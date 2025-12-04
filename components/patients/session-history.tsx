'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Calendar, FileText, CheckCircle2, Clock4, HelpCircle } from 'lucide-react'

// Use string type instead of Prisma enum for client component compatibility
type SessionStatusType = 'UNASSIGNED' | 'PENDING' | 'PROCESSED'

interface SessionInfo {
  id: string
  status: SessionStatusType
  sessionDate: Date | null
  summary: string | null
  transcript: string | null
  createdAt: Date
}

interface SessionHistoryProps {
  sessions: SessionInfo[]
}

function getStatusConfig(status: SessionStatusType) {
  switch (status) {
    case 'PROCESSED':
      return {
        label: 'Processed',
        variant: 'default' as const,
        icon: CheckCircle2,
        color: 'text-green-600',
      }
    case 'PENDING':
      return {
        label: 'Pending',
        variant: 'secondary' as const,
        icon: Clock4,
        color: 'text-yellow-600',
      }
    case 'UNASSIGNED':
      return {
        label: 'Unassigned',
        variant: 'outline' as const,
        icon: HelpCircle,
        color: 'text-gray-500',
      }
    default:
      return {
        label: status,
        variant: 'outline' as const,
        icon: HelpCircle,
        color: 'text-gray-500',
      }
  }
}

function formatDateTime(date: Date | null): string {
  if (!date) return 'No date'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function SessionHistory({ sessions }: SessionHistoryProps) {
  const [selectedSession, setSelectedSession] = useState<SessionInfo | null>(null)

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Session History</CardTitle>
          <CardDescription>No sessions recorded yet</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Session History</CardTitle>
          <CardDescription>
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} recorded
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sessions.map((session) => {
              const statusConfig = getStatusConfig(session.status)
              const StatusIcon = statusConfig.icon

              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Date & Time */}
                    <div className="flex items-center gap-2 text-sm min-w-[180px]">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDateTime(session.sessionDate || session.createdAt)}</span>
                    </div>

                    {/* Status */}
                    <Badge variant={statusConfig.variant} className="gap-1">
                      <StatusIcon className={`h-3 w-3 ${statusConfig.color}`} />
                      {statusConfig.label}
                    </Badge>
                  </div>

                  {/* View Details Button */}
                  {(session.summary || session.transcript) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSession(session)}
                      className="gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      View Details
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Session Details Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Session Details</DialogTitle>
            <DialogDescription>
              {selectedSession && formatDateTime(selectedSession.sessionDate || selectedSession.createdAt)}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Summary Section */}
              {selectedSession?.summary && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Summary</h4>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/50 p-4 rounded-lg">
                    {selectedSession.summary}
                  </div>
                </div>
              )}

              {/* Transcript Section */}
              {selectedSession?.transcript && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Transcript</h4>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/30 p-4 rounded-lg border">
                    {selectedSession.transcript}
                  </div>
                </div>
              )}

              {/* Fallback if neither */}
              {!selectedSession?.summary && !selectedSession?.transcript && (
                <p className="text-muted-foreground italic">No details available</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}
