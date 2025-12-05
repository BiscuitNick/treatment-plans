"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Suspense } from "react";
import { Loader2, AlertCircle, Copy, Check, Stethoscope, User } from "lucide-react";

const DEMO_PASSWORD = "Password123!";

const DEMO_ACCOUNTS = {
  therapists: [
    { email: "adam@example.com", name: "Dr. Adam Smith" },
    { email: "betty@example.com", name: "Dr. Betty Johnson" },
  ],
  patients: [
    { email: "sarah@example.com", name: "Sarah Johnson" },
    { email: "mike@example.com", name: "Mike Chen" },
  ],
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 rounded transition-colors"
      title={`Copy ${label}`}
    >
      {text}
      {copied ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <Copy className="h-3 w-3 text-slate-400" />
      )}
    </button>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/redirect";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(urlError);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error === "CredentialsSignin"
          ? "Invalid email or password"
          : result.error);
        setIsLoading(false);
      } else if (result?.ok) {
        router.push(callbackUrl);
      }
    } catch {
      setError("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold">SessionSync</CardTitle>
          <CardDescription className="text-base">
            Sign in to access your treatment plans dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t space-y-4">
            <p className="text-sm font-medium text-center text-muted-foreground">Demo Accounts</p>

            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <Stethoscope className="h-3.5 w-3.5" />
                  Therapists
                </div>
                <div className="space-y-1.5">
                  {DEMO_ACCOUNTS.therapists.map((account) => (
                    <div key={account.email} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted-foreground truncate">{account.name}</span>
                      <CopyButton text={account.email} label="email" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <User className="h-3.5 w-3.5" />
                  Patients
                </div>
                <div className="space-y-1.5">
                  {DEMO_ACCOUNTS.patients.map((account) => (
                    <div key={account.email} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted-foreground truncate">{account.name}</span>
                      <CopyButton text={account.email} label="email" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t text-xs">
                <span className="text-muted-foreground">Password (all accounts)</span>
                <CopyButton text={DEMO_PASSWORD} label="password" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}
