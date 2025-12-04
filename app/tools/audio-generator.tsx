'use client'

import { useState } from 'react';
import { generateSyntheticSession } from '@/app/actions/audio';
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
import { Loader2, Download, AudioWaveform, FileText, Play, CheckCircle2, XCircle, User, Clock } from 'lucide-react';

interface PatientOption {
  id: string;
  name: string;
  sessionCount: number;
}

interface AudioGeneratorProps {
  userId: string;
  patients: PatientOption[];
}

type OutputType = 'text' | 'audio';
type GenerationStep = 'idle' | 'generating-script' | 'synthesizing-audio' | 'saving' | 'complete' | 'error';

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

export function AudioGenerator({ userId, patients }: AudioGeneratorProps) {
  // Form state
  const [patientId, setPatientId] = useState<string>('');
  const [scenario, setScenario] = useState('');
  const [therapistStyle, setTherapistStyle] = useState('CBT');
  const [duration, setDuration] = useState(20);
  const [outputType, setOutputType] = useState<OutputType>('audio');
  const [saveToSessions, setSaveToSessions] = useState(false);
  const [autoGenerateSummary, setAutoGenerateSummary] = useState(false);

  // Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [currentStep, setCurrentStep] = useState<GenerationStep>('idle');
  const [result, setResult] = useState<GenerationResult | null>(null);

  const selectedPatient = patients.find(p => p.id === patientId);
  const isInitialIntake = !patientId || (selectedPatient?.sessionCount === 0);

  const handleStartGeneration = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmGeneration = async () => {
    setShowConfirmModal(false);
    setShowProgressModal(true);
    setCurrentStep('generating-script');
    setResult(null);

    try {
      const response = await generateSyntheticSession({
        userId,
        patientId: patientId || undefined,
        scenario: scenario || undefined,
        therapistStyle,
        duration,
        outputType,
        autoGenerateAudio: outputType === 'audio', // Always auto-generate for audio
        saveToSessions,
        autoGenerateSummary: saveToSessions && autoGenerateSummary,
      });

      if (!response.success) {
        setCurrentStep('error');
        setResult({ success: false, error: response.error });
        return;
      }

      // Update steps based on output type
      if (outputType === 'audio') {
        setCurrentStep('synthesizing-audio');
        // Small delay to show the step change
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setCurrentStep('saving');
      await new Promise(resolve => setTimeout(resolve, 300));

      setCurrentStep('complete');
      setResult({
        success: true,
        sessionId: response.sessionId,
        transcript: response.transcript,
        audioUrl: response.audioUrl,
        metrics: response.metrics,
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
    const steps: GenerationStep[] = ['generating-script', 'synthesizing-audio', 'saving', 'complete'];
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
                  <SelectItem value="CBT">CBT</SelectItem>
                  <SelectItem value="DBT">DBT</SelectItem>
                  <SelectItem value="Psychodynamic">Psychodynamic</SelectItem>
                  <SelectItem value="Humanistic">Humanistic</SelectItem>
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
                    {getStepStatus('generating-script') === 'current' && 'Creating session transcript...'}
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

              {outputType === 'audio' && (
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
                      {getStepStatus('synthesizing-audio') === 'current' && 'Converting to speech...'}
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

              {saveToSessions && (
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
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                    </TimelineIcon>
                    <TimelineTitle>Saving Session</TimelineTitle>
                  </TimelineHeader>
                  <TimelineContent>
                    <TimelineDescription>
                      {getStepStatus('saving') === 'current' && 'Saving to database...'}
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
