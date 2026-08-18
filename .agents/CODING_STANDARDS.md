# PlainOSS Coding Standards

## 1. Zero Bloat Philosophy

- **No Unnecessary Dependencies**: If a feature can be implemented in <= 30 lines of clean native TypeScript/CSS/DOM APIs, do not install an npm package for it.
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

## 4. Mobile (React Native / Expo) Guidelines

- Expo SDK with New Architecture enabled (`newArchEnabled: true` in `app.json`).
- Use Continuous Native Generation (CNG) via Expo config plugins rather than manual native file modifications.
- Ensure responsive layouts across phone and tablet screens using Flexbox and `useWindowDimensions`.
