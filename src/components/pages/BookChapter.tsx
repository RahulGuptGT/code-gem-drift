import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Clock, Lock } from 'lucide-react';
import { getChapter, type ChapterDTO } from '@/lib/content.functions';
import { db, TIER_LABEL, type Tier } from '@/integrations/supabase/db';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UniversalLoader } from '@/components/ui/UniversalLoader';

export default function BookChapter() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [chapter, setChapter] = useState<ChapterDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const lastSaved = useRef(0);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    getChapter({ data: { slug } })
      .then(result => {
        if (!active) return;
        setChapter(result);
        setLoading(false);
        window.scrollTo({ top: 0 });
      })
      .catch(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [slug]);

  const saveProgress = useCallback(
    async (percent: number) => {
      if (!user || !chapter || chapter.locked) return;
      await db.from('reading_progress').upsert(
        {
          user_id: user.id,
          chapter_id: chapter.id,
          progress_percent: percent,
          completed: percent >= 95,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,chapter_id' },
      );
    },
    [user, chapter],
  );

  useEffect(() => {
    const onScroll = () => {
      const total = document.body.scrollHeight - window.innerHeight;
      const percent = total > 0 ? Math.min(100, Math.round((window.scrollY / total) * 100)) : 0;
      setProgress(percent);
      if (percent - lastSaved.current >= 20 || (percent >= 95 && lastSaved.current < 95)) {
        lastSaved.current = percent;
        void saveProgress(percent);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [saveProgress]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <UniversalLoader />
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="section-container py-24 text-center">
        <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
        <h1 className="text-3xl font-bold text-primary">Chapter nahi mila</h1>
        <Button className="mt-6" asChild>
          <Link to="/book">Back to book</Link>
        </Button>
      </div>
    );
  }

  const tierLabel = TIER_LABEL[(chapter.min_tier as Tier) ?? 'signature'];

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 h-1 bg-transparent">
        <div className="h-full bg-secondary transition-[width]" style={{ width: `${progress}%` }} />
      </div>

      <div className="section-container py-14">
        <Link
          to="/book"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-secondary"
        >
          <ArrowLeft className="h-4 w-4" />
          {chapter.book.title}
        </Link>

        <article className="mx-auto mt-6 max-w-2xl">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline">Chapter {chapter.chapter_number}</Badge>
            {chapter.reading_minutes ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {chapter.reading_minutes} min read
              </span>
            ) : null}
          </div>

          <h1 className="mt-4 text-3xl font-bold leading-tight text-primary md:text-4xl">
            {chapter.title}
          </h1>

          {chapter.locked ? (
            <>
              <p className="mt-8 text-lg leading-relaxed text-foreground/70">{chapter.preview}</p>
              <div className="mt-8 rounded-2xl border border-dashed border-secondary/50 bg-secondary/5 p-8 text-center">
                <Lock className="mx-auto mb-3 h-6 w-6 text-secondary" />
                <h2 className="text-lg font-semibold">Ye chapter {tierLabel} members ke liye hai</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Poora chapter aur baaki gated writing unlock karne ke liye plan lijiye.
                </p>
                <Button className="mt-5" asChild>
                  <Link to="/pricing">See plans</Link>
                </Button>
              </div>
            </>
          ) : (
            <div className="prose prose-lg mt-8 max-w-none whitespace-pre-line leading-8 text-foreground/85 dark:prose-invert">
              {chapter.content}
            </div>
          )}

          <div className="mt-14 flex items-center justify-between gap-4 border-t pt-6">
            {chapter.prev ? (
              <Button variant="ghost" asChild>
                <Link to={`/book/${chapter.prev.slug}`}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {chapter.prev.title}
                </Link>
              </Button>
            ) : (
              <span />
            )}
            {chapter.next ? (
              <Button variant="ghost" asChild>
                <Link to={`/book/${chapter.next.slug}`}>
                  {chapter.next.title}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <span />
            )}
          </div>
        </article>
      </div>
    </>
  );
}
