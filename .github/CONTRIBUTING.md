# Contributing to PlainOSS

Thank you for your interest in contributing to PlainOSS! We are building a collection of free, simple, ad/bloat-free tools for Web and Mobile.

---

## Guiding Principles

1. **Zero Bloat & Privacy First**: No telemetry, analytics, ad SDKs, or unnecessary runtime dependencies.
2. **Offline-First**: Every tool should function without an internet connection whenever possible.
3. **Core Separation**: Web calculation engines live in `packages/core/` with pure TypeScript and hermetic Vitest tests. Native apps use Kotlin Multiplatform shared cores with common Kotlin tests. Keep equivalent calculations consistent across both implementations.
4. **Modern Standards**: Web apps follow Google Chrome's `modern-web-guidance`; native apps start with Android, Jetpack Compose Material 3, and Android platform APIs. Add iOS targets and native platform adapters when needed.

---

## Development Setup

### Prerequisites

- Node.js >= 20.0.0
- pnpm 10.34.9 (pinned in `package.json`)
- For Android development: JDK 17 or 21 and Android SDK Platform 37.

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

Native projects live in `apps/<tool>-mobile` and build with their checked-in Gradle wrappers, independently of pnpm/Turbo and Node. Follow [AR Ruler's setup guide](../apps/ar-ruler-mobile/README.md) for an existing example; `pnpm run android:check` is a convenience shortcut for that app.

---

## Proposing & Adding a New Tool

Before building a new tool, please open a [New Tool Request](https://github.com/plainoss/plainoss/issues/new?template=new_tool_request.yml) issue to discuss the proposal.

To scaffold a new tool:

```bash
pnpm run scaffold-tool <tool-name>
# Example: pnpm run scaffold-tool qr-generator
```

Follow the checklist in [.agents/TOOL_BLUEPRINT.md](../.agents/TOOL_BLUEPRINT.md):

1. Implement web logic in `packages/core/src/<tool>/` with unit tests in `packages/core/test/<tool>.test.ts`.
2. Implement Web UI in `apps/web-<tool>/`.
3. Implement the native equivalent in `apps/<tool>-mobile/shared/src/commonMain`, with matching reference cases in `shared/src/commonTest`.
4. Implement Android UI and platform integration in `apps/<tool>-mobile/androidApp`. Add iOS targets and a native iOS adapter when needed.

The scaffolder creates the TypeScript core, web app, and Kotlin Multiplatform mobile project. Web and native engines are separate implementations with equivalent behavior; Android and future iOS apps share the Kotlin core.

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
   For native changes, run the affected mobile project's checks and complete the relevant device checks in its README:
   ```bash
   cd apps/<tool>-mobile
   ./gradlew :shared:jvmTest :androidApp:lintDebug :androidApp:assembleDebug
   ```
   For AR Ruler, `pnpm run android:check` runs these checks from the repository root.
3. Open a Pull Request against `main`. Fill in the PR template completely.
4. CI will run automated linting, typechecking, and tests. Both `Lint, Typecheck & Test` and `Android Build, Lint & Shared Tests` are required before merging, including for auto-merge. Keep your branch up to date with `main`. See the [main branch ruleset](rulesets/README.md) for the recorded configuration and check names. Once approved and all required checks pass, the PR will be squash-merged.
