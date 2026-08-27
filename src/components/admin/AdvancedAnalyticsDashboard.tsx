import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import { Users, Eye, Clock, TrendingUp, TrendingDown, Monitor, Smartphone, Tablet, Globe, MousePointerClick, ArrowUpRight, ArrowDownRight, Download, RefreshCw, Activity, AlertTriangle, Zap, Search, X, Sparkles } from "lucide-react";import { format, subDays, startOfDay, endOfDay, differenceInDays } from 'date-fns';
import { UniversalLoader, UniversalSpinner } from "@/components/ui/UniversalLoader";

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(210, 70%, 55%)',
  'hsl(150, 60%, 45%)',
  'hsl(35, 80%, 55%)',
  'hsl(340, 65%, 55%)',
  'hsl(270, 60%, 55%)',
];

interface DashboardStats {
  totalVisitors: number;
  visitorsToday: number;
  visitorsWeek: number;
  visitorsMonth: number;
  totalPageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgSessionDuration: number;
  returningRate: number;
  // Previous period for comparison
  prevVisitorsToday: number;
  prevVisitorsWeek: number;
  prevVisitorsMonth: number;
  prevPageViews: number;
}

interface TrafficRow {
  id: string;
  session_id: string;
  visitor_id: string;
  started_at: string;
  duration_seconds: number;
  entry_page: string;
  exit_page: string;
  referrer: string;
  traffic_source: string;
  country: string;
  city: string;
  device_type: string;
  browser: string;
  os: string;
  ip_hash: string;
  page_count: number;
  is_bounce: boolean;
}

const AdvancedAnalyticsDashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState('30');
  const [liveVisitors, setLiveVisitors] = useState(0);
  const [stats, setStats] = useState<DashboardStats>({
    totalVisitors: 0, visitorsToday: 0, visitorsWeek: 0, visitorsMonth: 0,
    totalPageViews: 0, uniqueVisitors: 0, bounceRate: 0, avgSessionDuration: 0,
    returningRate: 0, prevVisitorsToday: 0, prevVisitorsWeek: 0, prevVisitorsMonth: 0, prevPageViews: 0,
  });
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [topPages, setTopPages] = useState<any[]>([]);
  const [deviceData, setDeviceData] = useState<any[]>([]);
  const [sourceData, setSourceData] = useState<any[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [trafficData, setTrafficData] = useState<TrafficRow[]>([]);
  const [trafficSearch, setTrafficSearch] = useState('');
  const [trafficPage, setTrafficPage] = useState(0);
  const [topClicks, setTopClicks] = useState<any[]>([]);
  const [countryData, setCountryData] = useState<{ country: string; visitors: number }[]>([]);
  const [errorData, setErrorData] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const VALID_TABS = ['overview', 'traffic', 'behavior', 'errors', 'settings'];
  const tabFromPath = pathname.replace(/^\/heena\/admin\/analytics\/?/, '').split('/')[0];
  const activeTab = VALID_TABS.includes(tabFromPath) ? tabFromPath : 'overview';
  const setActiveTab = (t: string) => navigate(`/heena/admin/analytics/${t}`);
  const [aiInsights, setAiInsights] = useState('');
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState('');

  const days = parseInt(dateRange);
  const startDate = subDays(new Date(), days).toISOString();
  const prevStartDate = subDays(new Date(), days * 2).toISOString();

  // Real-time live visitors polling (sessions active in last 5 minutes)
  useEffect(() => {
    const fetchLive = async () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('analytics_sessions')
        .select('visitor_id', { count: 'exact', head: true })
        .or(`ended_at.is.null,ended_at.gte.${fiveMinAgo}`)
        .gte('started_at', fiveMinAgo);
      setLiveVisitors(count || 0);
    };
    fetchLive();
    const interval = setInterval(fetchLive, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);

      // Fetch sessions for current period
      const { data: sessions } = await supabase
        .from('analytics_sessions')
        .select('*')
        .gte('started_at', startDate)
        .order('started_at', { ascending: false });

      // Fetch sessions for previous period
      const { data: prevSessions } = await supabase
        .from('analytics_sessions')
        .select('*')
        .gte('started_at', prevStartDate)
        .lt('started_at', startDate);

      // Fetch page views
      const { data: pageViews } = await supabase
        .from('analytics_page_views')
        .select('*')
        .gte('created_at', startDate);

      // Fetch prev page views count
      const { count: prevPvCount } = await supabase
        .from('analytics_page_views')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', prevStartDate)
        .lt('created_at', startDate);

      // Fetch visitors
      const { data: visitors } = await supabase
        .from('analytics_visitors')
        .select('*');

      // Fetch clicks
      const { data: clicks } = await supabase
        .from('analytics_clicks')
        .select('*')
        .gte('created_at', startDate);

      // Fetch errors
      const { data: errors } = await supabase
        .from('analytics_errors')
        .select('*')
        .gte('created_at', startDate)
        .order('created_at', { ascending: false })
        .limit(50);

      // Fetch settings
      const { data: settingsData } = await supabase
        .from('analytics_settings')
        .select('*');

      const allSessions = sessions || [];
      const allPrevSessions = prevSessions || [];
      const allPageViews = pageViews || [];
      const allVisitors = visitors || [];
      const allClicks = clicks || [];

      // Calculate stats
      const now = new Date();
      const todayStart = startOfDay(now).toISOString();
      const weekStart = subDays(now, 7).toISOString();
      const monthStart = subDays(now, 30).toISOString();
      const yesterdayStart = startOfDay(subDays(now, 1)).toISOString();
      const prevWeekStart = subDays(now, 14).toISOString();
      const prevMonthStart = subDays(now, 60).toISOString();

      const todayVisitors = new Set(allSessions.filter(s => s.started_at >= todayStart).map(s => s.visitor_id)).size;
      const weekVisitors = new Set(allSessions.filter(s => s.started_at >= weekStart).map(s => s.visitor_id)).size;
      const monthVisitors = new Set(allSessions.filter(s => s.started_at >= monthStart).map(s => s.visitor_id)).size;

      const prevTodayVisitors = new Set(allPrevSessions.filter(s => s.started_at >= yesterdayStart && s.started_at < todayStart).map(s => s.visitor_id)).size;
      const prevWeekVisitors = new Set(allPrevSessions.filter(s => s.started_at >= prevWeekStart && s.started_at < weekStart).map(s => s.visitor_id)).size;
      const prevMonthVisitors = new Set(allPrevSessions.filter(s => s.started_at >= prevMonthStart && s.started_at < monthStart).map(s => s.visitor_id)).size;

      const bounces = allSessions.filter(s => s.is_bounce).length;
      const bounceRate = allSessions.length > 0 ? Math.round((bounces / allSessions.length) * 100) : 0;

      const totalDuration = allSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
      const avgDuration = allSessions.length > 0 ? Math.round(totalDuration / allSessions.length) : 0;

      const returningCount = allVisitors.filter(v => v.is_returning).length;
      const returningRate = allVisitors.length > 0 ? Math.round((returningCount / allVisitors.length) * 100) : 0;

      setStats({
        totalVisitors: allVisitors.length,
        visitorsToday: todayVisitors,
        visitorsWeek: weekVisitors,
        visitorsMonth: monthVisitors,
        totalPageViews: allPageViews.length,
        uniqueVisitors: new Set(allSessions.map(s => s.visitor_id)).size,
        bounceRate,
        avgSessionDuration: avgDuration,
        returningRate,
        prevVisitorsToday: prevTodayVisitors,
        prevVisitorsWeek: prevWeekVisitors,
        prevVisitorsMonth: prevMonthVisitors,
        prevPageViews: prevPvCount || 0,
      });

      // Daily data for charts
      const dailyMap: Record<string, { visitors: Set<string>; views: number; sessions: number }> = {};
      for (let i = 0; i < days; i++) {
        const d = format(subDays(now, i), 'yyyy-MM-dd');
        dailyMap[d] = { visitors: new Set(), views: 0, sessions: 0 };
      }
      allSessions.forEach(s => {
        const d = format(new Date(s.started_at), 'yyyy-MM-dd');
        if (dailyMap[d]) {
          dailyMap[d].visitors.add(s.visitor_id);
          dailyMap[d].sessions++;
        }
      });
      allPageViews.forEach(pv => {
        const d = format(new Date(pv.created_at), 'yyyy-MM-dd');
        if (dailyMap[d]) dailyMap[d].views++;
      });
      const daily = Object.entries(dailyMap)
        .map(([date, val]) => ({
          date: format(new Date(date), 'MMM dd'),
          visitors: val.visitors.size,
          views: val.views,
          sessions: val.sessions,
        }))
        .reverse();
      setDailyData(daily);

      // Top pages
      const pageMap: Record<string, number> = {};
      allPageViews.forEach(pv => {
        pageMap[pv.page_path] = (pageMap[pv.page_path] || 0) + 1;
      });
      const sorted = Object.entries(pageMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([page, views]) => ({ page, views }));
      setTopPages(sorted);

      // Device data
      const deviceMap: Record<string, number> = {};
      allSessions.forEach(s => {
        const d = s.device_type || 'unknown';
        deviceMap[d] = (deviceMap[d] || 0) + 1;
      });
      setDeviceData(Object.entries(deviceMap).map(([name, value]) => ({ name, value })));

      // Source data
      const sourceMap: Record<string, number> = {};
      allSessions.forEach(s => {
        const src = s.traffic_source || 'direct';
        sourceMap[src] = (sourceMap[src] || 0) + 1;
      });
      setSourceData(Object.entries(sourceMap).map(([name, value]) => ({ name, value })));

      // Hourly heatmap
      const hourMap: Record<number, number> = {};
      for (let h = 0; h < 24; h++) hourMap[h] = 0;
      allSessions.forEach(s => {
        const h = new Date(s.started_at).getHours();
        hourMap[h]++;
      });
      setHourlyData(Object.entries(hourMap).map(([hour, count]) => ({
        hour: `${hour}:00`,
        sessions: count,
      })));

      // Country data for geographic chart
      const countryMap: Record<string, Set<string>> = {};
      allSessions.forEach(s => {
        const c = s.country || 'Unknown';
        if (!countryMap[c]) countryMap[c] = new Set();
        countryMap[c].add(s.visitor_id);
      });
      setCountryData(
        Object.entries(countryMap)
          .map(([country, visitors]) => ({ country, visitors: visitors.size }))
          .sort((a, b) => b.visitors - a.visitors)
          .slice(0, 20)
      );

      // Traffic table
      setTrafficData(allSessions as TrafficRow[]);

      // Top clicks
      const clickMap: Record<string, { count: number; tag: string; text: string }> = {};
      allClicks.forEach(c => {
        const key = c.element_text || c.element_id || c.element_tag || 'unknown';
        if (!clickMap[key]) clickMap[key] = { count: 0, tag: c.element_tag || '', text: key };
        clickMap[key].count++;
      });
      setTopClicks(Object.values(clickMap).sort((a, b) => b.count - a.count).slice(0, 15));

      // Errors
      setErrorData(errors || []);

      // Settings
      const settingsMap: Record<string, string> = {};
      (settingsData || []).forEach(s => { settingsMap[s.key] = s.value; });
      setSettings(settingsMap);

    } catch (error) {
      console.error('Analytics fetch error:', error);
      toast({ title: 'Error', description: 'Failed to load analytics', variant: 'destructive' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAll(); }, [dateRange]);

  const handleRefresh = () => { setRefreshing(true); fetchAll(); };

  const handleExportCSV = () => {
    const rows = trafficData.map(r => ({
      Date: r.started_at, IP: r.ip_hash, Country: r.country, City: r.city,
      Device: r.device_type, Browser: r.browser, OS: r.os,
      Referrer: r.referrer, Entry: r.entry_page, Duration: r.duration_seconds,
      Pages: r.page_count, Bounce: r.is_bounce,
    }));
    const headers = Object.keys(rows[0] || {});
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${(r as any)[h] || ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast({ title: 'Exported', description: 'CSV downloaded successfully' });
  };

  const handleSettingToggle = async (key: string, current: string) => {
    const newValue = current === 'true' ? 'false' : 'true';
    await supabase.from('analytics_settings').update({ value: newValue }).eq('key', key);
    setSettings(prev => ({ ...prev, [key]: newValue }));
    toast({ title: 'Updated', description: `${key} set to ${newValue}` });
  };

  const calcGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const filteredTraffic = useMemo(() => {
    if (!trafficSearch) return trafficData;
    const q = trafficSearch.toLowerCase();
    return trafficData.filter(r =>
      (r.country || '').toLowerCase().includes(q) ||
      (r.browser || '').toLowerCase().includes(q) ||
      (r.entry_page || '').toLowerCase().includes(q) ||
      (r.device_type || '').toLowerCase().includes(q) ||
      (r.referrer || '').toLowerCase().includes(q)
    );
  }, [trafficData, trafficSearch]);

  const paginatedTraffic = filteredTraffic.slice(trafficPage * 20, (trafficPage + 1) * 20);
  const totalTrafficPages = Math.ceil(filteredTraffic.length / 20);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <UniversalLoader />
      </div>
    );
  }

  const GrowthIndicator = ({ current, previous }: { current: number; previous: number }) => {
    const growth = calcGrowth(current, previous);
    const isPositive = growth >= 0;
    return (
      <span className={`flex items-center text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
        {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {Math.abs(growth)}%
      </span>
    );
  };

  const statCards = [
    { title: 'Total Visitors', value: stats.totalVisitors, icon: Users, color: 'text-blue-500' },
    { title: 'Today', value: stats.visitorsToday, icon: Activity, color: 'text-green-500', prev: stats.prevVisitorsToday },
    { title: 'This Week', value: stats.visitorsWeek, icon: TrendingUp, color: 'text-purple-500', prev: stats.prevVisitorsWeek },
    { title: 'This Month', value: stats.visitorsMonth, icon: Globe, color: 'text-orange-500', prev: stats.prevVisitorsMonth },
    { title: 'Page Views', value: stats.totalPageViews, icon: Eye, color: 'text-cyan-500', prev: stats.prevPageViews },
    { title: 'Unique Visitors', value: stats.uniqueVisitors, icon: Users, color: 'text-indigo-500' },
    { title: 'Bounce Rate', value: `${stats.bounceRate}%`, icon: TrendingDown, color: 'text-red-500' },
    { title: 'Avg Duration', value: formatDuration(stats.avgSessionDuration), icon: Clock, color: 'text-amber-500' },
    { title: 'Returning', value: `${stats.returningRate}%`, icon: RefreshCw, color: 'text-teal-500' },
  ];

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--background))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: '12px',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">📊 Analytics Dashboard</h1>
          <p className="text-muted-foreground">Real-time insights into your website performance</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      {/* Live Visitors Counter */}
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="p-4 flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-lg font-semibold">{liveVisitors}</span>
          <span className="text-sm text-muted-foreground">live visitor{liveVisitors !== 1 ? 's' : ''} right now</span>
          <Badge variant="outline" className="ml-auto text-xs text-muted-foreground">Updates every 15s</Badge>
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                  {'prev' in stat && stat.prev !== undefined && (
                    <GrowthIndicator current={typeof stat.value === 'number' ? stat.value : 0} previous={stat.prev} />
                  )}
                </div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.title}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
          <TabsTrigger value="behavior">Behavior</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          {/* Visitors & Page Views Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Visitors & Page Views</CardTitle>
              <CardDescription>Daily trends over the last {days} days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(210, 70%, 55%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(210, 70%, 55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="visitors" stroke="hsl(var(--primary))" fill="url(#colorVisitors)" strokeWidth={2} />
                  <Area type="monotone" dataKey="views" stroke="hsl(210, 70%, 55%)" fill="url(#colorViews)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Pages */}
            <Card>
              <CardHeader>
                <CardTitle>Top Pages</CardTitle>
              </CardHeader>
              <CardContent>
                {topPages.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topPages} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis dataKey="page" type="category" width={120} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState icon={Eye} text="No page views yet" />
                )}
              </CardContent>
            </Card>

            {/* Device Split */}
            <Card>
              <CardHeader>
                <CardTitle>Devices</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                {deviceData.length > 0 ? (
                  <div className="flex flex-col items-center gap-4 w-full">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={deviceData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {deviceData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 flex-wrap justify-center">
                      {deviceData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-2 text-sm">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="capitalize">{d.name}: {d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState icon={Monitor} text="No device data" />
                )}
              </CardContent>
            </Card>

            {/* Traffic Sources */}
            <Card>
              <CardHeader>
                <CardTitle>Traffic Sources</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                {sourceData.length > 0 ? (
                  <div className="flex flex-col items-center gap-4 w-full">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={sourceData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {sourceData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 flex-wrap justify-center">
                      {sourceData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-2 text-sm">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="capitalize">{d.name}: {d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState icon={Globe} text="No source data" />
                )}
              </CardContent>
            </Card>

            {/* Hourly Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Hourly Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Geographic Visitor Map */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" /> Visitors by Country
              </CardTitle>
              <CardDescription>Top {countryData.length} countries by unique visitors</CardDescription>
            </CardHeader>
            <CardContent>
              {countryData.length > 0 ? (
                <div className="space-y-2">
                  {countryData.map((item, i) => {
                    const maxVisitors = countryData[0]?.visitors || 1;
                    const pct = Math.round((item.visitors / maxVisitors) * 100);
                    return (
                      <div key={item.country} className="flex items-center gap-3">
                        <span className="text-sm w-6 text-muted-foreground text-right">{i + 1}</span>
                        <span className="text-sm font-medium w-32 truncate">{item.country}</span>
                        <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                              opacity: 0.8,
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold w-12 text-right">{item.visitors}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon={Globe} text="No geographic data yet" />
              )}
            </CardContent>
          </Card>

          {/* AI Insights */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" /> AI Insights
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    setInsightsLoading(true);
                    setInsightsError('');
                    try {
                      const { data, error } = await supabase.functions.invoke('analytics-insights', {
                        body: {
                          stats,
                          topPages: topPages.slice(0, 5),
                          countryData: countryData.slice(0, 5),
                          sourceData,
                          deviceData,
                          errorCount: errorData.length,
                          dateRange: days,
                        },
                      });
                      if (error) throw error;
                      if (data?.error) {
                        setInsightsError(data.error);
                      } else {
                        setAiInsights(data.insights);
                      }
                    } catch (e: any) {
                      console.error('AI insights error:', e);
                      setInsightsError(e.message || 'Failed to generate insights');
                      toast({ title: 'Error', description: 'Failed to generate AI insights', variant: 'destructive' });
                    } finally {
                      setInsightsLoading(false);
                    }
                  }}
                  disabled={insightsLoading}
                >
                  {insightsLoading ? <UniversalSpinner size={16} className="mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                  {aiInsights ? 'Refresh' : 'Generate'}
                </Button>
              </div>
              <CardDescription>AI-powered trend analysis of your analytics data</CardDescription>
            </CardHeader>
            <CardContent>
              {insightsLoading ? (
                <div className="flex items-center justify-center h-24">
                  <UniversalSpinner size={24} className="text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Analyzing trends...</span>
                </div>
              ) : insightsError ? (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{insightsError}</div>
              ) : aiInsights ? (
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                  {aiInsights}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Click "Generate" to get AI-powered insights about your analytics trends
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRAFFIC TAB */}
        <TabsContent value="traffic" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle>Session Details</CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by country, browser..."
                    value={trafficSearch}
                    onChange={e => { setTrafficSearch(e.target.value); setTrafficPage(0); }}
                    className="pl-9"
                  />
                  {trafficSearch && (
                    <button onClick={() => setTrafficSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 px-3 text-left text-muted-foreground font-medium">IP</th>
                      <th className="py-2 px-3 text-left text-muted-foreground font-medium">Country</th>
                      <th className="py-2 px-3 text-left text-muted-foreground font-medium hidden md:table-cell">Device</th>
                      <th className="py-2 px-3 text-left text-muted-foreground font-medium hidden lg:table-cell">Browser</th>
                      <th className="py-2 px-3 text-left text-muted-foreground font-medium hidden lg:table-cell">OS</th>
                      <th className="py-2 px-3 text-left text-muted-foreground font-medium">Entry</th>
                      <th className="py-2 px-3 text-left text-muted-foreground font-medium hidden md:table-cell">Duration</th>
                      <th className="py-2 px-3 text-left text-muted-foreground font-medium hidden sm:table-cell">Pages</th>
                      <th className="py-2 px-3 text-left text-muted-foreground font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTraffic.map(row => (
                      <tr key={row.id} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-3 font-mono text-xs">{row.ip_hash?.substring(0, 8) || '—'}</td>
                        <td className="py-2 px-3">{row.country || '—'}</td>
                        <td className="py-2 px-3 hidden md:table-cell capitalize">{row.device_type || '—'}</td>
                        <td className="py-2 px-3 hidden lg:table-cell">{row.browser || '—'}</td>
                        <td className="py-2 px-3 hidden lg:table-cell">{row.os || '—'}</td>
                        <td className="py-2 px-3 max-w-[120px] truncate">{row.entry_page || '—'}</td>
                        <td className="py-2 px-3 hidden md:table-cell">{formatDuration(row.duration_seconds || 0)}</td>
                        <td className="py-2 px-3 hidden sm:table-cell">{row.page_count || 0}</td>
                        <td className="py-2 px-3 text-xs">{format(new Date(row.started_at), 'MMM dd HH:mm')}</td>
                      </tr>
                    ))}
                    {paginatedTraffic.length === 0 && (
                      <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">No sessions found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {totalTrafficPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">{filteredTraffic.length} sessions</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={trafficPage === 0} onClick={() => setTrafficPage(p => p - 1)}>Prev</Button>
                    <span className="flex items-center text-sm px-2">{trafficPage + 1}/{totalTrafficPages}</span>
                    <Button variant="outline" size="sm" disabled={trafficPage >= totalTrafficPages - 1} onClick={() => setTrafficPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* BEHAVIOR TAB */}
        <TabsContent value="behavior" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Clicked Elements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MousePointerClick className="h-5 w-5" /> Top Clicked Elements
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topClicks.length > 0 ? (
                  <div className="space-y-2">
                    {topClicks.map((click, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="outline" className="text-xs shrink-0">{click.tag}</Badge>
                          <span className="text-sm truncate">{click.text}</span>
                        </div>
                        <span className="text-sm font-medium ml-2">{click.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={MousePointerClick} text="No click data yet" />
                )}
              </CardContent>
            </Card>

            {/* Most Exited Pages */}
            <Card>
              <CardHeader>
                <CardTitle>Exit Pages</CardTitle>
                <CardDescription>Where visitors leave your site</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const exitMap: Record<string, number> = {};
                  trafficData.forEach(s => {
                    if (s.exit_page) exitMap[s.exit_page] = (exitMap[s.exit_page] || 0) + 1;
                  });
                  const exits = Object.entries(exitMap).sort(([, a], [, b]) => b - a).slice(0, 10);
                  return exits.length > 0 ? (
                    <div className="space-y-2">
                      {exits.map(([page, count]) => (
                        <div key={page} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                          <span className="text-sm truncate">{page}</span>
                          <span className="text-sm font-medium">{count} exits</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon={TrendingDown} text="No exit data yet" />
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ERRORS TAB */}
        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" /> Errors ({errorData.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {errorData.length > 0 ? (
                <div className="space-y-3">
                  {errorData.map(err => (
                    <div key={err.id} className="p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="destructive">{err.error_type}</Badge>
                        <span className="text-xs text-muted-foreground">{format(new Date(err.created_at), 'MMM dd HH:mm')}</span>
                      </div>
                      <p className="text-sm">{err.error_message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{err.page_path}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Zap} text="No errors recorded 🎉" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tracking Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: 'tracking_enabled', label: 'Enable Tracking', desc: 'Collect visitor data' },
                { key: 'track_clicks', label: 'Track Clicks', desc: 'Record button/link clicks' },
                { key: 'track_scroll', label: 'Track Scroll', desc: 'Measure scroll depth' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">{item.label}</Label>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={settings[item.key] === 'true'}
                    onCheckedChange={() => handleSettingToggle(item.key, settings[item.key] || 'true')}
                  />
                </div>
              ))}

              <div className="pt-4 border-t space-y-3">
                <Label className="font-medium">Excluded IPs</Label>
                <p className="text-sm text-muted-foreground">
                  Current: {settings.excluded_ips || '[]'}
                </p>
                <Label className="font-medium">Data Retention</Label>
                <p className="text-sm text-muted-foreground">
                  {settings.data_retention_days || '365'} days
                </p>
              </div>

              <div className="pt-4 border-t">
                <Button variant="destructive" onClick={async () => {
                  if (!confirm('Delete all analytics data older than 90 days?')) return;
                  const cutoff = subDays(new Date(), 90).toISOString();
                  await Promise.all([
                    supabase.from('analytics_page_views').delete().lt('created_at', cutoff),
                    supabase.from('analytics_clicks').delete().lt('created_at', cutoff),
                    supabase.from('analytics_events').delete().lt('created_at', cutoff),
                    supabase.from('analytics_errors').delete().lt('created_at', cutoff),
                  ]);
                  toast({ title: 'Cleaned', description: 'Old data removed' });
                  fetchAll();
                }}>
                  Clear Old Data (90+ days)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
      <Icon className="h-10 w-10 mb-2 opacity-40" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

export default AdvancedAnalyticsDashboard;
