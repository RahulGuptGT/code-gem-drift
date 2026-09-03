import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { db, TIER_LABEL, type Tier } from '@/integrations/supabase/db';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UniversalLoader } from '@/components/ui/UniversalLoader';

interface Book {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  cover_url: string | null;
  min_tier: string;
}

export default function Library() {
  const { tier } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    db.from('books')
      .select('id, slug, title, subtitle, cover_url, min_tier')
      .eq('is_published', true)
      .order('created_at', { ascending: true })
      .then(({ data }: any) => {
        if (!active) return;
        setBooks((data ?? []) as Book[]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="section-container py-16">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-primary md:text-4xl">My library</h1>
        <p className="mt-2 text-muted-foreground">
          Aapke plan ({TIER_LABEL[(tier ?? 'starter') as Tier]}) ke saath available reading.
        </p>
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <UniversalLoader />
        </div>
      ) : books.length === 0 ? (
        <Card className="card-modern">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              Abhi koi book publish nahi hui. Jaldi hi naye chapters aayenge.
            </p>
            <Button variant="outline" asChild>
              <Link to="/pov">Read POVs</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {books.map(book => (
            <Card key={book.id} className="card-modern flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">{book.title}</CardTitle>
                {book.subtitle && (
                  <p className="text-sm text-muted-foreground">{book.subtitle}</p>
                )}
              </CardHeader>
              <CardContent className="mt-auto flex items-center justify-between">
                <Badge variant="outline">
                  {TIER_LABEL[(book.min_tier ?? 'public') as Tier] ?? book.min_tier}
                </Badge>
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/book/${book.slug}`}>Open</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
