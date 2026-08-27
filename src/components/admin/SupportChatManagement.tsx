import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Clock, Users, Star, TrendingUp, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import ChatbotIndexingPanel from "./ChatbotIndexingPanel";
import ChatbotQueryAnalytics from "./ChatbotQueryAnalytics";
import { UniversalLoader } from "@/components/ui/UniversalLoader";

interface ChatSession {
  id: string;
  session_id: string;
  page_url: string;
  opened_at: string;
  closed_at: string | null;
  duration_seconds: number | null;
  user_agent: string;
}

interface ChatStats {
  totalSessions: number;
  activeNow: number;
  todaySessions: number;
  avgDuration: number;
  uniqueVisitors: number;
  avgRating: number;
}

const SupportChatManagement = () => {
  const [stats, setStats] = useState<ChatStats>({
    totalSessions: 0,
    activeNow: 0,
    todaySessions: 0,
    avgDuration: 0,
    uniqueVisitors: 0,
    avgRating: 0,
  });
  const [recentSessions, setRecentSessions] = useState<ChatSession[]>([]);
  const [pageStats, setPageStats] = useState<{ page: string; count: number }[]>([]);
  const [dailyTrends, setDailyTrends] = useState<{ date: string; sessions: number }[]>([]);
  const [timeRange, setTimeRange] = useState("7");
  const [isLoading, setIsLoading] = useState(true);

  const fetchChatAnalytics = async () => {
    try {
      setIsLoading(true);
      const daysAgo = parseInt(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Fetch total sessions
      const { data: allSessions, error: sessionsError } = await supabase
        .from("chat_sessions")
        .select("*")
        .gte("created_at", startDate.toISOString());

      if (sessionsError) throw sessionsError;

      // Fetch today's sessions
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: todaySessions } = await supabase
        .from("chat_sessions")
        .select("*")
        .gte("created_at", todayStart.toISOString());

      // Active sessions (no closed_at)
      const { data: activeSessions } = await supabase
        .from("chat_sessions")
        .select("*")
        .is("closed_at", null);

      // Calculate average duration
      const completedSessions = allSessions?.filter(s => s.duration_seconds) || [];
      const avgDuration = completedSessions.length > 0
        ? completedSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / completedSessions.length
        : 0;

      // Fetch feedback ratings
      const { data: feedback } = await supabase
        .from("chat_feedback")
        .select("rating");

      const avgRating = feedback && feedback.length > 0
        ? feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.length
        : 0;

      // Recent sessions
      const { data: recent } = await supabase
        .from("chat_sessions")
        .select("*")
        .order("opened_at", { ascending: false })
        .limit(10);

      // Page-wise breakdown
      const pageBreakdown: Record<string, number> = {};
      allSessions?.forEach(session => {
        const page = session.page_url || "Unknown";
        pageBreakdown[page] = (pageBreakdown[page] || 0) + 1;
      });

      const pageStatsArray = Object.entries(pageBreakdown)
        .map(([page, count]) => ({ page, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Daily trends
      const dailyBreakdown: Record<string, number> = {};
      allSessions?.forEach(session => {
        const date = new Date(session.created_at).toLocaleDateString();
        dailyBreakdown[date] = (dailyBreakdown[date] || 0) + 1;
      });

      const trendsArray = Object.entries(dailyBreakdown)
        .map(([date, sessions]) => ({ date, sessions }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setStats({
        totalSessions: allSessions?.length || 0,
        activeNow: activeSessions?.length || 0,
        todaySessions: todaySessions?.length || 0,
        avgDuration: Math.round(avgDuration),
        uniqueVisitors: allSessions?.length || 0, // Simplified
        avgRating: parseFloat(avgRating.toFixed(1)),
      });

      setRecentSessions((recent || []) as any);
      setPageStats(pageStatsArray);
      setDailyTrends(trendsArray);
    } catch (error) {
      console.error("Error fetching chat analytics:", error);
      toast.error("Failed to load chat analytics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChatAnalytics();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("chat-sessions-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_sessions" },
        () => fetchChatAnalytics()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [timeRange]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const handleExportCSV = () => {
    const csvData = recentSessions.map(session => ({
      Time: new Date(session.opened_at).toLocaleString(),
      Page: session.page_url,
      Duration: formatDuration(session.duration_seconds),
      Status: session.closed_at ? "Closed" : "Active",
    }));

    const csv = [
      Object.keys(csvData[0]).join(","),
      ...csvData.map(row => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-sessions-${new Date().toISOString()}.csv`;
    a.click();
    toast.success("CSV exported successfully!");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <UniversalLoader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-foreground">Ramogu AI Assistant</h2>
        <p className="text-muted-foreground">Manage site-wide AI assistant, indexing, and analytics</p>
      </div>

      <Tabs defaultValue="sessions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sessions">Chat Sessions</TabsTrigger>
          <TabsTrigger value="queries">Query Analytics</TabsTrigger>
          <TabsTrigger value="indexing">Site Indexing</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-6">
          {/* Time Range Selector */}
          <div className="flex justify-end gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 3 Months</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExportCSV} variant="outline">
              Export CSV
            </Button>
          </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
            <p className="text-xs text-muted-foreground">Last {timeRange} days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeNow}</div>
            <p className="text-xs text-muted-foreground">Currently open chats</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Chats</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todaySessions}</div>
            <p className="text-xs text-muted-foreground">Sessions today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(stats.avgDuration)}</div>
            <p className="text-xs text-muted-foreground">Per session</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueVisitors}</div>
            <p className="text-xs text-muted-foreground">Unique sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
            <Star className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgRating > 0 ? `${stats.avgRating}/5` : "N/A"} ⭐</div>
            <p className="text-xs text-muted-foreground">Average rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Chat Usage Trends</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="sessions" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Page Breakdown Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Most Common Pages</CardTitle>
          </CardHeader>
          <CardContent>
            {pageStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={pageStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="page" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Chat Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Time</th>
                  <th className="text-left p-2">Page</th>
                  <th className="text-left p-2">Duration</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.length > 0 ? (
                  recentSessions.map((session) => (
                    <tr key={session.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        {new Date(session.opened_at).toLocaleString()}
                      </td>
                      <td className="p-2">{session.page_url}</td>
                      <td className="p-2">{formatDuration(session.duration_seconds)}</td>
                      <td className="p-2">
                        {session.closed_at ? (
                          <span className="text-muted-foreground">Closed</span>
                        ) : (
                          <span className="text-green-600 font-semibold">Active</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center p-4 text-muted-foreground">
                      No sessions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="queries">
          <ChatbotQueryAnalytics />
        </TabsContent>

        <TabsContent value="indexing">
          <ChatbotIndexingPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SupportChatManagement;