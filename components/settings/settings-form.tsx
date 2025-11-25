'use client'

import { useState } from 'react';
import { updateUserSettings } from '@/app/actions/settings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from 'lucide-react';

interface SettingsFormProps {
  userId: string;
  initialModality: string;
}

export function SettingsForm({ userId, initialModality }: SettingsFormProps) {
  const [modality, setModality] = useState(initialModality);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const result = await updateUserSettings({ 
        clinicalModality: modality as any, // Zod validation will catch invalid types
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
        <CardTitle>Clinical Preferences</CardTitle>
        <CardDescription>
          Customize how the AI analyzes sessions and generates treatment plans.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Primary Clinical Modality</Label>
          <Select value={modality} onValueChange={setModality}>
            <SelectTrigger>
              <SelectValue placeholder="Select modality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CBT">Cognitive Behavioral Therapy (CBT)</SelectItem>
              <SelectItem value="DBT">Dialectical Behavior Therapy (DBT)</SelectItem>
              <SelectItem value="ACT">Acceptance and Commitment Therapy (ACT)</SelectItem>
              <SelectItem value="Psychodynamic">Psychodynamic Therapy</SelectItem>
              <SelectItem value="Integrative">Integrative / Eclectic</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            This setting influences the terminology and interventions suggested in the treatment plan.
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Preferences
        </Button>
      </CardFooter>
    </Card>
  );
}