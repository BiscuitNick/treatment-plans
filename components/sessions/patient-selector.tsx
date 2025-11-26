'use client'

import { useState, useEffect } from 'react'
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'

interface Patient {
  id: string
  name: string
}

interface PatientSelectorProps {
  patients: Patient[]
  selectedPatientId: string | null
  onSelect: (patientId: string | null) => void
  onCreateNew: () => void
  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
}

export function PatientSelector({
  patients,
  selectedPatientId,
  onSelect,
  onCreateNew,
  isLoading,
  disabled,
  placeholder = 'Select patient...',
}: PatientSelectorProps) {
  const [open, setOpen] = useState(false)

  const selectedPatient = patients.find((p) => p.id === selectedPatientId)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between',
            !selectedPatient && 'text-muted-foreground'
          )}
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            selectedPatient?.name || placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search patients..." />
          <CommandList>
            <CommandEmpty>No patients found.</CommandEmpty>
            <CommandGroup>
              {patients.map((patient) => (
                <CommandItem
                  key={patient.id}
                  value={patient.name}
                  onSelect={() => {
                    onSelect(patient.id === selectedPatientId ? null : patient.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedPatientId === patient.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {patient.name}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setOpen(false)
                  onCreateNew()
                }}
                className="text-primary"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create New Patient
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
