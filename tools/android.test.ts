import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import {
  localSdkPath,
  resolveJava,
  resolveSdk,
  wrapperArguments,
} from "./android";

const javaBinary = process.platform === "win32" ? "java.exe" : "java";
const executable = (home: string) => path.join(home, "bin", javaBinary);
const jdk = (home: string, major: number) => ({
  home,
  major,
  executable: executable(home),
});

test("supported JAVA_HOME takes precedence over PATH and detected JDKs", () => {
  const configured = jdk(path.resolve("configured JDK"), 17);
  const fromPath = jdk(path.resolve("path JDK"), 21);
  const found = resolveJava(
    { JAVA_HOME: configured.home },
    ["another JDK"],
    (file) => {
      if (file === configured.executable) return configured;
      if (file === "java") return fromPath;
      return undefined;
    },
  );
  assert.equal(found, configured);
});

test("unsupported JAVA_HOME and PATH fall back to an installed supported JDK", () => {
  const fallback = jdk(path.resolve("JDK with spaces"), 21);
  const checked: string[] = [];
  const found = resolveJava(
    { JAVA_HOME: "unsupported" },
    [fallback.home],
    (file) => {
      checked.push(file);
      return file === fallback.executable ? fallback : undefined;
    },
  );
  assert.equal(found, fallback);
  assert.deepEqual(checked, [
    executable("unsupported"),
    "java",
    fallback.executable,
  ]);
});

test("missing supported JDK gives actionable guidance", () => {
  assert.throws(
    () => resolveJava({}, [], () => undefined),
    /Install JDK 17 or 21.*JAVA_HOME/,
  );
});

test("local.properties decodes Windows paths and escaped spaces", () => {
  assert.equal(
    localSdkPath(
      "# Android Studio\nsdk.dir=C\\:\\\\Users\\\\A\\ User\\\\Android\\\\Sdk\n",
    ),
    "C:\\Users\\A User\\Android\\Sdk",
  );
});

test("SDK config has Gradle precedence and invalid sdk.dir cannot silently fall back", () => {
  const root = mkdtempSync(path.join(tmpdir(), "plainoss-android-"));
  try {
    const project = path.join(root, "app");
    const configured = path.join(root, "configured-sdk");
    const environment = path.join(root, "environment-sdk");
    mkdirSync(project);
    mkdirSync(path.join(configured, "platforms"), { recursive: true });
    mkdirSync(path.join(environment, "platforms"), { recursive: true });
    const escaped = configured.replaceAll("\\", "\\\\");
    writeFileSync(
      path.join(project, "local.properties"),
      `sdk.dir=${escaped}\n`,
    );
    assert.equal(
      resolveSdk(project, { ANDROID_HOME: environment }, []),
      configured,
    );
    writeFileSync(
      path.join(project, "local.properties"),
      "sdk.dir=missing-sdk\n",
    );
    assert.throws(
      () => resolveSdk(project, { ANDROID_HOME: environment }, []),
      /Correct sdk.dir/,
    );
    rmSync(path.join(project, "local.properties"));
    assert.equal(
      resolveSdk(project, { ANDROID_HOME: "invalid" }, [environment]),
      environment,
    );
    assert.throws(
      () => resolveSdk(project, {}, []),
      /Install Android SDK Platform 37/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("wrapper invocation preserves device and arbitrary arguments without shell interpolation", () => {
  const extra = [
    "-Pandroid.injected.device.serial=USB device",
    "-Pexample=$(never-execute); literal",
  ];
  const args = wrapperArguments(
    path.resolve("project with spaces"),
    "install",
    extra,
  );
  assert.deepEqual(args.slice(-3), [":androidApp:installDebug", ...extra]);
  assert.ok(args.includes("org.gradle.wrapper.GradleWrapperMain"));
});
