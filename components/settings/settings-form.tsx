'use client'

import { useState } from 'react';
import { updateUserSettings } from '@/app/actions/settings';
import { REVIEW_FREQUENCY_OPTIONS, type ReviewFrequency } from '@/lib/constants/review-frequency';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from 'lucide-react';

interface SettingsFormProps {
  userId: string;
  initialSettings: {
    clinicalModality: string;
    llmModel: string;
    ttsModel: string;
    reviewFrequency: ReviewFrequency;
  };
}

export function SettingsForm({ userId, initialSettings }: SettingsFormProps) {
  const [modality, setModality] = useState(initialSettings.clinicalModality);
  const [llmModel, setLlmModel] = useState(initialSettings.llmModel);
  const [ttsModel, setTtsModel] = useState(initialSettings.ttsModel);
  const [reviewFrequency, setReviewFrequency] = useState<ReviewFrequency>(initialSettings.reviewFrequency);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const result = await updateUserSettings({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        clinicalModality: modality as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        llmModel: llmModel as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ttsModel: ttsModel as any,
        reviewFrequency,
        userId
      });
      
      if (result.success) {
        alert("Settings updated!");
      } else {
        alert("Failed to update settings.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuration</CardTitle>
        <CardDescription>
          Customize models and clinical preferences.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Clinical Modality */}
        <div className="space-y-2">
          <Label>Clinical Modality</Label>
          <Select value={modality} onValueChange={setModality}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CBT">CBT</SelectItem>
              <SelectItem value="DBT">DBT</SelectItem>
              <SelectItem value="ACT">ACT</SelectItem>
              <SelectItem value="Psychodynamic">Psychodynamic</SelectItem>
              <SelectItem value="Integrative">Integrative</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Influences the therapeutic style of generated scripts.</p>
        </div>

        {/* LLM Model */}
        <div className="space-y-2">
          <Label>Intelligence Model (Text Generation)</Label>
          <Select value={llmModel} onValueChange={setLlmModel}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-5.1">GPT-5.1 (Flagship - Best Quality)</SelectItem>
              <SelectItem value="gpt-5-mini">GPT-5 Mini (Fastest)</SelectItem>
              <SelectItem value="gpt-4o">GPT-4o (Legacy)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Used for generating transcripts and analyzing treatment plans.</p>
        </div>

        {/* TTS Model */}
        <div className="space-y-2">
          <Label>Voice Model (Audio Synthesis)</Label>
          <Select value={ttsModel} onValueChange={setTtsModel}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4o-mini-tts">GPT-4o Mini TTS (Best Quality - Style Support)</SelectItem>
              <SelectItem value="tts-1">TTS-1 (Standard - Faster)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Used for generating session audio.</p>
        </div>

        {/* Review Frequency */}
        <div className="space-y-2">
          <Label>Treatment Plan Review Frequency</Label>
          <Select value={reviewFrequency} onValueChange={(value) => setReviewFrequency(value as ReviewFrequency)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(REVIEW_FREQUENCY_OPTIONS).map(([key, option]) => (
                <SelectItem key={key} value={key}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">How often treatment plans should be reviewed. Plans will appear in the Reviews Due widget when approaching this interval.</p>
        </div>

      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Configuration
        </Button>
      </CardFooter>
    </Card>
  );
}
