#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import { scaffoldMobile, validateMobileTemplate } from "./scaffold-mobile";

const toolArg = process.argv[2];

if (!toolArg) {
  console.error("Usage: pnpm run scaffold-tool <tool-name>");
  console.error("Example: pnpm run scaffold-tool sun-tracker");
  process.exit(1);
}

// Normalize name: "sun-tracker" -> "sun-tracker", "sunTracker", "Sun Tracker"
const toolKebab = toolArg
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");
const toolCamel = toolKebab.replace(/-([a-z0-9])/g, (_, g) => g.toUpperCase());
const toolPascal = toolCamel.charAt(0).toUpperCase() + toolCamel.slice(1);
const toolTitle = toolKebab
  .split("-")
  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
  .join(" ");
const toolClean = toolKebab.replace(/-/g, "");

const rootDir = path.resolve(__dirname, "..");
const coreDir = path.join(rootDir, "packages", "core", "src", toolKebab);
const coreTestDir = path.join(rootDir, "packages", "core", "test");
const webDir = path.join(rootDir, "apps", `web-${toolKebab}`);
const mobileDir = path.join(rootDir, "apps", `${toolKebab}-mobile`);

// Validate every destination before writing so rerunning cannot overwrite a tool.
if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(toolKebab)) {
  console.error(
    "Tool names must start with a letter and contain letters, digits, or dashes.",
  );
  process.exit(1);
}
const packageKeywords = new Set([
  "abstract",
  "as",
  "assert",
  "boolean",
  "break",
  "byte",
  "case",
  "catch",
  "char",
  "class",
  "const",
  "continue",
  "default",
  "do",
  "double",
  "else",
  "enum",
  "extends",
  "false",
  "final",
  "finally",
  "float",
  "for",
  "fun",
  "goto",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "int",
  "interface",
  "is",
  "long",
  "native",
  "new",
  "null",
  "object",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "short",
  "static",
  "strictfp",
  "super",
  "switch",
  "synchronized",
  "this",
  "throw",
  "throws",
  "transient",
  "true",
  "try",
  "typealias",
  "typeof",
  "val",
  "var",
  "void",
  "volatile",
  "when",
  "while",
]);
if (packageKeywords.has(toolClean)) {
  console.error(
    `The normalized package name "${toolClean}" is a reserved Kotlin/Java keyword.`,
  );
  process.exit(1);
}
try {
  for (const destination of [
    coreDir,
    path.join(coreTestDir, `${toolKebab}.test.ts`),
    webDir,
    mobileDir,
    path.join(rootDir, "apps", `mobile-${toolKebab}`),
  ]) {
    if (fs.existsSync(destination)) {
      throw new Error(
        `Refusing to overwrite existing tool files: ${destination}`,
      );
    }
  }
  validateMobileTemplate(rootDir);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

console.log(
  `\n🚀 Scaffolding new PlainOSS standalone tool: "${toolTitle}" (${toolKebab})\n`,
);

// 1. packages/core/src/<toolKebab>/
fs.mkdirSync(coreDir, { recursive: true });
fs.mkdirSync(coreTestDir, { recursive: true });

fs.writeFileSync(
  path.join(coreDir, "index.ts"),
  `/**
 * ${toolTitle} Core Engine
 * 100% pure TypeScript calculation engine.
 */

export interface ${toolPascal}Config {
  enabled: boolean;
}

export function compute${toolPascal}(input: number): number {
  // Pure mathematical / computational logic here
  return input;
}
`,
);

fs.writeFileSync(
  path.join(coreTestDir, `${toolKebab}.test.ts`),
  `import { describe, it, expect } from 'vitest';
import { compute${toolPascal} } from '../src/${toolKebab}/index';

describe('${toolTitle} Core Engine', () => {
  it('computes correctly', () => {
    expect(compute${toolPascal}(42)).toBe(42);
  });
});
`,
);
console.log(`✅ Created Core Engine: packages/core/src/${toolKebab}/`);

// 2. apps/web-<toolKebab>/
const webSrcDir = path.join(webDir, "src");
fs.mkdirSync(webSrcDir, { recursive: true });

fs.writeFileSync(
  path.join(webDir, "package.json"),
  JSON.stringify(
    {
      name: `web-${toolKebab}`,
      version: "0.1.0",
      private: true,
      type: "module",
      scripts: {
        dev: "vite",
        build: "tsc && vite build",
        preview: "vite preview",
        typecheck: "tsc --noEmit",
      },
      dependencies: {
        "@plainoss/core": "workspace:*",
        react: "^19.3.1",
        "react-dom": "^19.3.1",
      },
      devDependencies: {
        "@plainoss/tsconfig": "workspace:*",
        "@types/react": "^19.3.0",
        "@types/react-dom": "^19.3.0",
        "@vitejs/plugin-react": "^6.1.2",
        typescript: "^7.0.2",
        vite: "^8.3.5",
      },
    },
    null,
    2,
  ),
);

fs.writeFileSync(
  path.join(webDir, "tsconfig.json"),
  JSON.stringify(
    {
      extends: "@plainoss/tsconfig/web.json",
      compilerOptions: {
        noEmit: true,
      },
      include: ["src"],
    },
    null,
    2,
  ),
);

fs.writeFileSync(
  path.join(webDir, "vite.config.ts"),
  `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
});
`,
);

fs.writeFileSync(
  path.join(webDir, "index.html"),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Free, simple, ad-free ${toolTitle}" />
    <title>${toolTitle} — PlainOSS</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
);

fs.writeFileSync(
  path.join(webSrcDir, "index.css"),
  `:root {
  --bg-primary: #0a0a0c;
  --bg-surface: #141418;
  --text-primary: #f2f2f4;
  --text-secondary: #a0a0a8;
  --accent: #3b82f6;
  --border: rgba(255, 255, 255, 0.08);
}

@media (prefers-color-scheme: light) {
  :root {
    --bg-primary: #f8f9fa;
    --bg-surface: #ffffff;
    --text-primary: #111827;
    --text-secondary: #6b7280;
    --accent: #2563eb;
    --border: rgba(0, 0, 0, 0.08);
  }
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
`,
);

fs.writeFileSync(
  path.join(webSrcDir, "App.tsx"),
  `import { useState } from 'react';
import { compute${toolPascal} } from '@plainoss/core/${toolKebab}/index';
import './index.css';

export function App() {
  const [val, setVal] = useState<number>(10);
  const result = compute${toolPascal}(val);

  return (
    <main style={{ padding: '2rem', maxWidth: '640px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600 }}>${toolTitle}</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Free, ad-free, bloat-free utility by PlainOSS</p>
      </header>

      <section style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Input Value</label>
        <input
          type="number"
          value={val}
          onChange={(e) => setVal(Number(e.target.value))}
          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'inherit', fontSize: '1rem' }}
        />
        <div style={{ marginTop: '1rem', fontSize: '1.125rem' }}>
          Computed Result: <strong>{result}</strong>
        </div>
      </section>
    </main>
  );
}
`,
);

fs.writeFileSync(
  path.join(webSrcDir, "main.tsx"),
  `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`,
);

fs.writeFileSync(
  path.join(webSrcDir, "vite-env.d.ts"),
  `/// <reference types="vite/client" />
`,
);
console.log(`✅ Created Standalone Web App: apps/web-${toolKebab}/`);

// 3. apps/<toolKebab>-mobile/ (Android-first Kotlin Multiplatform)
scaffoldMobile({ rootDir, toolKebab, toolPascal, toolTitle, toolClean });
console.log(
  `✅ Created Kotlin Multiplatform Mobile App: apps/${toolKebab}-mobile/`,
);

console.log(`
🎉 Successfully scaffolded "${toolTitle}"!
Next steps:
1. Run "pnpm install" to link web workspace dependencies.
2. Implement your web engine in packages/core/src/${toolKebab}/index.ts.
3. Implement matching portable Kotlin logic in apps/${toolKebab}-mobile/shared/src/commonMain.
4. Test web logic: "pnpm --filter @plainoss/core test"
5. Run Web: "pnpm --filter web-${toolKebab} dev"
6. Test/build Android: "cd apps/${toolKebab}-mobile && ./gradlew :shared:jvmTest :androidApp:assembleDebug"
7. Open apps/${toolKebab}-mobile in Android Studio, or run "./gradlew :androidApp:installDebug" there.
`);
