'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, FileAudio, FileText, Loader2, Upload, CheckCircle, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  FileDropZone,
  FileDropZoneArea,
  FileDropZoneContent,
  FileDropZoneList,
  type FileWithMeta,
} from '@/components/ui/file-drop-zone'
import { PatientSelector } from '@/components/sessions/patient-selector'

interface Patient {
  id: string
  name: string
}

interface AddSessionModalProps {
  patients: Patient[]
  onSessionsCreated?: () => void
  onCreatePatient?: () => void
}

type UploadStatus = 'idle' | 'uploading' | 'transcribing' | 'complete' | 'error'

interface FileUploadProgress {
  fileId: string
  fileName: string
  status: UploadStatus
  progress: number
  sessionId?: string
  error?: string
}

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const MAX_FILES = 5
const ACCEPTED_AUDIO_TYPES = 'audio/mpeg,audio/wav,audio/mp4,audio/x-m4a,audio/webm,audio/ogg,audio/flac,audio/aac'
const ACCEPTED_TEXT_TYPES = 'text/plain,text/markdown,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const ACCEPTED_TYPES = `${ACCEPTED_AUDIO_TYPES},${ACCEPTED_TEXT_TYPES}`

export function AddSessionModal({ patients, onSessionsCreated, onCreatePatient }: AddSessionModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'upload' | 'manual'>('upload')
  const [autoTranscribe, setAutoTranscribe] = useState(false)
  const [files, setFiles] = useState<FileWithMeta[]>([])
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Shared optional fields for both upload and manual
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  // Default to current date/time in local datetime format
  const [sessionDateTime, setSessionDateTime] = useState<string>(() => {
    const now = new Date()
    return now.toISOString().slice(0, 16) // Format: YYYY-MM-DDTHH:mm
  })

  // Manual entry state
  const [sessionSummary, setSessionSummary] = useState('')
  const [manualTranscript, setManualTranscript] = useState('')

  const router = useRouter()

  const handleFilesChange = (newFiles: FileWithMeta[]) => {
    setFiles(newFiles)
    setError(null)
  }

  const resetState = useCallback(() => {
    setFiles([])
    setUploadProgress([])
    setIsProcessing(false)
    setError(null)
    setSessionSummary('')
    setManualTranscript('')
    setSelectedPatientId(null)
    setSessionDateTime(new Date().toISOString().slice(0, 16))
    setActiveTab('upload')
    setAutoTranscribe(false)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    resetState()
  }, [resetState])

  const isAudioFile = (file: File) => {
    return file.type.startsWith('audio/') || file.type.startsWith('video/')
  }

  const isTextFile = (file: File) => {
    return (
      file.type.startsWith('text/') ||
      file.type === 'application/pdf' ||
      file.type === 'application/msword' ||
      file.type.includes('document')
    )
  }

  const readTextFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  const uploadFileToS3 = async (file: File): Promise<string> => {
    // Get presigned URL
    const uploadRes = await fetch('/api/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    })

    if (!uploadRes.ok) {
      throw new Error('Failed to get upload URL')
    }

    const { uploadUrl, s3Key } = await uploadRes.json()

    // Upload to S3
    const s3Res = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    })

    if (!s3Res.ok) {
      throw new Error('Failed to upload file to storage')
    }

    return s3Key
  }

  const transcribeAudio = async (s3Key: string): Promise<string> => {
    const transcribeRes = await fetch('/api/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ s3Key }),
    })

    if (!transcribeRes.ok) {
      const errData = await transcribeRes.json().catch(() => ({}))
      throw new Error(errData.error || 'Transcription failed')
    }

    const { text } = await transcribeRes.json()
    return text
  }

  const createSession = async (data: {
    summary?: string
    transcript?: string
    s3Key?: string
    audioUrl?: string
    sessionDate?: string
    patientId?: string
  }) => {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessions: [data] }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.error || 'Failed to create session')
    }

    const { sessions } = await res.json()
    return sessions[0]
  }

  // Helper to get ISO string from datetime-local input
  const getSessionDateTimeISO = (): string | undefined => {
    if (!sessionDateTime) return undefined
    return new Date(sessionDateTime).toISOString()
  }

  const handleUploadFiles = async () => {
    if (files.length === 0) return

    setIsProcessing(true)
    setError(null)

    // Initialize progress for all files
    const initialProgress: FileUploadProgress[] = files.map((f) => ({
      fileId: f.id,
      fileName: f.file.name,
      status: 'idle',
      progress: 0,
    }))
    setUploadProgress(initialProgress)

    const updateFileProgress = (fileId: string, updates: Partial<FileUploadProgress>) => {
      setUploadProgress((prev) =>
        prev.map((p) => (p.fileId === fileId ? { ...p, ...updates } : p))
      )
    }

    let hasErrors = false

    for (const fileWithMeta of files) {
      const file = fileWithMeta.file

      try {
        if (isAudioFile(file)) {
          // Audio file: upload to S3, optionally transcribe
          updateFileProgress(fileWithMeta.id, { status: 'uploading', progress: 30 })

          const s3Key = await uploadFileToS3(file)
          updateFileProgress(fileWithMeta.id, { progress: 60 })

          let transcript: string | undefined

          if (autoTranscribe) {
            updateFileProgress(fileWithMeta.id, { status: 'transcribing', progress: 70 })
            transcript = await transcribeAudio(s3Key)
            updateFileProgress(fileWithMeta.id, { progress: 90 })
          }

          const session = await createSession({
            s3Key,
            transcript,
            patientId: selectedPatientId || undefined,
            sessionDate: getSessionDateTimeISO(),
          })

          updateFileProgress(fileWithMeta.id, {
            status: 'complete',
            progress: 100,
            sessionId: session.id,
          })
        } else if (isTextFile(file)) {
          // Text file: read content and create session
          updateFileProgress(fileWithMeta.id, { status: 'uploading', progress: 50 })

          const content = await readTextFile(file)

          const session = await createSession({
            transcript: content,
            patientId: selectedPatientId || undefined,
            sessionDate: getSessionDateTimeISO(),
          })

          updateFileProgress(fileWithMeta.id, {
            status: 'complete',
            progress: 100,
            sessionId: session.id,
          })
        } else {
          throw new Error(`Unsupported file type: ${file.type}`)
        }
      } catch (err) {
        hasErrors = true
        updateFileProgress(fileWithMeta.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    setIsProcessing(false)

    if (!hasErrors) {
      onSessionsCreated?.()
      router.refresh()
      // Keep modal open briefly to show success
      setTimeout(() => {
        handleClose()
      }, 1500)
    }
  }

  const handleManualSubmit = async () => {
    if (!sessionSummary.trim()) {
      setError('Please enter a summary')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      await createSession({
        summary: sessionSummary.trim(),
        transcript: manualTranscript.trim() || undefined,
        patientId: selectedPatientId || undefined,
        sessionDate: getSessionDateTimeISO(),
      })

      onSessionsCreated?.()
      router.refresh()
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session')
    } finally {
      setIsProcessing(false)
    }
  }

  const allFilesComplete = uploadProgress.length > 0 && uploadProgress.every((p) => p.status === 'complete')
  const hasUploadErrors = uploadProgress.some((p) => p.status === 'error')

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && isProcessing) return // Prevent closing during processing
        setIsOpen(open)
        if (!open) resetState()
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Session(s)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Add Session(s)</DialogTitle>
          <DialogDescription>
            Upload audio or text files, or manually enter a transcript.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upload' | 'manual')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" disabled={isProcessing}>
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="manual" disabled={isProcessing}>
              <FileText className="h-4 w-4 mr-2" />
              Manual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4 mt-4">
            {uploadProgress.length === 0 ? (
              <>
                <FileDropZone
                  files={files}
                  onFilesChange={handleFilesChange}
                  accept={ACCEPTED_TYPES}
                  multiple={true}
                  maxFiles={MAX_FILES}
                  maxSize={MAX_FILE_SIZE}
                >
                  <FileDropZoneArea className="min-h-32">
                    <FileDropZoneContent>
                      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
                        <FileAudio className="text-muted-foreground size-6" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium">
                          Drag & drop files here
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Audio (mp3, wav, m4a) or text (txt, md, pdf) - up to {MAX_FILES} files, {MAX_FILE_SIZE / 1024 / 1024}MB each
                        </p>
                      </div>
                    </FileDropZoneContent>
                  </FileDropZoneArea>
                  <FileDropZoneList />
                </FileDropZone>

                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-transcribe" className="text-sm text-muted-foreground">
                    Auto transcribe audio files
                  </Label>
                  <Switch
                    id="auto-transcribe"
                    checked={autoTranscribe}
                    onCheckedChange={setAutoTranscribe}
                  />
                </div>

                {/* Optional fields for upload */}
                <div className="space-y-3 pt-2 border-t">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Patient (optional)</Label>
                    <PatientSelector
                      patients={patients}
                      selectedPatientId={selectedPatientId}
                      onSelect={setSelectedPatientId}
                      onCreateNew={onCreatePatient || (() => {})}
                      disabled={isProcessing}
                      placeholder="Assign to patient..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="upload-datetime" className="text-sm text-muted-foreground">Date & Time</Label>
                    <Input
                      id="upload-datetime"
                      type="datetime-local"
                      value={sessionDateTime}
                      onChange={(e) => setSessionDateTime(e.target.value)}
                      disabled={isProcessing}
                      className="w-full"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                {uploadProgress.map((fp) => (
                  <div key={fp.fileId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate max-w-[300px]">
                        {fp.fileName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {fp.status === 'uploading' && 'Uploading...'}
                        {fp.status === 'transcribing' && 'Transcribing...'}
                        {fp.status === 'complete' && (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> Complete
                          </span>
                        )}
                        {fp.status === 'error' && (
                          <span className="text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> Error
                          </span>
                        )}
                      </span>
                    </div>
                    <Progress value={fp.progress} className="h-1" />
                    {fp.error && (
                      <p className="text-xs text-destructive">{fp.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="summary">Summary</Label>
              <Textarea
                id="summary"
                placeholder="Brief summary of the session..."
                value={sessionSummary}
                onChange={(e) => setSessionSummary(e.target.value)}
                className="min-h-[80px]"
                disabled={isProcessing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transcript">Transcript (optional)</Label>
              <Textarea
                id="transcript"
                placeholder="Full session transcript or detailed notes..."
                value={manualTranscript}
                onChange={(e) => setManualTranscript(e.target.value)}
                className="min-h-[120px]"
                disabled={isProcessing}
              />
            </div>

            {/* Optional fields for manual entry */}
            <div className="space-y-3 pt-2 border-t">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Patient (optional)</Label>
                <PatientSelector
                  patients={patients}
                  selectedPatientId={selectedPatientId}
                  onSelect={setSelectedPatientId}
                  onCreateNew={onCreatePatient || (() => {})}
                  disabled={isProcessing}
                  placeholder="Assign to patient..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-datetime" className="text-sm text-muted-foreground">Date & Time</Label>
                <Input
                  id="manual-datetime"
                  type="datetime-local"
                  value={sessionDateTime}
                  onChange={(e) => setSessionDateTime(e.target.value)}
                  disabled={isProcessing}
                  className="w-full"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            Cancel
          </Button>
          {activeTab === 'upload' ? (
            allFilesComplete ? (
              <Button onClick={handleClose}>Done</Button>
            ) : hasUploadErrors ? (
              <Button onClick={resetState}>Try Again</Button>
            ) : (
              <Button
                onClick={handleUploadFiles}
                disabled={files.length === 0 || isProcessing}
              >
                {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isProcessing ? 'Processing...' : `Add ${files.length} Session${files.length !== 1 ? 's' : ''}`}
              </Button>
            )
          ) : (
            <Button
              onClick={handleManualSubmit}
              disabled={!sessionSummary.trim() || isProcessing}
            >
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Session
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
