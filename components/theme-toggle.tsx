"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { toolbarControl, touchTarget } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function ThemeToggle({ className }: Props) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        touchTarget,
        toolbarControl,
        "size-10 sm:size-9",
        className
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {mounted ? (
        isDark ? (
          <Sun className="size-4 shrink-0" aria-hidden />
        ) : (
          <Moon className="size-4 shrink-0" aria-hidden />
        )
      ) : (
        <Moon className="size-4 shrink-0 opacity-50" aria-hidden />
      )}
    </button>
  );
}
