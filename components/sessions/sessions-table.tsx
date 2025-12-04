'use client'

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
  Sparkles,
  FileDigit,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SessionRow {
  id: string
  sessionDate: string | null
  s3Key: string | null
  transcript: string | null
  summary: string | null
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
  onDateTimeClick: (session: SessionRow) => void
  onAudioClick: (session: SessionRow) => void
  onTranscriptClick: (session: SessionRow) => void
  onSummaryClick: (session: SessionRow) => void
  onPatientClick: (session: SessionRow) => void
  onGenerateTranscript: (session: SessionRow) => void
  onGenerateSummary: (session: SessionRow) => void
  isGenerating?: string // session id being generated (transcript)
  isGeneratingSummary?: string // session id being generated (summary)
}

export function SessionsTable({
  sessions,
  sortBy,
  sortOrder,
  onSort,
  onDateTimeClick,
  onAudioClick,
  onTranscriptClick,
  onSummaryClick,
  onPatientClick,
  onGenerateTranscript,
  onGenerateSummary,
  isGenerating,
  isGeneratingSummary,
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

  const formatDateTimeParts = (dateStr: string | null, fallbackDateStr: string | null) => {
    const dateToUse = dateStr || fallbackDateStr
    if (!dateToUse) return { date: 'Not set', time: '' }
    try {
      const date = new Date(dateToUse)
      return {
        date: format(date, 'MMM d yyyy'),
        time: format(date, 'h:mm a')
      }
    } catch {
      return { date: 'Not set', time: '' }
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
            <TableHead className="w-[180px]">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8"
                onClick={() => onSort('date')}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Date & Time
                <SortIcon field="date" />
              </Button>
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
            <TableHead className="min-w-[150px]">
              <div className="flex items-center">
                <FileDigit className="h-4 w-4 mr-1" />
                Summary
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
                {/* Date & Time */}
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-left font-normal"
                    onClick={() => onDateTimeClick(session)}
                  >
                    <span className="inline-block w-[90px]">{formatDateTimeParts(session.sessionDate, session.createdAt).date}</span>
                    <span className="text-muted-foreground">{formatDateTimeParts(session.sessionDate, session.createdAt).time}</span>
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

                {/* Summary */}
                <TableCell>
                  {session.summary ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto px-2 py-1 text-left font-normal max-w-[200px]"
                      onClick={() => onSummaryClick(session)}
                    >
                      <span className="truncate text-sm">
                        {truncateText(session.summary, 40)}
                      </span>
                    </Button>
                  ) : session.transcript ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => onGenerateSummary(session)}
                      disabled={isGeneratingSummary === session.id}
                    >
                      {isGeneratingSummary === session.id ? (
                        <>
                          <Sparkles className="h-4 w-4 mr-1 animate-pulse" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-1" />
                          Generate
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
