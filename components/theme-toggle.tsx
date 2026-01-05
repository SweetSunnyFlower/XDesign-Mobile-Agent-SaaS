"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      variant="outline"
      size="icon"
      className="relative rounded-full h-8 w-8"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <SunIcon
        className={cn(
          "absolute h-5 w-5 transition",
          isDark ? "scale-100" : "scale-0"
        )}
      />
      <MoonIcon
        className={cn(
          "absolute h-5 w-5 transition",
          isDark ? "scale-0" : "scale-100"
        )}
      />
    </Button>
  );
}
