import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { SessionsPageClient } from './sessions-page-client'

export const dynamic = 'force-dynamic'

export default async function SessionsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })

  if (!user) {
    redirect('/auth/error?error=UserNotFound')
  }

  // Patients cannot access this page
  if (user.role === 'PATIENT') {
    redirect('/portal')
  }

  // Get patients for the selector
  const patients = await prisma.patient.findMany({
    where: {
      clinicianId: user.id,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: 'asc' },
  })

  return <SessionsPageClient userId={user.id} initialPatients={patients} />
}
