'use client'

import { useState } from 'react';
import { generateScript, synthesizeAudio } from '@/app/actions/audio';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Switch } from "@/components/ui/switch";
import { Loader2, Download, AudioWaveform, FileText, Zap } from 'lucide-react';

export default function AudioGeneratorPage() {
  const [patientProfile, setPatientProfile] = useState('Alex, 28, dealing with social anxiety at work.');
  const [therapistStyle, setTherapistStyle] = useState('CBT');
  const [duration, setDuration] = useState(20); // Turns
  const [reviewScript, setReviewScript] = useState(true); // Toggle state
  
  const [step, setStep] = useState<'input' | 'script' | 'complete'>('input');
  const [loading, setLoading] = useState(false);
  
  const [generatedScript, setGeneratedScript] = useState('');
  const [audioUrl, setAudioUrl] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    try {
      // 1. Generate Script
      const scriptRes = await generateScript({ patientProfile, therapistStyle, duration });
      
      if (!scriptRes.success || !scriptRes.transcript) {
        throw new Error(scriptRes.error || "Script generation failed");
      }

      if (reviewScript) {
        // Stop here if reviewing
        setGeneratedScript(scriptRes.transcript);
        setStep('script');
      } else {
        // 2. Chain to Audio Synthesis immediately
        const audioRes = await synthesizeAudio(scriptRes.transcript);
        
        if (!audioRes.success || !audioRes.fileUrl) {
            throw new Error(audioRes.error || "Audio synthesis failed");
        }

        setGeneratedScript(scriptRes.transcript); // Still useful to see
        setAudioUrl(audioRes.fileUrl);
        setStep('complete');
      }

    } catch (error: any) {
      console.error(error);
      alert("Error: " + (error.message || "An unexpected error occurred."));
    } finally {
      setLoading(false);
    }
  };

  const handleSynthesize = async () => {
    setLoading(true);
    try {
      const res = await synthesizeAudio(generatedScript);
      if (res.success && res.fileUrl) {
        setAudioUrl(res.fileUrl);
        setStep('complete');
      } else {
        alert("Failed to synthesize audio: " + res.error);
      }
    } catch (error) {
      console.error(error);
      alert("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('input');
    setGeneratedScript('');
    setAudioUrl('');
  };

  return (
    <div className="container mx-auto py-10 max-w-3xl space-y-8">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Synthetic Audio Generator</h1>
            <p className="text-muted-foreground">Create custom therapy session audio for testing.</p>
        </div>
        {step !== 'input' && (
            <Button variant="outline" size="sm" onClick={reset}>Start Over</Button>
        )}
      </div>

      {/* Step 1: Configuration */}
      {step === 'input' && (
        <Card>
            <CardHeader>
            <CardTitle>1. Configuration</CardTitle>
            <CardDescription>Define the parameters for the simulated session script.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label>Patient Profile</Label>
                <Textarea 
                value={patientProfile} 
                onChange={(e) => setPatientProfile(e.target.value)} 
                placeholder="Describe the patient..."
                className="h-24"
                />
            </div>

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
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    min={10}
                    max={100}
                />
                <p className="text-xs text-muted-foreground">Approx. 10 turns = 1 minute</p>
                </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                    <Label className="text-base">Review Script</Label>
                    <div className="text-sm text-muted-foreground">
                        Pause to edit the script before generating audio.
                    </div>
                </div>
                <Switch
                    checked={reviewScript}
                    onCheckedChange={setReviewScript}
                />
            </div>

            </CardContent>
            <CardFooter>
            <Button onClick={handleGenerate} disabled={loading} className="w-full">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (reviewScript ? <FileText className="mr-2 h-4 w-4" /> : <Zap className="mr-2 h-4 w-4" />)}
                {loading ? "Processing..." : (reviewScript ? "Generate Script" : "Generate Audio (Quick Mode)")}
            </Button>
            </CardFooter>
        </Card>
      )}

      {/* Step 2: Script Review */}
      {step === 'script' && (
        <Card className="border-blue-200">
            <CardHeader>
            <CardTitle className="text-blue-800">2. Review Script</CardTitle>
            <CardDescription>
                Edit the script below if needed before generating audio.
                Ensure lines start with <strong>Therapist:</strong> or <strong>Patient:</strong>.
            </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Textarea 
                    value={generatedScript}
                    onChange={(e) => setGeneratedScript(e.target.value)}
                    className="min-h-[400px] font-mono text-sm leading-relaxed"
                />
            </CardContent>
            <CardFooter>
            <Button onClick={handleSynthesize} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AudioWaveform className="mr-2 h-4 w-4" />}
                {loading ? "Synthesizing Audio (this may take a minute)..." : "Synthesize Audio"}
            </Button>
            </CardFooter>
        </Card>
      )}

      {/* Step 3: Download */}
      {step === 'complete' && audioUrl && (
        <Card className="bg-green-50/50 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
                3. Ready for Download
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <audio controls src={audioUrl} className="w-full" />
            
            <div className="flex gap-4">
                <a href={audioUrl} download="generated-session.mp3" className="w-full">
                    <Button variant="outline" className="w-full gap-2">
                        <Download className="h-4 w-4" /> Download MP3
                    </Button>
                </a>
            </div>

            {!reviewScript && (
                <div className="mt-4">
                    <Label>Transcript Used</Label>
                    <div className="bg-background border rounded-md p-4 h-48 overflow-y-auto text-sm font-mono mt-2 whitespace-pre-wrap">
                        {generatedScript}
                    </div>
                </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
