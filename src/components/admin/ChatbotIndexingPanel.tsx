import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Database, Clock, FileText, AlertCircle, CheckCircle, Zap, Globe } from "lucide-react";import { toast } from "sonner";
import { UniversalSpinner } from "@/components/ui/UniversalLoader";
import { uniqueChannel } from "@/lib/realtime";

interface IndexingStatus {
  last_indexed_at: string | null;
  total_pages_indexed: number;
  status: string;
  error_message: string | null;
  indexed_by: string | null;
}

interface IndexedPage {
  page_path: string;
  page_title: string;
  last_indexed_at: string;
  keywords?: string[];
}

const ChatbotIndexingPanel = () => {
  const [status, setStatus] = useState<IndexingStatus | null>(null);
  const [indexedPages, setIndexedPages] = useState<IndexedPage[]>([]);
  const [isReindexing, setIsReindexing] = useState(false);
  const [isSmartIndexing, setIsSmartIndexing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      // Fetch indexing status
      const { data: statusData, error: statusError } = await supabase
        .from("site_indexing_status")
        .select("*")
        .limit(1)
        .single();

      if (statusError) {
        console.error("Error fetching status:", statusError);
      } else {
        setStatus((statusData) as any);
      }

      // Fetch indexed pages with keywords
      const { data: pagesData, error: pagesError } = await supabase
        .from("site_indexed_content")
        .select("page_path, page_title, last_indexed_at, keywords")
        .order("last_indexed_at", { ascending: false });

      if (pagesError) {
        console.error("Error fetching pages:", pagesError);
      } else {
        setIndexedPages((pagesData || []) as any);
      }
    } catch (error) {
      console.error("Error fetching indexing data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(uniqueChannel("indexing-status-changes"))
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_indexing_status" },
        () => fetchStatus()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_indexed_content" },
        () => fetchStatus()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleBasicReindex = async () => {
    setIsReindexing(true);
    try {
      const response = await fetch(
        '/api/public/index-site-content',
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Basic indexing completed!");
        fetchStatus();
      } else {
        toast.error(data.error || "Failed to index site");
      }
    } catch (error) {
      console.error("Reindex error:", error);
      toast.error("Failed to index site");
    } finally {
      setIsReindexing(false);
    }
  };

  const handleSmartIndex = async () => {
    setIsSmartIndexing(true);
    toast.info("Starting Firecrawl smart indexing... This may take 1-2 minutes.");
    
    try {
      const response = await fetch(
        '/api/public/smart-index-site',
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`Smart indexing complete! ${data.message}`);
        fetchStatus();
      } else {
        toast.error(data.error || "Smart indexing failed");
      }
    } catch (error) {
      console.error("Smart index error:", error);
      toast.error("Failed to run smart indexing");
    } finally {
      setIsSmartIndexing(false);
    }
  };

  const getStatusBadge = () => {
    if (!status) return null;
    
    switch (status.status) {
      case "completed":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case "indexing":
        return <Badge className="bg-blue-500"><UniversalSpinner size={12} className="mr-1" /> Indexing...</Badge>;
      case "error":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Error</Badge>;
      default:
        return <Badge variant="secondary">Idle</Badge>;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <UniversalSpinner size={32} className="text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Site Content Indexing
              </CardTitle>
              <CardDescription className="mt-1">
                Index website content for the AI chatbot to use
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{status?.total_pages_indexed || 0}</p>
                <p className="text-sm text-muted-foreground">Pages Indexed</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Clock className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium">{formatDate(status?.last_indexed_at || null)}</p>
                <p className="text-sm text-muted-foreground">Last Indexed</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Globe className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium">{status?.indexed_by || "None"}</p>
                <p className="text-sm text-muted-foreground">Indexer Used</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleSmartIndex} 
              disabled={isSmartIndexing || isReindexing || status?.status === "indexing"}
              className="flex-1"
              variant="default"
            >
              {isSmartIndexing ? (
                <>
                  <UniversalSpinner size={16} className="mr-2" />
                  Smart Indexing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Smart Index (Firecrawl)
                </>
              )}
            </Button>
            
            <Button 
              onClick={handleBasicReindex} 
              disabled={isReindexing || isSmartIndexing || status?.status === "indexing"}
              variant="outline"
              className="flex-1"
            >
              {isReindexing ? (
                <>
                  <UniversalSpinner size={16} className="mr-2" />
                  Basic Indexing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Basic Re-index
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <strong>Smart Index (Recommended):</strong> Uses Firecrawl to scrape live website content - more accurate and comprehensive.<br />
            <strong>Basic Re-index:</strong> Uses predefined content - faster but less accurate.
          </div>

          {status?.error_message && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{status.error_message}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Indexed Pages List */}
      <Card>
        <CardHeader>
          <CardTitle>Indexed Pages ({indexedPages.length})</CardTitle>
          <CardDescription>
            Pages available for the chatbot to reference
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Page</th>
                  <th className="text-left p-2">Path</th>
                  <th className="text-left p-2 hidden md:table-cell">Keywords</th>
                  <th className="text-left p-2">Last Indexed</th>
                </tr>
              </thead>
              <tbody>
                {indexedPages.length > 0 ? (
                  indexedPages.map((page) => (
                    <tr key={page.page_path} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{page.page_title}</td>
                      <td className="p-2 text-muted-foreground text-sm">{page.page_path}</td>
                      <td className="p-2 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {(page.keywords || []).slice(0, 5).map((keyword, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                          {(page.keywords || []).length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{(page.keywords || []).length - 5} more
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-sm text-muted-foreground">
                        {formatDate(page.last_indexed_at)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center p-4 text-muted-foreground">
                      No pages indexed yet. Click "Smart Index" to start.
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

export default ChatbotIndexingPanel;
