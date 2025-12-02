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
import { FileText, Calendar, CheckCircle2, Clock4, HelpCircle } from "lucide-react";
import { DashboardSession, PatientSessionInfo } from "@/app/actions/sessions";
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DualViewPlan } from "@/components/plan/DualViewPlan";
import { useRouter } from "next/navigation";

interface SessionListProps {
  sessions: DashboardSession[];
}

export function SessionList({ sessions }: SessionListProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedPlan, setSelectedPlan] = useState<{ plan: any | null, planId: string | undefined, patientId: string, sessionId: string, transcript?: string | null, sessions?: PatientSessionInfo[] } | null>(null);
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
      if (!session.patient) return;
      const treatmentPlan = session.patient.treatmentPlan;
      const latestVersion = treatmentPlan?.versions[0];

      setSelectedPlan({
          plan: latestVersion?.content || null,
          planId: treatmentPlan?.id,
          patientId: session.patient.id,
          sessionId: session.id,
          transcript: session.transcript,
          sessions: session.patient.sessions,
      });
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
                    const treatmentPlan = session.patient?.treatmentPlan;
                    const hasPlan = treatmentPlan !== null && treatmentPlan !== undefined;
                    const latestVersion = hasPlan ? treatmentPlan.versions[0] : null;

                    return (
                    <TableRow key={session.id}>
                        <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {session.sessionDate ? formatDate(session.sessionDate) : '—'}
                        </div>
                        </TableCell>
                        <TableCell>
                            {session.sessionTime || '—'}
                        </TableCell>
                        <TableCell>
                            {session.patient?.name.split(' - ')[0] || 'Unassigned'}
                        </TableCell>
                        <TableCell>
                        {session.status === 'PROCESSED' ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Processed
                            </Badge>
                        ) : session.status === 'PENDING' ? (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                              <Clock4 className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                              <HelpCircle className="h-3 w-3 mr-1" />
                              Unassigned
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
                              disabled={!session.patient}
                              onClick={() => handleViewPlan(session)}
                          >
                              <FileText className="h-4 w-4 mr-2" />
                              {hasPlan ? 'View Plan' : 'Create Plan'}
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
                        patientId={selectedPlan.patientId}
                        sessionId={selectedPlan.sessionId}
                        transcript={selectedPlan.transcript || ''}
                        sessions={selectedPlan.sessions}
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