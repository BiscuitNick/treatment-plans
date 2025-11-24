'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { generateDemoSession } from '@/app/actions/generateDemoSession';
import { useRouter } from 'next/navigation';

interface MagicButtonProps {
  userId: string;
}

export function MagicButton({ userId }: MagicButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateDemoSession(userId);
      if (result.success) {
        // Ideally show a toast here
        console.log("Demo session generated!");
        router.refresh();
      } else {
        console.error(result.error);
        alert("Failed to generate demo session: " + result.error);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="secondary" 
      className="gap-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 border border-purple-200 text-purple-700"
      onClick={handleGenerate}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      {loading ? "Generating..." : "Simulate Session"}
    </Button>
  );
}
