"use client";

import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  InfoIcon,
  Loader2Icon,
} from "lucide-react";
import { useTheme } from "next-themes";
import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * App-wide toast host. Positioned top-right to stay clear of UploadProgressWidget
 * (bottom-right). Colors follow DESIGN.md semantic tokens via CSS variables.
 */
function Toaster({ ...props }: ToasterProps) {
  const { theme = "light" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      closeButton
      visibleToasts={3}
      duration={4000}
      gap={10}
      icons={{
        success: <CheckCircle2Icon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <AlertTriangleIcon className="size-4" />,
        error: <AlertCircleIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:border-border group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:shadow-soft group-[.toaster]:rounded-xl group-[.toaster]:border",
          title:
            "group-[.toast]:text-sm group-[.toast]:font-semibold group-[.toast]:text-foreground",
          description: "group-[.toast]:text-sm group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:rounded-lg group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:text-xs group-[.toast]:font-semibold",
          cancelButton:
            "group-[.toast]:rounded-lg group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:text-xs group-[.toast]:font-medium",
          closeButton:
            "group-[.toast]:border-border group-[.toast]:bg-background group-[.toast]:text-muted-foreground group-[.toast]:hover:text-foreground",
          success: "[&_[data-icon]]:text-success",
          error: "[&_[data-icon]]:text-destructive",
          warning: "[&_[data-icon]]:text-warning",
          info: "[&_[data-icon]]:text-info",
          loading: "[&_[data-icon]]:text-primary",
        },
      }}
      style={
        {
          "--normal-bg": "var(--background)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border)",
          "--success-bg": "var(--background)",
          "--success-border": "var(--border)",
          "--success-text": "var(--foreground)",
          "--error-bg": "var(--background)",
          "--error-border": "var(--border)",
          "--error-text": "var(--foreground)",
          "--warning-bg": "var(--background)",
          "--warning-border": "var(--border)",
          "--warning-text": "var(--foreground)",
          "--info-bg": "var(--background)",
          "--info-border": "var(--border)",
          "--info-text": "var(--foreground)",
          "--border-radius": "0.75rem",
        } as CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
