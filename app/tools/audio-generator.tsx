'use client'

import { useState, useEffect } from 'react';
import { generateSessionScript, synthesizeAudio, saveGeneratedSession } from '@/app/actions/audio';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Timeline,
  TimelineItem,
  TimelineConnector,
  TimelineHeader,
  TimelineIcon,
  TimelineContent,
  TimelineTitle,
  TimelineDescription,
} from "@/components/ui/timeline";
import { Loader2, Download, AudioWaveform, FileText, Play, CheckCircle2, XCircle, User, Clock, Cloud, Database, Sparkles, BookOpen } from 'lucide-react';

interface PatientOption {
  id: string;
  name: string;
  sessionCount: number;
}

interface AudioGeneratorProps {
  userId: string;
  patients: PatientOption[];
  defaultTherapistStyle?: string;
}

type OutputType = 'text' | 'audio';
type GenerationStep =
  | 'idle'
  | 'preparing-context'
  | 'generating-script'
  | 'synthesizing-audio'
  | 'uploading-audio'
  | 'saving'
  | 'generating-summary'
  | 'complete'
  | 'error';

// Rotating status messages for each step (mix of professional + humorous)
const STEP_MESSAGES: Record<string, string[]> = {
  'preparing-context': [
    "Loading patient history...",
    "Fetching treatment plan...",
    "Building session context...",
    "Reading between the lines...",
    "Consulting the archives...",
    "Gathering clinical intel...",
    "Reviewing past breakthroughs...",
    "Checking the therapy notes...",
  ],
  'generating-script': [
    "Writing dialogue...",
    "Crafting conversation...",
    "Building rapport (artificially)...",
    "Channeling Carl Rogers...",
    "Generating empathy...",
    "Adding thoughtful pauses...",
    "Sprinkling in some 'hmm's...",
    "Crafting open-ended questions...",
    "Avoiding yes/no questions...",
    "Making it feel authentic...",
    "Adding therapeutic warmth...",
    "Simulating active listening...",
  ],
  'synthesizing-audio': [
    "Converting to speech...",
    "Generating voices...",
    "Warming up vocal cords...",
    "Adding emotional tone...",
    "Calibrating empathy levels...",
    "Fine-tuning inflection...",
    "Making it sound human...",
    "Adding natural pauses...",
    "Practicing pronunciation...",
    "Recording take #47...",
  ],
  'uploading-audio': [
    "Uploading to cloud...",
    "Saving audio file...",
    "Beaming to the cloud...",
    "Finding cloud storage...",
    "Almost there...",
    "Securing the connection...",
    "Transmitting bytes...",
  ],
  'saving': [
    "Saving to database...",
    "Recording session...",
    "Filing paperwork (digitally)...",
    "Organizing the records...",
    "Dotting i's, crossing t's...",
    "Making it official...",
  ],
  'generating-summary': [
    "Analyzing transcript...",
    "Creating summary...",
    "Extracting key themes...",
    "Finding the insights...",
    "Distilling wisdom...",
    "Summarizing breakthroughs...",
    "Noting progress...",
    "Highlighting growth...",
  ],
};

// Hook for rotating status messages
function useRotatingStatus(step: GenerationStep, active: boolean) {
  const [index, setIndex] = useState(0);
  const messages = STEP_MESSAGES[step] || ["Processing..."];

  useEffect(() => {
    if (!active || messages.length <= 1) {
      setIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setIndex(i => (i + 1) % messages.length);
    }, 4500); // Rotate every 4.5 seconds
    return () => clearInterval(timer);
  }, [active, messages.length, step]);

  return messages[index];
}

// Therapist style options (matching settings page)
const THERAPIST_STYLES = ['CBT', 'DBT', 'ACT', 'Psychodynamic', 'Integrative'] as const;

interface GenerationResult {
  success: boolean;
  sessionId?: string;
  transcript?: string;
  audioUrl?: string;
  error?: string;
  metrics?: {
    script?: { model: string; durationMs: number };
    audio?: { model: string; durationMs: number };
  };
}

export function AudioGenerator({ userId, patients, defaultTherapistStyle }: AudioGeneratorProps) {
  // Form state
  const [patientId, setPatientId] = useState<string>('');
  const [scenario, setScenario] = useState('');
  const [therapistStyle, setTherapistStyle] = useState(defaultTherapistStyle || 'Integrative');
  const [duration, setDuration] = useState(20);
  const [outputType, setOutputType] = useState<OutputType>('audio');
  const [saveToSessions, setSaveToSessions] = useState(false);
  const [autoGenerateSummary, setAutoGenerateSummary] = useState(false);

  // Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [currentStep, setCurrentStep] = useState<GenerationStep>('idle');
  const [result, setResult] = useState<GenerationResult | null>(null);

  // Rotating status messages
  const rotatingStatus = useRotatingStatus(currentStep, currentStep !== 'idle' && currentStep !== 'complete' && currentStep !== 'error');

  const selectedPatient = patients.find(p => p.id === patientId);
  const isInitialIntake = !patientId || (selectedPatient?.sessionCount === 0);

  // Determine which steps will be shown based on current config
  const hasPatientContext = !!patientId;
  const hasAudioOutput = outputType === 'audio';
  const hasSaving = saveToSessions;
  const hasSummary = saveToSessions && autoGenerateSummary;

  const handleStartGeneration = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmGeneration = async () => {
    setShowConfirmModal(false);
    setShowProgressModal(true);
    setResult(null);

    let transcript = '';
    let audioUrl: string | undefined;
    let s3Key: string | undefined;
    let sessionId: string | undefined;
    const metrics: {
      script?: { model: string; durationMs: number };
      audio?: { model: string; durationMs: number };
    } = {};

    try {
      // Step 1: Generating script (includes context prep)
      setCurrentStep('generating-script');
      const scriptResult = await generateSessionScript({
        userId,
        patientId: patientId || undefined,
        scenario: scenario || undefined,
        therapistStyle,
        duration,
      });

      if (!scriptResult.success || !scriptResult.transcript) {
        setCurrentStep('error');
        setResult({ success: false, error: scriptResult.error || 'Script generation failed' });
        return;
      }

      transcript = scriptResult.transcript;
      metrics.script = scriptResult.metrics;

      // Step 2: Synthesizing audio (if audio output)
      if (hasAudioOutput) {
        setCurrentStep('synthesizing-audio');
        const audioResult = await synthesizeAudio(transcript, userId);

        if (!audioResult.success || !audioResult.fileUrl) {
          setCurrentStep('error');
          setResult({ success: false, error: audioResult.error || 'Audio synthesis failed' });
          return;
        }

        audioUrl = audioResult.fileUrl;
        s3Key = audioResult.s3Key;
        metrics.audio = audioResult.metrics;

        // Step 3: Uploading complete (already done in synthesizeAudio, just update UI)
        setCurrentStep('uploading-audio');
        await new Promise(resolve => setTimeout(resolve, 300)); // Brief pause to show step
      }

      // Step 4: Saving to database (if enabled)
      if (hasSaving) {
        setCurrentStep('saving');
        const saveResult = await saveGeneratedSession({
          userId,
          patientId: patientId || undefined,
          transcript,
          s3Key,
          autoGenerateSummary: hasSummary,
        });

        if (!saveResult.success) {
          setCurrentStep('error');
          setResult({ success: false, error: saveResult.error || 'Save failed' });
          return;
        }

        sessionId = saveResult.sessionId;

        // Step 5: Summary generation happens inside saveGeneratedSession if enabled
        if (hasSummary) {
          setCurrentStep('generating-summary');
          await new Promise(resolve => setTimeout(resolve, 300)); // Brief pause to show step
        }
      }

      setCurrentStep('complete');
      setResult({
        success: true,
        sessionId,
        transcript,
        audioUrl,
        metrics,
      });

    } catch (error) {
      console.error('Generation error:', error);
      setCurrentStep('error');
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  };

  const handleCloseProgressModal = () => {
    setShowProgressModal(false);
    setCurrentStep('idle');
    if (result?.success) {
      // Reset form on success
      setScenario('');
    }
  };

  const handleDownloadText = () => {
    if (!result?.transcript) return;
    const blob = new Blob([result.transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-transcript-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStepStatus = (step: GenerationStep): 'completed' | 'current' | 'upcoming' => {
    // Build the steps array based on current config
    const steps: GenerationStep[] = [];
    if (hasPatientContext) steps.push('preparing-context');
    steps.push('generating-script');
    if (hasAudioOutput) {
      steps.push('synthesizing-audio');
      steps.push('uploading-audio');
    }
    if (hasSaving) steps.push('saving');
    if (hasSummary) steps.push('generating-summary');
    steps.push('complete');

    const currentIndex = steps.indexOf(currentStep);
    const stepIndex = steps.indexOf(step);

    if (currentStep === 'error') return stepIndex <= currentIndex ? 'current' : 'upcoming';
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Synthetic Session Generator</h2>
        <p className="text-sm text-muted-foreground">Create synthetic therapy sessions for testing and training.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session Configuration</CardTitle>
          <CardDescription>Configure the parameters for the synthetic session.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Patient Selection */}
          <div className="space-y-2">
            <Label>Patient (Optional)</Label>
            <Select value={patientId || 'none'} onValueChange={(val) => setPatientId(val === 'none' ? '' : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a patient or leave empty for new intake" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No patient (Initial Intake)</SelectItem>
                {patients.map(patient => (
                  <SelectItem key={patient.id} value={patient.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {patient.name}
                      <Badge variant="secondary" className="ml-2">
                        {patient.sessionCount} sessions
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isInitialIntake && (
              <p className="text-xs text-muted-foreground">
                This will generate an initial intake session.
              </p>
            )}
            {selectedPatient && selectedPatient.sessionCount > 0 && (
              <p className="text-xs text-muted-foreground">
                Will include context from up to 25 previous sessions and current treatment plan.
              </p>
            )}
          </div>

          {/* Scenario */}
          <div className="space-y-2">
            <Label>Scenario (Optional)</Label>
            <Textarea
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              placeholder="Describe a specific scenario to guide the session (e.g., 'Patient is experiencing increased anxiety about upcoming job interview')"
              className="h-20"
            />
          </div>

          {/* Therapist Style & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Therapist Style</Label>
              <Select value={therapistStyle} onValueChange={setTherapistStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THERAPIST_STYLES.map(style => (
                    <SelectItem key={style} value={style}>{style}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Duration (Turns)</Label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 20)}
                min={10}
                max={100}
              />
              <p className="text-xs text-muted-foreground">~10 turns = 1 minute</p>
            </div>
          </div>

          {/* Output Type */}
          <div className="space-y-3">
            <Label>Output Type</Label>
            <div className="grid grid-cols-2 gap-4">
              <div
                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  outputType === 'text' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
                onClick={() => setOutputType('text')}
              >
                <FileText className={`h-5 w-5 ${outputType === 'text' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div>
                  <p className="font-medium">Text Only</p>
                  <p className="text-xs text-muted-foreground">Download as .txt file</p>
                </div>
              </div>
              <div
                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  outputType === 'audio' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
                onClick={() => setOutputType('audio')}
              >
                <AudioWaveform className={`h-5 w-5 ${outputType === 'audio' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div>
                  <p className="font-medium">Audio File</p>
                  <p className="text-xs text-muted-foreground">Generate MP3 audio</p>
                </div>
              </div>
            </div>
          </div>

          {/* Save to Sessions toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Save to Sessions</Label>
                <div className="text-sm text-muted-foreground">
                  Automatically add to sessions table for processing.
                  {outputType === 'audio' && ' Saves both audio and transcript.'}
                </div>
              </div>
              <Switch
                checked={saveToSessions}
                onCheckedChange={(checked) => {
                  setSaveToSessions(checked);
                  if (!checked) setAutoGenerateSummary(false);
                }}
              />
            </div>

            {/* Auto-generate summary option (only when saving to sessions) */}
            {saveToSessions && (
              <div className="flex items-center justify-between rounded-lg border p-4 ml-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Auto-generate summary</Label>
                  <div className="text-sm text-muted-foreground">
                    Generate AI summary after session is saved.
                  </div>
                </div>
                <Switch
                  checked={autoGenerateSummary}
                  onCheckedChange={setAutoGenerateSummary}
                />
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleStartGeneration} className="w-full">
            <Play className="mr-2 h-4 w-4" />
            Generate Session
          </Button>
        </CardFooter>
      </Card>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Generation</DialogTitle>
            <DialogDescription>
              Please review your configuration before starting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Patient</p>
                <p className="font-medium">{selectedPatient?.name || 'None (Initial Intake)'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Session Type</p>
                <p className="font-medium">{isInitialIntake ? 'Initial Intake' : 'Follow-up Session'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Therapist Style</p>
                <p className="font-medium">{therapistStyle}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Duration</p>
                <p className="font-medium">{duration} turns (~{Math.round(duration / 10)} min)</p>
              </div>
              <div>
                <p className="text-muted-foreground">Output</p>
                <p className="font-medium">{outputType === 'audio' ? 'Audio + Text' : 'Text Only'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Save to Sessions</p>
                <p className="font-medium">{saveToSessions ? 'Yes' : 'No'}</p>
              </div>
              {saveToSessions && (
                <div>
                  <p className="text-muted-foreground">Auto-generate Summary</p>
                  <p className="font-medium">{autoGenerateSummary ? 'Yes' : 'No'}</p>
                </div>
              )}
            </div>
            {scenario && (
              <div>
                <p className="text-muted-foreground text-sm">Scenario</p>
                <p className="text-sm mt-1 p-2 bg-muted rounded">{scenario}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmGeneration}>
              Start Generation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progress Modal */}
      <Dialog open={showProgressModal} onOpenChange={(open) => { if (!open) handleCloseProgressModal(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {currentStep === 'complete' ? 'Generation Complete' :
               currentStep === 'error' ? 'Generation Failed' :
               'Generating Session...'}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <Timeline>
              {/* Step 1: Preparing Context (conditional) */}
              {hasPatientContext && (
                <TimelineItem status={getStepStatus('preparing-context')} className="[--timeline-icon-size:1.5rem]">
                  <TimelineHeader>
                    <TimelineIcon
                      size="sm"
                      variant={getStepStatus('preparing-context') === 'completed' ? 'primary' :
                               getStepStatus('preparing-context') === 'current' ? 'outline' : 'default'}
                    >
                      {getStepStatus('preparing-context') === 'completed' ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : getStepStatus('preparing-context') === 'current' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <BookOpen className="h-3 w-3" />
                      )}
                    </TimelineIcon>
                    <TimelineTitle>Preparing Context</TimelineTitle>
                  </TimelineHeader>
                  <TimelineConnector status={getStepStatus('preparing-context')} />
                  <TimelineContent>
                    <TimelineDescription>
                      {currentStep === 'preparing-context' && rotatingStatus}
                    </TimelineDescription>
                  </TimelineContent>
                </TimelineItem>
              )}

              {/* Step 2: Generating Script (always) */}
              <TimelineItem status={getStepStatus('generating-script')} className="[--timeline-icon-size:1.5rem]">
                <TimelineHeader>
                  <TimelineIcon
                    size="sm"
                    variant={getStepStatus('generating-script') === 'completed' ? 'primary' :
                             getStepStatus('generating-script') === 'current' ? 'outline' : 'default'}
                  >
                    {getStepStatus('generating-script') === 'completed' ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : getStepStatus('generating-script') === 'current' ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <FileText className="h-3 w-3" />
                    )}
                  </TimelineIcon>
                  <TimelineTitle>Generating Script</TimelineTitle>
                </TimelineHeader>
                <TimelineConnector status={getStepStatus('generating-script')} />
                <TimelineContent>
                  <TimelineDescription>
                    {currentStep === 'generating-script' && rotatingStatus}
                    {getStepStatus('generating-script') === 'completed' && result?.metrics?.script && (
                      <span className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {(result.metrics.script.durationMs / 1000).toFixed(1)}s
                        </span>
                        <span className="text-muted-foreground">({result.metrics.script.model})</span>
                      </span>
                    )}
                  </TimelineDescription>
                </TimelineContent>
              </TimelineItem>

              {/* Step 3: Synthesizing Audio (conditional) */}
              {hasAudioOutput && (
                <TimelineItem status={getStepStatus('synthesizing-audio')} className="[--timeline-icon-size:1.5rem]">
                  <TimelineHeader>
                    <TimelineIcon
                      size="sm"
                      variant={getStepStatus('synthesizing-audio') === 'completed' ? 'primary' :
                               getStepStatus('synthesizing-audio') === 'current' ? 'outline' : 'default'}
                    >
                      {getStepStatus('synthesizing-audio') === 'completed' ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : getStepStatus('synthesizing-audio') === 'current' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <AudioWaveform className="h-3 w-3" />
                      )}
                    </TimelineIcon>
                    <TimelineTitle>Synthesizing Audio</TimelineTitle>
                  </TimelineHeader>
                  <TimelineConnector status={getStepStatus('synthesizing-audio')} />
                  <TimelineContent>
                    <TimelineDescription>
                      {currentStep === 'synthesizing-audio' && rotatingStatus}
                      {getStepStatus('synthesizing-audio') === 'completed' && result?.metrics?.audio && (
                        <span className="flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {(result.metrics.audio.durationMs / 1000).toFixed(1)}s
                          </span>
                          <span className="text-muted-foreground">({result.metrics.audio.model})</span>
                        </span>
                      )}
                    </TimelineDescription>
                  </TimelineContent>
                </TimelineItem>
              )}

              {/* Step 4: Uploading Audio (conditional) */}
              {hasAudioOutput && (
                <TimelineItem status={getStepStatus('uploading-audio')} className="[--timeline-icon-size:1.5rem]">
                  <TimelineHeader>
                    <TimelineIcon
                      size="sm"
                      variant={getStepStatus('uploading-audio') === 'completed' ? 'primary' :
                               getStepStatus('uploading-audio') === 'current' ? 'outline' : 'default'}
                    >
                      {getStepStatus('uploading-audio') === 'completed' ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : getStepStatus('uploading-audio') === 'current' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Cloud className="h-3 w-3" />
                      )}
                    </TimelineIcon>
                    <TimelineTitle>Uploading Audio</TimelineTitle>
                  </TimelineHeader>
                  <TimelineConnector status={getStepStatus('uploading-audio')} />
                  <TimelineContent>
                    <TimelineDescription>
                      {currentStep === 'uploading-audio' && rotatingStatus}
                    </TimelineDescription>
                  </TimelineContent>
                </TimelineItem>
              )}

              {/* Step 5: Saving Session (conditional) */}
              {hasSaving && (
                <TimelineItem status={getStepStatus('saving')} className="[--timeline-icon-size:1.5rem]">
                  <TimelineHeader>
                    <TimelineIcon
                      size="sm"
                      variant={getStepStatus('saving') === 'completed' ? 'primary' :
                               getStepStatus('saving') === 'current' ? 'outline' : 'default'}
                    >
                      {getStepStatus('saving') === 'completed' ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : getStepStatus('saving') === 'current' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Database className="h-3 w-3" />
                      )}
                    </TimelineIcon>
                    <TimelineTitle>Saving Session</TimelineTitle>
                  </TimelineHeader>
                  <TimelineConnector status={getStepStatus('saving')} />
                  <TimelineContent>
                    <TimelineDescription>
                      {currentStep === 'saving' && rotatingStatus}
                    </TimelineDescription>
                  </TimelineContent>
                </TimelineItem>
              )}

              {/* Step 6: Generating Summary (conditional) */}
              {hasSummary && (
                <TimelineItem status={getStepStatus('generating-summary')} className="[--timeline-icon-size:1.5rem]">
                  <TimelineHeader>
                    <TimelineIcon
                      size="sm"
                      variant={getStepStatus('generating-summary') === 'completed' ? 'primary' :
                               getStepStatus('generating-summary') === 'current' ? 'outline' : 'default'}
                    >
                      {getStepStatus('generating-summary') === 'completed' ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : getStepStatus('generating-summary') === 'current' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                    </TimelineIcon>
                    <TimelineTitle>Generating Summary</TimelineTitle>
                  </TimelineHeader>
                  <TimelineContent>
                    <TimelineDescription>
                      {currentStep === 'generating-summary' && rotatingStatus}
                    </TimelineDescription>
                  </TimelineContent>
                </TimelineItem>
              )}
            </Timeline>

            {/* Error State */}
            {currentStep === 'error' && result?.error && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-5 w-5" />
                  <p className="font-medium">Error</p>
                </div>
                <p className="text-sm mt-2 text-destructive/80">{result.error}</p>
              </div>
            )}

            {/* Success State */}
            {currentStep === 'complete' && result?.success && (
              <div className="mt-4 space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-green-950/20 dark:border-green-900">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <p className="font-medium">Session Generated Successfully</p>
                  </div>
                  <p className="text-sm mt-1 text-green-600 dark:text-green-500">
                    {saveToSessions
                      ? 'Session has been saved to the database.'
                      : 'Use the download buttons below to save the files.'}
                  </p>
                </div>

                {/* Audio Player */}
                {result.audioUrl && (
                  <div className="space-y-2">
                    <Label>Audio Preview</Label>
                    <audio controls src={result.audioUrl} className="w-full" />
                  </div>
                )}

                {/* Download Buttons */}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={handleDownloadText}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Text
                  </Button>
                  {result.audioUrl && (
                    <a href={result.audioUrl} download="session-audio.mp3" className="flex-1">
                      <Button variant="outline" className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Download Audio
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant={currentStep === 'complete' || currentStep === 'error' ? 'default' : 'outline'}
              onClick={handleCloseProgressModal}
            >
              {currentStep === 'complete' || currentStep === 'error'
                ? 'Close'
                : saveToSessions
                  ? 'Close (continues in background)'
                  : 'Cancel (will lose progress)'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
