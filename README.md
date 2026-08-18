# PlainOSS

> Free, simple, ad/bloat-free tools for Web & Mobile.

PlainOSS is a monorepo housing a collection of standalone, single-purpose utility tools. Each tool is built with a focus on simplicity, privacy, speed, and offline capability.

## Architecture Highlights

- **Multi-App Monorepo**: Every tool is an independently deployable web app (e.g. `suntracker.plainoss.app`, `arruler.plainoss.app`) and standalone mobile app (Google Play / F-Droid / App Store).
- **Core Separation**: All mathematical engines, conversion algorithms, and parsers live in `packages/core` with 100% pure TypeScript and hermetic unit tests.
- **Modern Web Standards**: Built using Google Chrome's `modern-web-guidance` and Web Baseline standards (native dialogs, popovers, container queries, CSS `:has()`, view transitions).
- **Modern Mobile**: Built using React Native / Expo (SDK 52+) with the New Architecture (Fabric/TurboModules) and Continuous Native Generation (CNG).
- **Agent-Driven**: Structured for seamless collaboration with AI coding agents with sub-2s verification loops and strict typing.

## Repository Layout

```
plainoss/
├── apps/               # Independent standalone Web & Mobile applications
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

### Installation

```bash
pnpm install
```

### Common Commands

```bash
# Typecheck all packages & apps
pnpm run typecheck

# Run all unit tests
pnpm run test

# Build all apps
pnpm run build

# Scaffold a new tool (Core engine + Web app + Mobile app)
pnpm run scaffold-tool <tool-name>
```

## Adding a New Tool

See [.agents/TOOL_BLUEPRINT.md](.agents/TOOL_BLUEPRINT.md) for the exact step-by-step process.

## License

[MIT](LICENSE)
