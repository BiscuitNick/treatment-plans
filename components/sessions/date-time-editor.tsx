'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DateTimeEditorProps {
  sessionId: string
  dateTime: Date | null
  onSave: (sessionId: string, dateTime: Date | null) => Promise<void>
  disabled?: boolean
}

export function DateTimeEditor({ sessionId, dateTime, onSave, disabled }: DateTimeEditorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(dateTime ?? undefined)
  const [selectedTime, setSelectedTime] = useState(() => {
    if (!dateTime) return '09:00'
    return format(dateTime, 'HH:mm')
  })

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      // Preserve the time when changing date
      const [hours, minutes] = selectedTime.split(':').map(Number)
      newDate.setHours(hours, minutes, 0, 0)
    }
    setSelectedDate(newDate)
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value
    setSelectedTime(newTime)

    // Update the selected date with new time
    if (selectedDate) {
      const [hours, minutes] = newTime.split(':').map(Number)
      const newDateTime = new Date(selectedDate)
      newDateTime.setHours(hours, minutes, 0, 0)
      setSelectedDate(newDateTime)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (selectedDate) {
        // Ensure time is applied to the date
        const [hours, minutes] = selectedTime.split(':').map(Number)
        const finalDateTime = new Date(selectedDate)
        finalDateTime.setHours(hours, minutes, 0, 0)
        await onSave(sessionId, finalDateTime)
      } else {
        await onSave(sessionId, null)
      }
      setIsOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  const formatDisplay = () => {
    if (!dateTime) return 'Set date & time'
    return format(dateTime, 'MMM d, yyyy h:mm a')
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 px-2 text-left font-normal',
            !dateTime && 'text-muted-foreground'
          )}
          disabled={disabled || isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            formatDisplay()
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 space-y-3">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
          />
          <div className="px-1 space-y-2">
            <Label htmlFor="time" className="text-sm font-medium">Time</Label>
            <Input
              id="time"
              type="time"
              value={selectedTime}
              onChange={handleTimeChange}
              className="w-full"
            />
          </div>
          <div className="px-1 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
