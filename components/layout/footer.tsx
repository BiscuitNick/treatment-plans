"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wrench, FlaskConical } from "lucide-react";

export function Footer() {
  const pathname = usePathname();

  // Don't show footer on auth pages
  if (pathname?.startsWith("/auth")) {
    return null;
  }

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto flex h-14 items-center px-4">
        {/* Left section */}
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">
            &copy; 2025 SessionSync. All rights reserved.
          </p>
        </div>
        {/* Center section */}
        <div className="flex items-center justify-center gap-1">
          <Link
            href="/tools"
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <Wrench className="h-4 w-4" />
            Tools
          </Link>
          <Link
            href="/test"
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <FlaskConical className="h-4 w-4" />
            Test
          </Link>
        </div>
        {/* Right section */}
        <div className="flex-1 flex items-center justify-end gap-6">
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
