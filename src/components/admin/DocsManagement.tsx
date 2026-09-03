import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import {
  listDocsPages,
  getDocsPage,
  saveDocsPage,
  deleteDocsPage,
  listDocsSections,
  saveDocsSection,
  deleteDocsSection,
  reindexDocs,
  type DocsPage,
  type DocsSection,
} from '@/lib/docs-admin.functions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { ExternalLink, FileText, Plus, RefreshCw, Trash2, Upload } from 'lucide-react';

const DOCS_SITE = 'https://docs.rahulgupta.site';
const NO_SECTION = '__none__';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

type Draft = {
  id?: string;
  section_id: string | null;
  slug: string;
  title: string;
  description: string;
  content: string;
  status: 'draft' | 'published';
  position: number;
};

const emptyDraft: Draft = {
  section_id: null,
  slug: '',
  title: '',
  description: '',
  content: '',
  status: 'draft',
  position: 1,
};

export default function DocsManagement() {
  const queryClient = useQueryClient();
  const fetchPages = useServerFn(listDocsPages);
  const fetchPage = useServerFn(getDocsPage);
  const savePage = useServerFn(saveDocsPage);
  const removePage = useServerFn(deleteDocsPage);
  const fetchSections = useServerFn(listDocsSections);
  const saveSection = useServerFn(saveDocsSection);
  const removeSection = useServerFn(deleteDocsSection);
  const rebuildIndex = useServerFn(reindexDocs);

  const [editing, setEditing] = useState<Draft | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const pagesQuery = useQuery({
    queryKey: ['admin', 'docs', 'pages'],
    queryFn: () => fetchPages({}) as Promise<{ pages: DocsPage[]; sections: DocsSection[] }>,
  });

  const sectionsQuery = useQuery({
    queryKey: ['admin', 'docs', 'sections'],
    queryFn: () => fetchSections({}) as Promise<DocsSection[]>,
  });

  const sections = useMemo(
    () => sectionsQuery.data ?? pagesQuery.data?.sections ?? [],
    [sectionsQuery.data, pagesQuery.data],
  );
  const sectionName = (id: string | null) =>
    sections.find(s => s.id === id)?.title ?? '—';

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'docs'] });
  };

  const saveMutation = useMutation({
    mutationFn: (draft: Draft) =>
      savePage({
        data: {
          ...(draft.id ? { id: draft.id } : {}),
          section_id: draft.section_id,
          slug: draft.slug,
          title: draft.title,
          description: draft.description.trim() ? draft.description : null,
          content: draft.content,
          status: draft.status,
          position: Number(draft.position) || 1,
        },
      }),
    onSuccess: (res: any) => {
      toast.success(`Save ho gaya${res?.indexed ? ` · ${res.indexed} chunks indexed` : ''}`);
      invalidate();
      setEditing(null);
    },
    onError: (e: any) => toast.error(e?.message ?? 'Save nahi hua'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removePage({ data: { id } }),
    onSuccess: () => {
      toast.success('Page delete ho gaya');
      invalidate();
      setEditing(null);
    },
    onError: (e: any) => toast.error(e?.message ?? 'Delete nahi hua'),
  });

  const reindexMutation = useMutation({
    mutationFn: () => rebuildIndex({}),
    onSuccess: () => toast.success('AI index rebuild ho gaya'),
    onError: (e: any) => toast.error(e?.message ?? 'Reindex fail'),
  });

  const openPage = async (id: string) => {
    try {
      const page = await (fetchPage({ data: { id } }) as Promise<DocsPage>);
      setSlugTouched(true);
      setEditing({
        id: page.id,
        section_id: page.section_id ?? null,
        slug: page.slug,
        title: page.title,
        description: page.description ?? '',
        content: page.content ?? '',
        status: page.status,
        position: page.position ?? 1,
      });
    } catch (e: any) {
      toast.error(e?.message ?? 'Page load nahi hua');
    }
  };

  if (pagesQuery.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <UniversalLoader />
      </div>
    );
  }

  if (pagesQuery.isError) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6">
          <p className="text-sm text-destructive">
            Docs API se connect nahi ho paya: {(pagesQuery.error as any)?.message}
          </p>
          <Button variant="outline" onClick={() => pagesQuery.refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (editing) {
    return (
      <PageEditor
        draft={editing}
        sections={sections}
        slugTouched={slugTouched}
        onSlugTouched={() => setSlugTouched(true)}
        onChange={setEditing}
        onCancel={() => setEditing(null)}
        onSave={() => saveMutation.mutate(editing)}
        onDelete={() => editing.id && deleteMutation.mutate(editing.id)}
        saving={saveMutation.isPending}
        deleting={deleteMutation.isPending}
      />
    );
  }

  const pages = pagesQuery.data?.pages ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Documentation</h1>
          <p className="text-sm text-muted-foreground">
            Docs site ke pages aur sections yahin se manage karo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => reindexMutation.mutate()}
            disabled={reindexMutation.isPending}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${reindexMutation.isPending ? 'animate-spin' : ''}`} />
            Rebuild index
          </Button>
          <Button
            onClick={() => {
              setSlugTouched(false);
              setEditing({ ...emptyDraft, position: pages.length + 1 });
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New page
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pages">
        <TabsList>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="sections">Sections</TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> {pages.length} pages
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pages.map(page => (
                    <TableRow key={page.id}>
                      <TableCell>
                        <button
                          className="text-left font-medium hover:underline"
                          onClick={() => openPage(page.id)}
                        >
                          {page.title}
                        </button>
                        <div className="text-xs text-muted-foreground">/docs/{page.slug}</div>
                      </TableCell>
                      <TableCell className="text-sm">{sectionName(page.section_id)}</TableCell>
                      <TableCell>
                        <Badge variant={page.status === 'published' ? 'default' : 'outline'}>
                          {page.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(page.updated_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild>
                            <a
                              href={`${DOCS_SITE}/docs/${page.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="View live"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete page"
                            onClick={() => {
                              if (confirm(`"${page.title}" delete karein?`)) {
                                deleteMutation.mutate(page.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pages.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        Abhi koi doc page nahi hai.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sections" className="mt-4">
          <SectionsPanel
            sections={sections}
            onSave={async payload => {
              try {
                await saveSection({ data: payload });
                toast.success('Section save ho gaya');
                invalidate();
              } catch (e: any) {
                toast.error(e?.message ?? 'Section save nahi hua');
              }
            }}
            onDelete={async id => {
              try {
                await removeSection({ data: { id } });
                toast.success('Section delete ho gaya');
                invalidate();
              } catch (e: any) {
                toast.error(e?.message ?? 'Section delete nahi hua');
              }
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PageEditor({
  draft,
  sections,
  slugTouched,
  onSlugTouched,
  onChange,
  onCancel,
  onSave,
  onDelete,
  saving,
  deleting,
}: {
  draft: Draft;
  sections: DocsSection[];
  slugTouched: boolean;
  onSlugTouched: () => void;
  onChange: (d: Draft) => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete: () => void;
  saving: boolean;
  deleting: boolean;
}) {
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{draft.id ? 'Edit page' : 'New page'}</h1>
          <p className="text-sm text-muted-foreground">/docs/{draft.slug || '…'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onCancel}>
            Back
          </Button>
          {draft.id && (
            <Button
              variant="outline"
              onClick={() => {
                if (confirm('Ye page delete karein?')) onDelete();
              }}
              disabled={deleting}
            >
              <Trash2 className="mr-2 h-4 w-4 text-destructive" />
              Delete
            </Button>
          )}
          <Button onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="doc-title">Title</Label>
            <Input
              id="doc-title"
              value={draft.title}
              onChange={e => {
                const title = e.target.value;
                set(slugTouched ? { title } : { title, slug: slugify(title) });
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-slug">Slug</Label>
            <Input
              id="doc-slug"
              value={draft.slug}
              onChange={e => {
                onSlugTouched();
                set({ slug: slugify(e.target.value) });
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Section</Label>
            <Select
              value={draft.section_id ?? NO_SECTION}
              onValueChange={v => set({ section_id: v === NO_SECTION ? null : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SECTION}>No section</SelectItem>
                {sections.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-position">Position</Label>
            <Input
              id="doc-position"
              type="number"
              value={draft.position}
              onChange={e => set({ position: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="doc-desc">Description (SEO)</Label>
            <Input
              id="doc-desc"
              value={draft.description}
              onChange={e => set({ description: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-3 md:col-span-2">
            <Switch
              id="doc-published"
              checked={draft.status === 'published'}
              onCheckedChange={c => set({ status: c ? 'published' : 'draft' })}
            />
            <Label htmlFor="doc-published">Published</Label>
            <label className="ml-auto inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <Upload className="h-4 w-4" />
              Import .md
              <input
                type="file"
                accept=".md,.markdown,text/markdown"
                className="hidden"
                onChange={async e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  set({ content: await file.text() });
                  toast.success('Markdown import ho gaya');
                }}
              />
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Markdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={draft.content}
              onChange={e => set({ content: e.target.value })}
              className="min-h-[480px] font-mono text-sm"
              placeholder="# Heading&#10;&#10;Body…"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {draft.content.length.toLocaleString()} / 200,000 characters
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="min-h-[480px] whitespace-pre-wrap break-words rounded-md bg-muted/40 p-4 text-sm">
              {draft.content || 'Preview yahan dikhega…'}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SectionsPanel({
  sections,
  onSave,
  onDelete,
}: {
  sections: DocsSection[];
  onSave: (payload: Partial<DocsSection>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add section</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="sec-title">Title</Label>
            <Input
              id="sec-title"
              value={title}
              onChange={e => {
                setTitle(e.target.value);
                setSlug(slugify(e.target.value));
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sec-slug">Slug</Label>
            <Input id="sec-slug" value={slug} onChange={e => setSlug(slugify(e.target.value))} />
          </div>
          <Button
            onClick={async () => {
              if (!title || !slug) return;
              await onSave({ title, slug, position: sections.length + 1 });
              setTitle('');
              setSlug('');
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Position</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.map(section => (
                <SectionRow key={section.id} section={section} onSave={onSave} onDelete={onDelete} />
              ))}
              {sections.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Koi section nahi hai.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SectionRow({
  section,
  onSave,
  onDelete,
}: {
  section: DocsSection;
  onSave: (payload: Partial<DocsSection>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(section.title);
  const [position, setPosition] = useState(section.position ?? 1);
  const dirty = title !== section.title || position !== (section.position ?? 1);

  return (
    <TableRow>
      <TableCell>
        <Input value={title} onChange={e => setTitle(e.target.value)} className="max-w-xs" />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{section.slug}</TableCell>
      <TableCell>
        <Input
          type="number"
          value={position}
          onChange={e => setPosition(Number(e.target.value))}
          className="w-24"
        />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          {dirty && (
            <Button
              size="sm"
              onClick={() => onSave({ id: section.id, slug: section.slug, title, position })}
            >
              Save
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete section"
            onClick={() => {
              if (confirm(`"${section.title}" section delete karein?`)) onDelete(section.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
