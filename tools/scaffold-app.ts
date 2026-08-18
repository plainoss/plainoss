#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";

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

console.log(
  `\n🚀 Scaffolding new PlainOSS standalone tool: "${toolTitle}" (${toolKebab})\n`,
);

// 1. packages/core/src/<toolKebab>/
const coreDir = path.join(rootDir, "packages", "core", "src", toolKebab);
const coreTestDir = path.join(rootDir, "packages", "core", "test");
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
const webDir = path.join(rootDir, "apps", `web-${toolKebab}`);
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
        react: "^19.0.0",
        "react-dom": "^19.0.0",
      },
      devDependencies: {
        "@plainoss/tsconfig": "workspace:*",
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
        "@vitejs/plugin-react": "^4.3.4",
        typescript: "^5.7.0",
        vite: "^6.1.0",
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
        baseUrl: ".",
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
console.log(`✅ Created Standalone Web App: apps/web-${toolKebab}/`);

// 3. apps/mobile-<toolKebab>/
const mobileDir = path.join(rootDir, "apps", `mobile-${toolKebab}`);
const mobileSrcDir = path.join(mobileDir, "src");
fs.mkdirSync(mobileSrcDir, { recursive: true });

fs.writeFileSync(
  path.join(mobileDir, "package.json"),
  JSON.stringify(
    {
      name: `mobile-${toolKebab}`,
      version: "0.1.0",
      private: true,
      main: "index.js",
      scripts: {
        start: "expo start",
        android: "expo start --android",
        ios: "expo start --ios",
        web: "expo start --web",
        typecheck: "tsc --noEmit",
      },
      dependencies: {
        "@plainoss/core": "workspace:*",
        expo: "~52.0.0",
        "expo-status-bar": "~2.0.0",
        react: "18.3.1",
        "react-native": "0.76.7",
      },
      devDependencies: {
        "@plainoss/tsconfig": "workspace:*",
        "@types/react": "~18.3.12",
        typescript: "^5.7.0",
      },
    },
    null,
    2,
  ),
);

fs.writeFileSync(
  path.join(mobileDir, "app.json"),
  JSON.stringify(
    {
      expo: {
        name: toolTitle,
        slug: toolKebab,
        version: "0.1.0",
        orientation: "portrait",
        userInterfaceStyle: "automatic",
        newArchEnabled: true,
        ios: {
          supportsTablet: true,
          bundleIdentifier: `app.plainoss.${toolClean}`,
        },
        android: {
          adaptiveIcon: {
            backgroundColor: "#0a0a0c",
          },
          package: `app.plainoss.${toolClean}`,
        },
      },
    },
    null,
    2,
  ),
);

fs.writeFileSync(
  path.join(mobileDir, "tsconfig.json"),
  JSON.stringify(
    {
      extends: "@plainoss/tsconfig/react-native.json",
      compilerOptions: {
        baseUrl: ".",
        noEmit: true,
      },
      include: ["src", "App.tsx", "index.js"],
    },
    null,
    2,
  ),
);

fs.writeFileSync(
  path.join(mobileDir, "App.tsx"),
  `import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { compute${toolPascal} } from '@plainoss/core/${toolKebab}/index';

export default function App() {
  const [val, setVal] = useState('10');
  const num = parseFloat(val) || 0;
  const result = compute${toolPascal}(num);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.content}>
        <Text style={styles.title}>${toolTitle}</Text>
        <Text style={styles.subtitle}>Free, ad-free utility by PlainOSS</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Input Value</Text>
          <TextInput
            style={styles.input}
            value={val}
            onChangeText={setVal}
            keyboardType="numeric"
          />
          <Text style={styles.resultText}>
            Result: {result}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0c',
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f2f2f4',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#a0a0a8',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#141418',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  label: {
    color: '#f2f2f4',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 8,
    padding: 12,
    color: '#f2f2f4',
    fontSize: 16,
    marginBottom: 16,
  },
  resultText: {
    color: '#3b82f6',
    fontSize: 18,
    fontWeight: '700',
  },
});
`,
);

fs.writeFileSync(
  path.join(mobileDir, "index.js"),
  `import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
`,
);
console.log(`✅ Created Standalone Mobile App: apps/mobile-${toolKebab}/`);

console.log(`
🎉 Successfully scaffolded "${toolTitle}"!
Next steps:
1. Run "pnpm install" to link workspace dependencies.
2. Implement your mathematical engine in packages/core/src/${toolKebab}/index.ts.
3. Test logic: "pnpm --filter @plainoss/core test"
4. Run Web: "pnpm --filter web-${toolKebab} dev"
5. Run Mobile: "pnpm --filter mobile-${toolKebab} start"
`);
