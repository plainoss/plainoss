# PlainOSS Tool Blueprint

This is the standard, repeatable recipe for building any new utility tool in PlainOSS.

---

## 3-Phase Tool Development Process

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Core Engine (packages/core/src/<tool>/)                  │
│    • Write pure mathematical / computational functions      │
│    • Write 100% Vitest unit tests in packages/core/test/    │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│ 2. Web App (apps/web-<tool>) │    │ 3. Mobile App (apps/mobile-) │
│    • Query modern-web-guid-  │    │    • Expo standalone app     │
│      ance skill first        │    │    • Native sensors & camera │
│    • Zero-bloat CSS & tokens │    │    • Material/Cupertino feel │
└──────────────────────────────┘    └──────────────────────────────┘
```

---

## Step-by-Step Instructions

### Step 1: Scaffold the Tool

Run the scaffolding CLI:

```bash
pnpm run scaffold-tool <name-of-tool>
# Example: pnpm run scaffold-tool sun-tracker
```

### Step 2: Implement & Test the Core Engine

1. Open `packages/core/src/<tool>/index.ts` and implement the business logic and interfaces.
2. Open `packages/core/test/<tool>.test.ts` and add comprehensive unit test cases (edge cases, precision checks).
3. Verify immediately:
   ```bash
   pnpm --filter @plainoss/core test
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

### Step 4: Implement Mobile App (`apps/mobile-<tool>`)

1. Connect core engine to the React Native UI in `apps/mobile-<tool>/App.tsx`.
2. Configure permissions (Camera, Location, Sensors) in `apps/mobile-<tool>/app.json`.
3. Verify TypeScript:
   ```bash
   pnpm --filter mobile-<tool> typecheck
   ```
