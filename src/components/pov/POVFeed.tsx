import { POVPost } from '@/pages/RahulPOV';
import { POVPostCard } from './POVPostCard';
import { MessageSquare } from 'lucide-react';

interface POVFeedProps {
  posts: POVPost[];
  isLoading: boolean;
  onPostUpdated: () => void;
}

export function POVFeed({ posts, isLoading, onPostUpdated }: POVFeedProps) {
  if (isLoading) {
    return (
      <section id="pov-feed" className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card rounded-xl border border-border p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/4 mb-3" />
              <div className="h-6 bg-muted rounded w-3/4 mb-4" />
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (posts.length === 0) {
    return (
      <section id="pov-feed" className="container mx-auto px-4 py-16">
        <div className="text-center max-w-md mx-auto">
          <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2">No posts yet</h3>
          <p className="text-muted-foreground">
            Thoughts are brewing. Check back soon for raw, unfiltered POVs.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="pov-feed" className="container mx-auto px-4 py-8 pb-16">
      <div className="max-w-2xl mx-auto space-y-6">
        {posts.map(post => (
          <POVPostCard key={post.id} post={post} onUpdated={onPostUpdated} />
        ))}
      </div>
    </section>
  );
}
