'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, Clock, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'

interface DateEditorProps {
  sessionId: string
  date: Date | null
  onSave: (sessionId: string, date: Date | null) => Promise<void>
  disabled?: boolean
}

export function DateEditor({ sessionId, date, onSave, disabled }: DateEditorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(date ?? undefined)

  const handleSelect = async (newDate: Date | undefined) => {
    setSelectedDate(newDate)
    setIsSaving(true)
    try {
      await onSave(sessionId, newDate ?? null)
      setIsOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 px-2 text-left font-normal',
            !date && 'text-muted-foreground'
          )}
          disabled={disabled || isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : date ? (
            format(date, 'MMM d, yyyy')
          ) : (
            'Set date'
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

interface TimeEditorProps {
  sessionId: string
  time: string | null
  onSave: (sessionId: string, time: string | null) => Promise<void>
  disabled?: boolean
}

export function TimeEditor({ sessionId, time, onSave, disabled }: TimeEditorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedTime, setSelectedTime] = useState(time ?? '')

  const formatTimeDisplay = (timeStr: string | null) => {
    if (!timeStr) return 'Set time'
    try {
      const [hours, minutes] = timeStr.split(':').map(Number)
      const period = hours >= 12 ? 'PM' : 'AM'
      const displayHours = hours % 12 || 12
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
    } catch {
      return timeStr
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(sessionId, selectedTime || null)
      setIsOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 px-2 text-left font-normal',
            !time && 'text-muted-foreground'
          )}
          disabled={disabled || isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            formatTimeDisplay(time)
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="flex flex-col gap-2">
          <Input
            type="time"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
          />
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
