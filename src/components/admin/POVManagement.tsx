import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, Eye, EyeOff, Flame, ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { UniversalLoader } from "@/components/ui/UniversalLoader";

interface POVPost {
  id: string;
  title: string;
  content: string;
  post_type: string;
  category: string;
  language: string;
  author_name: string;
  is_featured: boolean;
  is_hot_take: boolean;
  is_visible: boolean;
  agree_count: number;
  disagree_count: number;
  comment_count: number;
  created_at: string;
  min_tier: string;
  excerpt: string | null;
}

const defaultPost = {
  title: '',
  content: '',
  post_type: 'quick_pov',
  category: 'personal',
  language: 'hindi',
  author_name: 'Rahul',
  is_featured: false,
  is_hot_take: false,
  is_visible: true,
  min_tier: 'public',
  excerpt: '',
};

export default function POVManagement() {
  const [posts, setPosts] = useState<POVPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<POVPost | null>(null);
  const [form, setForm] = useState(defaultPost);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('pov_posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setPosts(data as POVPost[]);
    setIsLoading(false);
  };

  const openCreate = () => {
    setEditingPost(null);
    setForm(defaultPost);
    setDialogOpen(true);
  };

  const openEdit = (post: POVPost) => {
    setEditingPost(post);
    setForm({
      title: post.title,
      content: post.content,
      post_type: post.post_type,
      category: post.category,
      language: post.language,
      author_name: post.author_name,
      is_featured: post.is_featured,
      is_hot_take: post.is_hot_take,
      is_visible: post.is_visible,
      min_tier: post.min_tier ?? 'public',
      excerpt: post.excerpt ?? '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Title and content are required');
      return;
    }
    setIsSubmitting(true);

    if (editingPost) {
      const { error } = await supabase.from('pov_posts').update(form).eq('id', editingPost.id);
      if (error) toast.error('Failed to update post');
      else { toast.success('Post updated'); setDialogOpen(false); fetchPosts(); }
    } else {
      const { error } = await supabase.from('pov_posts').insert(form);
      if (error) toast.error('Failed to create post');
      else { toast.success('Post created!'); setDialogOpen(false); fetchPosts(); }
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this post? All comments and reactions will be removed.')) return;
    const { error } = await supabase.from('pov_posts').delete().eq('id', id);
    if (error) toast.error('Failed to delete');
    else { toast.success('Post deleted'); fetchPosts(); }
  };

  const toggleVisibility = async (post: POVPost) => {
    await supabase.from('pov_posts').update({ is_visible: !post.is_visible }).eq('id', post.id);
    fetchPosts();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Rahul POV</h1>
          <p className="text-muted-foreground">Manage your thoughts and discussions</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New Post</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Posts ({posts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <UniversalLoader />
            </div>
          ) : posts.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No posts yet. Create your first POV!</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden md:table-cell">Type</TableHead>
                    <TableHead className="hidden sm:table-cell">Stats</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map(post => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <div className="font-medium max-w-[200px] truncate">{post.title}</div>
                        <div className="flex gap-1 mt-1">
                          <Badge variant="outline" className="text-xs">{post.category}</Badge>
                          {post.is_hot_take && <Badge variant="destructive" className="text-xs">🔥</Badge>}
                          {!post.is_visible && <Badge variant="secondary" className="text-xs">Hidden</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary" className="text-xs">{post.post_type}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{post.agree_count}</span>
                          <span className="flex items-center gap-1"><ThumbsDown className="h-3 w-3" />{post.disagree_count}</span>
                          <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{post.comment_count}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => toggleVisibility(post)} title={post.is_visible ? 'Hide' : 'Show'}>
                            {post.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(post)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(post.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? 'Edit Post' : 'Create New Post'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Your bold thought..." />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Share your unfiltered POV..." className="min-h-[120px]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Post Type</Label>
                <Select value={form.post_type} onValueChange={v => setForm({ ...form, post_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quick_pov">Quick POV</SelectItem>
                    <SelectItem value="deep_thought">Deep Thought</SelectItem>
                    <SelectItem value="discussion">Discussion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="philosophy">Philosophy</SelectItem>
                    <SelectItem value="society">Society Reality</SelectItem>
                    <SelectItem value="politics">Politics</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="short_pov">Short POV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={form.language} onValueChange={v => setForm({ ...form, language: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hindi">Hindi</SelectItem>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="bhojpuri">Bhojpuri</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Author Name</Label>
                <Input value={form.author_name} onChange={e => setForm({ ...form, author_name: e.target.value })} />
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_featured} onCheckedChange={v => setForm({ ...form, is_featured: v })} />
                <Label>Featured</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_hot_take} onCheckedChange={v => setForm({ ...form, is_hot_take: v })} />
                <Label className="flex items-center gap-1"><Flame className="h-4 w-4" />Hot Take</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_visible} onCheckedChange={v => setForm({ ...form, is_visible: v })} />
                <Label>Visible</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingPost ? 'Save Changes' : 'Create Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
