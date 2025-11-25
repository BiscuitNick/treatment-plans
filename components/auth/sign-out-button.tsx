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
    // Sign out from NextAuth first
    await signOut({ redirect: false });

    // Redirect to Cognito logout to clear Cognito session
    const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
    const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
    const logoutUri = encodeURIComponent(window.location.origin);

    if (cognitoDomain && clientId) {
      window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${logoutUri}`;
    } else {
      window.location.href = "/";
    }
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
