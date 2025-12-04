'use client'

import { useState, useEffect } from 'react'
import { Loader2, Pencil, Save, X } from 'lucide-react'

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

interface SummaryModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string
  summary: string
  onSave: (sessionId: string, summary: string) => Promise<void>
}

export function SummaryModal({
  isOpen,
  onClose,
  sessionId,
  summary,
  onSave,
}: SummaryModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedSummary, setEditedSummary] = useState(summary)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setEditedSummary(summary)
    setIsEditing(false)
  }, [summary, sessionId])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(sessionId, editedSummary)
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedSummary(summary)
    setIsEditing(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Session Summary</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Edit the summary below and click save when done.'
              : 'View the session summary.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isEditing ? (
            <Textarea
              value={editedSummary}
              onChange={(e) => setEditedSummary(e.target.value)}
              className="min-h-[150px] text-sm"
              placeholder="Enter summary..."
            />
          ) : (
            <div className="rounded-md border p-4">
              <p className="whitespace-pre-wrap text-sm">{summary}</p>
            </div>
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
