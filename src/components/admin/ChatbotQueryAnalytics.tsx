import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, AlertCircle, CheckCircle, TrendingUp, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";
import { UniversalLoader } from "@/components/ui/UniversalLoader";

interface ChatQuery {
  id: string;
  query: string;
  was_answered: boolean;
  matched_page_path: string | null;
  language: string;
  created_at: string;
}

interface QueryStats {
  total: number;
  answered: number;
  unanswered: number;
  answerRate: number;
}

const ChatbotQueryAnalytics = () => {
  const [queries, setQueries] = useState<ChatQuery[]>([]);
  const [stats, setStats] = useState<QueryStats>({ total: 0, answered: 0, unanswered: 0, answerRate: 0 });
  const [topQueries, setTopQueries] = useState<{ query: string; count: number }[]>([]);
  const [unansweredQueries, setUnansweredQueries] = useState<{ query: string; count: number }[]>([]);
  const [timeRange, setTimeRange] = useState("7");
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const daysAgo = parseInt(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Fetch all queries in time range
      const { data: queriesData, error } = await supabase
        .from("chat_queries")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      setQueries(queriesData || []);

      // Calculate stats
      const total = queriesData?.length || 0;
      const answered = queriesData?.filter(q => q.was_answered).length || 0;
      const unanswered = total - answered;
      const answerRate = total > 0 ? Math.round((answered / total) * 100) : 0;

      setStats({ total, answered, unanswered, answerRate });

      // Calculate top queries (group similar queries)
      const queryMap: Record<string, number> = {};
      queriesData?.forEach(q => {
        const normalizedQuery = q.query.toLowerCase().trim().substring(0, 50);
        queryMap[normalizedQuery] = (queryMap[normalizedQuery] || 0) + 1;
      });

      const topQueriesArray = Object.entries(queryMap)
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setTopQueries(topQueriesArray);

      // Calculate unanswered queries
      const unansweredMap: Record<string, number> = {};
      queriesData?.filter(q => !q.was_answered).forEach(q => {
        const normalizedQuery = q.query.toLowerCase().trim().substring(0, 50);
        unansweredMap[normalizedQuery] = (unansweredMap[normalizedQuery] || 0) + 1;
      });

      const unansweredArray = Object.entries(unansweredMap)
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setUnansweredQueries(unansweredArray);
    } catch (error) {
      console.error("Error fetching query analytics:", error);
      toast.error("Failed to load query analytics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const handleExportCSV = () => {
    const csvData = queries.map(q => ({
      Query: q.query.replace(/,/g, ";"),
      Answered: q.was_answered ? "Yes" : "No",
      Page: q.matched_page_path || "N/A",
      Language: q.language,
      Time: new Date(q.created_at).toLocaleString()
    }));

    const csv = [
      Object.keys(csvData[0] || {}).join(","),
      ...csvData.map(row => Object.values(row).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-queries-${new Date().toISOString()}.csv`;
    a.click();
    toast.success("CSV exported!");
  };

  const pieData = [
    { name: "Answered", value: stats.answered, color: "#22c55e" },
    { name: "Unanswered", value: stats.unanswered, color: "#ef4444" }
  ].filter(d => d.value > 0);

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
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold">Query Analytics</h3>
          <p className="text-sm text-muted-foreground">Track what users are asking</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 3 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportCSV} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Answered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.answered}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Unanswered</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.unanswered}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Answer Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.answerRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Queries Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Most Asked Questions</CardTitle>
          </CardHeader>
          <CardContent>
            {topQueries.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topQueries} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="query" 
                    type="category" 
                    width={150}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No queries yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Answer Rate Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Answer Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Unanswered Queries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Unanswered Queries (Need Attention)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unansweredQueries.length > 0 ? (
            <div className="space-y-2">
              {unansweredQueries.map((q, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <span className="text-sm">{q.query}</span>
                  <Badge variant="secondary">{q.count}x</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              All queries are being answered!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Queries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Queries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Query</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Page</th>
                  <th className="text-left p-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {queries.slice(0, 20).map((q) => (
                  <tr key={q.id} className="border-b hover:bg-muted/50">
                    <td className="p-2 max-w-[300px] truncate">{q.query}</td>
                    <td className="p-2">
                      {q.was_answered ? (
                        <Badge className="bg-green-500">Answered</Badge>
                      ) : (
                        <Badge variant="destructive">Unanswered</Badge>
                      )}
                    </td>
                    <td className="p-2 text-sm text-muted-foreground">
                      {q.matched_page_path || "-"}
                    </td>
                    <td className="p-2 text-sm text-muted-foreground">
                      {new Date(q.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {queries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center p-4 text-muted-foreground">
                      No queries recorded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatbotQueryAnalytics;
