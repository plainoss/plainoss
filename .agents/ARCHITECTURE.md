# PlainOSS Architecture & System Design

PlainOSS is a monorepo containing a collection of standalone, single-purpose, privacy-first, ad/bloat-free utility tools.

---

## Core Tenets

1. **Standalone Deployment**: Every tool is an independent application on both Web (e.g. `suntracker.plainoss.app`, `arruler.plainoss.app`) and Mobile (distinct bundle ID `app.plainoss.<tool>`, independent APK/AAB).
2. **Strict Layering**:
   - `packages/core`: Pure TypeScript web business logic, math, astronomical calculations, parsing, and algorithms. Zero DOM, React, or Mobile dependencies.
   - `apps/web-<tool>`: Lightweight Vite + React + TypeScript static web apps adhering to Google Modern Web Baseline standards.
   - `apps/<tool>-mobile/shared/src/commonMain`: Portable Kotlin Multiplatform business logic, math, units, and state. Common code has no Android or Apple API dependencies; tests live in `shared/src/commonTest`.
   - `apps/<tool>-mobile/androidApp`: Native Android app using Jetpack Compose Material 3 and Android platform APIs. Camera, sensors, permissions, lifecycle, rendering, and persistence belong here.
   - iOS targets and a native iOS app/platform adapter are added to each mobile project when needed. Android is the first platform; an iOS app is not generated yet.
   - Web and native calculation engines are separate TypeScript and Kotlin implementations. Keep their behavior aligned using the same reference inputs, expected results, and edge cases.
3. **Zero Bloat Policy**:
   - No tracking, telemetry, ad SDKs, heavy UI libraries, or extraneous runtime dependencies.
   - Prioritize browser-native and OS-native primitives.

---

## Directory Organization

```plaintext
plainoss/
├── apps/                              # Standalone applications
│   ├── web-<tool>/                    # Standalone Web app (Vite + React)
│   └── <tool>-mobile/                 # Kotlin Multiplatform Gradle project
│       ├── androidApp/                # Native Compose UI and Android APIs
│       └── shared/src/
│           ├── commonMain/            # Portable Kotlin logic
│           └── commonTest/            # Common Kotlin tests
├── packages/
│   ├── core/                          # Web computational engines + Vitest tests
│   └── tsconfig/                      # Shared tsconfig bases
├── tools/                             # Automation & scaffolding scripts
├── .agents/                           # System instructions & agent guidelines
└── .github/workflows/                 # CI/CD pipelines
```

---

## Developer & Agent Workflows

### 1. Verification Commands

```bash
# Typecheck web apps and TypeScript packages
pnpm run typecheck

# Run TypeScript engine unit tests hermetically
pnpm run test

# Check code formatting (automated on git commit via nano-staged & husky)
pnpm run format:check

# Run formatting on staged files
pnpm run nano-staged

# Test AR Ruler Kotlin logic, lint Android, and assemble a debug APK
pnpm run android:check

# Check another native tool using its Gradle wrapper
cd apps/<tool>-mobile
./gradlew :shared:jvmTest :androidApp:lintDebug :androidApp:assembleDebug
```

### 2. Adding a New Tool

Always follow the blueprint in [.agents/TOOL_BLUEPRINT.md](TOOL_BLUEPRINT.md) using:

```bash
pnpm run scaffold-tool <tool-name>
```

The scaffolder creates both web and native projects. Use `apps/ar-ruler-mobile` as the existing example of a shared Kotlin core with a native Android API adapter. Keep native builds separate from pnpm/Turbo web builds.
