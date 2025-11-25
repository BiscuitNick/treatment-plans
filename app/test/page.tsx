"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0"
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  );
}

const THERAPIST_ACCOUNTS = [
  { email: "adam@example.com", name: "Dr. Adam Smith", role: "CLINICIAN" },
  { email: "betty@example.com", name: "Dr. Betty Johnson", role: "CLINICIAN" },
  { email: "charlie@example.com", name: "Dr. Charlie Chen", role: "CLINICIAN" },
  { email: "diana@example.com", name: "Diana Admin", role: "ADMIN" },
];

const PATIENT_ACCOUNTS = [
  { email: "pat@example.com", name: "Pat Miller", role: "PATIENT" },
  { email: "quinn@example.com", name: "Quinn Davis", role: "PATIENT" },
  { email: "riley@example.com", name: "Riley Thompson", role: "PATIENT" },
];

const DEFAULT_PASSWORD = "Password123!";

function getRoleBadgeVariant(role: string) {
  switch (role) {
    case "ADMIN":
      return "default";
    case "CLINICIAN":
      return "secondary";
    case "PATIENT":
      return "outline";
    default:
      return "secondary";
  }
}

export default function TestAccountsPage() {
  return (
    <div className="container mx-auto max-w-2xl py-16 px-6 space-y-6">
      {/* Password Card */}
      <Card>
        <CardHeader>
          <CardTitle>Test Accounts</CardTitle>
          <CardDescription>
            Use these credentials to sign in during development and testing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/50 p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Password for all accounts:</p>
              <code className="text-lg font-mono">{DEFAULT_PASSWORD}</code>
            </div>
            <CopyButton text={DEFAULT_PASSWORD} />
          </div>
        </CardContent>
      </Card>

      {/* Therapist Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Therapist Accounts
          </CardTitle>
          <CardDescription>
            Full access to dashboard, patients, sessions, and treatment plans.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {THERAPIST_ACCOUNTS.map((account) => (
            <div
              key={account.email}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium">{account.name}</p>
                <div className="flex items-center gap-1">
                  <p className="text-sm text-muted-foreground font-mono truncate">
                    {account.email}
                  </p>
                  <CopyButton text={account.email} />
                </div>
              </div>
              <Badge variant={getRoleBadgeVariant(account.role)}>
                {account.role}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Patient Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Patient Accounts
          </CardTitle>
          <CardDescription>
            Limited access to view their own treatment plan (client view only).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {PATIENT_ACCOUNTS.map((account) => (
            <div
              key={account.email}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium">{account.name}</p>
                <div className="flex items-center gap-1">
                  <p className="text-sm text-muted-foreground font-mono truncate">
                    {account.email}
                  </p>
                  <CopyButton text={account.email} />
                </div>
              </div>
              <Badge variant={getRoleBadgeVariant(account.role)}>
                {account.role}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Sign In Button */}
      <Button asChild className="w-full" size="lg">
        <Link href="/auth/signin">Go to Sign In</Link>
      </Button>
    </div>
  );
}
