"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  Mic,
  Shield,
  Sparkles,
  Users,
  Clock,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: Mic,
    title: "Session Recording",
    description:
      "Upload audio recordings of therapy sessions for automatic transcription and analysis.",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Plan Generation",
    description:
      "Generate comprehensive treatment plans from session transcripts using advanced AI.",
  },
  {
    icon: FileText,
    title: "Dual-View Plans",
    description:
      "Create both clinical documentation and client-friendly summaries from a single session.",
  },
  {
    icon: Shield,
    title: "Safety Screening",
    description:
      "Automatic risk assessment and safety flag detection to support clinical decision-making.",
  },
  {
    icon: Users,
    title: "Patient Management",
    description:
      "Organize sessions and treatment plans by patient for easy tracking and continuity of care.",
  },
  {
    icon: Clock,
    title: "Version History",
    description:
      "Track changes to treatment plans over time with full version history and rollback support.",
  },
];

export default function HomePage() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-24 bg-gradient-to-b from-background to-muted/30">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Streamline Your
            <span className="text-primary"> Treatment Planning</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
            Transform therapy sessions into comprehensive treatment plans with
            AI-powered transcription, analysis, and documentation. Save time and
            improve patient outcomes.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            {isLoading ? (
              <Button size="lg" disabled>
                Loading...
              </Button>
            ) : session ? (
              <Button size="lg" asChild>
                <Link href="/dashboard">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button size="lg" asChild>
                  <Link href="/auth/signin">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/auth/signin">Sign In</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-24 bg-muted/30">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need for treatment planning
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Powerful features designed for mental health professionals
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="border-0 shadow-sm">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to transform your practice?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join therapists who are saving hours on documentation while
            improving care quality.
          </p>
          <div className="mt-10">
            {!session && !isLoading && (
              <Button size="lg" asChild>
                <Link href="/auth/signin">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
            {session && (
              <Button size="lg" asChild>
                <Link href="/dashboard">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
