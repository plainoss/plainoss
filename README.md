# PlainOSS

> Free, simple, ad/bloat-free tools for Web & Mobile.

PlainOSS is a monorepo housing a collection of standalone, single-purpose utility tools. Each tool is built with a focus on simplicity, privacy, speed, and offline capability.

## Architecture Highlights

- **Multi-App Monorepo**: Each tool has independent web and native mobile projects, with platform releases built separately. Web apps deploy independently (e.g. `suntracker.plainoss.app`, `arruler.plainoss.app`).
- **Core Separation**: Web mathematical engines live in `packages/core` with pure TypeScript and hermetic unit tests. Native apps keep portable Kotlin logic and tests in their Kotlin Multiplatform `shared` modules. Equivalent engines follow the same behavior and reference cases across both languages.
- **Modern Web Standards**: Built using Google Chrome's `modern-web-guidance` and Web Baseline standards (native dialogs, popovers, container queries, CSS `:has()`, view transitions).
- **Modern Mobile**: Native apps use Kotlin Multiplatform in `apps/<tool>-mobile`, starting with Android, Jetpack Compose Material 3, and native platform APIs. iOS targets and platform adapters are added when needed. [AR Ruler Mobile](apps/ar-ruler-mobile/README.md) is the first implementation, with native camera and ARCore integration.
- **Agent-Driven**: Structured for seamless collaboration with AI coding agents with sub-2s verification loops and strict typing.

## Repository Layout

```
plainoss/
├── apps/               # Independent standalone Web & Mobile applications
│   ├── web-<tool>/     # Vite + React web app
│   └── <tool>-mobile/  # Kotlin Multiplatform Gradle project
│       ├── androidApp/ # Native Android UI and platform APIs
│       └── shared/src/ # Portable Kotlin commonMain and commonTest
├── packages/           # Shared packages
│   ├── core/           # 100% pure math/logic engines (Vitest)
│   └── tsconfig/       # Shared TypeScript configuration
├── tools/              # Scaffolding & CI tooling
└── .agents/            # Agent blueprints & system standards
```

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 10.0.0
- For Android development: JDK 17 or 21 and Android SDK Platform 36.

### Installation

```bash
pnpm install
```

### Common Commands

```bash
# Typecheck web apps and TypeScript packages
pnpm run typecheck

# Run TypeScript unit tests
pnpm run test

# Build web apps and TypeScript packages
pnpm run build

# Build AR Ruler's Android debug APK (JDK 17 or 21 + Android SDK 36)
pnpm run android:build

# Test AR Ruler's shared Kotlin core, lint Android, and build its debug APK
pnpm run android:check

# Install AR Ruler's Android app on a connected device
pnpm run android:install

# Scaffold a new tool (Core engine + Web app + Mobile app)
pnpm run scaffold-tool <tool-name>
```

## Adding a New Tool

See [.agents/TOOL_BLUEPRINT.md](.agents/TOOL_BLUEPRINT.md) for the exact step-by-step process.

The scaffolder creates a TypeScript core, web app, and Kotlin Multiplatform project in `apps/<tool>-mobile`. Each native Gradle project builds independently of pnpm/Turbo. Open its directory in Android Studio, or run its checked-in Gradle wrapper to test `shared` and build `androidApp`. The root `android:*` commands are shortcuts for AR Ruler; see its [README](apps/ar-ruler-mobile/README.md) for setup and device testing.

## License

[MIT](LICENSE)
