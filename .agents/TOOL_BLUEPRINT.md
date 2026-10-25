# PlainOSS Tool Blueprint

This is the standard, repeatable recipe for building any new utility tool in PlainOSS.

---

## 3-Phase Tool Development Process

```
┌────────────────────────────────────────────────────────────────┐
│ 1. Define core behavior and matching reference cases            │
│    • Pure calculations, units, state transitions, edge cases    │
│    • TypeScript engine for web; shared Kotlin engine for mobile │
└───────────────────────────────┬────────────────────────────────┘
                                │
             ┌──────────────────┴──────────────────┐
             ▼                                     ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│ 2. Web (apps/web-<tool>)      │    │ 3. Native (<tool>-mobile)    │
│    • packages/core + Vitest  │    │    • KMP shared + commonTest │
│    • modern-web-guidance    │    │    • Android Compose first   │
│    • Accessible HTML / CSS  │    │    • Native platform APIs    │
└──────────────────────────────┘    └──────────────────────────────┘
```

---

## Step-by-Step Instructions

Native apps use Kotlin Multiplatform projects in `apps/<tool>-mobile`. Start with Android and keep portable Kotlin logic in `shared/src/commonMain`; add iOS targets and a native platform adapter when needed. [AR Ruler Mobile](../apps/ar-ruler-mobile/README.md) is the existing example.

### Step 1: Scaffold the Tool

Run the scaffolding CLI:

```bash
pnpm run scaffold-tool <name-of-tool>
# Example: pnpm run scaffold-tool sun-tracker
```

This creates the TypeScript core, web app, and Kotlin Multiplatform mobile project with `shared` and `androidApp` modules.

### Step 2: Implement & Test the Core Engine

1. Implement web business logic and interfaces in `packages/core/src/<tool>/index.ts`.
2. Implement the equivalent portable Kotlin logic in `apps/<tool>-mobile/shared/src/commonMain`. Keep Android and Apple APIs out of common code.
3. Add matching reference cases, edge cases, and precision checks in `packages/core/test/<tool>.test.ts` and the mobile project's `shared/src/commonTest`. These are separate TypeScript and Kotlin implementations whose behavior must agree.
4. Verify both engines:
   ```bash
   pnpm --filter @plainoss/core test
   cd apps/<tool>-mobile
   ./gradlew :shared:jvmTest
   ```

### Step 3: Implement Web App (`apps/web-<tool>`)

1. Before writing UI or CSS, trigger the **`modern-web-guidance`** skill:
   ```bash
   npx -y modern-web-guidance@latest search "<ui-pattern>"
   ```
2. Build responsive, accessible, dark/light theme aware interface in `apps/web-<tool>/src/App.tsx`.
3. Verify web build:
   ```bash
   pnpm --filter web-<tool> build
   ```

### Step 4: Implement Native Mobile App (`apps/<tool>-mobile`)

1. Open the generated Gradle project in Android Studio. Use JDK 17 or 21 and Android SDK Platform 36.
2. Connect the shared Kotlin engine to a native Jetpack Compose Material 3 UI in `androidApp`. Keep permissions, camera/sensors, lifecycle, persistence, and platform rendering in this module.
3. Use native Android APIs for platform capabilities. Start camera or sensor workflows directly when permission and availability checks allow it, with accessible recovery states when unavailable.
4. Verify the native app independently of pnpm/Turbo:
   ```bash
   cd apps/<tool>-mobile
   ./gradlew :shared:jvmTest :androidApp:lintDebug :androidApp:assembleDebug
   ```
5. Test hardware-dependent behavior and lifecycle on a suitable physical device. For AR Ruler, the root `pnpm run android:check` shortcut runs its Gradle checks; its README lists device verification scenarios.
6. When iOS is needed, add Apple targets to `shared` and a native iOS app/platform adapter. Reuse the Kotlin engine and common tests while keeping permissions, lifecycle, and platform interface behavior native. No iOS app is generated yet.
