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
import { Calendar, Clock, FileText, CheckCircle2, Clock4, HelpCircle } from 'lucide-react'

// Use string type instead of Prisma enum for client component compatibility
type SessionStatusType = 'UNASSIGNED' | 'PENDING' | 'PROCESSED'

interface SessionInfo {
  id: string
  status: SessionStatusType
  sessionDate: Date | null
  sessionTime: string | null
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

function formatDate(date: Date | null): string {
  if (!date) return 'No date'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(time: string | null): string {
  if (!time) return ''
  // Parse HH:mm format and format to 12-hour
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
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
                    {/* Date */}
                    <div className="flex items-center gap-2 text-sm min-w-[120px]">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(session.sessionDate || session.createdAt)}</span>
                    </div>

                    {/* Time */}
                    {session.sessionTime && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{formatTime(session.sessionTime)}</span>
                      </div>
                    )}

                    {/* Status */}
                    <Badge variant={statusConfig.variant} className="gap-1">
                      <StatusIcon className={`h-3 w-3 ${statusConfig.color}`} />
                      {statusConfig.label}
                    </Badge>
                  </div>

                  {/* View Transcript Button */}
                  {session.transcript && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSession(session)}
                      className="gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      View Transcript
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Transcript Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Session Transcript</DialogTitle>
            <DialogDescription>
              {selectedSession && formatDate(selectedSession.sessionDate || selectedSession.createdAt)}
              {selectedSession?.sessionTime && ` at ${formatTime(selectedSession.sessionTime)}`}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {selectedSession?.transcript || 'No transcript available'}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}
