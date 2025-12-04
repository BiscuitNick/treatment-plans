'use client'

import { useState, useEffect } from 'react'
import { Loader2, Pencil, Save, X, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'

interface TranscriptModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string
  transcript: string
  onSave: (sessionId: string, transcript: string) => Promise<void>
  onDelete?: (sessionId: string) => Promise<void>
}

export function TranscriptModal({
  isOpen,
  onClose,
  sessionId,
  transcript,
  onSave,
  onDelete,
}: TranscriptModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTranscript, setEditedTranscript] = useState(transcript)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    setEditedTranscript(transcript)
    setIsEditing(false)
  }, [transcript, sessionId])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(sessionId, editedTranscript)
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedTranscript(transcript)
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (!onDelete) return
    if (!confirm('Are you sure you want to delete this transcript? This action cannot be undone.')) {
      return
    }
    setIsDeleting(true)
    try {
      await onDelete(sessionId)
      onClose()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Session Transcript</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Edit the transcript below and click save when done.'
              : 'View the full session transcript.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isEditing ? (
            <Textarea
              value={editedTranscript}
              onChange={(e) => setEditedTranscript(e.target.value)}
              className="min-h-[400px] font-mono text-sm"
              placeholder="Enter transcript..."
            />
          ) : (
            <ScrollArea className="h-[400px] rounded-md border p-4">
              <p className="whitespace-pre-wrap text-sm">{transcript}</p>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </>
          ) : (
            <>
              {onDelete && (
                <Button
                  variant="ghost"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 mr-auto"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete Transcript
                </Button>
              )}
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
