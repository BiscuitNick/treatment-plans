'use client'

import { useState } from 'react';
import { generateCustomAudio } from '@/app/actions/audio';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, Download } from 'lucide-react';

export default function AudioGeneratorPage() {
  const [patientProfile, setPatientProfile] = useState('Alex, 28, dealing with social anxiety at work.');
  const [therapistStyle, setTherapistStyle] = useState('CBT');
  const [duration, setDuration] = useState(20); // Turns
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ fileUrl: string, transcript: string } | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const res = await generateCustomAudio({ patientProfile, therapistStyle, duration });
      if (res.success && res.fileUrl) {
        setResult({ fileUrl: res.fileUrl, transcript: res.transcript || '' });
      } else {
        alert("Failed: " + res.error);
      }
    } catch (error) {
      console.error(error);
      alert("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Synthetic Audio Generator</h1>
        <p className="text-muted-foreground">Create custom therapy session audio for testing.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Define the parameters for the simulated session.</CardDescription>
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
        </CardContent>
        <CardFooter>
          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Audio (this may take a minute)...
              </>
            ) : (
              "Generate Audio"
            )}
          </Button>
        </CardFooter>
      </Card>

      {result && (
        <Card className="bg-green-50/50 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
                Generated Successfully
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <audio controls src={result.fileUrl} className="w-full" />
            
            <div className="flex gap-4">
                <a href={result.fileUrl} download="generated-session.mp3" className="w-full">
                    <Button variant="outline" className="w-full gap-2">
                        <Download className="h-4 w-4" /> Download MP3
                    </Button>
                </a>
            </div>

            <div className="mt-4">
                <Label>Transcript Preview</Label>
                <div className="bg-background border rounded-md p-4 h-48 overflow-y-auto text-sm font-mono mt-2 whitespace-pre-wrap">
                    {result.transcript}
                </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
