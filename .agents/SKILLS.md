# Agent Skills Registry for PlainOSS

AI Agents developing in PlainOSS MUST consult these skills during tool development:

---

## 1. `modern-web-guidance`

- **When to trigger**: Before writing any new HTML/CSS, Web UI component, animation, dialog/modal, or layout.
- **Command**:
  ```bash
  npx -y modern-web-guidance@latest search "<query>"
  npx -y modern-web-guidance@latest retrieve "<guide-id>"
  ```
- **Purpose**: Prevents using outdated CSS/JS hacks by fetching the latest Google Chrome Web Baseline best practices.

---

## 2. Testing & Verification Skills

- Vitest for fast, in-memory testing of calculation engines:
  ```bash
  pnpm --filter @plainoss/core test
  ```
- TypeScript strict checking:
  ```bash
  pnpm run typecheck
  ```
