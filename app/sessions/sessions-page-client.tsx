'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { DatePicker } from '@/components/ui/date-picker'
import { Badge } from '@/components/ui/badge'

import { AddSessionModal } from '@/components/sessions/add-session-modal'
import { SessionsTable, type SessionRow, type SortField, type SortOrder } from '@/components/sessions/sessions-table'
import { TranscriptModal } from '@/components/sessions/transcript-modal'
import { AudioPlayerModal } from '@/components/sessions/audio-player-modal'
import { PatientSelector } from '@/components/sessions/patient-selector'
import { CreatePatientModal } from '@/components/sessions/create-patient-modal'
import { DateEditor, TimeEditor } from '@/components/sessions/date-time-editor'

interface Patient {
  id: string
  name: string
}

interface SessionsPageClientProps {
  userId: string
  initialPatients: Patient[]
}

export function SessionsPageClient({ userId, initialPatients }: SessionsPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // State
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [patients, setPatients] = useState<Patient[]>(initialPatients)
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Pagination & Sorting
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Filters
  const [filterPatientId, setFilterPatientId] = useState<string | null>(null)
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>(undefined)
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>(undefined)
  const [filterHasTranscript, setFilterHasTranscript] = useState<string>('all')
  const [filterHasAudio, setFilterHasAudio] = useState<string>('all')

  // Modals
  const [transcriptModal, setTranscriptModal] = useState<{ isOpen: boolean; session: SessionRow | null }>({
    isOpen: false,
    session: null,
  })
  const [audioModal, setAudioModal] = useState<{ isOpen: boolean; sessionId: string | null }>({
    isOpen: false,
    sessionId: null,
  })
  const [patientSelectorSession, setPatientSelectorSession] = useState<SessionRow | null>(null)
  const [createPatientModal, setCreatePatientModal] = useState(false)
  const [dateEditorSession, setDateEditorSession] = useState<SessionRow | null>(null)
  const [timeEditorSession, setTimeEditorSession] = useState<SessionRow | null>(null)

  // Generation state
  const [generatingSessionId, setGeneratingSessionId] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        sortBy,
        sortOrder,
      })

      if (filterPatientId) params.set('patientId', filterPatientId)
      if (filterDateFrom) params.set('dateFrom', filterDateFrom.toISOString())
      if (filterDateTo) params.set('dateTo', filterDateTo.toISOString())
      if (filterHasTranscript === 'yes') params.set('hasTranscript', 'true')
      if (filterHasTranscript === 'no') params.set('hasTranscript', 'false')
      if (filterHasAudio === 'yes') params.set('hasAudio', 'true')
      if (filterHasAudio === 'no') params.set('hasAudio', 'false')

      const res = await fetch(`/api/sessions?${params}`)
      if (!res.ok) throw new Error('Failed to fetch sessions')

      const data = await res.json()
      setSessions(data.sessions)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setIsLoading(false)
    }
  }, [page, sortBy, sortOrder, filterPatientId, filterDateFrom, filterDateTo, filterHasTranscript, filterHasAudio])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
    setPage(1)
  }

  const handleDateClick = (session: SessionRow) => {
    setDateEditorSession(session)
  }

  const handleTimeClick = (session: SessionRow) => {
    setTimeEditorSession(session)
  }

  const handleAudioClick = (session: SessionRow) => {
    setAudioModal({ isOpen: true, sessionId: session.id })
  }

  const handleTranscriptClick = (session: SessionRow) => {
    setTranscriptModal({ isOpen: true, session })
  }

  const handlePatientClick = (session: SessionRow) => {
    setPatientSelectorSession(session)
  }

  const handleGenerateTranscript = async (session: SessionRow) => {
    if (!session.s3Key) return

    setGeneratingSessionId(session.id)
    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Key: session.s3Key }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Transcription failed')
      }

      const { text } = await res.json()

      // Update the session with the transcript
      await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      })

      fetchSessions()
    } catch (error) {
      console.error('Error generating transcript:', error)
    } finally {
      setGeneratingSessionId(null)
    }
  }

  const handleSaveTranscript = async (sessionId: string, transcript: string) => {
    await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript }),
    })
    fetchSessions()
  }

  const handleSaveDate = async (sessionId: string, date: Date | null) => {
    await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionDate: date?.toISOString() ?? null }),
    })
    setDateEditorSession(null)
    fetchSessions()
  }

  const handleSaveTime = async (sessionId: string, time: string | null) => {
    await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionTime: time }),
    })
    setTimeEditorSession(null)
    fetchSessions()
  }

  const handleSavePatient = async (sessionId: string, patientId: string | null) => {
    await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId }),
    })
    setPatientSelectorSession(null)
    fetchSessions()
  }

  const handlePatientCreated = (patient: Patient) => {
    setPatients([...patients, patient].sort((a, b) => a.name.localeCompare(b.name)))
    setCreatePatientModal(false)
    // If we were assigning to a session, assign this patient
    if (patientSelectorSession) {
      handleSavePatient(patientSelectorSession.id, patient.id)
    }
  }

  const clearFilters = () => {
    setFilterPatientId(null)
    setFilterDateFrom(undefined)
    setFilterDateTo(undefined)
    setFilterHasTranscript('all')
    setFilterHasAudio('all')
    setPage(1)
  }

  const hasActiveFilters =
    filterPatientId ||
    filterDateFrom ||
    filterDateTo ||
    filterHasTranscript !== 'all' ||
    filterHasAudio !== 'all'

  return (
    <div className="container mx-auto py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
          <p className="text-muted-foreground">
            Manage your therapy session recordings and transcripts.
          </p>
        </div>
        <AddSessionModal onSessionsCreated={fetchSessions} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1">
                  Active
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Patient</Label>
                <Select
                  value={filterPatientId || 'all'}
                  onValueChange={(v) => setFilterPatientId(v === 'all' ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All patients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All patients</SelectItem>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date Range</Label>
                <div className="flex gap-2">
                  <DatePicker
                    date={filterDateFrom}
                    onDateChange={setFilterDateFrom}
                    placeholder="From"
                    className="flex-1"
                  />
                  <DatePicker
                    date={filterDateTo}
                    onDateChange={setFilterDateTo}
                    placeholder="To"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Has Transcript</Label>
                <Select value={filterHasTranscript} onValueChange={setFilterHasTranscript}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Has Audio</Label>
                <Select value={filterHasAudio} onValueChange={setFilterHasAudio}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full">
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <div className="flex items-center gap-2">
            {filterPatientId && (
              <Badge variant="secondary" className="gap-1">
                Patient: {patients.find((p) => p.id === filterPatientId)?.name}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setFilterPatientId(null)}
                />
              </Badge>
            )}
            {filterDateFrom && (
              <Badge variant="secondary" className="gap-1">
                From: {filterDateFrom.toLocaleDateString()}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setFilterDateFrom(undefined)}
                />
              </Badge>
            )}
            {filterDateTo && (
              <Badge variant="secondary" className="gap-1">
                To: {filterDateTo.toLocaleDateString()}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setFilterDateTo(undefined)}
                />
              </Badge>
            )}
          </div>
        )}

        <div className="ml-auto text-sm text-muted-foreground">
          {total} session{total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <SessionsTable
        sessions={sessions}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        onDateClick={handleDateClick}
        onTimeClick={handleTimeClick}
        onAudioClick={handleAudioClick}
        onTranscriptClick={handleTranscriptClick}
        onPatientClick={handlePatientClick}
        onGenerateTranscript={handleGenerateTranscript}
        isGenerating={generatingSessionId ?? undefined}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages || isLoading}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Transcript Modal */}
      {transcriptModal.session && (
        <TranscriptModal
          isOpen={transcriptModal.isOpen}
          onClose={() => setTranscriptModal({ isOpen: false, session: null })}
          sessionId={transcriptModal.session.id}
          transcript={transcriptModal.session.transcript || ''}
          onSave={handleSaveTranscript}
        />
      )}

      {/* Audio Player Modal */}
      {audioModal.sessionId && (
        <AudioPlayerModal
          isOpen={audioModal.isOpen}
          onClose={() => setAudioModal({ isOpen: false, sessionId: null })}
          sessionId={audioModal.sessionId}
        />
      )}

      {/* Patient Selector Popover */}
      {patientSelectorSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-6 shadow-lg w-[350px]">
            <h3 className="text-lg font-semibold mb-4">Assign Patient</h3>
            <PatientSelector
              patients={patients}
              selectedPatientId={patientSelectorSession.patient?.id || null}
              onSelect={(patientId) => handleSavePatient(patientSelectorSession.id, patientId)}
              onCreateNew={() => setCreatePatientModal(true)}
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setPatientSelectorSession(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Patient Modal */}
      <CreatePatientModal
        isOpen={createPatientModal}
        onClose={() => setCreatePatientModal(false)}
        userId={userId}
        onPatientCreated={handlePatientCreated}
      />

      {/* Date Editor Popover */}
      {dateEditorSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Edit Session Date</h3>
            <DatePicker
              date={dateEditorSession.sessionDate ? new Date(dateEditorSession.sessionDate) : undefined}
              onDateChange={(date) => handleSaveDate(dateEditorSession.id, date ?? null)}
              placeholder="Select date"
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDateEditorSession(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Time Editor Popover */}
      {timeEditorSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Edit Session Time</h3>
            <input
              type="time"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={timeEditorSession.sessionTime || ''}
              onChange={(e) => handleSaveTime(timeEditorSession.id, e.target.value || null)}
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setTimeEditorSession(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
