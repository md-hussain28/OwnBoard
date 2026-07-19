import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/nextjs-vite";

const mockPath = (file: string) => fileURLToPath(new URL(`./mocks/${file}`, import.meta.url));

const config: StorybookConfig = {
  framework: "@storybook/nextjs-vite",
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  // Serves public/ (including mockServiceWorker.js, required by MSW).
  staticDirs: ["../public"],
  viteFinal: async (config) => {
    const { mergeConfig } = await import("vite");
    // Swap Clerk for a signed-in mock so the real console shell (sidebar,
    // topbar, account footer) renders in stories — see mocks/clerk.tsx.
    return mergeConfig(config, {
      resolve: {
        alias: [
          { find: /^@clerk\/nextjs$/, replacement: mockPath("clerk.tsx") },
          { find: /^@clerk\/ui\/themes$/, replacement: mockPath("clerk-themes.ts") },
        ],
      },
      // The `ai` SDK pulls in Next's compiled @opentelemetry shim, which reads
      // `__dirname` — undefined in Vite's browser bundle. Stub it so ask/chat
      // components (which import from `ai`) can render in stories.
      define: { __dirname: JSON.stringify("/") },
    });
  },
};

export default config;
