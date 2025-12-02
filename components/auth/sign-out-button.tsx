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
  const handleSignOut = async () => {
    // Sign out from NextAuth and redirect to sign-in page
    await signOut({ callbackUrl: "/auth/signin" });
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSignOut}
      className="gap-2"
    >
      {showIcon && <LogOut className="h-4 w-4" />}
      Sign Out
    </Button>
  );
}
