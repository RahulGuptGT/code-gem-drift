import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, Eye, FileText, Users, Activity, MousePointerClick, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { UniversalLoader } from "@/components/ui/UniversalLoader";

interface AnalyticsStats {
  totalContacts: number;
  unreadContacts: number;
  monthContacts: number;
  totalMembers: number;
  paidMembers: number;
  totalReferrals: number;
  visibleReferrals: number;
}

interface ACAnalytics {
  ac_name: string;
  view_count: number;
  last_viewed_at: string;
}

interface PageView {
  page: string;
  views: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

const WebsiteAnalytics = () => {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<string>('30');
  const [stats, setStats] = useState<AnalyticsStats>({
    totalContacts: 0,
    unreadContacts: 0,
    monthContacts: 0,
    totalMembers: 0,
    paidMembers: 0,
    totalReferrals: 0,
    visibleReferrals: 0,
  });
  const [acAnalytics, setAcAnalytics] = useState<ACAnalytics[]>([]);
  const [pageViews, setPageViews] = useState<PageView[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch contact submissions stats
      const { data: contacts, error: contactError } = await supabase
        .from('contact_submissions')
        .select('*');

      if (contactError) throw contactError;

      const totalContacts = contacts?.length || 0;
      const unreadContacts = contacts?.filter(c => c.status === 'unread').length || 0;
      const monthContacts = contacts?.filter(c => {
        const createdDate = new Date(c.created_at || '');
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        return createdDate >= monthAgo;
      }).length || 0;

      // Fetch YouTube subscriptions stats
      const { data: subscriptions, error: subsError } = await supabase
        .from('youtube_subscriptions')
        .select('*');

      if (subsError) throw subsError;

      const totalMembers = subscriptions?.length || 0;
      const paidMembers = subscriptions?.filter(s => s.payment_status === 'paid').length || 0;

      // Fetch referral links stats
      const { data: referrals, error: refError } = await supabase
        .from('referral_links')
        .select('*');

      if (refError) throw refError;

      const totalReferrals = referrals?.length || 0;
      const visibleReferrals = referrals?.filter(r => r.is_visible).length || 0;

      // Fetch AC analytics
      const { data: acData, error: acError } = await supabase
        .from('ac_analytics')
        .select(`
          view_count,
          last_viewed_at,
          bihar_acs!inner(ac_name)
        `)
        .order('view_count', { ascending: false })
        .limit(10);

      if (acError) throw acError;

      const formattedAcData: ACAnalytics[] = acData?.map((item: any) => ({
        ac_name: item.bihar_acs.ac_name,
        view_count: item.view_count,
        last_viewed_at: item.last_viewed_at,
      })) || [];

      setStats({
        totalContacts,
        unreadContacts,
        monthContacts,
        totalMembers,
        paidMembers,
        totalReferrals,
        visibleReferrals,
      });

      setAcAnalytics(formattedAcData);

      // Mock page views data (can be enhanced with actual tracking)
      setPageViews([
        { page: '/home', views: 45 },
        { page: '/2025BiharElection', views: 38 },
        { page: '/referrals', views: 22 },
        { page: '/contact', views: 15 },
        { page: '/youtube/subscription', views: 12 },
      ]);

    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch analytics data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();

    // Real-time subscriptions
    const channel = supabase
      .channel('analytics-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_submissions' }, fetchAnalytics)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'youtube_subscriptions' }, fetchAnalytics)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referral_links' }, fetchAnalytics)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ac_analytics' }, fetchAnalytics)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleExportCSV = () => {
    const csvContent = [
      ['Metric', 'Value'],
      ['Total Contacts', stats.totalContacts],
      ['Unread Contacts', stats.unreadContacts],
      ['This Month Contacts', stats.monthContacts],
      ['Total Members', stats.totalMembers],
      ['Paid Members', stats.paidMembers],
      ['Total Referrals', stats.totalReferrals],
      ['Visible Referrals', stats.visibleReferrals],
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    toast({
      title: 'Success',
      description: 'Analytics exported successfully',
    });
  };

  const statCards = [
    { title: 'Contact Forms', value: stats.totalContacts, icon: FileText, color: 'text-blue-600', subtext: `${stats.unreadContacts} unread` },
    { title: 'This Month', value: stats.monthContacts, icon: TrendingUp, color: 'text-green-600', subtext: 'Last 30 days' },
    { title: 'YouTube Members', value: stats.totalMembers, icon: Users, color: 'text-purple-600', subtext: `${stats.paidMembers} paid` },
    { title: 'AC Page Views', value: acAnalytics.reduce((sum, ac) => sum + ac.view_count, 0), icon: Eye, color: 'text-orange-600', subtext: 'Total views' },
    { title: 'Referral Links', value: stats.totalReferrals, icon: MousePointerClick, color: 'text-pink-600', subtext: `${stats.visibleReferrals} visible` },
    { title: 'Active Sections', value: 5, icon: Activity, color: 'text-cyan-600', subtext: 'Running' },
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <UniversalLoader />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">📊 Website Reach Analytics</h1>
          <p className="text-muted-foreground mt-1">Complete visibility into your website's performance</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 3 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.subtext}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Page Views Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Most Visited Pages</CardTitle>
            <CardDescription>Top performing pages on your website</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pageViews}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="page" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="views" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AC Analytics Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Viewed Constituencies (ACs)</CardTitle>
            <CardDescription>Most popular assembly constituency pages</CardDescription>
          </CardHeader>
          <CardContent>
            {acAnalytics.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={acAnalytics.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="ac_name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="view_count" fill="hsl(var(--secondary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <div className="text-center">
                  <Eye className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No AC views yet</p>
                  <p className="text-sm">Data will appear when users visit AC pages</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Page Views Table */}
        <Card>
          <CardHeader>
            <CardTitle>Page Views Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pageViews.map((page, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="font-medium text-foreground">{page.page}</span>
                  <span className="text-sm text-muted-foreground">{page.views} views</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AC Table */}
        <Card>
          <CardHeader>
            <CardTitle>Assembly Constituency Views</CardTitle>
          </CardHeader>
          <CardContent>
            {acAnalytics.length > 0 ? (
              <div className="space-y-3">
                {acAnalytics.slice(0, 5).map((ac, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="font-medium text-foreground">{ac.ac_name}</span>
                    <span className="text-sm text-muted-foreground">{ac.view_count} views</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                <div className="text-center">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No activity recorded yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WebsiteAnalytics;
