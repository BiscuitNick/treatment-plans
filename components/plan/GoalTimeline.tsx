'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Target,
  CheckCircle,
  Clock,
  AlertCircle,
  Circle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GoalWithHistory, GoalHistoryEntry } from '@/lib/types/suggestion';

interface GoalTimelineProps {
  /** Plan ID to fetch history for */
  planId: string;
  /** Pre-loaded data (optional, will fetch if not provided) */
  initialData?: GoalWithHistory[];
  /** Whether to show in compact mode */
  compact?: boolean;
}

/**
 * Status configuration with colors, icons, and formatted labels
 * Matches the styling in TherapistView for consistency
 */
const statusConfig: Record<string, { color: string; bgColor: string; borderColor: string; icon: typeof Circle; label: string }> = {
  NEW: { color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', icon: Circle, label: 'New' },
  ACTIVE: { color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', icon: Circle, label: 'Active' },
  IN_PROGRESS: { color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', icon: Clock, label: 'In Progress' },
  COMPLETED: { color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200', icon: CheckCircle, label: 'Completed' },
  MAINTAINED: { color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200', icon: CheckCircle, label: 'Maintained' },
  DEFERRED: { color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200', icon: AlertCircle, label: 'Deferred' },
  DISCONTINUED: { color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200', icon: AlertCircle, label: 'Discontinued' },
  UNKNOWN: { color: 'text-gray-500', bgColor: 'bg-gray-50', borderColor: 'border-gray-200', icon: Circle, label: 'Unknown' },
};

/**
 * Get formatted status label
 */
function getStatusLabel(status: string): string {
  return statusConfig[status]?.label || status;
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * Single timeline entry component
 */
function TimelineEntry({
  entry,
  isLast,
}: {
  entry: GoalHistoryEntry;
  isLast: boolean;
}) {
  const config = statusConfig[entry.newStatus] || statusConfig.UNKNOWN;
  const StatusIcon = config.icon;

  return (
    <div className="flex gap-3">
      {/* Timeline line and dot */}
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center`}>
          <StatusIcon className={`h-4 w-4 ${config.color}`} />
        </div>
        {!isLast && <div className="w-0.5 h-full min-h-[40px] bg-border" />}
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`${config.bgColor} ${config.color} ${config.borderColor}`}>
            {getStatusLabel(entry.newStatus)}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(entry.changedAt)}
          </span>
        </div>

        <p className="text-xs text-muted-foreground mt-1">
          {formatDate(entry.changedAt)}
          {entry.previousStatus !== 'NEW' && (
            <span className="ml-2">
              (from {getStatusLabel(entry.previousStatus)})
            </span>
          )}
        </p>

        {entry.reason && (
          <p className="text-sm mt-2 text-foreground/80">{entry.reason}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Single goal with its timeline
 */
function GoalTimelineCard({
  goal,
  compact = false,
}: {
  goal: GoalWithHistory;
  compact?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const currentConfig = statusConfig[goal.currentStatus] || statusConfig.UNKNOWN;
  const CurrentIcon = currentConfig.icon;

  const hasHistory = goal.history.length > 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className={`pb-3 ${hasHistory ? 'cursor-pointer hover:bg-muted/50' : ''}`}
        onClick={() => hasHistory && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1">
            <div className={`w-10 h-10 rounded-full ${currentConfig.bgColor} flex items-center justify-center flex-shrink-0`}>
              <CurrentIcon className={`h-5 w-5 ${currentConfig.color}`} />
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <CardTitle className="text-base font-medium leading-snug break-words">
                {goal.description}
              </CardTitle>
              <CardDescription className="mt-1">
                <Badge variant="outline" className={`${currentConfig.bgColor} ${currentConfig.color} ${currentConfig.borderColor}`}>
                  {getStatusLabel(goal.currentStatus)}
                </Badge>
                {hasHistory && (
                  <span className="text-xs ml-2">
                    {goal.history.length} update{goal.history.length !== 1 ? 's' : ''}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>

          {hasHistory && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      {isExpanded && hasHistory && (
        <CardContent className="pt-0">
          <div className="border-t pt-4">
            <h4 className="text-xs font-medium text-muted-foreground uppercase mb-4">
              Status History
            </h4>
            <div className="space-y-0">
              {goal.history.map((entry, idx) => (
                <TimelineEntry
                  key={entry.id}
                  entry={entry}
                  isLast={idx === goal.history.length - 1}
                />
              ))}
            </div>
          </div>
        </CardContent>
      )}

      {!hasHistory && (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            No status changes recorded yet.
          </p>
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Loading skeleton
 */
function TimelineSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

/**
 * GoalTimeline Component
 *
 * Displays a visual timeline of goal status changes over time.
 * Each goal is shown as a card with expandable history.
 */
export function GoalTimeline({ planId, initialData, compact = false }: GoalTimelineProps) {
  const [goals, setGoals] = useState<GoalWithHistory[]>(initialData || []);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setGoals(initialData);
      setIsLoading(false);
      return;
    }

    async function fetchHistory() {
      try {
        const res = await fetch(`/api/plans/${planId}/goal-history`);
        if (!res.ok) {
          throw new Error('Failed to fetch goal history');
        }
        const data = await res.json();
        setGoals(data.goals || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setIsLoading(false);
      }
    }

    fetchHistory();
  }, [planId, initialData]);

  if (isLoading) {
    return <TimelineSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (goals.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No goals found for this plan.</p>
        </CardContent>
      </Card>
    );
  }

  // Separate goals with history from those without
  const goalsWithHistory = goals.filter(g => g.history.length > 0);
  const goalsWithoutHistory = goals.filter(g => g.history.length === 0);

  return (
    <div className="rounded-md border p-4 bg-muted/10 space-y-6">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Goal Progress</h3>
          <p className="text-sm text-muted-foreground">
            {goals.length} goal{goals.length !== 1 ? 's' : ''} • {goalsWithHistory.length} with history
          </p>
        </div>
      </div>

      {/* Goals with history */}
      {goalsWithHistory.length > 0 && (
        <div className="space-y-4">
          {goalsWithHistory.map((goal) => (
            <GoalTimelineCard key={goal.goalId} goal={goal} compact={compact} />
          ))}
        </div>
      )}

      {/* Goals without history (collapsed) */}
      {goalsWithoutHistory.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Goals without updates ({goalsWithoutHistory.length})
          </h4>
          <div className="grid gap-2">
            {goalsWithoutHistory.map((goal) => {
              const config = statusConfig[goal.currentStatus] || statusConfig.UNKNOWN;
              const StatusIcon = config.icon;

              return (
                <div
                  key={goal.goalId}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className={`w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <StatusIcon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-sm font-medium break-words">{goal.description}</p>
                  </div>
                  <Badge variant="outline" className={`${config.bgColor} ${config.color} ${config.borderColor} flex-shrink-0`}>
                    {getStatusLabel(goal.currentStatus)}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
