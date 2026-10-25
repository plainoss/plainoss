# PlainOSS Coding Standards

## 1. Zero Bloat Philosophy

- **No Unnecessary Dependencies**: Prefer a small implementation using standard TypeScript, CSS, DOM, Kotlin, or platform APIs over an additional runtime dependency.
- **No Telemetry / Ads / Trackers**: PlainOSS tools are strictly private and local-first.
- **Hermetic & Offline-First**: All tools should function without an internet connection whenever possible.

## 2. TypeScript & Code Quality

- Strict mode enabled everywhere (`noImplicitAny`, `strictNullChecks`, `noUnusedLocals`).
- Pure functions must be deterministic and side-effect free in `packages/core`.
- File naming: kebab-case for files (`solar-position.ts`), PascalCase for React components (`CameraOverlay.tsx`).

## 3. Web Development Guidelines

- Mandatory execution of `modern-web-guidance` before writing custom UI components or complex CSS layouts.
- Use semantic HTML5 elements (`<main>`, `<header>`, `<dialog>`, `<section>`, `<article>`).
- Always support dark and light color schemes via CSS custom properties and `prefers-color-scheme`.
- Optimize Core Web Vitals: ensure LCP < 1.2s, INP < 100ms, and CLS = 0.

## 4. Native Mobile (Kotlin Multiplatform) Guidelines

- Create native projects in `apps/<tool>-mobile`, with portable logic in `shared/src/commonMain` and common Kotlin tests in `shared/src/commonTest`. Common code must not import Android or Apple APIs.
- Implement Android first. Keep permissions, camera/sensors, session lifecycle, rendering, persistence, and Jetpack Compose UI in `androidApp` using native platform APIs.
- Use Material 3 components, accessible labels, system insets, and responsive layouts. Start platform features directly when their permissions and availability checks allow it; provide actionable recovery states when unavailable.
- Add iOS targets and native iOS platform adapters when needed, sharing the Kotlin domain logic. Do not require Apple tooling for Android-only development and CI.
- Each native Gradle project builds independently of pnpm/Turbo. Run its shared JVM tests, Android lint, and debug assembly with the checked-in wrapper. The root `pnpm run android:check` shortcut checks AR Ruler.
- Verify hardware-dependent behavior on a suitable physical device. For AR Ruler, this includes tracking, camera lifecycle, and measurement accuracy on an ARCore-supported device.

## 5. Web and Native Behavior Parity

- Web engines remain TypeScript in `packages/core`; native equivalents are Kotlin in each mobile project's `shared` module.
- Keep calculations, units, state transitions, and edge cases consistent across implementations. Use matching reference cases in Vitest and common Kotlin tests.
- Keep platform presentation and hardware adapters native while preserving the tool's functional behavior.
