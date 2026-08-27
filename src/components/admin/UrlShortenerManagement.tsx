import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Copy, Trash2, ExternalLink, Link2, BarChart2, Pencil } from 'lucide-react';
import { z } from 'zod';
import { UniversalLoader } from "@/components/ui/UniversalLoader";

interface ShortUrl {
  id: string;
  short_code: string;
  original_url: string;
  click_count: number;
  created_at: string;
}

// Trusted domains allowlist for URL shortener security
// This prevents potential phishing attacks if an admin account is compromised
const ALLOWED_DOMAINS = [
  // Own domains
  'rahulgupta.site',
  'biharelection.rahulgupta.site',
  
  // Social Media
  'youtube.com',
  'youtu.be',
  'instagram.com',
  'twitter.com',
  'x.com',
  'linkedin.com',
  'facebook.com',
  'fb.com',
  'whatsapp.com',
  'wa.me',
  'telegram.org',
  't.me',
  'discord.com',
  'discord.gg',
  'reddit.com',
  'pinterest.com',
  'threads.net',
  
  // Development & Code
  'github.com',
  'gist.github.com',
  'gitlab.com',
  'bitbucket.org',
  'npmjs.com',
  'stackoverflow.com',
  'codepen.io',
  'replit.com',
  'figma.com',
  'canva.com',
  
  // Google Services
  'google.com',
  'drive.google.com',
  'docs.google.com',
  'sheets.google.com',
  'slides.google.com',
  'forms.google.com',
  'play.google.com',
  'meet.google.com',
  'calendar.google.com',
  'mail.google.com',
  
  // Cloud & Hosting
  'vercel.app',
  'netlify.app',
  'supabase.com',
  'lovable.dev',
  'firebase.google.com',
  'cloudflare.com',
  'aws.amazon.com',
  'dropbox.com',
  'onedrive.live.com',
  
  // Productivity & Notes
  'notion.so',
  'notion.site',
  'trello.com',
  'asana.com',
  'slack.com',
  'zoom.us',
  
  // Education & Content
  'medium.com',
  'dev.to',
  'hashnode.dev',
  'wikipedia.org',
  'khanacademy.org',
  'coursera.org',
  'udemy.com',
  'edx.org',
  
  // Payment & Commerce
  'paypal.com',
  'razorpay.com',
  'paytm.com',
  'phonepe.com',
  'gpay.app',
  'amazon.in',
  'flipkart.com',
];

const isValidHttpUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

const urlSchema = z.object({
  original_url: z.string()
    .url({ message: "Please enter a valid URL" })
    .refine(isValidHttpUrl, { message: "URL must start with http:// or https://" }),
  custom_code: z.string().regex(/^[a-zA-Z0-9_-]*$/, { message: "Only letters, numbers, hyphens and underscores allowed" }).max(20, { message: "Max 20 characters" }).optional().or(z.literal('')),
});

const generateShortCode = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export default function UrlShortenerManagement() {
  const [urls, setUrls] = useState<ShortUrl[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUrl, setEditingUrl] = useState<ShortUrl | null>(null);
  const [editOriginalUrl, setEditOriginalUrl] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const baseUrl = 'https://rahulgupta.site/';

  useEffect(() => {
    fetchUrls();
  }, []);

  const fetchUrls = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('short_urls')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch URLs');
      console.error(error);
    } else {
      setUrls(data || []);
    }
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    try {
      const validation = urlSchema.safeParse({ original_url: originalUrl, custom_code: customCode });
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      setIsSubmitting(true);
      const shortCode = customCode.trim() || generateShortCode();

      // Check if custom code already exists
      if (customCode.trim()) {
        const { data: existing } = await supabase
          .from('short_urls')
          .select('id')
          .eq('short_code', shortCode)
          .single();
        
        if (existing) {
          toast.error('This short code is already taken');
          setIsSubmitting(false);
          return;
        }
      }

      const { error } = await supabase
        .from('short_urls')
        .insert({ 
          short_code: shortCode, 
          original_url: originalUrl.trim(),
          click_count: 0
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('This short code already exists');
        } else {
          toast.error('Failed to create short URL');
        }
        console.error(error);
      } else {
        toast.success('Short URL created!');
        setOriginalUrl('');
        setCustomCode('');
        setIsDialogOpen(false);
        fetchUrls();
      }
    } catch (err) {
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this URL?')) return;

    const { error } = await supabase
      .from('short_urls')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete URL');
    } else {
      toast.success('URL deleted');
      fetchUrls();
    }
  };

  const copyToClipboard = (shortCode: string) => {
    navigator.clipboard.writeText(`${baseUrl}${shortCode}`);
    toast.success('Copied to clipboard!');
  };

  const openEditDialog = (url: ShortUrl) => {
    setEditingUrl(url);
    setEditOriginalUrl(url.original_url);
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editingUrl) return;

    const validation = z.string().url().refine(isValidHttpUrl).safeParse(editOriginalUrl);
    if (!validation.success) {
      toast.error('Please enter a valid URL (http:// or https://)');
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase
      .from('short_urls')
      .update({ original_url: editOriginalUrl.trim() })
      .eq('id', editingUrl.id);

    if (error) {
      toast.error('Failed to update URL');
    } else {
      toast.success('URL updated!');
      setEditDialogOpen(false);
      setEditingUrl(null);
      fetchUrls();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">URL Shortener</h1>
          <p className="text-muted-foreground">Create and manage short URLs</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Short URL
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Short URL</DialogTitle>
              <DialogDescription>
                Paste a long URL to create a short version
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="originalUrl">Original URL *</Label>
                <Input
                  id="originalUrl"
                  placeholder="https://example.com/very-long-url..."
                  value={originalUrl}
                  onChange={(e) => setOriginalUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customCode">Custom Code (optional)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">rahulgupta.site/</span>
                  <Input
                    id="customCode"
                    placeholder="my-link"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave empty for auto-generated code
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || !originalUrl.trim()}>
                {isSubmitting ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            All Short URLs
          </CardTitle>
          <CardDescription>
            {urls.length} URL{urls.length !== 1 ? 's' : ''} created
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <UniversalLoader />
            </div>
          ) : urls.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No short URLs yet</p>
              <p className="text-sm">Create your first short URL above</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Short URL</TableHead>
                    <TableHead className="hidden md:table-cell">Original URL</TableHead>
                    <TableHead className="text-center">Clicks</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {urls.map((url) => (
                    <TableRow key={url.id}>
                      <TableCell>
                        <div className="font-mono text-sm text-primary">
                          /{url.short_code}
                        </div>
                        <div className="md:hidden text-xs text-muted-foreground truncate max-w-[200px]">
                          {url.original_url}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-[300px]">
                        <div className="truncate text-sm text-muted-foreground">
                          {url.original_url}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <BarChart2 className="h-4 w-4 text-muted-foreground" />
                          <span>{url.click_count}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(url.short_code)}
                            title="Copy short URL"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(url)}
                            title="Edit URL"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            title="Open original URL"
                          >
                            <a href={url.original_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(url.id)}
                            title="Delete"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit URL Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Short URL</DialogTitle>
            <DialogDescription>
              Update the destination URL for: <span className="font-mono text-primary">/{editingUrl?.short_code}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editOriginalUrl">Destination URL</Label>
              <Input
                id="editOriginalUrl"
                placeholder="https://example.com/new-url..."
                value={editOriginalUrl}
                onChange={(e) => setEditOriginalUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={isSubmitting || !editOriginalUrl.trim()}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
