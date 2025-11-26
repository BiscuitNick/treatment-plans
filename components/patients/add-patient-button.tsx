'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { UserPlus } from 'lucide-react'
import { CreatePatientModal } from '@/components/sessions/create-patient-modal'

interface AddPatientButtonProps {
  userId: string
}

export function AddPatientButton({ userId }: AddPatientButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const handlePatientCreated = () => {
    router.refresh()
  }

  return (
    <>
      <Button className="gap-2" onClick={() => setIsOpen(true)}>
        <UserPlus className="h-4 w-4" />
        Add Patient
      </Button>
      <CreatePatientModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        userId={userId}
        onPatientCreated={handlePatientCreated}
      />
    </>
  )
}
