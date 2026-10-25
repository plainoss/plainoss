#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";

interface JavaInstallation {
  executable: string;
  home: string;
  major: number;
}

const projectDir = path.resolve(__dirname, "../apps/ar-ruler-mobile");
const javaBinary = process.platform === "win32" ? "java.exe" : "java";
const javacBinary = process.platform === "win32" ? "javac.exe" : "javac";
const tasks = {
  build: [":androidApp:assembleDebug"],
  check: [
    ":shared:jvmTest",
    ":androidApp:lintDebug",
    ":androidApp:assembleDebug",
  ],
  install: [":androidApp:installDebug"],
};

function directory(location: string): boolean {
  try {
    return statSync(location).isDirectory();
  } catch {
    return false;
  }
}

function children(location: string, suffix = ""): string[] {
  try {
    return readdirSync(location)
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
      .map((name) => path.join(location, name, suffix));
  } catch {
    return [];
  }
}

function installedJavaHomes(env: NodeJS.ProcessEnv): string[] {
  const home = homedir();
  const shared = [
    path.join(home, ".sdkman/candidates/java/current"),
    ...children(path.join(home, ".jdks")),
    ...children(path.join(home, ".sdkman/candidates/java")),
  ];
  if (process.platform === "darwin") {
    return [
      ...["/opt/homebrew", "/usr/local"].flatMap((prefix) =>
        ["openjdk@21", "openjdk@17", "openjdk"].map((name) =>
          path.join(prefix, "opt", name, "libexec/openjdk.jdk/Contents/Home"),
        ),
      ),
      ...children("/Applications")
        .filter((app) => path.basename(app).startsWith("Android Studio"))
        .map((app) => path.join(app, "Contents/jbr/Contents/Home")),
      ...children(path.join(home, "Applications"))
        .filter((app) => path.basename(app).startsWith("Android Studio"))
        .map((app) => path.join(app, "Contents/jbr/Contents/Home")),
      ...children("/Library/Java/JavaVirtualMachines", "Contents/Home"),
      ...children(
        path.join(home, "Library/Java/JavaVirtualMachines"),
        "Contents/Home",
      ),
      ...shared,
    ];
  }
  if (process.platform === "win32") {
    const programFiles = env.ProgramFiles || "C:\\Program Files";
    return [
      path.join(programFiles, "Android/Android Studio/jbr"),
      ...["Java", "Eclipse Adoptium", "Microsoft"].flatMap((name) =>
        children(path.join(programFiles, name)),
      ),
      ...shared,
    ];
  }
  return [
    "/opt/android-studio/jbr",
    "/usr/local/android-studio/jbr",
    path.join(home, "android-studio/jbr"),
    ...children("/usr/lib/jvm"),
    ...children("/usr/java"),
    ...shared,
  ];
}

function inspectJava(executable: string): JavaInstallation | undefined {
  const result = spawnSync(
    executable,
    ["-XshowSettings:properties", "-version"],
    {
      encoding: "utf8",
      timeout: 5_000,
      windowsHide: true,
    },
  );
  if (result.error || result.status !== 0) return;
  const output = `${result.stdout}\n${result.stderr}`;
  const version =
    output.match(/\bversion\s+"(\d+)(?:\.(\d+))?/i) ||
    output.match(/^(?:openjdk|java)\s+(\d+)(?:\.(\d+))?/m);
  const major = Number(version?.[1] === "1" ? version[2] : version?.[1]);
  const home = output.match(/^\s*java\.home\s*=\s*(.+)$/m)?.[1]?.trim();
  if (
    !home ||
    ![17, 21].includes(major) ||
    !existsSync(path.join(home, "bin", javacBinary))
  )
    return;
  return { executable: path.join(home, "bin", javaBinary), home, major };
}

/** Dependencies are injectable so precedence and unsupported-JDK fallback can be tested offline. */
export function resolveJava(
  env: NodeJS.ProcessEnv = process.env,
  candidates: string[] = installedJavaHomes(env),
  inspect: (executable: string) => JavaInstallation | undefined = inspectJava,
): JavaInstallation {
  const executables = [
    ...(env.JAVA_HOME ? [path.join(env.JAVA_HOME, "bin", javaBinary)] : []),
    "java",
    ...candidates.map((home) => path.join(home, "bin", javaBinary)),
  ];
  for (const executable of new Set(executables)) {
    // Avoid launching nonexistent candidate files. PATH Java is resolved by spawn itself.
    if (
      inspect === inspectJava &&
      executable !== "java" &&
      !existsSync(executable)
    )
      continue;
    const java = inspect(executable);
    if (java) return java;
  }
  throw new Error(
    "No supported JDK found. Install JDK 17 or 21, then set JAVA_HOME to its home directory " +
      "(the directory containing bin/java and bin/javac). Java 25 is not supported by this Android toolchain.",
  );
}

/** Decode the Java-properties escaping used by Android Studio, including Windows drive paths. */
export function localSdkPath(contents: string): string | undefined {
  const value = contents.match(/^\s*sdk\.dir\s*[:=]\s*(.*)$/m)?.[1]?.trim();
  return value?.replace(
    /\\u([\da-f]{4})|\\(.)/gi,
    (_match, unicode: string | undefined, escaped: string | undefined) => {
      if (unicode) return String.fromCharCode(Number.parseInt(unicode, 16));
      return (
        { t: "\t", n: "\n", r: "\r", f: "\f" }[escaped ?? ""] ?? escaped ?? ""
      );
    },
  );
}

export function resolveSdk(
  project: string,
  env: NodeJS.ProcessEnv = process.env,
  defaults: string[] = process.platform === "darwin"
    ? [path.join(homedir(), "Library/Android/sdk")]
    : process.platform === "win32"
      ? [
          path.join(
            env.LOCALAPPDATA || path.join(homedir(), "AppData/Local"),
            "Android/Sdk",
          ),
        ]
      : [
          path.join(homedir(), "Android/Sdk"),
          path.join(homedir(), "Android/sdk"),
        ],
): string {
  const validSdk = (sdk: string) =>
    directory(sdk) && directory(path.join(sdk, "platforms"));
  const properties = path.join(project, "local.properties");
  if (existsSync(properties)) {
    const configured = localSdkPath(readFileSync(properties, "utf8"));
    if (configured) {
      const sdk = path.resolve(project, configured);
      if (validSdk(sdk)) return sdk;
      throw new Error(
        `The sdk.dir in ${properties} is not an Android SDK with installed platforms: ${sdk}. ` +
          "Correct sdk.dir or remove that entry to use ANDROID_HOME or the default SDK location.",
      );
    }
  }
  for (const candidate of [
    env.ANDROID_HOME,
    env.ANDROID_SDK_ROOT,
    ...defaults,
  ]) {
    if (candidate && validSdk(candidate)) return path.resolve(candidate);
  }
  throw new Error(
    "No Android SDK found. Install Android SDK Platform 36 with Android Studio, then set ANDROID_HOME " +
      "to the SDK directory, or set sdk.dir in apps/ar-ruler-mobile/local.properties.",
  );
}

/** Use the wrapper main class on every OS; .bat files otherwise require unsafe shell quoting. */
export function wrapperArguments(
  project: string,
  action: keyof typeof tasks | "--version",
  extra: string[],
): string[] {
  return [
    "-Xmx64m",
    "-Xms64m",
    "-Dorg.gradle.appname=gradlew",
    "-classpath",
    path.join(project, "gradle/wrapper/gradle-wrapper.jar"),
    "org.gradle.wrapper.GradleWrapperMain",
    ...(action === "--version" ? ["--version"] : tasks[action]),
    ...extra,
  ];
}

function main(): void {
  const [action, ...args] = process.argv.slice(2);
  if (!action || (action !== "--version" && !Object.hasOwn(tasks, action))) {
    console.error(
      "Usage: tsx tools/android.ts <build|check|install|--version> [Gradle arguments…]",
    );
    process.exitCode = 1;
    return;
  }
  try {
    const java = resolveJava();
    const sdk = resolveSdk(projectDir);
    console.log(`Android: JDK ${java.major} (${java.home})`);
    console.log(`Android SDK: ${sdk}`);
    const child = spawn(
      java.executable,
      wrapperArguments(
        projectDir,
        action as keyof typeof tasks | "--version",
        args[0] === "--" ? args.slice(1) : args,
      ),
      {
        cwd: projectDir,
        env: {
          ...process.env,
          JAVA_HOME: java.home,
          ANDROID_HOME: sdk,
          ANDROID_SDK_ROOT: sdk,
        },
        stdio: "inherit",
        shell: false,
        windowsHide: true,
      },
    );
    child.on("error", (error) => {
      console.error(`Could not launch Gradle: ${error.message}`);
      process.exitCode = 1;
    });
    child.on("exit", (code, signal) => {
      process.exitCode = code ?? (signal === "SIGINT" ? 130 : 1);
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (require.main === module) main();
