'use client'

import { useState } from 'react';
import { TreatmentPlan } from '@/lib/schemas/plan';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash, Save, X, Loader2, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

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

interface PlanEditorProps {
  plan: TreatmentPlan;
  onSave: (updatedPlan: TreatmentPlan) => Promise<void>;
  onCancel: () => void;
}

export function PlanEditor({ plan, onSave, onCancel }: PlanEditorProps) {
  const [formData, setFormData] = useState<TreatmentPlan>(plan);
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="space-y-6">
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

      {/* Clinical Goals */}
      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle>Clinical Goals</CardTitle>
                <Button size="sm" variant="outline" onClick={addClinicalGoal}>
                    <Plus className="h-4 w-4 mr-2" /> Add Goal
                </Button>
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.clinicalGoals.map((goal, i) => (
            <div key={goal.id || i} className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                    <Input 
                        value={goal.description} 
                        onChange={(e) => updateClinicalGoal(i, 'description', e.target.value)}
                        placeholder="Goal description..."
                    />
                    <div className="flex gap-2">
                        <Input 
                            className="w-32"
                            value={goal.targetDate || ''} 
                            onChange={(e) => updateClinicalGoal(i, 'targetDate', e.target.value)}
                            placeholder="Target Date"
                        />
                         <select 
                            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
        </CardContent>
      </Card>

       {/* Interventions */}
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

      {/* Client Summary */}
      <Card>
        <CardHeader><CardTitle>Client Summary</CardTitle></CardHeader>
        <CardContent>
          <Textarea 
            value={formData.clientSummary} 
            onChange={(e) => handleChange('clientSummary', e.target.value)} 
          />
        </CardContent>
      </Card>

      {/* Homework */}
      <Card>
        <CardHeader><CardTitle>Homework</CardTitle></CardHeader>
        <CardContent>
          <Textarea 
            value={formData.homework} 
            onChange={(e) => handleChange('homework', e.target.value)} 
          />
        </CardContent>
      </Card>
    </div>
  );
}
