'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Upload, FileAudio, CheckCircle, AlertCircle } from 'lucide-react';

interface UploadSessionDialogProps {
  userId: string;
}

type UploadStep = 'idle' | 'uploading' | 'transcribing' | 'analyzing' | 'complete' | 'error';

export function UploadSessionDialog({ userId }: UploadSessionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<UploadStep>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !userId) return;

    setStep('uploading');
    setProgress(10);
    setError(null);

    try {
      // 1. Get Presigned URL
      const uploadRes = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      
      if (!uploadRes.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, publicUrl } = await uploadRes.json();

      setProgress(30);

      // 2. Upload to S3
      const s3Res = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!s3Res.ok) throw new Error('Failed to upload file to Storage');
      
      setProgress(50);
      setStep('transcribing');

      // 3. Transcribe
      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl: publicUrl }),
      });

      if (!transcribeRes.ok) throw new Error('Transcription failed');
      const { text: transcript } = await transcribeRes.json();

      setProgress(75);
      setStep('analyzing');

      // 4. Analyze (Generate Plan)
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transcript, 
          userId,
          // sessionId could be passed if we created it earlier, 
          // but the API handles creation if not present.
          // Ideally, we should create the session at step 2 or 3 to track it.
          // For now, relying on analyze route to create it.
        }),
      });

      if (!analyzeRes.ok) {
        const errData = await analyzeRes.json();
        throw new Error(errData.error || 'Analysis failed');
      }

      setProgress(100);
      setStep('complete');
      
      // Refresh the dashboard to show the new session
      router.refresh();

      // Close dialog after a brief delay
      setTimeout(() => {
        setIsOpen(false);
        resetState();
      }, 2000);

    } catch (err: any) {
      console.error(err);
      setStep('error');
      setError(err.message || 'An unexpected error occurred');
    }
  };

  const resetState = () => {
    setFile(null);
    setStep('idle');
    setProgress(0);
    setError(null);
  };

  const renderStepStatus = () => {
    switch (step) {
      case 'uploading': return 'Uploading audio file...';
      case 'transcribing': return 'Transcribing session audio...';
      case 'analyzing': return 'Generating treatment plan...';
      case 'complete': return 'Success! Session processed.';
      case 'error': return 'Error occurred.';
      default: return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open && step === 'analyzing') return; // Prevent closing during critical work
        setIsOpen(open);
        if (!open) resetState();
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          Upload Session
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload New Session</DialogTitle>
          <DialogDescription>
            Upload an audio recording of your therapy session. We'll transcribe it and generate a treatment plan.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {step === 'idle' || step === 'error' ? (
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="audio-file">Audio File</Label>
              <Input id="audio-file" type="file" accept="audio/*,video/*" onChange={handleFileChange} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 space-y-4">
               {step === 'complete' ? (
                 <CheckCircle className="h-12 w-12 text-green-500 animate-in zoom-in" />
               ) : (
                 <Loader2 className="h-10 w-10 animate-spin text-primary" />
               )}
               <div className="w-full space-y-1">
                 <div className="flex justify-between text-xs text-muted-foreground">
                   <span>{renderStepStatus()}</span>
                   <span>{progress}%</span>
                 </div>
                 <Progress value={progress} className="h-2" />
               </div>
            </div>
          )}

          {step === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          {step === 'idle' || step === 'error' ? (
            <Button onClick={handleUpload} disabled={!file}>
              Start Processing
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
