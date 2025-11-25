'use client'

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { generateDemoSession } from '@/app/actions/generateDemoSession';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPatients } from '@/app/actions/patients';

interface MagicButtonProps {
  userId: string;
}

export function MagicButton({ userId }: MagicButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'persona' | 'patient'>('persona');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patients, setPatients] = useState<{id: string, name: string}[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (open && mode === 'patient') {
      // Fetch patients client-side for the dropdown
      // Ideally this data is passed in, but fetching here keeps it self-contained for now
      getPatients(userId).then(data => setPatients(data));
    }
  }, [open, mode, userId]);

  const handleGenerate = async () => {
    if (mode === 'patient' && !selectedPatientId) return;

    setLoading(true);
    try {
      const patientId = mode === 'patient' ? selectedPatientId : undefined;
      const result = await generateDemoSession(userId, patientId);
      
      if (result.success) {
        setOpen(false);
        router.refresh();
      } else {
        console.error(result.error);
        alert("Failed: " + result.error);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="secondary" 
          className="gap-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 border border-purple-200 text-purple-700"
        >
          <Sparkles className="h-4 w-4" />
          Simulate Session
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Simulate Therapy Session</DialogTitle>
          <DialogDescription>
            Generate a realistic AI session to test the platform.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <RadioGroup defaultValue="persona" onValueChange={(v: 'persona' | 'patient') => setMode(v)} className="grid grid-cols-2 gap-4">
            <div>
              <RadioGroupItem value="persona" id="persona" className="peer sr-only" />
              <Label
                htmlFor="persona"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                <span className="mb-2 text-xl">🎭</span>
                New Persona
              </Label>
            </div>
            <div>
              <RadioGroupItem value="patient" id="patient" className="peer sr-only" />
              <Label
                htmlFor="patient"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                <span className="mb-2 text-xl">👤</span>
                Existing Patient
              </Label>
            </div>
          </RadioGroup>

          {mode === 'patient' && (
            <div className="space-y-2">
              <Label>Select Patient</Label>
              <Select onValueChange={setSelectedPatientId} value={selectedPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a patient..." />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleGenerate} disabled={loading || (mode === 'patient' && !selectedPatientId)}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Generate Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}