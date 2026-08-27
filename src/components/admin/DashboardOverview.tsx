import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Youtube, Link2, Settings } from 'lucide-react';

export const DashboardOverview = () => {
  const [stats, setStats] = useState({
    totalContacts: 0,
    unreadContacts: 0,
    totalSubscriptions: 0,
    paidSubscriptions: 0,
    totalReferrals: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch contact stats
      const { count: totalContacts } = await supabase
        .from('contact_submissions')
        .select('*', { count: 'exact', head: true });

      const { count: unreadContacts } = await supabase
        .from('contact_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'unread');

      // Fetch subscription stats
      const { count: totalSubscriptions } = await supabase
        .from('youtube_subscriptions')
        .select('*', { count: 'exact', head: true });

      const { count: paidSubscriptions } = await supabase
        .from('youtube_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('payment_status', 'paid');

      setStats({
        totalContacts: totalContacts || 0,
        unreadContacts: unreadContacts || 0,
        totalSubscriptions: totalSubscriptions || 0,
        paidSubscriptions: paidSubscriptions || 0,
        totalReferrals: 0, // Will be managed via referral management
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const statCards = [
    {
      title: 'Contact Messages',
      value: stats.totalContacts,
      subtitle: `${stats.unreadContacts} unread`,
      icon: MessageSquare,
      color: 'text-blue-500',
    },
    {
      title: 'YouTube Subscriptions',
      value: stats.totalSubscriptions,
      subtitle: `${stats.paidSubscriptions} paid`,
      icon: Youtube,
      color: 'text-red-500',
    },
    {
      title: 'Referral Links',
      value: stats.totalReferrals,
      subtitle: 'Active links',
      icon: Link2,
      color: 'text-green-500',
    },
    {
      title: 'Site Settings',
      value: '✓',
      subtitle: 'Configured',
      icon: Settings,
      color: 'text-purple-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your admin studio</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className={cn("h-4 w-4", stat.color)} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Use the sidebar to navigate between different management sections
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
