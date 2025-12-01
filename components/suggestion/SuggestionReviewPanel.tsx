'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Clock,
  FileText,
  Flag,
  Lightbulb,
  Target,
  TrendingUp,
  AlertTriangle,
  Plus,
  BookOpen,
  Edit,
  X,
  Check,
  HeartPulse,
  Meh,
  Sparkles,
  Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SuggestedChanges, GoalUpdate, NewGoal, RiskAssessment, HomeworkUpdate, SuggestedIntervention, DiagnosisUpdate } from '@/lib/schemas/suggestion';
import { Stethoscope } from 'lucide-react';
import type { TreatmentPlan } from '@/lib/schemas/plan';

/**
 * Props for the SuggestionReviewPanel component
 */
interface SuggestionReviewPanelProps {
  /** ID of the suggestion */
  suggestionId: string;
  /** Summary of the session */
  sessionSummary: string;
  /** Progress notes from the session */
  progressNotes?: string | null;
  /** The suggested changes from AI analysis */
  suggestedChanges: SuggestedChanges;
  /** Current treatment plan (for reference) */
  currentPlan?: TreatmentPlan | null;
  /** When the suggestion was created */
  createdAt?: string;
  /** Callback when approve is clicked */
  onApprove?: (modifications?: Partial<SuggestedChanges>, therapistNotes?: string) => void;
  /** Callback when reject is clicked */
  onReject?: (reason: string) => void;
  /** Whether actions are loading */
  isLoading?: boolean;
}

/**
 * Risk level colors and styling
 */
const riskLevelConfig = {
  LOW: { color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle },
  MEDIUM: { color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: AlertTriangle },
  HIGH: { color: 'bg-red-50 text-red-700 border-red-200', icon: AlertCircle },
};

/**
 * Goal status colors
 */
const goalStatusConfig: Record<string, string> = {
  ACTIVE: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-purple-50 text-purple-700 border-purple-200',
  COMPLETED: 'bg-green-50 text-green-700 border-green-200',
  MAINTAINED: 'bg-teal-50 text-teal-700 border-teal-200',
  DEFERRED: 'bg-gray-50 text-gray-600 border-gray-200',
  DISCONTINUED: 'bg-red-50 text-red-600 border-red-200',
};

/**
 * Available goal statuses
 */
const goalStatuses = ['ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'MAINTAINED', 'DEFERRED', 'DISCONTINUED'];

/**
 * Priority badge colors
 */
const priorityConfig: Record<string, string> = {
  HIGH: 'bg-red-50 text-red-700 border-red-200',
  MEDIUM: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  LOW: 'bg-gray-50 text-gray-600 border-gray-200',
};

/**
 * Track modifications for each item type
 */
interface ModificationState {
  goalUpdates: Map<number, { accepted: boolean; modifiedStatus?: string }>;
  newGoals: Map<number, { accepted: boolean; modifiedDescription?: string; modifiedRationale?: string }>;
  interventionsUsed: Set<number>;
  suggestedInterventions: Set<number>;
  homeworkAccepted: boolean;
  modifiedHomework?: string;
}

/**
 * Therapist Note Section (Session Summary)
 */
function TherapistNoteSection({ summary, progressNotes }: { summary: string; progressNotes?: string | null }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-muted-foreground" />
          Therapist Note
        </CardTitle>
        <CardDescription>Professional observations and clinical assessment.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{summary}</p>
        {progressNotes && (
          <div className="pt-2 border-t">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Progress Notes</h4>
            <p className="text-sm leading-relaxed text-muted-foreground break-words whitespace-pre-wrap">{progressNotes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Risk Assessment Section
 */
function RiskAssessmentSection({ riskAssessment }: { riskAssessment: RiskAssessment }) {
  const currentConfig = riskLevelConfig[riskAssessment.currentLevel];
  const suggestedConfig = riskLevelConfig[riskAssessment.suggestedLevel];
  const CurrentIcon = currentConfig.icon;
  const SuggestedIcon = suggestedConfig.icon;
  const hasChange = riskAssessment.currentLevel !== riskAssessment.suggestedLevel;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Flag className="h-5 w-5 text-muted-foreground" />
          Risk Assessment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Current:</span>
            <Badge variant="outline" className={currentConfig.color}>
              <CurrentIcon className="h-3 w-3 mr-1" />
              {riskAssessment.currentLevel}
            </Badge>
          </div>
          {hasChange && (
            <>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Suggested:</span>
                <Badge variant="outline" className={suggestedConfig.color}>
                  <SuggestedIcon className="h-3 w-3 mr-1" />
                  {riskAssessment.suggestedLevel}
                </Badge>
              </div>
            </>
          )}
          {!hasChange && (
            <span className="text-sm text-muted-foreground">(No change)</span>
          )}
        </div>

        <p className="text-sm text-muted-foreground">{riskAssessment.rationale}</p>

        {riskAssessment.flags.length > 0 && (
          <div className="pt-2 border-t">
            <h4 className="text-sm font-medium mb-2">Risk Flags</h4>
            <div className="flex flex-wrap gap-2">
              {riskAssessment.flags.map((flag, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {flag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Diagnosis Section
 */
function DiagnosisSection({ diagnosisUpdate, currentPlan }: { diagnosisUpdate: DiagnosisUpdate | null; currentPlan?: TreatmentPlan | null }) {
  const hasDiagnosis = diagnosisUpdate?.primaryDiagnosis;
  const hasExistingDiagnosis = currentPlan?.primaryDiagnosis;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Stethoscope className="h-5 w-5 text-muted-foreground" />
          Diagnosis
        </CardTitle>
        <CardDescription>Primary and secondary diagnostic codes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {diagnosisUpdate ? (
          <>
            {/* Primary Diagnosis */}
            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-sm font-medium text-muted-foreground w-20">Primary</span>
                {diagnosisUpdate.primaryDiagnosis ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono">
                      {diagnosisUpdate.primaryDiagnosis.code}
                    </Badge>
                    <span className="text-sm">{diagnosisUpdate.primaryDiagnosis.description}</span>
                    {diagnosisUpdate.isNew && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                        New
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground italic">Unable to determine from session</span>
                )}
              </div>
            </div>

            {/* Secondary Diagnoses */}
            {diagnosisUpdate.secondaryDiagnoses.length > 0 && (
              <div className="flex items-baseline gap-3">
                <span className="text-sm font-medium text-muted-foreground w-20">Secondary</span>
                <div className="space-y-1">
                  {diagnosisUpdate.secondaryDiagnoses.map((diagnosis, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono">
                        {diagnosis.code}
                      </Badge>
                      <span className="text-sm">{diagnosis.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rationale */}
            <div className="pt-2 border-t">
              <span className="text-sm font-medium text-muted-foreground">Rationale: </span>
              <span className="text-sm text-muted-foreground">{diagnosisUpdate.rationale}</span>
            </div>

            {/* Client Summary Preview */}
            {diagnosisUpdate.clientSummary && (
              <div className="pt-2 border-t">
                <span className="text-sm font-medium text-muted-foreground">Client-friendly summary: </span>
                <span className="text-sm">{diagnosisUpdate.clientSummary}</span>
                {diagnosisUpdate.isNew && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    New diagnosis will be hidden from client view until manually approved
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            {hasExistingDiagnosis
              ? 'No changes to existing diagnosis suggested'
              : 'Unable to determine diagnosis from this session. You can add one manually via Edit Plan.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Goal Updates Section with Edit Mode
 */
function GoalUpdatesSection({
  goalUpdates,
  currentPlan,
  isEditMode,
  modifications,
  onToggleAccept,
  onModifyStatus,
}: {
  goalUpdates: GoalUpdate[];
  currentPlan?: TreatmentPlan | null;
  isEditMode: boolean;
  modifications: ModificationState;
  onToggleAccept: (idx: number, accepted: boolean) => void;
  onModifyStatus: (idx: number, status: string) => void;
}) {
  if (goalUpdates.length === 0) {
    return null;
  }

  const acceptedCount = Array.from(modifications.goalUpdates.values()).filter(v => v.accepted).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          Goal Updates
          <Badge variant="secondary" className="ml-2">
            {isEditMode ? `${acceptedCount}/${goalUpdates.length}` : goalUpdates.length}
          </Badge>
        </CardTitle>
        <CardDescription>
          {isEditMode
            ? 'Select which goal updates to accept and optionally modify the suggested status'
            : 'Suggested status changes for existing goals'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {goalUpdates.map((update, idx) => {
            const goal = currentPlan?.clinicalGoals.find(g => g.id === update.goalId);
            const hasChange = update.currentStatus !== update.suggestedStatus;
            const modState = modifications.goalUpdates.get(idx) || { accepted: true };
            const isAccepted = modState.accepted;
            const displayStatus = modState.modifiedStatus || update.suggestedStatus;

            return (
              <div
                key={idx}
                className={`p-4 rounded-lg border bg-card space-y-3 transition-opacity ${
                  isEditMode && !isAccepted ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {isEditMode && (
                    <Checkbox
                      checked={isAccepted}
                      onCheckedChange={(checked) => onToggleAccept(idx, checked as boolean)}
                      className="mt-1"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">
                      {goal?.description || `Goal ${update.goalId}`}
                    </h4>
                  </div>
                  {isEditMode && !isAccepted && (
                    <Badge variant="outline" className="bg-gray-100 text-gray-500">
                      Excluded
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={goalStatusConfig[update.currentStatus] || 'bg-gray-50'}>
                    {update.currentStatus}
                  </Badge>
                  {hasChange && (
                    <>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      {isEditMode && isAccepted ? (
                        <Select
                          value={displayStatus}
                          onValueChange={(value) => onModifyStatus(idx, value)}
                        >
                          <SelectTrigger className="w-[160px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {goalStatuses.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className={goalStatusConfig[displayStatus] || 'bg-gray-50'}>
                          {displayStatus}
                        </Badge>
                      )}
                    </>
                  )}
                  {!hasChange && (
                    <span className="text-sm text-muted-foreground">(Status unchanged)</span>
                  )}
                </div>

                <div className="text-sm space-y-2">
                  <div>
                    <span className="font-medium text-muted-foreground">Progress: </span>
                    <span>{update.progressNote}</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Rationale: </span>
                    <span className="text-muted-foreground">{update.rationale}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * New Goals Section with Edit Mode
 */
function NewGoalsSection({
  newGoals,
  isEditMode,
  modifications,
  onToggleAccept,
  onModifyDescription,
  onModifyRationale,
}: {
  newGoals: NewGoal[];
  isEditMode: boolean;
  modifications: ModificationState;
  onToggleAccept: (idx: number, accepted: boolean) => void;
  onModifyDescription: (idx: number, description: string) => void;
  onModifyRationale: (idx: number, rationale: string) => void;
}) {
  if (newGoals.length === 0) {
    return null;
  }

  const acceptedCount = Array.from(modifications.newGoals.values()).filter(v => v.accepted).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plus className="h-5 w-5 text-muted-foreground" />
          New Goals
          <Badge variant="secondary" className="ml-2">
            {isEditMode ? `${acceptedCount}/${newGoals.length}` : newGoals.length}
          </Badge>
        </CardTitle>
        <CardDescription>
          {isEditMode
            ? 'Select which new goals to add and optionally edit their descriptions'
            : 'New goals identified from this session'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {newGoals.map((goal, idx) => {
            const modState = modifications.newGoals.get(idx) || { accepted: true };
            const isAccepted = modState.accepted;
            const displayDescription = modState.modifiedDescription || goal.description;
            const displayRationale = modState.modifiedRationale || goal.clinicalRationale;

            return (
              <div
                key={idx}
                className={`p-4 rounded-lg border bg-card space-y-3 transition-opacity ${
                  isEditMode && !isAccepted ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {isEditMode && (
                    <Checkbox
                      checked={isAccepted}
                      onCheckedChange={(checked) => onToggleAccept(idx, checked as boolean)}
                      className="mt-1"
                    />
                  )}
                  <div className="flex items-center gap-2 flex-1">
                    {goal.emoji && <span className="text-xl">{goal.emoji}</span>}
                    {isEditMode && isAccepted ? (
                      <Input
                        value={displayDescription}
                        onChange={(e) => onModifyDescription(idx, e.target.value)}
                        className="flex-1"
                      />
                    ) : (
                      <h4 className="font-medium text-sm">{displayDescription}</h4>
                    )}
                  </div>
                  <Badge variant="outline" className={isAccepted ? priorityConfig[goal.priority] : 'bg-gray-100 text-gray-500'}>
                    {isAccepted ? goal.priority : 'Excluded'}
                  </Badge>
                </div>

                <div className="text-sm space-y-2">
                  <div>
                    <span className="font-medium text-muted-foreground">Rationale: </span>
                    {isEditMode && isAccepted ? (
                      <Textarea
                        value={displayRationale}
                        onChange={(e) => onModifyRationale(idx, e.target.value)}
                        rows={2}
                        className="mt-1"
                      />
                    ) : (
                      <span className="text-muted-foreground">{displayRationale}</span>
                    )}
                  </div>
                  {goal.suggestedTargetDate && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Target: {goal.suggestedTargetDate}</span>
                    </div>
                  )}
                  {goal.clientDescription && (
                    <div className="pt-2 border-t mt-2">
                      <span className="font-medium text-muted-foreground">Client-friendly: </span>
                      <span>{goal.clientDescription}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Interventions Section with Edit Mode
 */
function InterventionsSection({
  used,
  suggested,
  isEditMode,
  modifications,
  onToggleUsed,
  onToggleSuggested,
}: {
  used: string[];
  suggested: SuggestedIntervention[];
  isEditMode: boolean;
  modifications: ModificationState;
  onToggleUsed: (idx: number, accepted: boolean) => void;
  onToggleSuggested: (idx: number, accepted: boolean) => void;
}) {
  if (used.length === 0 && suggested.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="h-5 w-5 text-muted-foreground" />
          Interventions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {used.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Used This Session</h4>
            <div className="flex flex-wrap gap-2">
              {used.map((intervention, idx) => {
                const isAccepted = !modifications.interventionsUsed.has(idx) || modifications.interventionsUsed.has(idx);
                // Default to accepted
                const isExcluded = isEditMode && modifications.interventionsUsed.has(idx) === false;

                return (
                  <div key={idx} className="flex items-center gap-1">
                    {isEditMode && (
                      <Checkbox
                        checked={!modifications.interventionsUsed.has(idx)}
                        onCheckedChange={(checked) => onToggleUsed(idx, checked as boolean)}
                        className="h-3 w-3"
                      />
                    )}
                    <Badge
                      variant="outline"
                      className={`${
                        isExcluded
                          ? 'bg-gray-100 text-gray-400 line-through'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {intervention}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {suggested.length > 0 && (
          <div className={used.length > 0 ? 'pt-3 border-t' : ''}>
            <h4 className="text-sm font-medium mb-2">Suggested for Future</h4>
            <div className="space-y-2">
              {suggested.map((item, idx) => {
                const isAccepted = !modifications.suggestedInterventions.has(idx);

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-md bg-muted/50 flex items-start gap-2 ${
                      isEditMode && !isAccepted ? 'opacity-50' : ''
                    }`}
                  >
                    {isEditMode && (
                      <Checkbox
                        checked={isAccepted}
                        onCheckedChange={(checked) => onToggleSuggested(idx, checked as boolean)}
                        className="mt-0.5"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.intervention}</div>
                      <div className="text-xs text-muted-foreground mt-1">{item.rationale}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Homework Update Section with Edit Mode
 */
function HomeworkSection({
  homework,
  isEditMode,
  isAccepted,
  modifiedHomework,
  onToggleAccept,
  onModifyHomework,
}: {
  homework: HomeworkUpdate | null;
  isEditMode: boolean;
  isAccepted: boolean;
  modifiedHomework?: string;
  onToggleAccept: (accepted: boolean) => void;
  onModifyHomework: (value: string) => void;
}) {
  if (!homework) {
    return null;
  }

  const displayHomework = modifiedHomework || homework.suggested;

  return (
    <Card className={isEditMode && !isAccepted ? 'opacity-50' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          {isEditMode && (
            <Checkbox
              checked={isAccepted}
              onCheckedChange={(checked) => onToggleAccept(checked as boolean)}
            />
          )}
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            Homework Update
            {isEditMode && !isAccepted && (
              <Badge variant="outline" className="ml-2 bg-gray-100 text-gray-500">
                Excluded
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-3 rounded-md bg-muted/30">
            <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Current</h4>
            <p className="text-sm">{homework.current}</p>
          </div>
          <div className="p-3 rounded-md bg-green-50 border border-green-100 dark:bg-green-900/20 dark:border-green-800">
            <h4 className="text-xs font-medium text-green-700 dark:text-green-400 uppercase mb-2">Suggested</h4>
            {isEditMode && isAccepted ? (
              <Textarea
                value={displayHomework}
                onChange={(e) => onModifyHomework(e.target.value)}
                rows={3}
                className="bg-white dark:bg-background"
              />
            ) : (
              <p className="text-sm">{displayHomework}</p>
            )}
          </div>
        </div>
        <div className="text-sm">
          <span className="font-medium text-muted-foreground">Rationale: </span>
          <span className="text-muted-foreground">{homework.rationale}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Feedback Section - for improving AI suggestions
 */
function FeedbackSection({
  feedback,
  onChange
}: {
  feedback: string;
  onChange: (value: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-muted-foreground" />
          Feedback
        </CardTitle>
        <CardDescription>
          Help improve future AI suggestions by sharing what worked well or could be better. This feedback is used to enhance the quality of generated recommendations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder="Share your feedback on these suggestions to help improve future recommendations..."
          value={feedback}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="resize-none"
        />
      </CardContent>
    </Card>
  );
}

/**
 * Main SuggestionReviewPanel Component
 *
 * Displays AI-generated suggestions for therapist review.
 * Supports edit mode to selectively accept/reject and modify suggestions.
 */
export function SuggestionReviewPanel({
  suggestionId,
  sessionSummary,
  progressNotes,
  suggestedChanges,
  currentPlan,
  createdAt,
  onApprove,
  onReject,
  isLoading = false,
}: SuggestionReviewPanelProps) {
  const [feedback, setFeedback] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewMode, setViewMode] = useState<'therapist' | 'client'>('therapist');

  // Initialize modification state
  const [modifications, setModifications] = useState<ModificationState>(() => {
    const goalUpdates = new Map<number, { accepted: boolean; modifiedStatus?: string }>();
    suggestedChanges.goalUpdates.forEach((_, idx) => {
      goalUpdates.set(idx, { accepted: true });
    });

    const newGoals = new Map<number, { accepted: boolean; modifiedDescription?: string; modifiedRationale?: string }>();
    suggestedChanges.newGoals.forEach((_, idx) => {
      newGoals.set(idx, { accepted: true });
    });

    return {
      goalUpdates,
      newGoals,
      interventionsUsed: new Set<number>(),
      suggestedInterventions: new Set<number>(),
      homeworkAccepted: true,
      modifiedHomework: undefined,
    };
  });

  const hasHighRisk = suggestedChanges.riskAssessment.suggestedLevel === 'HIGH';
  const hasChanges =
    suggestedChanges.goalUpdates.length > 0 ||
    suggestedChanges.newGoals.length > 0 ||
    suggestedChanges.homeworkUpdate !== null ||
    suggestedChanges.riskAssessment.currentLevel !== suggestedChanges.riskAssessment.suggestedLevel;

  // Check if any modifications were made
  const hasModifications = useMemo(() => {
    // Check goal updates
    for (const [idx, mod] of modifications.goalUpdates.entries()) {
      if (!mod.accepted) return true;
      if (mod.modifiedStatus && mod.modifiedStatus !== suggestedChanges.goalUpdates[idx].suggestedStatus) {
        return true;
      }
    }

    // Check new goals
    for (const [idx, mod] of modifications.newGoals.entries()) {
      if (!mod.accepted) return true;
      if (mod.modifiedDescription && mod.modifiedDescription !== suggestedChanges.newGoals[idx].description) {
        return true;
      }
      if (mod.modifiedRationale && mod.modifiedRationale !== suggestedChanges.newGoals[idx].clinicalRationale) {
        return true;
      }
    }

    // Check interventions
    if (modifications.interventionsUsed.size > 0) return true;
    if (modifications.suggestedInterventions.size > 0) return true;

    // Check homework
    if (!modifications.homeworkAccepted && suggestedChanges.homeworkUpdate) return true;
    if (modifications.modifiedHomework && modifications.modifiedHomework !== suggestedChanges.homeworkUpdate?.suggested) {
      return true;
    }

    return false;
  }, [modifications, suggestedChanges]);

  // Build the modifications object for the API
  const buildModifications = (): Partial<SuggestedChanges> | undefined => {
    if (!hasModifications) return undefined;

    const mods: Partial<SuggestedChanges> = {};

    // Filter and modify goal updates
    const filteredGoalUpdates = suggestedChanges.goalUpdates
      .map((update, idx) => {
        const mod = modifications.goalUpdates.get(idx);
        if (!mod?.accepted) return null;
        return {
          ...update,
          suggestedStatus: mod.modifiedStatus || update.suggestedStatus,
        };
      })
      .filter((u): u is GoalUpdate => u !== null);

    if (filteredGoalUpdates.length !== suggestedChanges.goalUpdates.length ||
        filteredGoalUpdates.some((u, i) => u.suggestedStatus !== suggestedChanges.goalUpdates[i].suggestedStatus)) {
      mods.goalUpdates = filteredGoalUpdates;
    }

    // Filter and modify new goals
    const filteredNewGoals = suggestedChanges.newGoals
      .map((goal, idx) => {
        const mod = modifications.newGoals.get(idx);
        if (!mod?.accepted) return null;
        return {
          ...goal,
          description: mod.modifiedDescription || goal.description,
          clinicalRationale: mod.modifiedRationale || goal.clinicalRationale,
        };
      })
      .filter((g): g is NewGoal => g !== null);

    if (filteredNewGoals.length !== suggestedChanges.newGoals.length ||
        filteredNewGoals.some((g, i) =>
          g.description !== suggestedChanges.newGoals[i].description ||
          g.clinicalRationale !== suggestedChanges.newGoals[i].clinicalRationale)) {
      mods.newGoals = filteredNewGoals;
    }

    // Filter interventions
    if (modifications.interventionsUsed.size > 0) {
      mods.interventionsUsed = suggestedChanges.interventionsUsed.filter((_, idx) =>
        !modifications.interventionsUsed.has(idx)
      );
    }

    if (modifications.suggestedInterventions.size > 0) {
      mods.suggestedInterventions = suggestedChanges.suggestedInterventions.filter((_, idx) =>
        !modifications.suggestedInterventions.has(idx)
      );
    }

    // Handle homework
    if (!modifications.homeworkAccepted) {
      mods.homeworkUpdate = null;
    } else if (modifications.modifiedHomework && suggestedChanges.homeworkUpdate) {
      mods.homeworkUpdate = {
        ...suggestedChanges.homeworkUpdate,
        suggested: modifications.modifiedHomework,
      };
    }

    return Object.keys(mods).length > 0 ? mods : undefined;
  };

  // Handler functions
  const handleGoalUpdateToggle = (idx: number, accepted: boolean) => {
    setModifications(prev => {
      const newMap = new Map(prev.goalUpdates);
      const existing = newMap.get(idx) || { accepted: true };
      newMap.set(idx, { ...existing, accepted });
      return { ...prev, goalUpdates: newMap };
    });
  };

  const handleGoalUpdateStatusChange = (idx: number, status: string) => {
    setModifications(prev => {
      const newMap = new Map(prev.goalUpdates);
      const existing = newMap.get(idx) || { accepted: true };
      newMap.set(idx, { ...existing, modifiedStatus: status });
      return { ...prev, goalUpdates: newMap };
    });
  };

  const handleNewGoalToggle = (idx: number, accepted: boolean) => {
    setModifications(prev => {
      const newMap = new Map(prev.newGoals);
      const existing = newMap.get(idx) || { accepted: true };
      newMap.set(idx, { ...existing, accepted });
      return { ...prev, newGoals: newMap };
    });
  };

  const handleNewGoalDescriptionChange = (idx: number, description: string) => {
    setModifications(prev => {
      const newMap = new Map(prev.newGoals);
      const existing = newMap.get(idx) || { accepted: true };
      newMap.set(idx, { ...existing, modifiedDescription: description });
      return { ...prev, newGoals: newMap };
    });
  };

  const handleNewGoalRationaleChange = (idx: number, rationale: string) => {
    setModifications(prev => {
      const newMap = new Map(prev.newGoals);
      const existing = newMap.get(idx) || { accepted: true };
      newMap.set(idx, { ...existing, modifiedRationale: rationale });
      return { ...prev, newGoals: newMap };
    });
  };

  const handleInterventionUsedToggle = (idx: number, accepted: boolean) => {
    setModifications(prev => {
      const newSet = new Set(prev.interventionsUsed);
      if (accepted) {
        newSet.delete(idx);
      } else {
        newSet.add(idx);
      }
      return { ...prev, interventionsUsed: newSet };
    });
  };

  const handleSuggestedInterventionToggle = (idx: number, accepted: boolean) => {
    setModifications(prev => {
      const newSet = new Set(prev.suggestedInterventions);
      if (accepted) {
        newSet.delete(idx);
      } else {
        newSet.add(idx);
      }
      return { ...prev, suggestedInterventions: newSet };
    });
  };

  const handleHomeworkToggle = (accepted: boolean) => {
    setModifications(prev => ({ ...prev, homeworkAccepted: accepted }));
  };

  const handleHomeworkChange = (value: string) => {
    setModifications(prev => ({ ...prev, modifiedHomework: value }));
  };

  const handleApprove = () => {
    if (!onApprove) return;
    const mods = buildModifications();
    onApprove(mods, feedback || undefined);
  };

  return (
    <div className="flex flex-col h-full w-full max-h-[calc(100vh-14rem)] overflow-hidden">
      {/* High Risk Alert */}
      {hasHighRisk && (
        <Alert variant="destructive" className="mb-4 flex-shrink-0">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>High Risk Assessment</AlertTitle>
          <AlertDescription>
            This session has been flagged as high risk. Please review carefully before proceeding.
          </AlertDescription>
        </Alert>
      )}

      {/* View Toggle */}
      <div className="flex items-center gap-3 pb-3 mb-3 border-b flex-shrink-0">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">View</span>
        <div className="flex space-x-2">
          <Button
            variant={viewMode === 'therapist' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('therapist')}
            className={cn(viewMode === 'therapist' && "pointer-events-none")}
          >
            <HeartPulse className="h-4 w-4 mr-2" />
            Therapist
          </Button>
          <Button
            variant={viewMode === 'client' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('client')}
            className={cn(viewMode === 'client' && "pointer-events-none")}
          >
            <Meh className="h-4 w-4 mr-2" />
            Client
          </Button>
        </div>
      </div>

      {/* Header with timestamp and edit toggle - only in therapist view */}
      {viewMode === 'therapist' && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 flex-shrink-0">
          <p className="text-sm text-muted-foreground">
            {isEditMode
              ? 'Select items to accept and optionally modify them'
              : 'Review and approve changes before they are applied to the treatment plan'}
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            {createdAt && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {new Date(createdAt).toLocaleDateString()}
              </Badge>
            )}
            <Button
              variant={isEditMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsEditMode(!isEditMode)}
            >
              {isEditMode ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Done Editing
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Selection
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Edit mode notice */}
      {viewMode === 'therapist' && isEditMode && (
        <Alert className="mb-4 flex-shrink-0">
          <Edit className="h-4 w-4" />
          <AlertTitle>Edit Mode</AlertTitle>
          <AlertDescription>
            Uncheck items to exclude them from approval. You can also modify goal statuses and descriptions.
          </AlertDescription>
        </Alert>
      )}

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-4 pr-4">
          {/* ========== THERAPIST VIEW ========== */}
          {viewMode === 'therapist' && (
            <>
              {/* Risk Assessment - shown first to match saved treatment plan order */}
              <RiskAssessmentSection riskAssessment={suggestedChanges.riskAssessment} />

              {/* Diagnosis */}
              <DiagnosisSection diagnosisUpdate={suggestedChanges.diagnosisUpdate} currentPlan={currentPlan} />

              {/* Therapist Note (Session Summary) */}
              <TherapistNoteSection summary={sessionSummary} progressNotes={progressNotes} />

              {/* Goal Updates */}
              <GoalUpdatesSection
                goalUpdates={suggestedChanges.goalUpdates}
                currentPlan={currentPlan}
                isEditMode={isEditMode}
                modifications={modifications}
                onToggleAccept={handleGoalUpdateToggle}
                onModifyStatus={handleGoalUpdateStatusChange}
              />

              {/* New Goals */}
              <NewGoalsSection
                newGoals={suggestedChanges.newGoals}
                isEditMode={isEditMode}
                modifications={modifications}
                onToggleAccept={handleNewGoalToggle}
                onModifyDescription={handleNewGoalDescriptionChange}
                onModifyRationale={handleNewGoalRationaleChange}
              />

              {/* Interventions */}
              <InterventionsSection
                used={suggestedChanges.interventionsUsed}
                suggested={suggestedChanges.suggestedInterventions}
                isEditMode={isEditMode}
                modifications={modifications}
                onToggleUsed={handleInterventionUsedToggle}
                onToggleSuggested={handleSuggestedInterventionToggle}
              />

              {/* Homework Update */}
              <HomeworkSection
                homework={suggestedChanges.homeworkUpdate}
                isEditMode={isEditMode}
                isAccepted={modifications.homeworkAccepted}
                modifiedHomework={modifications.modifiedHomework}
                onToggleAccept={handleHomeworkToggle}
                onModifyHomework={handleHomeworkChange}
              />

              {/* Feedback - for improving AI suggestions */}
              <FeedbackSection
                feedback={feedback}
                onChange={setFeedback}
              />
            </>
          )}

          {/* ========== CLIENT VIEW ========== */}
          {viewMode === 'client' && (
            <>
              {/* Session Summary - warm client-facing version */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    Session Summary
                  </CardTitle>
                  <CardDescription>A warm summary of what we discussed today.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">
                    {suggestedChanges.clientSummary || sessionSummary}
                  </p>
                </CardContent>
              </Card>

              {/* Understanding Your Path - Client Diagnosis (if available and not new/hidden) */}
              {suggestedChanges.diagnosisUpdate?.clientSummary && !suggestedChanges.diagnosisUpdate?.isNew && (
                <Card className="border-purple-200 bg-purple-50/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg text-purple-900">
                      <Heart className="h-5 w-5 text-purple-500" />
                      Understanding Your Path
                    </CardTitle>
                    <CardDescription>What we&apos;re working on together.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-purple-900">
                      {suggestedChanges.diagnosisUpdate.clientSummary}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Your Goals - Client-friendly goal view */}
              {(suggestedChanges.newGoals.length > 0 || (currentPlan?.clientGoals && currentPlan.clientGoals.length > 0)) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Target className="h-5 w-5 text-blue-500" />
                      Your Goals
                    </CardTitle>
                    <CardDescription>Things we&apos;re working toward together.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Existing client goals */}
                    {currentPlan?.clientGoals?.map((goal) => (
                      <div key={goal.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <span className="text-2xl">{goal.emoji || '🎯'}</span>
                        <div>
                          <p className="font-medium text-sm">{goal.description}</p>
                        </div>
                      </div>
                    ))}
                    {/* New goals being added */}
                    {suggestedChanges.newGoals.map((goal, idx) => (
                      <div key={`new-${idx}`} className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                        <span className="text-2xl">{goal.emoji || '🎯'}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{goal.clientDescription || goal.description}</p>
                            <Badge variant="outline" className="bg-green-100 text-green-700 text-xs">New</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Homework - Client-friendly homework view */}
              {suggestedChanges.homeworkUpdate && (
                <Card className="border-amber-200 bg-amber-50/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg text-amber-900">
                      <BookOpen className="h-5 w-5 text-amber-500" />
                      Your Practice for This Week
                    </CardTitle>
                    <CardDescription>Things to try before our next session.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-amber-900">
                      {suggestedChanges.homeworkUpdate.suggested}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Preview notice */}
              <Alert className="bg-blue-50 border-blue-200">
                <Sparkles className="h-4 w-4 text-blue-500" />
                <AlertTitle className="text-blue-900">Client Preview</AlertTitle>
                <AlertDescription className="text-blue-700">
                  This is how the suggested changes will appear to your client after approval.
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Actions */}
      {(onApprove || onReject) && (
        <div className="pt-4 mt-4 border-t flex-shrink-0 space-y-3">
          {hasModifications && (
            <div className="flex justify-center">
              <Badge variant="secondary" className="text-xs">
                Changes pending
              </Badge>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {onReject && (
              <Button
                variant="outline"
                onClick={() => onReject(feedback || 'No reason provided')}
                disabled={isLoading}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                Reject All
              </Button>
            )}
            {onApprove && (
              <Button
                onClick={handleApprove}
                disabled={isLoading || !hasChanges}
                className="w-full"
              >
                <Check className="h-4 w-4 mr-2" />
                {isLoading ? 'Processing...' : hasModifications ? 'Approve' : 'Approve All'}
              </Button>
            )}
          </div>
        </div>
      )}

      {!hasChanges && (
        <p className="text-sm text-muted-foreground text-center py-2 flex-shrink-0">
          No significant changes were suggested for this session.
        </p>
      )}
    </div>
  );
}
