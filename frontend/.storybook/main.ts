import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  framework: "@storybook/nextjs-vite",
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  // Serves public/ (including mockServiceWorker.js, required by MSW).
  staticDirs: ["../public"],
};

export default config;
