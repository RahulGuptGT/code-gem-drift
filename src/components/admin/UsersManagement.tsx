import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { listMembers, setMemberPlan, type AdminMember } from '@/lib/admin-members.functions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UniversalLoader } from '@/components/ui/UniversalLoader';
import { toast } from 'sonner';
import { Crown, RefreshCw, Users } from 'lucide-react';

const PLAN_LABEL: Record<string, string> = {
  starter: 'Starter',
  signature: 'Signature',
  sovereign: 'Sovereign',
};

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function UsersManagement() {
  const fetchMembers = useServerFn(listMembers);
  const updatePlan = useServerFn(setMemberPlan);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'members'],
    queryFn: () => fetchMembers({}) as Promise<AdminMember[]>,
  });

  const mutation = useMutation({
    mutationFn: (vars: { userId: string; planSlug: 'starter' | 'signature' | 'sovereign' }) =>
      updatePlan({ data: vars }),
    onSuccess: () => {
      toast.success('Plan update ho gaya');
      queryClient.invalidateQueries({ queryKey: ['admin', 'members'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Plan update nahi hua'),
  });

  const members = useMemo(() => {
    const list = data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      m =>
        (m.email ?? '').toLowerCase().includes(q) ||
        (m.displayName ?? '').toLowerCase().includes(q),
    );
  }, [data, search]);

  const stats = useMemo(() => {
    const list = data ?? [];
    return {
      total: list.length,
      signature: list.filter(m => m.planSlug === 'signature').length,
      sovereign: list.filter(m => m.planSlug === 'sovereign').length,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <UniversalLoader />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-destructive">
            Users load nahi ho paye: {(error as any)?.message ?? 'unknown error'}
          </p>
          <Button className="mt-4" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Users & Members</h1>
          <p className="text-sm text-muted-foreground">
            Registered accounts, unke plans aur manual plan grant.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Signature members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.signature}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sovereign members</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sovereign}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search by email or name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-sm"
          />

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Last sign in</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Change plan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map(member => (
                  <TableRow key={member.userId}>
                    <TableCell>
                      <div className="font-medium">{member.displayName ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{member.email}</div>
                      {member.isAdmin && (
                        <Badge variant="secondary" className="mt-1">admin</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(member.createdAt)}</TableCell>
                    <TableCell className="text-sm">{formatDate(member.lastSignInAt)}</TableCell>
                    <TableCell>
                      <Badge variant={member.planSlug === 'starter' ? 'outline' : 'default'}>
                        {PLAN_LABEL[member.planSlug] ?? member.planSlug}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(member.expiresAt)}</TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={member.planSlug}
                        onValueChange={value =>
                          mutation.mutate({
                            userId: member.userId,
                            planSlug: value as 'starter' | 'signature' | 'sovereign',
                          })
                        }
                        disabled={mutation.isPending}
                      >
                        <SelectTrigger className="ml-auto w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="starter">Starter</SelectItem>
                          <SelectItem value="signature">Signature (30d)</SelectItem>
                          <SelectItem value="sovereign">Sovereign (lifetime)</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
                {members.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Koi user nahi mila.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
