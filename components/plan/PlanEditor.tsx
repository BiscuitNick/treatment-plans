'use client'

import { useState } from 'react';
import { TreatmentPlan, Diagnosis } from '@/lib/schemas/plan';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash, Save, X, Loader2, AlertCircle, CheckCircle, AlertTriangle, HeartPulse, Meh } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ICD10_CODES, searchICD10Codes } from '@/lib/icd10-codes';

type EditorViewMode = 'therapist' | 'client';

// Simple Textarea since shadcn doesn't have one installed by default in my previous command
// or I can just use the standard one styled like Input
function Textarea({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      {...props}
    />
  );
}

// Diagnosis Code Selector Component with custom input support
function DiagnosisSelector({
  value,
  onChange,
  placeholder = "Search diagnosis code..."
}: {
  value: Diagnosis | undefined;
  onChange: (diagnosis: Diagnosis | undefined) => void;
  placeholder?: string;
}) {
  const [codeInput, setCodeInput] = useState(value?.code || '');
  const [descriptionInput, setDescriptionInput] = useState(value?.description || '');
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);

  const filteredCodes = codeInput ? searchICD10Codes(codeInput) : ICD10_CODES.slice(0, 8);
  const hasExactMatch = filteredCodes.some(item => item.code.toLowerCase() === codeInput.toLowerCase());

  // Update parent when inputs change in custom mode
  const updateValue = (code: string, description: string) => {
    if (code) {
      onChange({ code, description });
    } else {
      onChange(undefined);
    }
  };

  return (
    <div className="relative flex-1 space-y-2">
      <div className="flex gap-2">
        <Input
          value={codeInput}
          onChange={(e) => {
            const newCode = e.target.value.toUpperCase();
            setCodeInput(newCode);
            setIsOpen(true);
            setIsCustomMode(false);
            if (!newCode) {
              setDescriptionInput('');
              onChange(undefined);
            }
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder={placeholder}
          className="font-mono text-sm"
        />
        {(codeInput || value) && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => {
              setCodeInput('');
              setDescriptionInput('');
              setIsCustomMode(false);
              onChange(undefined);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Dropdown with suggestions + custom option */}
      {isOpen && codeInput && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-52 overflow-auto">
          {filteredCodes.map((item) => (
            <button
              key={item.code}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
              onMouseDown={() => {
                setCodeInput(item.code);
                setDescriptionInput(item.description);
                onChange({ code: item.code, description: item.description });
                setIsOpen(false);
                setIsCustomMode(false);
              }}
            >
              <span className="font-mono font-medium">{item.code}</span>
              <span className="text-muted-foreground ml-2 text-xs">{item.description}</span>
            </button>
          ))}
          {/* Custom code option */}
          {!hasExactMatch && codeInput.length >= 2 && (
            <>
              <div className="border-t" />
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-muted text-sm text-primary"
                onMouseDown={() => {
                  setIsCustomMode(true);
                  setIsOpen(false);
                  updateValue(codeInput, descriptionInput);
                }}
              >
                <Plus className="h-3 w-3 inline mr-1" />
                Use custom code: <span className="font-mono font-medium">{codeInput}</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Custom description input when in custom mode */}
      {isCustomMode && codeInput && (
        <Input
          value={descriptionInput}
          onChange={(e) => {
            setDescriptionInput(e.target.value);
            updateValue(codeInput, e.target.value);
          }}
          placeholder="Enter diagnosis description..."
          className="text-sm"
        />
      )}

      {/* Show description if selected from list (not in custom mode) */}
      {!isCustomMode && value?.description && (
        <p className="text-xs text-muted-foreground">{value.description}</p>
      )}
    </div>
  );
}

// Common emoji options for client goals
const EMOJI_OPTIONS = ['🎯', '💪', '🧠', '❤️', '🌟', '🌱', '🏃', '😊', '🙏', '✨', '🌈', '🔥'];

interface PlanEditorProps {
  plan: TreatmentPlan;
  onSave: (updatedPlan: TreatmentPlan) => Promise<void>;
  onCancel: () => void;
}

export function PlanEditor({ plan, onSave, onCancel }: PlanEditorProps) {
  const [formData, setFormData] = useState<TreatmentPlan>(plan);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<EditorViewMode>('therapist');

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error(error);
      alert("Failed to save plan changes.");
    } finally {
      setSaving(false);
    }
  };

  // Generic Change Handler
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChange = (field: keyof TreatmentPlan, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Array Helpers
  const updateClinicalGoal = (index: number, field: string, value: string) => {
    const newClinicalGoals = [...formData.clinicalGoals];
    newClinicalGoals[index] = { ...newClinicalGoals[index], [field]: value };

    // If description changed, also update corresponding client goal
    let newClientGoals = formData.clientGoals;
    if (field === 'description') {
      const goalId = newClinicalGoals[index].id;
      newClientGoals = formData.clientGoals.map(cg =>
        cg.id === goalId ? { ...cg, description: value } : cg
      );
    }

    setFormData(prev => ({
      ...prev,
      clinicalGoals: newClinicalGoals,
      clientGoals: newClientGoals,
    }));
  };

  const removeClinicalGoal = (index: number) => {
    const goalToRemove = formData.clinicalGoals[index];
    const newClinicalGoals = [...formData.clinicalGoals];
    newClinicalGoals.splice(index, 1);
    // Also remove corresponding client goal
    const newClientGoals = formData.clientGoals.filter(g => g.id !== goalToRemove.id);
    setFormData(prev => ({
      ...prev,
      clinicalGoals: newClinicalGoals,
      clientGoals: newClientGoals,
    }));
  };

  const addClinicalGoal = () => {
    const newId = crypto.randomUUID();
    // Add clinical goal
    const newClinicalGoals = [
      ...formData.clinicalGoals,
      { id: newId, description: '', status: 'IN_PROGRESS' as const }
    ];
    // Add corresponding client goal
    const newClientGoals = [
      ...formData.clientGoals,
      { id: newId, description: '', emoji: '🎯' }
    ];
    setFormData(prev => ({
      ...prev,
      clinicalGoals: newClinicalGoals,
      clientGoals: newClientGoals,
    }));
  };

  // Update a client goal field (emoji, description)
  const updateClientGoal = (goalId: string, field: string, value: string) => {
    const newClientGoals = formData.clientGoals.map(cg =>
      cg.id === goalId ? { ...cg, [field]: value } : cg
    );
    setFormData(prev => ({
      ...prev,
      clientGoals: newClientGoals,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header with title and action buttons */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Edit Treatment Plan</h2>
        <div className="flex space-x-2">
            <Button variant="outline" onClick={onCancel} disabled={saving}>
                <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
            </Button>
        </div>
      </div>

      {/* View Toggle - separate line */}
      <div className="flex items-center gap-3 pb-3 border-b">
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

      {/* Therapist View Sections */}
      {viewMode === 'therapist' && (
        <>
          {/* Risk Assessment - First section to match display order */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Risk Assessment
                <Badge
                  className={
                    formData.riskScore === 'HIGH' ? "bg-red-100 text-red-800" :
                    formData.riskScore === 'MEDIUM' ? "bg-orange-100 text-orange-800" :
                    "bg-green-100 text-green-800"
                  }
                >
                  {formData.riskScore}
                </Badge>
              </CardTitle>
              <CardDescription>Overall safety and risk level for this patient.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Risk Level</label>
                <div className="flex gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH'] as const).map((level) => {
                    const isSelected = formData.riskScore === level;
                    const Icon = level === 'HIGH' ? AlertCircle : level === 'MEDIUM' ? AlertTriangle : CheckCircle;
                    const colorClass = level === 'HIGH'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : level === 'MEDIUM'
                        ? 'border-orange-200 bg-orange-50 text-orange-700'
                        : 'border-green-200 bg-green-50 text-green-700';
                    return (
                      <Button
                        key={level}
                        type="button"
                        variant="outline"
                        size="sm"
                        className={`flex items-center gap-2 ${isSelected ? colorClass : ''}`}
                        onClick={() => handleChange('riskScore', level)}
                      >
                        <Icon className="h-4 w-4" />
                        {level}
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Risk Assessment Notes (optional)</label>
                <Textarea
                  value={formData.riskRationale || ''}
                  onChange={(e) => handleChange('riskRationale', e.target.value)}
                  placeholder="Explain the rationale for this risk assessment..."
                  className="min-h-[60px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Diagnosis */}
          <Card>
            <CardHeader>
              <CardTitle>Diagnosis</CardTitle>
              <CardDescription>Primary and secondary diagnostic codes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Primary Diagnosis */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Primary Diagnosis</label>
                <DiagnosisSelector
                  value={formData.primaryDiagnosis}
                  onChange={(diagnosis) => handleChange('primaryDiagnosis', diagnosis)}
                  placeholder="Search primary diagnosis..."
                />
              </div>

              {/* Secondary Diagnoses */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Secondary Diagnoses</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const current = formData.secondaryDiagnoses || [];
                      handleChange('secondaryDiagnoses', [...current, { code: '', description: '' }]);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                {(formData.secondaryDiagnoses || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No secondary diagnoses</p>
                ) : (
                  <div className="space-y-2">
                    {(formData.secondaryDiagnoses || []).map((diagnosis, idx) => (
                      <div key={idx} className="flex gap-2 items-start">
                        <DiagnosisSelector
                          value={diagnosis.code ? diagnosis : undefined}
                          onChange={(newDiagnosis) => {
                            const newSecondary = [...(formData.secondaryDiagnoses || [])];
                            if (newDiagnosis) {
                              newSecondary[idx] = newDiagnosis;
                            } else {
                              newSecondary.splice(idx, 1);
                            }
                            handleChange('secondaryDiagnoses', newSecondary);
                          }}
                          placeholder="Search secondary diagnosis..."
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-destructive hover:text-destructive"
                          onClick={() => {
                            const newSecondary = [...(formData.secondaryDiagnoses || [])];
                            newSecondary.splice(idx, 1);
                            handleChange('secondaryDiagnoses', newSecondary);
                          }}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Therapist Note */}
          <Card>
            <CardHeader><CardTitle>Therapist Note</CardTitle></CardHeader>
            <CardContent>
              <Textarea
                value={formData.therapistNote}
                onChange={(e) => handleChange('therapistNote', e.target.value)}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Clinical Goals - Therapist View */}
      {viewMode === 'therapist' && (
        <Card>
          <CardHeader>
              <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Clinical Goals</CardTitle>
                    <CardDescription>Professional treatment objectives with ICD-10 codes</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={addClinicalGoal}>
                      <Plus className="h-4 w-4 mr-2" /> Add Goal
                  </Button>
              </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.clinicalGoals.map((goal, i) => (
              <div key={goal.id || i} className="flex gap-2 items-start border rounded-lg p-3 bg-muted/20">
                  <div className="flex-1 space-y-2">
                      <Input
                          value={goal.description}
                          onChange={(e) => updateClinicalGoal(i, 'description', e.target.value)}
                          placeholder="Goal description..."
                      />
                      <div className="flex gap-2 flex-wrap">
                          <Input
                              className="w-32"
                              value={goal.targetDate || ''}
                              onChange={(e) => updateClinicalGoal(i, 'targetDate', e.target.value)}
                              placeholder="Target Date"
                          />
                          <select
                              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              value={goal.status}
                              onChange={(e) => updateClinicalGoal(i, 'status', e.target.value)}
                          >
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="COMPLETED">Completed</option>
                              <option value="DEFERRED">Deferred</option>
                          </select>
                      </div>
                  </div>
                  <Button variant="destructive" size="icon" onClick={() => removeClinicalGoal(i)}>
                      <Trash className="h-4 w-4" />
                  </Button>
              </div>
            ))}
            {formData.clinicalGoals.length === 0 && (
              <p className="text-muted-foreground italic text-center py-4">No clinical goals yet. Click &quot;Add Goal&quot; to create one.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Client Diagnosis - Client View */}
      {viewMode === 'client' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Understanding Your Path</CardTitle>
                <CardDescription>Patient-friendly explanation of their diagnosis</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Hide from client</label>
                <input
                  type="checkbox"
                  checked={formData.clientDiagnosis?.hidden || false}
                  onChange={(e) => {
                    handleChange('clientDiagnosis', {
                      ...formData.clientDiagnosis,
                      summary: formData.clientDiagnosis?.summary || '',
                      hidden: e.target.checked
                    });
                  }}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.clientDiagnosis?.summary || ''}
              onChange={(e) => {
                handleChange('clientDiagnosis', {
                  ...formData.clientDiagnosis,
                  summary: e.target.value,
                  hidden: formData.clientDiagnosis?.hidden || false
                });
              }}
              placeholder="Write a warm, accessible explanation of what you're working on together... (e.g., 'We're focusing on helping you manage feelings of worry and stress that have been affecting your daily life.')"
              className="min-h-[100px]"
            />
            {formData.clientDiagnosis?.hidden && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <span className="text-amber-600">⚠</span> This section is hidden from the client view
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Client Goals - Client View */}
      {viewMode === 'client' && (
        <Card>
          <CardHeader>
              <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Client Goals</CardTitle>
                    <CardDescription>Friendly, empowering versions of goals shown to the client</CardDescription>
                  </div>
              </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.clientGoals.map((clientGoal) => {
              const clinicalGoal = formData.clinicalGoals.find(cg => cg.id === clientGoal.id);
              return (
                <div key={clientGoal.id} className="border rounded-lg p-3 bg-muted/20 space-y-3">
                  {/* Show clinical goal for reference */}
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Clinical version:</span> {clinicalGoal?.description || 'N/A'}
                  </div>
                  <div className="flex gap-2 items-start">
                    {/* Emoji Selector */}
                    <div className="relative">
                      <select
                        className="h-10 w-16 rounded-md border border-input bg-background px-2 py-2 text-xl text-center"
                        value={clientGoal.emoji || '🎯'}
                        onChange={(e) => updateClientGoal(clientGoal.id, 'emoji', e.target.value)}
                      >
                        {EMOJI_OPTIONS.map((emoji) => (
                          <option key={emoji} value={emoji}>{emoji}</option>
                        ))}
                      </select>
                    </div>
                    {/* Client-friendly description */}
                    <Input
                        className="flex-1"
                        value={clientGoal.description}
                        onChange={(e) => updateClientGoal(clientGoal.id, 'description', e.target.value)}
                        placeholder="Client-friendly goal description..."
                    />
                  </div>
                </div>
              );
            })}
            {formData.clientGoals.length === 0 && (
              <p className="text-muted-foreground italic text-center py-4">No goals yet. Add goals in the Therapist View first.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Interventions - Therapist Only */}
      {viewMode === 'therapist' && (
        <Card>
          <CardHeader><CardTitle>Interventions</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              value={formData.interventions.join('\n')}
              onChange={(e) => handleChange('interventions', e.target.value.split('\n'))}
              placeholder="One intervention per line"
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground mt-2">Enter each intervention on a new line.</p>
          </CardContent>
        </Card>
      )}

      {/* Client Summary */}
      <Card>
        <CardHeader>
          <CardTitle>{viewMode === 'client' ? 'Session Summary' : 'Client Summary'}</CardTitle>
          <CardDescription>
            {viewMode === 'client'
              ? 'The warm, friendly summary shown to your client'
              : 'Empathetic summary written for the client to read'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.clientSummary}
            onChange={(e) => handleChange('clientSummary', e.target.value)}
            placeholder={viewMode === 'client'
              ? "Write a warm, encouraging summary of the session..."
              : "Write an empathetic summary for the client..."
            }
          />
        </CardContent>
      </Card>

      {/* Homework */}
      <Card>
        <CardHeader>
          <CardTitle>{viewMode === 'client' ? 'What to Practice This Week' : 'Homework'}</CardTitle>
          <CardDescription>
            {viewMode === 'client'
              ? 'Action items and exercises for your client'
              : 'Tasks assigned for completion before the next session'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.homework}
            onChange={(e) => handleChange('homework', e.target.value)}
            placeholder={viewMode === 'client'
              ? "List accessible, encouraging activities..."
              : "Enter homework assignments..."
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
