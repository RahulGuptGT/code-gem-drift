import { useCallback, useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { UniversalLoader } from '@/components/ui/UniversalLoader';
import { adminActivatePayment, listAllPayments } from '@/lib/payments.functions';

interface PaymentRow {
  id: string;
  user_id: string;
  plan_slug: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  provider_payment_id: string | null;
  buyer_email: string | null;
  buyer_name: string | null;
  created_at: string;
}

const statusVariant = (status: string) =>
  status === 'success' ? 'default' : status === 'failed' ? 'destructive' : 'secondary';

export default function PaymentsManagement() {
  const fetchPayments = useServerFn(listAllPayments);
  const activate = useServerFn(adminActivatePayment);
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows((await fetchPayments()) as PaymentRow[]);
    } catch {
      toast.error('Payments load nahi hue');
    } finally {
      setLoading(false);
    }
  }, [fetchPayments]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleActivate = async (id: string) => {
    setBusyId(id);
    try {
      const res = await activate({ data: { paymentId: id } });
      if (res.ok) {
        toast.success('Membership activate ho gayi');
        await load();
      } else {
        toast.error(res.error ?? 'Activate nahi hua');
      }
    } catch {
      toast.error('Activate nahi hua');
    } finally {
      setBusyId(null);
    }
  };

  const filtered = rows.filter(row => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [row.buyer_email, row.buyer_name, row.plan_slug, row.status, row.provider_payment_id]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(q));
  });

  const total = rows
    .filter(row => row.status === 'success')
    .reduce((sum, row) => sum + Number(row.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-sm text-muted-foreground">
            Instamojo transactions aur manual activation.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>₹{total.toLocaleString('en-IN')}</CardTitle>
          <CardDescription>{rows.length} transactions recorded</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by email, plan, status…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="max-w-sm"
          />
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <UniversalLoader />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Abhi koi payment nahi hai.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Buyer</th>
                <th className="p-3 text-left">Plan</th>
                <th className="p-3 text-left">Amount</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Payment id</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row.id} className="border-t">
                  <td className="p-3">
                    {new Date(row.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="p-3">
                    <div>{row.buyer_name ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">{row.buyer_email ?? ''}</div>
                  </td>
                  <td className="p-3 capitalize">{row.plan_slug}</td>
                  <td className="p-3">₹{Number(row.amount).toLocaleString('en-IN')}</td>
                  <td className="p-3">
                    <Badge variant={statusVariant(row.status) as any}>{row.status}</Badge>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {row.provider_payment_id ?? '—'}
                  </td>
                  <td className="p-3 text-right">
                    {row.status !== 'success' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === row.id}
                        onClick={() => handleActivate(row.id)}
                      >
                        {busyId === row.id && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                        Mark paid
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
