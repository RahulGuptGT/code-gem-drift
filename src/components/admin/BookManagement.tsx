import { useEffect, useState } from 'react';
import { db, TIER_LABEL, type Tier } from '@/integrations/supabase/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UniversalLoader } from '@/components/ui/UniversalLoader';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Lock, Pencil, Plus, Trash2 } from 'lucide-react';

const TIERS: Tier[] = ['public', 'starter', 'signature', 'sovereign'];

interface Book {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_url: string | null;
  author_name: string;
  is_published: boolean;
}

interface Chapter {
  id: string;
  book_id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  min_tier: string;
  chapter_number: number;
  reading_minutes: number | null;
  is_published: boolean;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

const emptyChapter = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  min_tier: 'public',
  chapter_number: 1,
  is_published: true,
};

export default function BookManagement() {
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bookForm, setBookForm] = useState({
    slug: 'the-book',
    title: '',
    subtitle: '',
    description: '',
    cover_url: '',
    author_name: 'Rahul Gupta',
    is_published: true,
  });
  const [chapterOpen, setChapterOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [chapterForm, setChapterForm] = useState({ ...emptyChapter });

  const load = async () => {
    setLoading(true);
    const { data: books } = await db
      .from('books')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1);
    const current = ((books ?? []) as Book[])[0] ?? null;
    setBook(current);
    if (current) {
      setBookForm({
        slug: current.slug,
        title: current.title,
        subtitle: current.subtitle ?? '',
        description: current.description ?? '',
        cover_url: current.cover_url ?? '',
        author_name: current.author_name,
        is_published: current.is_published,
      });
      const { data: rows } = await db
        .from('book_chapters')
        .select('*')
        .eq('book_id', current.id)
        .order('chapter_number', { ascending: true });
      setChapters((rows ?? []) as Chapter[]);
    } else {
      setChapters([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const saveBook = async () => {
    if (!bookForm.title.trim()) {
      toast.error('Book title zaroori hai');
      return;
    }
    setSaving(true);
    const payload = {
      slug: slugify(bookForm.slug || bookForm.title),
      title: bookForm.title.trim(),
      subtitle: bookForm.subtitle.trim() || null,
      description: bookForm.description.trim() || null,
      cover_url: bookForm.cover_url.trim() || null,
      author_name: bookForm.author_name.trim() || 'Rahul Gupta',
      is_published: bookForm.is_published,
    };
    const { error } = book
      ? await db.from('books').update(payload).eq('id', book.id)
      : await db.from('books').insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Book saved');
    void load();
  };

  const openNewChapter = () => {
    setEditingChapter(null);
    setChapterForm({
      ...emptyChapter,
      chapter_number: chapters.length + 1,
      min_tier: chapters.length < 2 ? 'public' : 'signature',
    });
    setChapterOpen(true);
  };

  const openEditChapter = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setChapterForm({
      title: chapter.title,
      slug: chapter.slug,
      excerpt: chapter.excerpt ?? '',
      content: chapter.content,
      min_tier: chapter.min_tier,
      chapter_number: chapter.chapter_number,
      is_published: chapter.is_published,
    });
    setChapterOpen(true);
  };

  const saveChapter = async () => {
    if (!book) {
      toast.error('Pehle book details save karo');
      return;
    }
    if (!chapterForm.title.trim() || !chapterForm.content.trim()) {
      toast.error('Title aur content zaroori hain');
      return;
    }
    setSaving(true);
    const words = chapterForm.content.trim().split(/\s+/).length;
    const payload = {
      book_id: book.id,
      slug: slugify(chapterForm.slug || chapterForm.title),
      title: chapterForm.title.trim(),
      excerpt: chapterForm.excerpt.trim() || null,
      content: chapterForm.content,
      min_tier: chapterForm.min_tier,
      chapter_number: Number(chapterForm.chapter_number) || chapters.length + 1,
      reading_minutes: Math.max(1, Math.round(words / 200)),
      is_published: chapterForm.is_published,
    };
    const { error } = editingChapter
      ? await db.from('book_chapters').update(payload).eq('id', editingChapter.id)
      : await db.from('book_chapters').insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editingChapter ? 'Chapter updated' : 'Chapter added');
    setChapterOpen(false);
    void load();
  };

  const removeChapter = async (chapter: Chapter) => {
    if (!window.confirm(`"${chapter.title}" delete karein?`)) return;
    const { error } = await db.from('book_chapters').delete().eq('id', chapter.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Chapter deleted');
    void load();
  };

  const move = async (chapter: Chapter, direction: -1 | 1) => {
    const index = chapters.findIndex(c => c.id === chapter.id);
    const swapWith = chapters[index + direction];
    if (!swapWith) return;
    await Promise.all([
      db.from('book_chapters').update({ chapter_number: swapWith.chapter_number }).eq('id', chapter.id),
      db.from('book_chapters').update({ chapter_number: chapter.chapter_number }).eq('id', swapWith.id),
    ]);
    void load();
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <UniversalLoader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Book</h1>
        <p className="text-sm text-muted-foreground">
          Long-form book jo website par hi padhi jaati hai — har chapter ka apna access tier.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Book details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={bookForm.title}
              onChange={e => setBookForm({ ...bookForm, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Subtitle</Label>
            <Input
              value={bookForm.subtitle}
              onChange={e => setBookForm({ ...bookForm, subtitle: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={bookForm.description}
              onChange={e => setBookForm({ ...bookForm, description: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Cover image URL</Label>
            <Input
              value={bookForm.cover_url}
              onChange={e => setBookForm({ ...bookForm, cover_url: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Author name</Label>
            <Input
              value={bookForm.author_name}
              onChange={e => setBookForm({ ...bookForm, author_name: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={bookForm.is_published}
              onCheckedChange={checked => setBookForm({ ...bookForm, is_published: checked })}
            />
            <Label>Published</Label>
          </div>
          <div className="flex items-end justify-end">
            <Button onClick={() => void saveBook()} disabled={saving}>
              {book ? 'Save book' : 'Create book'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Chapters ({chapters.length})</CardTitle>
          <Button size="sm" onClick={openNewChapter} disabled={!book}>
            <Plus className="mr-2 h-4 w-4" />
            New chapter
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chapters.map(chapter => (
                <TableRow key={chapter.id}>
                  <TableCell>{chapter.chapter_number}</TableCell>
                  <TableCell className="font-medium">{chapter.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      {chapter.min_tier !== 'public' && <Lock className="h-3 w-3" />}
                      {TIER_LABEL[chapter.min_tier as Tier] ?? chapter.min_tier}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={chapter.is_published ? 'default' : 'outline'}>
                      {chapter.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => void move(chapter, -1)}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => void move(chapter, 1)}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => openEditChapter(chapter)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => void removeChapter(chapter)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {chapters.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Abhi koi chapter nahi. "New chapter" se pehla chapter likhiye.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={chapterOpen} onOpenChange={setChapterOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingChapter ? 'Edit chapter' : 'New chapter'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Title</Label>
              <Input
                value={chapterForm.title}
                onChange={e =>
                  setChapterForm({
                    ...chapterForm,
                    title: e.target.value,
                    slug: editingChapter ? chapterForm.slug : slugify(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Slug (URL)</Label>
              <Input
                value={chapterForm.slug}
                onChange={e => setChapterForm({ ...chapterForm, slug: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Chapter number</Label>
              <Input
                type="number"
                value={chapterForm.chapter_number}
                onChange={e =>
                  setChapterForm({ ...chapterForm, chapter_number: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Minimum plan</Label>
              <Select
                value={chapterForm.min_tier}
                onValueChange={value => setChapterForm({ ...chapterForm, min_tier: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIERS.map(tier => (
                    <SelectItem key={tier} value={tier}>
                      {TIER_LABEL[tier]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 pt-8">
              <Switch
                checked={chapterForm.is_published}
                onCheckedChange={checked =>
                  setChapterForm({ ...chapterForm, is_published: checked })
                }
              />
              <Label>Published</Label>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Excerpt (locked readers ko yahi dikhega)</Label>
              <Textarea
                rows={2}
                value={chapterForm.excerpt}
                onChange={e => setChapterForm({ ...chapterForm, excerpt: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Chapter text (long-form)</Label>
              <Textarea
                rows={18}
                className="font-serif leading-7"
                value={chapterForm.content}
                onChange={e => setChapterForm({ ...chapterForm, content: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setChapterOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveChapter()} disabled={saving}>
              {saving ? 'Saving…' : 'Save chapter'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
