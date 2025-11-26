'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar } from "lucide-react";
import { DashboardSession } from "@/app/actions/sessions";
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DualViewPlan } from "@/components/plan/DualViewPlan";
import { useRouter } from "next/navigation";

interface SessionListProps {
  sessions: DashboardSession[];
}

export function SessionList({ sessions }: SessionListProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedPlan, setSelectedPlan] = useState<{ plan: any, planId: string, sessionId: string, transcript?: string | null } | null>(null);
  const router = useRouter();

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date));
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(new Date(date));
  };

  const handleViewPlan = (session: DashboardSession) => {
      const treatmentPlan = session.patient.treatmentPlan;
      const latestVersion = treatmentPlan?.versions[0];

      if (treatmentPlan && latestVersion) {
          setSelectedPlan({
              plan: latestVersion.content,
              planId: treatmentPlan.id,
              sessionId: session.id,
              transcript: session.transcript
          });
      }
  };

  return (
    <>
        <Card>
        <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
            <CardDescription>
            Manage your patient sessions and treatment plans.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Patient/User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Latest Plan</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sessions.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    No sessions found. Upload one to get started.
                    </TableCell>
                </TableRow>
                ) : (
                sessions.map((session) => {
                    const treatmentPlan = session.patient.treatmentPlan;
                    const hasPlan = treatmentPlan !== null;
                    const latestVersion = hasPlan ? treatmentPlan.versions[0] : null;

                    return (
                    <TableRow key={session.id}>
                        <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {formatDate(session.createdAt)}
                        </div>
                        </TableCell>
                        <TableCell>
                            {formatTime(session.createdAt)}
                        </TableCell>
                        <TableCell>
                            {session.patient.name.split(' - ')[0]}
                        </TableCell>
                        <TableCell>
                        {session.suggestion?.status === 'APPROVED' || session.suggestion?.status === 'MODIFIED' ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Processed
                            </Badge>
                        ) : hasPlan ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Has Plan
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                            New
                            </Badge>
                        )}
                        </TableCell>
                        <TableCell>
                        {hasPlan ? (
                            <span className="text-xs text-muted-foreground">
                            v{latestVersion?.version} • {formatDate(latestVersion?.createdAt || new Date())}
                            </span>
                        ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                        )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                              variant="ghost"
                              size="sm"
                              disabled={!hasPlan}
                              onClick={() => handleViewPlan(session)}
                          >
                              <FileText className="h-4 w-4 mr-2" />
                              View Plan
                          </Button>
                        </TableCell>
                    </TableRow>
                    );
                })
                )}
            </TableBody>
            </Table>
        </CardContent>
        </Card>

        {/* View/Edit Plan Dialog */}
        <Dialog open={!!selectedPlan} onOpenChange={(open) => {
            if (!open) {
                setSelectedPlan(null);
                router.refresh(); // Refresh list to show updated version/time if changed
            }
        }}>
            <DialogContent className="w-[90vw] max-w-[1200px] max-h-[calc(100vh-2rem)] overflow-y-auto overflow-x-hidden p-6">
                <DialogHeader>
                    <DialogTitle>Treatment Plan Details</DialogTitle>
                </DialogHeader>
                {selectedPlan && (
                    <DualViewPlan
                        plan={selectedPlan.plan}
                        planId={selectedPlan.planId}
                        sessionId={selectedPlan.sessionId}
                        transcript={selectedPlan.transcript || ''}
                        onPlanUpdated={() => {
                             console.log("Plan updated successfully");
                        }}
                    />
                )}
            </DialogContent>
        </Dialog>

    </>
  );
}