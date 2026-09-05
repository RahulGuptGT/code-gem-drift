import { createServerFn } from '@tanstack/react-start';
import { getRequestHeader } from '@tanstack/react-start/server';

export type Tier = 'public' | 'starter' | 'signature' | 'sovereign';

const RANK: Record<string, number> = {
  public: 0,
  starter: 1,
  signature: 2,
  sovereign: 3,
};

export function rankOf(tier?: string | null): number {
  return RANK[(tier ?? 'public').toLowerCase()] ?? 0;
}

/**
 * Tier of whoever made this request. Public callers (no bearer token) are
 * `public`; a signed-in caller gets the tier of their active membership.
 * Never trust a tier sent from the browser.
 */
async function callerTier(): Promise<Tier> {
  const authHeader = getRequestHeader('authorization');
  if (!authHeader?.startsWith('Bearer ')) return 'public';
  const token = authHeader.slice(7);
  if (token.split('.').length !== 3) return 'public';

  const { createClient } = await import('@supabase/supabase-js');
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) return 'public';

  const client = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}`, apikey: key } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.getClaims(token);
  const userId = data?.claims?.sub;
  if (error || !userId) return 'public';

  const { data: tier } = await client.rpc('user_tier' as never, { _user_id: userId } as never);
  return ((tier as unknown as string) ?? 'starter') as Tier;
}

async function adminDb() {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  return supabaseAdmin as any;
}

function previewOf(content: string, excerpt?: string | null, words = 45) {
  if (excerpt && excerpt.trim()) return excerpt.trim();
  const plain = content.replace(/\s+/g, ' ').trim();
  const cut = plain.split(' ').slice(0, words).join(' ');
  return cut.length < plain.length ? `${cut}…` : plain;
}

export interface PovPostDTO {
  id: string;
  title: string;
  content: string;
  post_type: 'quick_pov' | 'deep_thought' | 'discussion';
  category: string;
  language: string;
  author_name: string;
  is_featured: boolean;
  is_hot_take: boolean;
  agree_count: number;
  disagree_count: number;
  comment_count: number;
  created_at: string;
  min_tier: string;
  locked: boolean;
}

export const listPovPosts = createServerFn({ method: 'GET' })
  .inputValidator((input?: { category?: string; language?: string }) => input ?? {})
  .handler(async ({ data }): Promise<{ posts: PovPostDTO[]; tier: Tier }> => {
    const tier = await callerTier();
    const db = await adminDb();

    let query = db
      .from('pov_posts')
      .select('*')
      .eq('is_visible', true)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false });

    if (data.category && data.category !== 'all') query = query.eq('category', data.category);
    if (data.language && data.language !== 'all') query = query.eq('language', data.language);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const posts: PovPostDTO[] = (rows ?? []).map((row: any) => {
      const locked = rankOf(tier) < rankOf(row.min_tier);
      return {
        id: row.id,
        title: row.title,
        // Locked bodies never leave the server.
        content: locked ? previewOf(row.content, row.excerpt) : row.content,
        post_type: row.post_type,
        category: row.category,
        language: row.language,
        author_name: row.author_name,
        is_featured: row.is_featured,
        is_hot_take: row.is_hot_take,
        agree_count: row.agree_count,
        disagree_count: row.disagree_count,
        comment_count: row.comment_count,
        created_at: row.created_at,
        min_tier: row.min_tier ?? 'public',
        locked,
      };
    });

    return { posts, tier };
  });

export interface ChapterMeta {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  chapter_number: number;
  reading_minutes: number | null;
  min_tier: string;
  locked: boolean;
}

export interface BookDTO {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_url: string | null;
  author_name: string;
}

export const getBookLanding = createServerFn({ method: 'GET' })
  .inputValidator((input?: { slug?: string }) => input ?? {})
  .handler(
    async ({
      data,
    }): Promise<{ book: BookDTO | null; chapters: ChapterMeta[]; tier: Tier }> => {
      const tier = await callerTier();
      const db = await adminDb();

      let bookQuery = db
        .from('books')
        .select('id, slug, title, subtitle, description, cover_url, author_name')
        .eq('is_published', true);
      if (data.slug) bookQuery = bookQuery.eq('slug', data.slug);

      const { data: books } = await bookQuery.order('created_at', { ascending: true }).limit(1);
      const book = (books ?? [])[0] ?? null;
      if (!book) return { book: null, chapters: [], tier };

      const { data: rows } = await db
        .from('book_chapters')
        .select('id, slug, title, excerpt, chapter_number, reading_minutes, min_tier')
        .eq('book_id', book.id)
        .eq('is_published', true)
        .order('chapter_number', { ascending: true });

      const chapters: ChapterMeta[] = (rows ?? []).map((row: any) => ({
        ...row,
        min_tier: row.min_tier ?? 'public',
        locked: rankOf(tier) < rankOf(row.min_tier),
      }));

      return { book, chapters, tier };
    },
  );

export interface ChapterDTO extends ChapterMeta {
  content: string | null;
  preview: string;
  book: BookDTO;
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}

export const getChapter = createServerFn({ method: 'GET' })
  .inputValidator((input: { slug: string }) => {
    if (!input?.slug || typeof input.slug !== 'string') throw new Error('slug required');
    return input;
  })
  .handler(async ({ data }): Promise<ChapterDTO | null> => {
    const tier = await callerTier();
    const db = await adminDb();

    const { data: rows } = await db
      .from('book_chapters')
      .select('*')
      .eq('slug', data.slug)
      .eq('is_published', true)
      .limit(1);

    const chapter = (rows ?? [])[0];
    if (!chapter) return null;

    const { data: bookRows } = await db
      .from('books')
      .select('id, slug, title, subtitle, description, cover_url, author_name')
      .eq('id', chapter.book_id)
      .limit(1);
    const book = (bookRows ?? [])[0];
    if (!book) return null;

    const { data: siblings } = await db
      .from('book_chapters')
      .select('slug, title, chapter_number')
      .eq('book_id', chapter.book_id)
      .eq('is_published', true)
      .order('chapter_number', { ascending: true });

    const list = (siblings ?? []) as { slug: string; title: string; chapter_number: number }[];
    const index = list.findIndex(c => c.slug === chapter.slug);
    const locked = rankOf(tier) < rankOf(chapter.min_tier);

    return {
      id: chapter.id,
      slug: chapter.slug,
      title: chapter.title,
      excerpt: chapter.excerpt,
      chapter_number: chapter.chapter_number,
      reading_minutes: chapter.reading_minutes,
      min_tier: chapter.min_tier ?? 'public',
      locked,
      // Locked chapter bodies never leave the server.
      content: locked ? null : chapter.content,
      preview: previewOf(chapter.content, chapter.excerpt, 70),
      book,
      prev: index > 0 ? { slug: list[index - 1]!.slug, title: list[index - 1]!.title } : null,
      next:
        index >= 0 && index < list.length - 1
          ? { slug: list[index + 1]!.slug, title: list[index + 1]!.title }
          : null,
    };
  });
