'use client'

import { useEffect, useState } from 'react';
import { getPlanHistory, PlanHistoryItem } from '@/app/actions/plan-history';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, History, FileEdit, Calendar, Bot, Sparkles } from 'lucide-react';
import type { ChangeType } from '@prisma/client';

interface PlanHistoryProps {
  planId: string;
}

/**
 * Configuration for different change types
 */
const changeTypeConfig: Record<ChangeType, { label: string; color: string; icon: typeof FileEdit }> = {
  INITIAL: { label: 'Initial', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Sparkles },
  SESSION_UPDATE: { label: 'Session Update', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Bot },
  MANUAL_EDIT: { label: 'Manual Edit', color: 'bg-gray-50 text-gray-700 border-gray-200', icon: FileEdit },
  REVIEW_90_DAY: { label: '90-Day Review', color: 'bg-green-50 text-green-700 border-green-200', icon: Calendar },
};

/**
 * Format date and time
 */
function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
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
    <ScrollArea className="h-[350px] w-full rounded-md border p-4">
      <div className="space-y-4">
        {history.map((item, idx) => {
          const config = changeTypeConfig[item.changeType] || changeTypeConfig.MANUAL_EDIT;
          const TypeIcon = config.icon;
          const isLatest = idx === 0;

          return (
            <div key={item.id} className="flex flex-col space-y-2 pb-4 border-b last:border-0">
              {/* Header row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm flex items-center">
                    <History className="h-3 w-3 mr-1" />
                    Version {item.version}
                  </span>
                  {isLatest && (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      Current
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(item.createdAt)}
                </span>
              </div>

              {/* Change type badge */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`${config.color} text-xs`}>
                  <TypeIcon className="h-3 w-3 mr-1" />
                  {config.label}
                </Badge>
              </div>

              {/* Change summary or fallback to changeReason */}
              <div className="text-sm">
                {item.changeSummary ? (
                  <p className="text-foreground/80">{item.changeSummary}</p>
                ) : item.changeReason ? (
                  <p className="text-muted-foreground">{item.changeReason}</p>
                ) : (
                  <p className="text-muted-foreground italic">No description</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
