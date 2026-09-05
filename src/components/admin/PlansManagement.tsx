import { useEffect, useState } from 'react';
import { db } from '@/integrations/supabase/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UniversalLoader } from '@/components/ui/UniversalLoader';
import { toast } from 'sonner';
import { Crown, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';

interface Plan {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  price_inr: number;
  billing_period: string;
  duration_days: number | null;
  features: string[] | null;
  is_visible: boolean;
  is_highlighted: boolean;
  display_order: number;
}

const emptyPlan = {
  slug: '',
  name: '',
  tagline: '',
  description: '',
  price_inr: 0,
  billing_period: 'one_time',
  duration_days: '' as number | '' | null,
  features: '',
  is_visible: true,
  is_highlighted: false,
  display_order: 0,
};

type FormState = typeof emptyPlan;

function toForm(plan: Plan): FormState {
  return {
    slug: plan.slug,
    name: plan.name,
    tagline: plan.tagline ?? '',
    description: plan.description ?? '',
    price_inr: Number(plan.price_inr),
    billing_period: plan.billing_period ?? 'one_time',
    duration_days: plan.duration_days ?? '',
    features: (plan.features ?? []).join('\n'),
    is_visible: plan.is_visible,
    is_highlighted: plan.is_highlighted,
    display_order: plan.display_order ?? 0,
  };
}

export default function PlansManagement() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyPlan);

  const load = async () => {
    setLoading(true);
    const { data, error } = await db
      .from('plans')
      .select('*')
      .order('display_order', { ascending: true });
    if (error) toast.error(`Plans load nahi hue: ${error.message}`);
    setPlans((data ?? []) as Plan[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyPlan, display_order: plans.length });
    setOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditing(plan);
    setForm(toForm(plan));
    setOpen(true);
  };

  const save = async () => {
    if (!form.slug.trim() || !form.name.trim()) {
      toast.error('Slug aur name zaroori hain');
      return;
    }
    setSaving(true);
    const payload = {
      slug: form.slug.trim().toLowerCase(),
      name: form.name.trim(),
      tagline: form.tagline.trim() || null,
      description: form.description.trim() || null,
      price_inr: Number(form.price_inr) || 0,
      billing_period: form.billing_period,
      duration_days:
        form.duration_days === '' || form.duration_days === null
          ? null
          : Number(form.duration_days),
      features: form.features
        .split('\n')
        .map(f => f.trim())
        .filter(Boolean),
      is_visible: form.is_visible,
      is_highlighted: form.is_highlighted,
      display_order: Number(form.display_order) || 0,
    };

    const { error } = editing
      ? await db.from('plans').update(payload).eq('id', editing.id)
      : await db.from('plans').insert(payload);

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing ? 'Plan update ho gaya' : 'Naya plan ban gaya');
    setOpen(false);
    void load();
  };

  const remove = async (plan: Plan) => {
    if (!window.confirm(`"${plan.name}" plan delete karein?`)) return;
    const { error } = await db.from('plans').delete().eq('id', plan.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Plan delete ho gaya');
    void load();
  };

  const toggleVisible = async (plan: Plan) => {
    const { error } = await db
      .from('plans')
      .update({ is_visible: !plan.is_visible })
      .eq('id', plan.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void load();
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <UniversalLoader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Plans & Pricing</h1>
          <p className="text-sm text-muted-foreground">
            Pricing page inhi records se banta hai — yahin se naam, price aur features badlo.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            New plan
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map(plan => (
          <Card key={plan.id} className={plan.is_highlighted ? 'border-primary/50' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {plan.is_highlighted && <Crown className="h-4 w-4 text-primary" />}
                  {plan.name}
                </CardTitle>
                <Badge variant={plan.is_visible ? 'default' : 'outline'}>
                  {plan.is_visible ? 'Live' : 'Hidden'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">/{plan.slug}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-2xl font-bold">
                {Number(plan.price_inr) === 0
                  ? 'Free'
                  : `₹${Number(plan.price_inr).toLocaleString('en-IN')}`}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  {plan.billing_period === 'monthly' ? '/month' : 'one-time'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{plan.tagline}</p>
              <ul className="space-y-1 text-sm">
                {(plan.features ?? []).slice(0, 4).map(f => (
                  <li key={f} className="text-muted-foreground">
                    • {f}
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(plan)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void toggleVisible(plan)}>
                  {plan.is_visible ? 'Hide' : 'Show'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto text-destructive"
                  onClick={() => void remove(plan)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : 'New plan'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={form.slug}
                disabled={!!editing}
                onChange={e => setForm({ ...form, slug: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Tagline</Label>
              <Input
                value={form.tagline}
                onChange={e => setForm({ ...form, tagline: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Price (₹)</Label>
              <Input
                type="number"
                value={form.price_inr}
                onChange={e => setForm({ ...form, price_inr: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Billing</Label>
              <Select
                value={form.billing_period}
                onValueChange={value => setForm({ ...form, billing_period: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="one_time">One-time (lifetime)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duration (days, blank = lifetime)</Label>
              <Input
                type="number"
                value={form.duration_days ?? ''}
                onChange={e =>
                  setForm({
                    ...form,
                    duration_days: e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Display order</Label>
              <Input
                type="number"
                value={form.display_order}
                onChange={e => setForm({ ...form, display_order: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Features (ek line = ek feature)</Label>
              <Textarea
                rows={6}
                value={form.features}
                onChange={e => setForm({ ...form, features: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.is_visible}
                onCheckedChange={checked => setForm({ ...form, is_visible: checked })}
              />
              <Label>Visible on pricing page</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.is_highlighted}
                onCheckedChange={checked => setForm({ ...form, is_highlighted: checked })}
              />
              <Label>Highlight as most popular</Label>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving…' : 'Save plan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
