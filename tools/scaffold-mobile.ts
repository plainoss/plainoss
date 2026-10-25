import * as fs from "node:fs";
import * as path from "node:path";

interface MobileTool {
  rootDir: string;
  toolKebab: string;
  toolPascal: string;
  toolTitle: string;
  toolClean: string;
}

// Reuse the repository's verified Gradle toolchain instead of maintaining a
// second wrapper binary or a separately versioned copy of the Android setup.
const referenceFiles = [
  "settings.gradle.kts",
  "build.gradle.kts",
  "gradle.properties",
  "gradlew",
  "gradlew.bat",
  "gradle/wrapper/gradle-wrapper.jar",
  "gradle/wrapper/gradle-wrapper.properties",
  "gradle/libs.versions.toml",
  "shared/build.gradle.kts",
  "androidApp/build.gradle.kts",
  "androidApp/src/main/res/xml/data_extraction_rules.xml",
];

export function validateMobileTemplate(rootDir: string): void {
  for (const relativeFile of referenceFiles) {
    const source = path.join(rootDir, "apps/ar-ruler-mobile", relativeFile);
    if (!fs.existsSync(source)) {
      throw new Error(`Missing native scaffold reference: ${source}`);
    }
  }
}

export function scaffoldMobile(tool: MobileTool): void {
  const { rootDir, toolKebab, toolPascal, toolTitle, toolClean } = tool;
  const mobileDir = path.join(rootDir, "apps", `${toolKebab}-mobile`);
  const packageName = `app.plainoss.${toolClean}`;
  const packagePath = packageName.replaceAll(".", "/");
  const referenceDir = path.join(rootDir, "apps/ar-ruler-mobile");

  function write(relativeFile: string, content: string): void {
    const destination = path.join(mobileDir, relativeFile);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, content);
  }

  for (const relativeFile of referenceFiles) {
    const source = path.join(referenceDir, relativeFile);
    const destination = path.join(mobileDir, relativeFile);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (relativeFile.endsWith(".jar")) {
      fs.copyFileSync(source, destination);
      continue;
    }
    let content = fs
      .readFileSync(source, "utf8")
      .replaceAll("app.plainoss.arruler", packageName)
      .replaceAll('"ar-ruler-mobile"', `"${toolKebab}-mobile"`)
      .replace("common measurement tests", "common logic tests");
    if (relativeFile === "gradle/libs.versions.toml") {
      content = content
        .split("\n")
        .filter(
          (line) =>
            !/^(arcore|core|lifecycle|google-arcore|androidx-core-ktx|androidx-lifecycle-[\w-]+|androidx-compose-ui-tooling-preview)\s*=/.test(
              line,
            ),
        )
        .join("\n");
    }
    if (relativeFile === "androidApp/build.gradle.kts") {
      content = content
        .split("\n")
        .filter(
          (line) =>
            !/libs\.(google\.arcore|androidx\.core\.ktx|androidx\.lifecycle\.|androidx\.compose\.ui\.tooling\.preview)/.test(
              line,
            ),
        )
        .join("\n");
    }
    fs.writeFileSync(destination, content);
  }
  fs.chmodSync(path.join(mobileDir, "gradlew"), 0o755);

  write(
    `shared/src/commonMain/kotlin/${packagePath}/core/${toolPascal}.kt`,
    `package ${packageName}.core

/** Portable calculation logic shared by Android and a future iOS app. */
fun compute${toolPascal}(input: Double): Double = input
`,
  );
  write(
    `shared/src/commonTest/kotlin/${packagePath}/core/${toolPascal}Test.kt`,
    `package ${packageName}.core

import kotlin.test.Test
import kotlin.test.assertEquals

class ${toolPascal}Test {
    @Test
    fun computesCorrectly() {
        assertEquals(42.0, compute${toolPascal}(42.0))
    }
}
`,
  );
  write(
    "androidApp/src/main/AndroidManifest.xml",
    `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:allowBackup="false"
        android:dataExtractionRules="@xml/data_extraction_rules"
        android:fullBackupContent="false"
        android:icon="@drawable/ic_tool"
        android:label="${toolTitle}"
        android:supportsRtl="true"
        android:theme="@style/Theme.PlainTool">
        <activity android:name=".MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`,
  );
  write(
    "androidApp/src/main/res/values/styles.xml",
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.PlainTool" parent="android:style/Theme.Material.Light.NoActionBar">
        <item name="android:windowLightStatusBar">true</item>
        <item name="android:windowActionModeOverlay">true</item>
        <item name="android:fontFamily">sans</item>
    </style>
</resources>
`,
  );
  write(
    "androidApp/src/main/res/drawable/ic_tool.xml",
    `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="48dp" android:height="48dp"
    android:viewportWidth="48" android:viewportHeight="48">
    <path android:fillColor="#2563EB" android:pathData="M0,0h48v48h-48z" />
    <path android:fillColor="#FFFFFF" android:pathData="M12,12h24v6h-18v18h-6z" />
</vector>
`,
  );
  write(
    `androidApp/src/main/kotlin/${packagePath}/MainActivity.kt`,
    `package ${packageName}

import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import ${packageName}.core.compute${toolPascal}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val dark = isSystemInDarkTheme()
            val context = LocalContext.current
            val colors = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (dark) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
            } else {
                if (dark) darkColorScheme() else lightColorScheme()
            }
            MaterialTheme(colorScheme = colors) {
                var input by rememberSaveable { mutableStateOf("10") }
                val number = input.toDoubleOrNull()?.takeIf { it.isFinite() }
                Scaffold { insets ->
                    Column(
                        modifier = Modifier.fillMaxSize().padding(insets)
                            .verticalScroll(rememberScrollState()).padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        Column(
                            modifier = Modifier.widthIn(max = 640.dp).fillMaxWidth(),
                            verticalArrangement = Arrangement.spacedBy(16.dp),
                        ) {
                            Text("${toolTitle}", style = MaterialTheme.typography.headlineLarge)
                            Text("Free, ad-free utility by PlainOSS", color = MaterialTheme.colorScheme.onSurfaceVariant)
                            OutlinedTextField(
                                value = input,
                                onValueChange = { input = it },
                                label = { Text("Input value") },
                                supportingText = { Text(if (number == null) "Enter a valid number" else "Calculated on your device") },
                                isError = number == null,
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                modifier = Modifier.fillMaxWidth(),
                            )
                            Text(
                                text = number?.let { "Result: \$\{compute${toolPascal}(it)}" } ?: "Result: —",
                                style = MaterialTheme.typography.titleLarge,
                            )
                        }
                    }
                }
            }
        }
    }
}
`,
  );
  write(
    ".gitignore",
    `.gradle/
.kotlin/
**/build/
local.properties
.idea/
*.iml
*.apk
*.aab
`,
  );
  write(
    "README.md",
    `# ${toolTitle} Mobile

Android-first Kotlin Multiplatform app with a native Compose Material 3 interface. The shared module contains portable calculation logic and common Kotlin tests; Android platform code stays in androidApp. No Node dependencies are required to build this mobile project.

## Build

Install JDK 17 or 21 and Android SDK Platform 36. Set ANDROID_HOME to the SDK directory, or create an untracked local.properties containing sdk.dir=/absolute/path/to/Android/sdk. Select the same JDK as Android Studio's Gradle JDK.

Run from this directory (use gradlew.bat on Windows):

\`\`\`bash
./gradlew :shared:jvmTest :androidApp:lintDebug :androidApp:assembleDebug
./gradlew :androidApp:installDebug
\`\`\`

The debug APK is written to androidApp/build/outputs/apk/debug/androidApp-debug.apk. Release application ID: ${packageName}; debug ID: ${packageName}.debug. Minimum Android version: 8.0 (API 26).

## Development

- Implement reusable Kotlin logic in shared/src/commonMain and tests in shared/src/commonTest. Keep behavior aligned with the web engine in packages/core/src/${toolKebab}.
- Build platform interactions and Compose UI in androidApp. Native projects run independently of the repository's pnpm/Turbo web commands.
- Add iOS targets/frameworks to shared and an iOS app when ready; Android builds do not need Xcode.

The scaffolder copies the verified Gradle wrapper and pinned toolchain from ar-ruler-mobile and excludes its AR-specific dependencies. This app has no camera permission, ARCore dependency, telemetry, or network permission by default.
`,
  );
}
