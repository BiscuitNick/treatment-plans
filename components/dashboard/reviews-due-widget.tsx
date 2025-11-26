'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, AlertCircle, Clock, ChevronRight, User } from 'lucide-react';
import Link from 'next/link';
import type { ReviewDueItem } from '@/lib/types/suggestion';

interface ReviewsDueWidgetProps {
  /** Maximum number of items to show */
  maxItems?: number;
}

interface ReviewsData {
  reviews: ReviewDueItem[];
  summary: {
    total: number;
    overdue: number;
    dueSoon: number;
  };
}

/**
 * Format days for display
 */
function formatDays(days: number): string {
  if (days === 0) return 'Due today';
  if (days === 1) return '1 day overdue';
  if (days > 1) return `${days} days overdue`;
  if (days === -1) return 'Due tomorrow';
  return `Due in ${Math.abs(days)} days`;
}

/**
 * Get badge color based on days overdue
 */
function getUrgencyColor(daysOverdue: number): string {
  if (daysOverdue > 7) return 'bg-red-100 text-red-800 border-red-200';
  if (daysOverdue > 0) return 'bg-orange-100 text-orange-800 border-orange-200';
  return 'bg-yellow-100 text-yellow-800 border-yellow-200';
}

/**
 * Loading skeleton
 */
function WidgetSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * ReviewsDueWidget Component
 *
 * Displays a list of treatment plans that are due or overdue for 90-day review.
 */
export function ReviewsDueWidget({ maxItems = 5 }: ReviewsDueWidgetProps) {
  const [data, setData] = useState<ReviewsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReviews() {
      try {
        const res = await fetch('/api/dashboard/reviews-due');
        if (!res.ok) throw new Error('Failed to fetch reviews');
        const result = await res.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setIsLoading(false);
      }
    }
    fetchReviews();
  }, []);

  if (isLoading) {
    return <WidgetSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.reviews.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            90-Day Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-6 text-center">
            <Calendar className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <p className="text-sm text-muted-foreground">All reviews are up to date!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayedReviews = data.reviews.slice(0, maxItems);
  const hasMore = data.reviews.length > maxItems;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            90-Day Reviews
          </CardTitle>
          {data.summary.overdue > 0 && (
            <Badge variant="destructive" className="text-xs">
              {data.summary.overdue} overdue
            </Badge>
          )}
        </div>
        <CardDescription>
          {data.summary.total} plan{data.summary.total !== 1 ? 's' : ''} need{data.summary.total === 1 ? 's' : ''} review
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <ScrollArea className={displayedReviews.length > 3 ? 'h-[200px]' : ''}>
          <div className="space-y-3">
            {displayedReviews.map((review) => (
              <Link
                key={review.planId}
                href={`/patients/${review.patientId}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {review.patientName.split(' - ')[0]}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-xs ${getUrgencyColor(review.daysOverdue)}`}
                    >
                      {review.daysOverdue > 0 ? (
                        <AlertCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <Clock className="h-3 w-3 mr-1" />
                      )}
                      {formatDays(review.daysOverdue)}
                    </Badge>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </ScrollArea>

        {hasMore && (
          <div className="pt-3 border-t mt-3">
            <Button variant="ghost" size="sm" className="w-full" asChild>
              <Link href="/patients">
                View all {data.reviews.length} reviews
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
