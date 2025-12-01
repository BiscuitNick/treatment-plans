"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

export function Footer() {
  const pathname = usePathname();

  // Don't show footer on auth pages
  if (pathname?.startsWith("/auth")) {
    return null;
  }

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <p className="text-sm text-muted-foreground">
          &copy; 2025 SessionSync. All rights reserved.
        </p>
        <div className="flex items-center gap-6">
          <Link
            href="/privacy"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Terms
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
