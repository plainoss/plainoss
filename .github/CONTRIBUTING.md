# Contributing to PlainOSS

Thank you for your interest in contributing to PlainOSS! We are building a collection of free, simple, ad/bloat-free tools for Web and Mobile.

---

## Guiding Principles

1. **Zero Bloat & Privacy First**: No telemetry, analytics, ad SDKs, or unnecessary runtime dependencies.
2. **Offline-First**: Every tool should function without an internet connection whenever possible.
3. **Core Separation**: Calculation engines live in `packages/core/` with 100% pure TypeScript and hermetic Vitest tests.
4. **Modern Standards**: Web apps follow Google Chrome's `modern-web-guidance`; Mobile apps use modern Expo SDK with New Architecture.

---

## Development Setup

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 10.0.0

### Getting Started

```bash
# Clone the repository
git clone https://github.com/plainoss/plainoss.git
cd plainoss

# Install dependencies
pnpm install

# Run test suite
pnpm run test

# Run type check
pnpm run typecheck
```

---

## Proposing & Adding a New Tool

Before building a new tool, please open a [New Tool Request](https://github.com/plainoss/plainoss/issues/new?template=new_tool_request.yml) issue to discuss the proposal.

To scaffold a new tool:

```bash
pnpm run scaffold-tool <tool-name>
# Example: pnpm run scaffold-tool qr-generator
```

Follow the checklist in [.agents/TOOL_BLUEPRINT.md](../.agents/TOOL_BLUEPRINT.md):

1. Implement pure logic in `packages/core/src/<tool>/` with unit tests in `packages/core/test/<tool>.test.ts`.
2. Implement Web UI in `apps/web-<tool>/`.
3. Implement Mobile UI in `apps/mobile-<tool>/`.

---

## Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat(<scope>): add new capability or tool`
- `fix(<scope>): fix bug or regression`
- `docs(<scope>): documentation update`
- `test(<scope>): test additions or updates`
- `refactor(<scope>): code refactoring without behavior change`
- `chore(<scope>): tooling, dependency, or config updates`

Examples:

- `feat(core/solar): add NOAA solar elevation calculation`
- `fix(web-sun-tracker): correct compass orientation listener for iOS Safari`
- `docs: update tool blueprint checklist`

---

## Pull Request Process

1. Create a feature branch off `main` (e.g. `feat/sun-tracker`).
2. Ensure all verification checks pass locally:
   ```bash
   pnpm run format:check
   pnpm run typecheck
   pnpm run test
   ```
3. Open a Pull Request against `main`. Fill in the PR template completely.
4. CI will run automated linting, typechecking, and tests. Once approved, the PR will be squash-merged.
