'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsForm } from '@/components/settings/settings-form';
import { AudioGenerator } from './audio-generator';
import { Settings, AudioWaveform } from 'lucide-react';
import type { ReviewFrequency } from '@/lib/constants/review-frequency';

interface PatientOption {
  id: string;
  name: string;
  sessionCount: number;
}

interface ToolsPageClientProps {
  userId: string;
  initialSettings: {
    clinicalModality: string;
    llmModel: string;
    ttsModel: string;
    sttModel: string;
    reviewFrequency: ReviewFrequency;
  };
  patients: PatientOption[];
}

export function ToolsPageClient({ userId, initialSettings, patients }: ToolsPageClientProps) {
  return (
    <div className="container mx-auto py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tools</h1>
        <p className="text-muted-foreground">Manage settings and access development tools.</p>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="audio" className="gap-2">
            <AudioWaveform className="h-4 w-4" />
            Audio Tools
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-6">
          <div className="max-w-2xl">
            <SettingsForm userId={userId} initialSettings={initialSettings} />
          </div>
        </TabsContent>

        <TabsContent value="audio" className="mt-6">
          <AudioGenerator userId={userId} patients={patients} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
