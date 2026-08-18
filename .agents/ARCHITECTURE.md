# PlainOSS Architecture & System Design

PlainOSS is a monorepo containing a collection of standalone, single-purpose, privacy-first, ad/bloat-free utility tools.

---

## Core Tenets

1. **Standalone Deployment**: Every tool is an independent application on both Web (e.g. `suntracker.plainoss.app`, `arruler.plainoss.app`) and Mobile (distinct bundle ID `app.plainoss.<tool>`, independent APK/AAB).
2. **Strict Layering**:
   - `packages/core`: 100% pure TypeScript business logic, math, astronomical calculations, parsing, and algorithms. Zero DOM, React, or Mobile dependencies.
   - `apps/web-<tool>`: Lightweight Vite + React + TypeScript static web apps adhering to Google Modern Web Baseline standards.
   - `apps/mobile-<tool>`: Standalone React Native (Expo) apps with clean native camera/sensor integrations.
3. **Zero Bloat Policy**:
   - No tracking, telemetry, ad SDKs, heavy UI libraries, or extraneous runtime dependencies.
   - Prioritize browser-native and OS-native primitives.

---

## Directory Organization

```plaintext
plainoss/
├── apps/                              # Standalone applications
│   ├── web-<tool>/                    # Standalone Web app (Vite + React)
│   └── mobile-<tool>/                 # Standalone Mobile app (Expo SDK 52+)
├── packages/
│   ├── core/                          # Pure computational engines + Vitest tests
│   └── tsconfig/                      # Shared tsconfig bases
├── tools/                             # Automation & scaffolding scripts
├── .agents/                           # System instructions & agent guidelines
└── .github/workflows/                 # CI/CD pipelines
```

---

## Developer & Agent Workflows

### 1. Verification Commands

```bash
# Type check entire monorepo
pnpm run typecheck

# Run all core engine unit tests hermetically
pnpm run test

# Check code formatting (automated on git commit via nano-staged & husky)
pnpm run format:check

# Run formatting on staged files
pnpm run nano-staged
```

### 2. Adding a New Tool

Always follow the blueprint in [.agents/TOOL_BLUEPRINT.md](TOOL_BLUEPRINT.md) using:

```bash
pnpm run scaffold-tool <tool-name>
```
