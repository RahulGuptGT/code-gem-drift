import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Check, Clock, Lock } from 'lucide-react';
import { getBookLanding, type BookDTO, type ChapterMeta } from '@/lib/content.functions';
import { TIER_LABEL, type Tier } from '@/integrations/supabase/db';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/integrations/supabase/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UniversalLoader } from '@/components/ui/UniversalLoader';

export default function BookLanding() {
  const { user } = useAuth();
  const [book, setBook] = useState<BookDTO | null>(null);
  const [chapters, setChapters] = useState<ChapterMeta[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getBookLanding({ data: {} })
      .then(result => {
        if (!active) return;
        setBook(result.book);
        setChapters(result.chapters);
        setLoading(false);
      })
      .catch(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    db.from('reading_progress')
      .select('chapter_id, completed')
      .eq('user_id', user.id)
      .then(({ data }: any) => {
        if (!active) return;
        setReadIds(new Set((data ?? []).filter((r: any) => r.completed).map((r: any) => r.chapter_id)));
      });
    return () => {
      active = false;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <UniversalLoader />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="section-container py-24 text-center">
        <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
        <h1 className="text-3xl font-bold text-primary">Book coming soon</h1>
        <p className="mt-3 text-muted-foreground">
          Chapters likhe ja rahe hain. Tab tak POV padhiye.
        </p>
        <Button className="mt-6" asChild>
          <Link to="/pov">Read POVs</Link>
        </Button>
      </div>
    );
  }

  const firstOpen = chapters.find(c => !c.locked);

  return (
    <div className="section-container py-16">
      <div className="grid gap-10 md:grid-cols-[280px_1fr]">
        <div>
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt={`${book.title} cover`}
              className="w-full rounded-xl shadow-soft"
              loading="lazy"
            />
          ) : (
            <div className="flex aspect-[3/4] w-full items-center justify-center rounded-xl bg-primary/10">
              <BookOpen className="h-12 w-12 text-primary/50" />
            </div>
          )}
        </div>

        <div>
          <h1 className="text-4xl font-bold text-primary">{book.title}</h1>
          {book.subtitle && <p className="mt-2 text-lg text-muted-foreground">{book.subtitle}</p>}
          <p className="mt-1 text-sm text-muted-foreground">by {book.author_name}</p>
          {book.description && (
            <p className="mt-6 whitespace-pre-line leading-relaxed text-foreground/80">
              {book.description}
            </p>
          )}
          {firstOpen && (
            <Button className="mt-6" asChild>
              <Link to={`/book/${firstOpen.slug}`}>Start reading</Link>
            </Button>
          )}
        </div>
      </div>

      <h2 className="mt-14 text-2xl font-bold text-primary">Chapters</h2>
      <div className="mt-6 space-y-3">
        {chapters.map(chapter => (
          <Card key={chapter.id} className="card-modern">
            <CardContent className="flex flex-wrap items-center gap-4 py-4">
              <span className="w-8 text-sm font-semibold text-muted-foreground">
                {chapter.chapter_number}
              </span>
              <div className="min-w-[200px] flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/book/${chapter.slug}`}
                    className="font-semibold text-foreground hover:text-secondary"
                  >
                    {chapter.title}
                  </Link>
                  {readIds.has(chapter.id) && <Check className="h-4 w-4 text-secondary" />}
                </div>
                {chapter.excerpt && (
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                    {chapter.excerpt}
                  </p>
                )}
              </div>
              {chapter.reading_minutes ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {chapter.reading_minutes} min
                </span>
              ) : null}
              {chapter.locked ? (
                <Badge variant="outline" className="gap-1">
                  <Lock className="h-3 w-3" />
                  {TIER_LABEL[(chapter.min_tier as Tier) ?? 'signature']}
                </Badge>
              ) : (
                <Badge variant="secondary">Open</Badge>
              )}
            </CardContent>
          </Card>
        ))}
        {chapters.length === 0 && (
          <p className="text-muted-foreground">Abhi koi chapter publish nahi hua.</p>
        )}
      </div>
    </div>
  );
}
