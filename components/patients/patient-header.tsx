'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, User, Calendar, Activity, Mail, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updatePatient } from '@/app/actions/patients'

interface PatientData {
  id: string
  name: string
  age: number | null
  gender: string | null
  diagnosis: string | null
  notes: string | null
  status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED'
  createdAt: Date
  sessionsCount: number
}

interface PatientHeaderProps {
  patient: PatientData
  userId: string
}

const genderOptions = ['Male', 'Female', 'Non-binary', 'Other', 'Prefer not to say']

export function PatientHeader({ patient, userId }: PatientHeaderProps) {
  const router = useRouter()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [name, setName] = useState(patient.name)
  const [age, setAge] = useState<string>(patient.age?.toString() ?? '')
  const [gender, setGender] = useState<string>(patient.gender ?? '')
  const [diagnosis, setDiagnosis] = useState(patient.diagnosis ?? '')
  const [notes, setNotes] = useState(patient.notes ?? '')
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'TERMINATED'>(patient.status)

  // Generate demo email from patient name
  const generateDemoEmail = (name: string) => {
    const firstName = name.split(' ')[0].toLowerCase()
    return `${firstName}@example.com`
  }

  const handleOpenEdit = () => {
    // Reset form to current values
    setName(patient.name)
    setAge(patient.age?.toString() ?? '')
    setGender(patient.gender ?? '')
    setDiagnosis(patient.diagnosis ?? '')
    setNotes(patient.notes ?? '')
    setStatus(patient.status)
    setIsEditOpen(true)
  }

  const handleSave = async () => {
    setIsSubmitting(true)
    try {
      const validGender = gender as 'Male' | 'Female' | 'Non-binary' | 'Other' | 'Prefer not to say' | null
      const result = await updatePatient(patient.id, userId, {
        name: name.trim() || undefined,
        age: age ? parseInt(age, 10) : null,
        gender: validGender || null,
        diagnosis: diagnosis.trim() || null,
        notes: notes.trim() || null,
        status,
      })

      if (result.success) {
        setIsEditOpen(false)
        router.refresh()
      } else {
        console.error('Failed to update patient:', result.error)
      }
    } catch (error) {
      console.error('Error updating patient:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Header with Demographics */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        {/* Left side: Name with edit icon */}
        <div className="flex items-start gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{patient.name}</h1>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleOpenEdit}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Patient Profile</p>
          </div>
        </div>

        {/* Right side: All patient info */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{generateDemoEmail(patient.name)}</span>
          </div>
          {patient.age && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Age:</span>
              <span className="font-medium">{patient.age}</span>
            </div>
          )}
          {patient.gender && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Gender:</span>
              <span className="font-medium">{patient.gender}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Status:</span>
            <Badge variant="outline">{patient.status}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Joined:</span>
            <span className="font-medium">{new Date(patient.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Sessions:</span>
            <span className="font-medium">{patient.sessionsCount}</span>
          </div>
        </div>
      </div>

      {/* Diagnosis display if present */}
      {patient.diagnosis && (
        <div className="mt-2 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Diagnosis:</span> {patient.diagnosis}
          </p>
        </div>
      )}

      {/* Edit Patient Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Patient</DialogTitle>
            <DialogDescription>
              Update patient information and demographics.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Patient name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  min="0"
                  max="150"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Age"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={gender || 'not_specified'} onValueChange={(v) => setGender(v === 'not_specified' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_specified">Not specified</SelectItem>
                    {genderOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as 'ACTIVE' | 'INACTIVE' | 'TERMINATED')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="TERMINATED">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="diagnosis">Diagnosis</Label>
              <Textarea
                id="diagnosis"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Primary diagnosis or presenting concerns"
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional clinical notes"
                className="min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
