"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface SignOutButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
}

export function SignOutButton({
  variant = "outline",
  size = "sm",
  showIcon = true
}: SignOutButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => signOut({ callbackUrl: "/" })}
      className="gap-2"
    >
      {showIcon && <LogOut className="h-4 w-4" />}
      Sign Out
    </Button>
  );
}
