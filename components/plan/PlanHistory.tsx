'use client'

import { useEffect, useState } from 'react';
import { getPlanHistory, PlanHistoryItem } from '@/app/actions/plan-history';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, History } from 'lucide-react';

interface PlanHistoryProps {
  planId: string;
}

export function PlanHistory({ planId }: PlanHistoryProps) {
  const [history, setHistory] = useState<PlanHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getPlanHistory(planId);
        setHistory(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [planId]);

  if (loading) {
    return <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (history.length === 0) {
    return <div className="text-sm text-muted-foreground p-4">No history available.</div>;
  }

  return (
    <ScrollArea className="h-[300px] w-full rounded-md border p-4">
      <div className="space-y-4">
        {history.map((item) => (
          <div key={item.id} className="flex flex-col space-y-1 pb-4 border-b last:border-0">
            <div className="flex items-center justify-between">
                <span className="font-medium text-sm flex items-center">
                    <History className="h-3 w-3 mr-1" />
                    Version {item.version}
                </span>
                <span className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt))}
                </span>
            </div>
            <p className="text-xs text-muted-foreground">
                {item.changeReason || "No changes recorded"}
            </p>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
