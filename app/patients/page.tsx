import { getPatients } from '@/app/actions/patients';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AddPatientButton } from '@/components/patients/add-patient-button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar } from "lucide-react";
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PatientsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    redirect('/auth/error?error=UserNotFound');
  }

  // Patients cannot access this page
  if (user.role === 'PATIENT') {
    redirect('/portal');
  }

  const patients = await getPatients(user.id);

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
          <p className="text-muted-foreground">Manage your patient roster.</p>
        </div>
        <AddPatientButton userId={user.id} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Session</TableHead>
              <TableHead>Risk Score</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  No patients found.
                </TableCell>
              </TableRow>
            ) : (
              patients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell className="font-medium">{patient.name}</TableCell>
                  <TableCell>
                    <Badge variant={patient.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {patient.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {patient.lastSessionDate ? (
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {new Date(patient.lastSessionDate).toLocaleDateString()}
                        </div>
                    ) : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{patient.riskScore}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/patients/${patient.id}`}>
                        <Button variant="ghost" size="sm">
                            <FileText className="h-4 w-4 mr-2" />
                            Details
                        </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
