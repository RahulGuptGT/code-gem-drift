import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Upload, Eye, Users, Calendar, TrendingUp, CheckCircle2, Clock, RefreshCw, UserPlus, Check } from 'lucide-react';

interface Subscription {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  amount: number;
  payment_status: 'pending' | 'paid' | 'failed';
  payment_screenshot_url: string | null;
  member_since: string | null;
  payment_date: string | null;
  notes: string | null;
  display_order: number | null;
  is_visible: boolean;
  created_at: string;
  slot_number: number | null;
  payment_month: string | null;
  payment_history: any;
}

// Resolve any stored screenshot value (old public URL or new path) to a fresh signed URL.
function useSignedScreenshot(stored: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!stored) { setUrl(null); return; }
    const path = stored.includes('/youtube-payment-screenshots/')
      ? stored.split('/youtube-payment-screenshots/').pop()!.split('?')[0]
      : stored;
    supabase.storage
      .from('youtube-payment-screenshots')
      .createSignedUrl(path, 60 * 60)
      .then(({ data }) => { if (active) setUrl(data?.signedUrl ?? null); });
    return () => { active = false; };
  }, [stored]);
  return url;
}

function ScreenshotPreview({ stored }: { stored: string }) {
  const url = useSignedScreenshot(stored);
  if (!url) {
    return (
      <div>
        <p className="text-sm text-muted-foreground mb-2">Payment Screenshot</p>
        <div className="w-full h-32 rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="cursor-pointer group">
          <p className="text-sm text-muted-foreground mb-2">Payment Screenshot</p>
          <div className="relative overflow-hidden rounded-lg">
            <img src={url} alt="Payment screenshot" className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-200" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Eye className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <img src={url} alt="Payment screenshot" className="w-full" />
      </DialogContent>
    </Dialog>
  );
}

const YouTubeSubscriptionManagement = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [memberFormData, setMemberFormData] = useState({
    name: '',
    email: '',
    phone: '',
    amount: 50,
    member_since: new Date().toISOString().split('T')[0],
    slot_number: null as number | null,
    notes: '',
  });

  useEffect(() => {
    fetchSubscriptions();

    const channel = supabase
      .channel('admin-youtube-subscriptions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'youtube_subscriptions',
        },
        () => {
          fetchSubscriptions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSubscriptions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('youtube_subscriptions')
      .select('*')
      .order('slot_number', { ascending: true, nullsFirst: false });

    if (!error && data) {
      setSubscriptions((data) as any);
    }
    setLoading(false);
  };

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate slot number (1-6)
    if (memberFormData.slot_number && (memberFormData.slot_number < 1 || memberFormData.slot_number > 6)) {
      toast.error('Slot number must be between 1 and 6');
      return;
    }

    // Check if slot is already taken
    if (memberFormData.slot_number) {
      const { data: existingSlot } = await supabase
        .from('youtube_subscriptions')
        .select('id')
        .eq('slot_number', memberFormData.slot_number)
        .neq('id', selectedSub?.id || '')
        .single();

      if (existingSlot) {
        toast.error(`Slot ${memberFormData.slot_number} is already taken`);
        return;
      }
    }
    
    const payload = {
      name: memberFormData.name,
      email: memberFormData.email || null,
      phone: memberFormData.phone || null,
      amount: memberFormData.amount,
      member_since: memberFormData.member_since,
      slot_number: memberFormData.slot_number,
      notes: memberFormData.notes || null,
      payment_status: selectedSub?.payment_status || ('pending' as const),
      is_visible: true,
      payment_month: new Date().toISOString().slice(0, 7),
    };

    if (selectedSub) {
      const { error } = await supabase
        .from('youtube_subscriptions')
        .update(payload)
        .eq('id', selectedSub.id);

      if (error) {
        toast.error('Failed to update member');
      } else {
        toast.success('Member updated successfully');
        setMemberDialogOpen(false);
        resetMemberForm();
      }
    } else {
      const { error } = await supabase
        .from('youtube_subscriptions')
        .insert([payload]);

      if (error) {
        toast.error('Failed to add member');
      } else {
        toast.success('Member added successfully');
        setMemberDialogOpen(false);
        resetMemberForm();
      }
    }
  };

  const handleEditMember = (sub: Subscription) => {
    setSelectedSub(sub);
    setMemberFormData({
      name: sub.name,
      email: sub.email || '',
      phone: sub.phone || '',
      amount: sub.amount,
      member_since: sub.member_since || new Date().toISOString().split('T')[0],
      slot_number: sub.slot_number,
      notes: sub.notes || '',
    });
    setMemberDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedSub) return;

    // Delete screenshot if exists
    if (selectedSub.payment_screenshot_url) {
      const fileName = selectedSub.payment_screenshot_url.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('youtube-payment-screenshots')
          .remove([fileName]);
      }
    }

    const { error } = await supabase
      .from('youtube_subscriptions')
      .delete()
      .eq('id', selectedSub.id);

    if (error) {
      toast.error('Failed to delete member');
    } else {
      toast.success('Member deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedSub(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, subId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Please upload JPG, PNG, or WEBP only');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${subId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('youtube-payment-screenshots')
      .upload(fileName, file);

    if (uploadError) {
      toast.error('Failed to upload screenshot');
      setUploading(false);
      return;
    }

    // Store path only; we will create signed URLs on display since the bucket is private.
    const publicUrl = fileName;

    const { error: updateError } = await supabase
      .from('youtube_subscriptions')
      .update({ 
        payment_screenshot_url: publicUrl,
        payment_date: new Date().toISOString(),
      })
      .eq('id', subId);

    if (updateError) {
      toast.error('Failed to update screenshot');
    } else {
      toast.success('Screenshot uploaded successfully');
    }

    setUploading(false);
  };

  const resetMemberForm = () => {
    setSelectedSub(null);
    setMemberFormData({
      name: '',
      email: '',
      phone: '',
      amount: 50,
      member_since: new Date().toISOString().split('T')[0],
      slot_number: null,
      notes: '',
    });
  };

  const handleMarkAsPaid = async (subId: string) => {
    const { error } = await supabase
      .from('youtube_subscriptions')
      .update({
        payment_status: 'paid',
        payment_date: new Date().toISOString(),
      })
      .eq('id', subId);

    if (error) {
      toast.error('Failed to update payment status');
    } else {
      toast.success('Marked as paid');
    }
  };

  const handleMonthlyReset = async () => {
    try {
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 26, 22, 48, 0);
      const nextMonthString = nextMonth.toISOString().slice(0, 7);
      
      const updates = subscriptions.map(async (sub) => {
        const history = sub.payment_history || [];
        const currentMonth = now.toISOString().slice(0, 7);
        
        // Save current month's payment status to history
        history.push({
          month: currentMonth,
          status: sub.payment_status,
          amount: sub.amount,
          payment_date: sub.payment_date,
        });

        await supabase
          .from('youtube_subscriptions')
          .update({
            payment_status: 'pending',
            payment_date: null,
            payment_screenshot_url: null,
            payment_history: history,
            last_reset_date: now.toISOString(),
            payment_month: nextMonthString,
          })
          .eq('id', sub.id);
      });

      await Promise.all(updates);
      toast.success(`Reset complete! Next due: ${nextMonth.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} at 10:48 PM`);
      setResetDialogOpen(false);
    } catch (error) {
      toast.error('Failed to reset monthly payments');
    }
  };

  const stats = {
    total: subscriptions.length,
    paid: subscriptions.filter(s => s.payment_status === 'paid').length,
    pending: subscriptions.filter(s => s.payment_status === 'pending').length,
    revenue: subscriptions.filter(s => s.payment_status === 'paid').reduce((sum, s) => sum + s.amount, 0),
  };

  const getDaysUntil26th = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let targetDate = new Date(currentYear, currentMonth, 26, 22, 48, 0); // 10:48 PM
    
    if (now > targetDate) {
      targetDate = new Date(currentYear, currentMonth + 1, 26, 22, 48, 0);
    }
    
    const diff = targetDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getTargetDate = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let targetDate = new Date(currentYear, currentMonth, 26, 22, 48, 0);
    
    if (now > targetDate) {
      targetDate = new Date(currentYear, currentMonth + 1, 26, 22, 48, 0);
    }
    
    return targetDate.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  };

  const daysUntil26th = getDaysUntil26th();
  const targetDateText = getTargetDate();
  
  // Check if we're overdue based on payment collection status and last reset
  const now = new Date();
  const lastResetDate = subscriptions.length > 0 
    ? subscriptions.reduce((latest, sub) => {
        const subReset = sub.payment_history?.length > 0 
          ? new Date(sub.payment_history[sub.payment_history.length - 1].month + '-01')
          : null;
        return subReset && (!latest || subReset > latest) ? subReset : latest;
      }, null as Date | null)
    : null;
  
  // Calculate next due date (26th of next month after last reset, or current/next month if no reset)
  let nextDueDate: Date;
  if (lastResetDate) {
    const resetMonth = lastResetDate.getMonth();
    const resetYear = lastResetDate.getFullYear();
    nextDueDate = new Date(resetYear, resetMonth + 1, 26, 22, 48, 0);
  } else {
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    nextDueDate = new Date(currentYear, currentMonth, 26, 22, 48, 0);
    if (now > nextDueDate) {
      nextDueDate = new Date(currentYear, currentMonth + 1, 26, 22, 48, 0);
    }
  }
  
  const isOverdue = now > nextDueDate && stats.revenue < 300;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Members
            </CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.paid} <span className="text-lg text-muted-foreground">/ 6</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">paid this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Collection Progress
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              ₹{stats.revenue} <span className="text-lg text-muted-foreground">/ ₹300</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {((stats.revenue / 300) * 100).toFixed(0)}% collected
            </p>
          </CardContent>
        </Card>

        <Card className={isOverdue ? 'border-red-500' : daysUntil26th <= 3 ? 'border-yellow-500' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {isOverdue ? 'Overdue!' : 'Days Until Due'}
            </CardTitle>
            <Calendar className={`h-5 w-5 ${isOverdue ? 'text-red-600' : daysUntil26th <= 3 ? 'text-yellow-600' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${isOverdue ? 'text-red-600' : daysUntil26th <= 3 ? 'text-yellow-600' : ''}`}>
              {isOverdue ? '!' : daysUntil26th}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Due: {targetDateText}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
            <Clock className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">members need to pay</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Status
            </CardTitle>
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {stats.revenue >= 300 ? (
                <span className="text-green-600">Complete ✓</span>
              ) : isOverdue ? (
                <span className="text-red-600">Overdue</span>
              ) : (
                <span className="text-yellow-600">In Progress</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ₹{300 - stats.revenue} remaining
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">YouTube Premium Family Group</h2>
          <p className="text-sm text-muted-foreground">6 Members • ₹50 per person • Next Due: {targetDateText} at 10:48 PM</p>
        </div>
        <Button 
          variant="outline" 
          size="lg"
          onClick={() => setResetDialogOpen(true)}
          disabled={subscriptions.length === 0}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reset Month
        </Button>
      </div>

      {/* Tabs for Members and Payments */}
      <Tabs defaultValue="payments" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="payments">Monthly Payments</TabsTrigger>
          <TabsTrigger value="members">Manage Members</TabsTrigger>
        </TabsList>

        {/* Monthly Payments Tab */}
        <TabsContent value="payments" className="space-y-4 mt-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : subscriptions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Users className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No members yet</p>
                <p className="text-sm text-muted-foreground">Add members first in the "Manage Members" tab</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subscriptions.map((sub) => (
                <Card key={sub.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-xl">{sub.name}</CardTitle>
                          {sub.slot_number && (
                            <Badge variant="outline" className="text-xs">
                              Slot {sub.slot_number}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              sub.payment_status === 'paid'
                                ? 'default'
                                : sub.payment_status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                            }
                            className="capitalize"
                          >
                            {sub.payment_status}
                          </Badge>
                          <span className="text-xl font-bold">₹{sub.amount}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="text-sm">
                      <p className="text-muted-foreground mb-1">Payment Time</p>
                      <p className="font-medium">
                        {sub.payment_date
                          ? new Date(sub.payment_date).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Not paid yet'}
                      </p>
                    </div>

                    {sub.payment_screenshot_url ? (
                      <ScreenshotPreview stored={sub.payment_screenshot_url} />
                    ) : (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Upload Payment Screenshot</p>
                        <Label htmlFor={`upload-${sub.id}`} className="cursor-pointer">
                          <div className="border-2 border-dashed rounded-lg p-6 hover:border-primary hover:bg-accent transition-colors flex flex-col items-center justify-center">
                            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                            <span className="text-sm text-muted-foreground">Click to upload</span>
                          </div>
                          <Input
                            id={`upload-${sub.id}`}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, sub.id)}
                            disabled={uploading}
                          />
                        </Label>
                      </div>
                    )}

                    {sub.payment_status !== 'paid' && (
                      <Button
                        onClick={() => handleMarkAsPaid(sub.id)}
                        className="w-full"
                        variant="default"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Mark as Paid
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Manage Members Tab */}
        <TabsContent value="members" className="space-y-4 mt-6">
          <div className="flex justify-end mb-4">
            <Dialog open={memberDialogOpen} onOpenChange={(open) => {
              setMemberDialogOpen(open);
              if (!open) resetMemberForm();
            }}>
              <DialogTrigger asChild>
                <Button size="lg" disabled={subscriptions.length >= 6}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  {subscriptions.length >= 6 ? 'All Slots Full (6/6)' : 'Add Member'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl">
                    {selectedSub ? 'Edit Member Profile' : 'Add New Member'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleMemberSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={memberFormData.name}
                        onChange={(e) => setMemberFormData({ ...memberFormData, name: e.target.value })}
                        required
                        placeholder="Enter member name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="slot_number">Slot Number (1-6) *</Label>
                      <Input
                        id="slot_number"
                        type="number"
                        min="1"
                        max="6"
                        value={memberFormData.slot_number || ''}
                        onChange={(e) => setMemberFormData({ ...memberFormData, slot_number: e.target.value ? Number(e.target.value) : null })}
                        required
                        placeholder="1-6"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={memberFormData.email}
                        onChange={(e) => setMemberFormData({ ...memberFormData, email: e.target.value })}
                        placeholder="member@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={memberFormData.phone}
                        onChange={(e) => setMemberFormData({ ...memberFormData, phone: e.target.value })}
                        placeholder="+91 XXXXXXXXXX"
                      />
                    </div>
                    <div>
                      <Label htmlFor="amount">Monthly Amount (₹) *</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={memberFormData.amount}
                        onChange={(e) => setMemberFormData({ ...memberFormData, amount: Number(e.target.value) })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="member_since">Member Since *</Label>
                      <Input
                        id="member_since"
                        type="date"
                        value={memberFormData.member_since}
                        onChange={(e) => setMemberFormData({ ...memberFormData, member_since: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={memberFormData.notes}
                      onChange={(e) => setMemberFormData({ ...memberFormData, notes: e.target.value })}
                      placeholder="Any additional notes about this member"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setMemberDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {selectedSub ? 'Update Member' : 'Add Member'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : subscriptions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Users className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No members yet</p>
                <p className="text-sm text-muted-foreground">Click "Add Member" to add your first member</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subscriptions.map((sub) => (
                <Card key={sub.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-xl">{sub.name}</CardTitle>
                          {sub.slot_number && (
                            <Badge variant="outline" className="text-xs">
                              Slot {sub.slot_number}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">₹{sub.amount}/month</p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Member Since</p>
                        <p className="font-medium">
                          {sub.member_since
                            ? new Date(sub.member_since).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '-'}
                        </p>
                      </div>
                      {sub.email && (
                        <div>
                          <p className="text-muted-foreground">Email</p>
                          <p className="font-medium text-xs">{sub.email}</p>
                        </div>
                      )}
                      {sub.phone && (
                        <div>
                          <p className="text-muted-foreground">Phone</p>
                          <p className="font-medium">{sub.phone}</p>
                        </div>
                      )}
                      {sub.notes && (
                        <div>
                          <p className="text-muted-foreground">Notes</p>
                          <p className="font-medium text-xs">{sub.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEditMember(sub)}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedSub(sub);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedSub?.name}? This will remove all their payment history and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Monthly Reset Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset for New Month</AlertDialogTitle>
            <AlertDialogDescription>
              This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Save current payment status to history</li>
                <li>Mark all members as "Pending" for new month</li>
                <li>Clear payment dates and screenshots</li>
                <li>Update payment month to next month</li>
              </ul>
              <p className="mt-4 font-semibold">Are you sure you want to proceed?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMonthlyReset} className="bg-primary">
              Yes, Reset Month
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default YouTubeSubscriptionManagement;
