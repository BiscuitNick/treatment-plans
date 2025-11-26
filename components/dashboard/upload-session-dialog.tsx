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
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Loader2, Upload, CheckCircle, AlertCircle, FileAudio, CloudUpload, FileText, Sparkles, Circle } from 'lucide-react';
import {
  FileDropZone,
  FileDropZoneArea,
  FileDropZoneContent,
  FileDropZoneList,
  type FileWithMeta,
} from '@/components/ui/file-drop-zone';
import {
  Timeline,
  TimelineItem,
  TimelineConnector,
  TimelineHeader,
  TimelineIcon,
  TimelineTitle,
} from '@/components/ui/timeline';

interface UploadSessionDialogProps {
  userId: string;
}

type UploadStep = 'idle' | 'uploading' | 'transcribing' | 'analyzing' | 'complete' | 'error';

export function UploadSessionDialog({ userId }: UploadSessionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState<FileWithMeta[]>([]);
  const [step, setStep] = useState<UploadStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [pendingStep, setPendingStep] = useState<UploadStep | null>(null);
  const router = useRouter();

  const file = files[0]?.file ?? null;

  const handleFilesChange = (newFiles: FileWithMeta[]) => {
    setFiles(newFiles);
    setError(null);
  };

  // Store upload context between manual steps
  const [uploadContext, setUploadContext] = useState<{
    s3Key?: string;
    transcript?: string;
  }>({});

  const advanceStep = (nextStep: UploadStep) => {
    if (manualMode && nextStep !== 'complete') {
      setPendingStep(nextStep);
    } else {
      setStep(nextStep);
    }
  };

  const handleManualAdvance = () => {
    if (pendingStep) {
      setStep(pendingStep);
      setPendingStep(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !userId) return;

    setStep('uploading');
    setError(null);
    setUploadContext({});

    try {
      // 1. Get Presigned URL
      const uploadRes = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });

      if (!uploadRes.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, s3Key } = await uploadRes.json();

      // 2. Upload to S3
      const s3Res = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!s3Res.ok) throw new Error('Failed to upload file to Storage');

      setUploadContext({ s3Key });

      if (manualMode) {
        setPendingStep('transcribing');
        return; // Wait for user to advance
      }

      await continueFromTranscribe(s3Key);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err);
      setStep('error');
      setError(err.message || 'An unexpected error occurred');
    }
  };

  const continueFromTranscribe = async (s3Key: string) => {
    try {
      setStep('transcribing');

      // 3. Transcribe
      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Key }),
      });

      if (!transcribeRes.ok) {
        const errData = await transcribeRes.json().catch(() => ({}));
        throw new Error(errData.error || `Transcription failed with status ${transcribeRes.status}`);
      }
      const { text: transcript } = await transcribeRes.json();

      setUploadContext(prev => ({ ...prev, transcript }));

      if (manualMode) {
        setPendingStep('analyzing');
        return; // Wait for user to advance
      }

      await continueFromAnalyze(transcript);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err);
      setStep('error');
      setError(err.message || 'An unexpected error occurred');
    }
  };

  const continueFromAnalyze = async (transcript: string) => {
    try {
      setStep('analyzing');

      // 4. Analyze (Generate Plan)
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          userId,
        }),
      });

      if (!analyzeRes.ok) {
        const errData = await analyzeRes.json();
        throw new Error(errData.error || 'Analysis failed');
      }

      setStep('complete');

      // Refresh the dashboard to show the new session
      router.refresh();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err);
      setStep('error');
      setError(err.message || 'An unexpected error occurred');
    }
  };

  // Handle manual step advancement
  const handleNextStep = async () => {
    if (!pendingStep) return;

    if (pendingStep === 'transcribing' && uploadContext.s3Key) {
      setPendingStep(null);
      await continueFromTranscribe(uploadContext.s3Key);
    } else if (pendingStep === 'analyzing' && uploadContext.transcript) {
      setPendingStep(null);
      await continueFromAnalyze(uploadContext.transcript);
    }
  };

  const resetState = () => {
    setFiles([]);
    setStep('idle');
    setError(null);
    setPendingStep(null);
    setUploadContext({});
  };

  const handleClose = () => {
    setIsOpen(false);
    resetState();
  };

  const getStepStatus = (targetStep: UploadStep) => {
    const stepOrder: UploadStep[] = ['uploading', 'transcribing', 'analyzing', 'complete'];
    const currentIndex = stepOrder.indexOf(step);
    const targetIndex = stepOrder.indexOf(targetStep);

    if (step === 'error') return 'default';
    if (targetIndex < currentIndex) return 'completed';
    if (targetIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  const getConnectorStatus = (targetStep: UploadStep) => {
    const stepOrder: UploadStep[] = ['uploading', 'transcribing', 'analyzing', 'complete'];
    const currentIndex = stepOrder.indexOf(step);
    const targetIndex = stepOrder.indexOf(targetStep);

    if (step === 'error') return 'default';
    if (targetIndex < currentIndex) return 'completed';
    return 'upcoming';
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
            Upload an audio recording of your therapy session. We&apos;ll transcribe it and generate a treatment plan.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {step === 'idle' || step === 'error' ? (
            <div className="grid w-full items-center gap-4">
              <div className="grid gap-1.5">
                <Label>Audio File</Label>
                <FileDropZone
                  files={files}
                  onFilesChange={handleFilesChange}
                  accept="audio/*,video/*"
                  multiple={false}
                  maxFiles={1}
                >
                  <FileDropZoneArea className="min-h-32">
                    <FileDropZoneContent>
                      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
                        <FileAudio className="text-muted-foreground size-6" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium">
                          Drag & drop your audio file here
                        </p>
                        <p className="text-muted-foreground text-xs">or click to browse</p>
                      </div>
                    </FileDropZoneContent>
                  </FileDropZoneArea>
                  <FileDropZoneList />
                </FileDropZone>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="manual-mode" className="text-sm text-muted-foreground">
                  Manual step advancement
                </Label>
                <Switch
                  id="manual-mode"
                  checked={manualMode}
                  onCheckedChange={setManualMode}
                />
              </div>
            </div>
          ) : (
            <Timeline className="py-2">
              {/* Upload Step */}
              <TimelineItem status={getStepStatus('uploading')}>
                <TimelineConnector status={getConnectorStatus('uploading')} />
                <TimelineHeader>
                  <TimelineIcon
                    size="sm"
                    variant={getStepStatus('uploading') === 'completed' ? 'primary' : 'default'}
                  >
                    {getStepStatus('uploading') === 'completed' ? (
                      <CheckCircle className="size-3" />
                    ) : getStepStatus('uploading') === 'current' ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <CloudUpload className="size-3" />
                    )}
                  </TimelineIcon>
                  <TimelineTitle className="text-sm">Uploading audio file</TimelineTitle>
                </TimelineHeader>
              </TimelineItem>

              {/* Transcribe Step */}
              <TimelineItem status={getStepStatus('transcribing')}>
                <TimelineConnector status={getConnectorStatus('transcribing')} />
                <TimelineHeader>
                  <TimelineIcon
                    size="sm"
                    variant={getStepStatus('transcribing') === 'completed' ? 'primary' : 'default'}
                  >
                    {getStepStatus('transcribing') === 'completed' ? (
                      <CheckCircle className="size-3" />
                    ) : getStepStatus('transcribing') === 'current' ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <FileText className="size-3" />
                    )}
                  </TimelineIcon>
                  <TimelineTitle className="text-sm">Transcribing session</TimelineTitle>
                </TimelineHeader>
              </TimelineItem>

              {/* Analyze Step */}
              <TimelineItem status={getStepStatus('analyzing')}>
                <TimelineConnector status={getConnectorStatus('analyzing')} />
                <TimelineHeader>
                  <TimelineIcon
                    size="sm"
                    variant={getStepStatus('analyzing') === 'completed' ? 'primary' : 'default'}
                  >
                    {getStepStatus('analyzing') === 'completed' ? (
                      <CheckCircle className="size-3" />
                    ) : getStepStatus('analyzing') === 'current' ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Sparkles className="size-3" />
                    )}
                  </TimelineIcon>
                  <TimelineTitle className="text-sm">Generating treatment plan</TimelineTitle>
                </TimelineHeader>
              </TimelineItem>

              {/* Complete Step */}
              <TimelineItem status={getStepStatus('complete')}>
                <TimelineHeader>
                  <TimelineIcon
                    size="sm"
                    variant={getStepStatus('complete') === 'completed' || step === 'complete' ? 'primary' : 'default'}
                  >
                    {step === 'complete' ? (
                      <CheckCircle className="size-3" />
                    ) : (
                      <Circle className="size-3" />
                    )}
                  </TimelineIcon>
                  <TimelineTitle className="text-sm">Complete</TimelineTitle>
                </TimelineHeader>
              </TimelineItem>
            </Timeline>
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
          ) : pendingStep ? (
            <Button onClick={handleNextStep}>
              Next Step
            </Button>
          ) : step === 'complete' ? (
            <Button onClick={handleClose}>
              Done
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
