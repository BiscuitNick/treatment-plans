'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle,
  Circle,
  Clock,
  Trophy,
  Target,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type { GoalWithHistory } from '@/lib/types/suggestion';

interface PatientProgressViewProps {
  /** Plan ID to fetch progress for */
  planId: string;
}

/**
 * Patient-friendly status labels
 */
const statusLabels: Record<string, { label: string; color: string; icon: typeof Circle }> = {
  ACTIVE: { label: 'Working on it', color: 'text-blue-600 bg-blue-50', icon: Circle },
  IN_PROGRESS: { label: 'Making progress', color: 'text-purple-600 bg-purple-50', icon: TrendingUp },
  COMPLETED: { label: 'Achieved!', color: 'text-green-600 bg-green-50', icon: CheckCircle },
  MAINTAINED: { label: 'Keeping it up', color: 'text-teal-600 bg-teal-50', icon: Trophy },
  DEFERRED: { label: 'On hold', color: 'text-gray-500 bg-gray-50', icon: Clock },
  DISCONTINUED: { label: 'Changed direction', color: 'text-gray-400 bg-gray-50', icon: Circle },
};

/**
 * Format date for patient-friendly display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/**
 * Loading skeleton
 */
function ProgressSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-48" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-2 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * Milestone item component
 */
function MilestoneItem({ goal }: { goal: GoalWithHistory }) {
  const config = statusLabels[goal.currentStatus] || statusLabels.ACTIVE;
  const StatusIcon = config.icon;
  const isCompleted = goal.currentStatus === 'COMPLETED' || goal.currentStatus === 'MAINTAINED';

  // Get the most recent milestone date
  const latestUpdate = goal.history[goal.history.length - 1];

  return (
    <div className={`p-4 rounded-lg border ${isCompleted ? 'bg-green-50/50 border-green-100' : 'bg-card'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center flex-shrink-0`}>
          <StatusIcon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium">{goal.description}</h4>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className={config.color}>
              {config.label}
            </Badge>
            {latestUpdate && (
              <span className="text-xs text-muted-foreground">
                Updated {formatDate(latestUpdate.changedAt)}
              </span>
            )}
          </div>
        </div>
        {isCompleted && (
          <Trophy className="h-5 w-5 text-yellow-500 flex-shrink-0" />
        )}
      </div>
    </div>
  );
}

/**
 * PatientProgressView Component
 *
 * A simplified, patient-friendly view of their goal progress.
 * Shows milestones without clinical details.
 */
export function PatientProgressView({ planId }: PatientProgressViewProps) {
  const [goals, setGoals] = useState<GoalWithHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProgress() {
      try {
        const res = await fetch(`/api/plans/${planId}/goal-history`);
        if (!res.ok) throw new Error('Failed to fetch progress');
        const data = await res.json();
        setGoals(data.goals || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setIsLoading(false);
      }
    }
    fetchProgress();
  }, [planId]);

  if (isLoading) {
    return <ProgressSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (goals.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Target className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-medium mb-1">Your Journey Begins</h3>
          <p className="text-sm text-muted-foreground">
            Goals will appear here as you work with your therapist.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Separate completed and in-progress goals
  const completedGoals = goals.filter(g =>
    g.currentStatus === 'COMPLETED' || g.currentStatus === 'MAINTAINED'
  );
  const activeGoals = goals.filter(g =>
    g.currentStatus !== 'COMPLETED' &&
    g.currentStatus !== 'MAINTAINED' &&
    g.currentStatus !== 'DISCONTINUED'
  );

  // Calculate overall progress
  const totalGoals = goals.filter(g => g.currentStatus !== 'DISCONTINUED').length;
  const progressPercent = totalGoals > 0
    ? Math.round((completedGoals.length / totalGoals) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Progress overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Your Journey
          </CardTitle>
          <CardDescription>
            Track your progress toward your wellness goals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-3" />
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>{completedGoals.length} achieved</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span>{activeGoals.length} in progress</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievements section */}
      {completedGoals.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Achievements
          </h3>
          <div className="space-y-3">
            {completedGoals.map((goal) => (
              <MilestoneItem key={goal.goalId} goal={goal} />
            ))}
          </div>
        </div>
      )}

      {/* Active goals section */}
      {activeGoals.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            Current Focus
          </h3>
          <div className="space-y-3">
            {activeGoals.map((goal) => (
              <MilestoneItem key={goal.goalId} goal={goal} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
