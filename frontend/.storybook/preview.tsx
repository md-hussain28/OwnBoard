import React, { useEffect, useState } from "react";
import type { Decorator, Preview } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { initialize, mswLoader } from "msw-storybook-addon";
import { handlers } from "./mocks/handlers";
import "../src/app/globals.css";

// MSW intercepts the axios calls that services make against `/api/*`, so
// data-driven components render with mock data — no backend (or Next server) needed.
initialize({ onUnhandledRequest: "bypass" });

/** Fresh QueryClient per story so cache/state never leaks between stories. */
function StoryQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false, staleTime: 30_000 },
        },
      }),
  );
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const withQueryClient: Decorator = (Story) => (
  <StoryQueryProvider>
    <Story />
  </StoryQueryProvider>
);

/** Applies the app's `.dark` class theming (see globals.css `@custom-variant dark`). */
function StoryThemeFrame({ theme, children }: { theme: string; children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    document.body.classList.add("bg-background", "text-foreground", "antialiased");
  }, [theme]);
  return <div className="bg-background font-sans text-foreground">{children}</div>;
}

const withTheme: Decorator = (Story, context) => (
  <StoryThemeFrame theme={(context.globals.theme as string) ?? "light"}>
    <Story />
  </StoryThemeFrame>
);

const preview: Preview = {
  parameters: {
    layout: "padded",
    nextjs: { appDirectory: true },
    // Default happy-path mocks for every backend endpoint; stories override
    // `parameters.msw.handlers` to show loading / error / "Incoming" states.
    msw: { handlers },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  globalTypes: {
    theme: {
      description: "App color theme",
      toolbar: {
        title: "Theme",
        icon: "mirror",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light" },
  loaders: [mswLoader],
  decorators: [withQueryClient, withTheme],
};

export default preview;
