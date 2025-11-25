"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/redirect";
  const error = searchParams.get("error");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome</CardTitle>
          <CardDescription>
            Sign in to access your treatment plans dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
              {error === "OAuthSignin" && "Error starting sign in flow."}
              {error === "OAuthCallback" && "Error during sign in callback."}
              {error === "OAuthAccountNotLinked" && "This account is already linked to another user."}
              {error === "Callback" && "Error during callback."}
              {error === "Default" && "An error occurred during sign in."}
              {!["OAuthSignin", "OAuthCallback", "OAuthAccountNotLinked", "Callback", "Default"].includes(error) && error}
            </div>
          )}
          <Button
            onClick={() => signIn("cognito", { callbackUrl })}
            className="w-full"
            size="lg"
          >
            Sign in with Cognito
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
