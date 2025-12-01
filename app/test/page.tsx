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

const CLINICIAN_ACCOUNTS = [
  { email: "adam@example.com", name: "Dr. Adam Smith", patients: "Andy, Sarah, Mike" },
  { email: "betty@example.com", name: "Dr. Betty Johnson", patients: "Emma, Frank, Grace" },
  { email: "charlie@example.com", name: "Dr. Charlie Chen", patients: "Henry, Iris, Jack" },
  { email: "diana@example.com", name: "Dr. Diana Martinez", patients: "Kate" },
];

const PATIENT_ACCOUNTS = [
  { email: "andy@example.com", name: "Andy Smith", diagnosis: "F40.10 Social Anxiety", clinician: "Adam" },
  { email: "sarah@example.com", name: "Sarah Johnson", diagnosis: "F41.1 GAD", clinician: "Adam" },
  { email: "mike@example.com", name: "Mike Chen", diagnosis: "F43.21 Adjustment Disorder", clinician: "Adam" },
  { email: "emma@example.com", name: "Emma Davis", diagnosis: "F32.1 Major Depression (Moderate)", clinician: "Betty" },
  { email: "frank@example.com", name: "Frank Wilson", diagnosis: "F41.0 Panic Disorder", clinician: "Betty" },
  { email: "grace@example.com", name: "Grace Lee", diagnosis: "F42.2 OCD", clinician: "Betty" },
  { email: "henry@example.com", name: "Henry Brown", diagnosis: "F33.1 Recurrent Depression", clinician: "Charlie" },
  { email: "iris@example.com", name: "Iris Taylor", diagnosis: "F41.1 GAD", clinician: "Charlie" },
  { email: "jack@example.com", name: "Jack Martinez", diagnosis: "F40.10 Social Anxiety", clinician: "Charlie" },
  { email: "kate@example.com", name: "Kate Thompson", diagnosis: "F32.0 Mild Depression", clinician: "Diana" },
];

const DEFAULT_PASSWORD = "Password123!";

function getRiskBadge(email: string) {
  // Emma has HIGH risk (passive SI)
  if (email === "emma@example.com") {
    return <Badge variant="destructive" className="text-xs">HIGH RISK</Badge>;
  }
  // Several have MEDIUM risk
  if (["sarah@example.com", "mike@example.com", "frank@example.com", "grace@example.com", "henry@example.com"].includes(email)) {
    return <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">MEDIUM</Badge>;
  }
  return <Badge variant="outline" className="text-xs">LOW</Badge>;
}

export default function TestAccountsPage() {
  return (
    <div className="container mx-auto max-w-3xl py-16 px-6 space-y-6">
      {/* Password Card */}
      <Card>
        <CardHeader>
          <CardTitle>Test Accounts</CardTitle>
          <CardDescription>
            Use these credentials to sign in during development and testing.
            All accounts use the same password.
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

      {/* Clinician Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Clinician Accounts
            <Badge variant="secondary">{CLINICIAN_ACCOUNTS.length}</Badge>
          </CardTitle>
          <CardDescription>
            Full access to dashboard, patients, sessions, and treatment plans.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {CLINICIAN_ACCOUNTS.map((account) => (
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
                <p className="text-xs text-muted-foreground mt-1">
                  Patients: {account.patients}
                </p>
              </div>
              <Badge variant="secondary">CLINICIAN</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Patient Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Patient Accounts
            <Badge variant="secondary">{PATIENT_ACCOUNTS.length}</Badge>
          </CardTitle>
          <CardDescription>
            Access to client portal with treatment plan (client view only).
            Each patient has a unique diagnosis and treatment plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {PATIENT_ACCOUNTS.map((account) => (
            <div
              key={account.email}
              className="flex items-start justify-between rounded-lg border p-4 gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{account.name}</p>
                  {getRiskBadge(account.email)}
                </div>
                <div className="flex items-center gap-1">
                  <p className="text-sm text-muted-foreground font-mono truncate">
                    {account.email}
                  </p>
                  <CopyButton text={account.email} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="font-medium">Dx:</span> {account.diagnosis}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Clinician:</span> Dr. {account.clinician}
                </p>
              </div>
              <Badge variant="outline">PATIENT</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Test Data Summary</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-medium">Diagnoses included:</p>
              <ul className="text-muted-foreground text-xs mt-1 space-y-0.5">
                <li>Social Anxiety (F40.10)</li>
                <li>GAD (F41.1)</li>
                <li>Panic Disorder (F41.0)</li>
                <li>OCD (F42.2)</li>
                <li>Major Depression (F32.x)</li>
                <li>Recurrent Depression (F33.x)</li>
                <li>Adjustment Disorder (F43.21)</li>
              </ul>
            </div>
            <div>
              <p className="font-medium">Risk levels:</p>
              <ul className="text-muted-foreground text-xs mt-1 space-y-0.5">
                <li>HIGH: 1 patient (Emma - passive SI)</li>
                <li>MEDIUM: 5 patients</li>
                <li>LOW: 4 patients</li>
              </ul>
              <p className="font-medium mt-3">Special cases:</p>
              <ul className="text-muted-foreground text-xs mt-1 space-y-0.5">
                <li>Emma: Diagnosis hidden from client</li>
                <li>Henry: Goal marked as DEFERRED</li>
                <li>Andy: Goal marked as COMPLETED</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sign In Button */}
      <Button asChild className="w-full" size="lg">
        <Link href="/auth/signin">Go to Sign In</Link>
      </Button>
    </div>
  );
}
