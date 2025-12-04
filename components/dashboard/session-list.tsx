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
import Link from "next/link";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

interface SessionListProps {
  sessions: DashboardSession[];
}

export function SessionList({ sessions }: SessionListProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedPlan, setSelectedPlan] = useState<{ plan: any | null, planId: string | undefined, patientId: string, sessionId: string, transcript?: string | null, sessions?: PatientSessionInfo[] } | null>(null);
  const router = useRouter();

  // Date & Time editor state
  const [dateTimeEditorSession, setDateTimeEditorSession] = useState<DashboardSession | null>(null);
  const [editingDateTime, setEditingDateTime] = useState<Date | undefined>(undefined);
  const [editingTime, setEditingTime] = useState<string>('09:00');

  const formatDateTimeParts = (date: Date | string | null) => {
    if (!date) return { date: '—', time: '' };
    const d = new Date(date);
    return {
      date: new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(d).replace(',', ''),
      time: new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(d),
    };
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return '—';
    const d = new Date(date);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
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

  const handleDateTimeClick = (session: DashboardSession) => {
    setDateTimeEditorSession(session);
    if (session.sessionDate) {
      const date = new Date(session.sessionDate);
      setEditingDateTime(date);
      setEditingTime(format(date, 'HH:mm'));
    } else {
      setEditingDateTime(undefined);
      setEditingTime('09:00');
    }
  };

  const handleSaveDateTime = async () => {
    if (!dateTimeEditorSession) return;

    let finalDateTime: Date | null = null;
    if (editingDateTime) {
      const [hours, minutes] = editingTime.split(':').map(Number);
      finalDateTime = new Date(editingDateTime);
      finalDateTime.setHours(hours, minutes, 0, 0);
    }

    await fetch(`/api/sessions/${dateTimeEditorSession.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionDate: finalDateTime?.toISOString() ?? null }),
    });
    setDateTimeEditorSession(null);
    router.refresh();
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
                <TableHead>Date & Time</TableHead>
                <TableHead>Patient/User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Latest Plan</TableHead>
                <TableHead className="text-right">Plan</TableHead>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-left font-medium -ml-2"
                          onClick={() => handleDateTimeClick(session)}
                        >
                            <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                            <span className="inline-block w-[85px]">{formatDateTimeParts(session.sessionDate).date}</span>
                            <span className="text-muted-foreground">{formatDateTimeParts(session.sessionDate).time}</span>
                        </Button>
                        </TableCell>
                        <TableCell>
                            {session.patient ? (
                              <Link
                                href={`/patients/${session.patient.id}`}
                                className="hover:underline text-primary"
                              >
                                {session.patient.name.split(' - ')[0]}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">Unassigned</span>
                            )}
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
                              {hasPlan ? 'View' : 'Create'}
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

        {/* Date & Time Editor Modal */}
        {dateTimeEditorSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-background rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-4">Edit Session Date & Time</h3>
              <div className="space-y-4">
                <CalendarComponent
                  mode="single"
                  selected={editingDateTime}
                  onSelect={(date) => setEditingDateTime(date)}
                  initialFocus
                />
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={editingTime}
                    onChange={(e) => setEditingTime(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setDateTimeEditorSession(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveDateTime}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}

    </>
  );
}
