'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileAudio,
  FileText,
  User,
  Calendar,
  Clock,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SessionRow {
  id: string
  sessionDate: string | null
  sessionTime: string | null
  s3Key: string | null
  transcript: string | null
  patient: {
    id: string
    name: string
  } | null
  createdAt: string
}

export type SortField = 'date' | 'patient' | 'createdAt'
export type SortOrder = 'asc' | 'desc'

interface SessionsTableProps {
  sessions: SessionRow[]
  sortBy: SortField
  sortOrder: SortOrder
  onSort: (field: SortField) => void
  onDateClick: (session: SessionRow) => void
  onTimeClick: (session: SessionRow) => void
  onAudioClick: (session: SessionRow) => void
  onTranscriptClick: (session: SessionRow) => void
  onPatientClick: (session: SessionRow) => void
  onGenerateTranscript: (session: SessionRow) => void
  isGenerating?: string // session id being generated
}

export function SessionsTable({
  sessions,
  sortBy,
  sortOrder,
  onSort,
  onDateClick,
  onTimeClick,
  onAudioClick,
  onTranscriptClick,
  onPatientClick,
  onGenerateTranscript,
  isGenerating,
}: SessionsTableProps) {
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1" />
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    )
  }

  const formatDate = (dateStr: string | null, fallback: string) => {
    if (!dateStr) return fallback
    try {
      return format(new Date(dateStr), 'MMM d, yyyy')
    } catch {
      return fallback
    }
  }

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '—'
    try {
      const [hours, minutes] = timeStr.split(':').map(Number)
      const period = hours >= 12 ? 'PM' : 'AM'
      const displayHours = hours % 12 || 12
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
    } catch {
      return timeStr
    }
  }

  const truncateText = (text: string | null, maxLength: number = 50) => {
    if (!text) return null
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[130px]">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8"
                onClick={() => onSort('date')}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Date
                <SortIcon field="date" />
              </Button>
            </TableHead>
            <TableHead className="w-[100px]">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Time
              </div>
            </TableHead>
            <TableHead className="w-[80px]">
              <div className="flex items-center">
                <FileAudio className="h-4 w-4 mr-1" />
                Audio
              </div>
            </TableHead>
            <TableHead className="min-w-[200px]">
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-1" />
                Transcript
              </div>
            </TableHead>
            <TableHead className="w-[150px]">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8"
                onClick={() => onSort('patient')}
              >
                <User className="h-4 w-4 mr-1" />
                Patient
                <SortIcon field="patient" />
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                No sessions found. Upload some sessions to get started.
              </TableCell>
            </TableRow>
          ) : (
            sessions.map((session) => (
              <TableRow key={session.id}>
                {/* Date */}
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-left font-normal"
                    onClick={() => onDateClick(session)}
                  >
                    {formatDate(session.sessionDate, formatDate(session.createdAt, 'Not set'))}
                  </Button>
                </TableCell>

                {/* Time */}
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-left font-normal"
                    onClick={() => onTimeClick(session)}
                  >
                    {formatTime(session.sessionTime)}
                  </Button>
                </TableCell>

                {/* Audio */}
                <TableCell>
                  {session.s3Key ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => onAudioClick(session)}
                    >
                      <FileAudio className="h-4 w-4 text-blue-500" />
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>

                {/* Transcript */}
                <TableCell>
                  {session.transcript ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto px-2 py-1 text-left font-normal max-w-[300px]"
                      onClick={() => onTranscriptClick(session)}
                    >
                      <span className="truncate text-sm">
                        {truncateText(session.transcript, 60)}
                      </span>
                    </Button>
                  ) : session.s3Key ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => onGenerateTranscript(session)}
                      disabled={isGenerating === session.id}
                    >
                      {isGenerating === session.id ? (
                        <>
                          <Sparkles className="h-4 w-4 mr-1 animate-pulse" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-1" />
                          Generate Transcript
                        </>
                      )}
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>

                {/* Patient */}
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 px-2 text-left font-normal",
                      !session.patient && "text-muted-foreground"
                    )}
                    onClick={() => onPatientClick(session)}
                  >
                    {session.patient?.name || 'Assign patient'}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
