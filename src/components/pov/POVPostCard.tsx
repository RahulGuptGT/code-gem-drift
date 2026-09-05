import { useState } from 'react';
import { POVPost } from '@/components/pages/RahulPOV';
import { supabase } from '@/integrations/supabase/client';
import { ThumbsUp, ThumbsDown, MessageCircle, Flame, Clock, Tag, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TIER_LABEL, type Tier } from '@/integrations/supabase/db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { POVComments } from './POVComments';
import { formatDistanceToNow } from 'date-fns';

interface POVPostCardProps {
  post: POVPost;
  onUpdated: () => void;
}

function getVisitorId(): string {
  let id = localStorage.getItem('pov_visitor_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('pov_visitor_id', id);
  }
  return id;
}

const POST_TYPE_STYLES = {
  quick_pov: { label: 'Quick POV', bg: 'bg-secondary/10 text-secondary' },
  deep_thought: { label: 'Deep Thought', bg: 'bg-primary/10 text-primary' },
  discussion: { label: 'Discussion', bg: 'bg-destructive/10 text-destructive' },
};

const CATEGORY_LABELS: Record<string, string> = {
  philosophy: 'Philosophy',
  society: 'Society Reality',
  politics: 'Politics',
  personal: 'Personal',
  short_pov: 'Short POV',
};

const LANG_LABELS: Record<string, string> = {
  hindi: 'हिंदी',
  english: 'EN',
  bhojpuri: 'भोजपुरी',
};

export function POVPostCard({ post, onUpdated }: POVPostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [reacting, setReacting] = useState(false);
  const visitorId = getVisitorId();
  const typeStyle = POST_TYPE_STYLES[post.post_type];

  const handleReaction = async (type: 'agree' | 'disagree') => {
    if (reacting) return;
    setReacting(true);

    try {
      // Route through a SECURITY DEFINER RPC so anon users can only set their
      // own reaction; direct UPDATE on other visitors' rows is not allowed.
      const { error } = await supabase.rpc('set_pov_reaction', {
        _post_id: post.id,
        _visitor_id: visitorId,
        _reaction_type: type,
      });
      if (error) throw error;
      onUpdated();
    } catch (err) {
      console.error('Reaction error:', err);
    } finally {
      setReacting(false);
    }
  };

  const isQuickPov = post.post_type === 'quick_pov';

  return (
    <article className={`bg-card rounded-xl border border-border overflow-hidden transition-all hover:shadow-lg ${
      post.is_hot_take ? 'ring-2 ring-destructive/30' : ''
    } ${post.is_featured ? 'ring-2 ring-primary/30' : ''}`}>
      {/* Hot Take Banner */}
      {post.is_hot_take && (
        <div className="bg-destructive/10 px-4 py-1.5 flex items-center gap-2 text-sm font-semibold text-destructive">
          <Flame className="h-4 w-4" />
          Hot Take 🔥
        </div>
      )}

      <div className="p-5 sm:p-6">
        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <Badge variant="secondary" className={`text-xs ${typeStyle.bg} border-0`}>
            {typeStyle.label}
          </Badge>
          <Badge variant="outline" className="text-xs">
            <Tag className="h-3 w-3 mr-1" />
            {CATEGORY_LABELS[post.category] || post.category}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {LANG_LABELS[post.language] || post.language}
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* Title */}
        <h3 className={`font-bold text-foreground mb-3 ${
          isQuickPov ? 'text-xl sm:text-2xl leading-tight' : 'text-lg sm:text-xl'
        }`}>
          {post.title}
        </h3>

        {/* Content */}
        <div className="relative">
          <div className={`text-foreground/80 leading-relaxed whitespace-pre-line ${
            isQuickPov ? 'text-base sm:text-lg font-medium' : 'text-sm sm:text-base'
          } ${post.locked ? 'max-h-32 overflow-hidden [mask-image:linear-gradient(to_bottom,black,transparent)]' : ''}`}>
            {post.content}
          </div>
        </div>

        {post.locked && (
          <div className="mt-4 rounded-xl border border-dashed border-secondary/50 bg-secondary/5 p-4 text-center">
            <Lock className="mx-auto mb-2 h-5 w-5 text-secondary" />
            <p className="text-sm font-medium text-foreground">
              Ye poori writing {TIER_LABEL[(post.min_tier as Tier) ?? 'signature']} members ke liye hai.
            </p>
            <Button size="sm" className="mt-3" asChild>
              <Link to="/pricing">Unlock with {TIER_LABEL[(post.min_tier as Tier) ?? 'signature']}</Link>
            </Button>
          </div>
        )}

        {/* Author */}
        <div className="mt-4 text-sm text-muted-foreground">
          — {post.author_name}
        </div>

        {/* Interaction bar */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleReaction('agree')}
            disabled={reacting}
            className="gap-1.5 text-muted-foreground hover:text-primary"
          >
            <ThumbsUp className="h-4 w-4" />
            <span className="font-semibold">{post.agree_count}</span>
            <span className="hidden sm:inline">Agree</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleReaction('disagree')}
            disabled={reacting}
            className="gap-1.5 text-muted-foreground hover:text-destructive"
          >
            <ThumbsDown className="h-4 w-4" />
            <span className="font-semibold">{post.disagree_count}</span>
            <span className="hidden sm:inline">Disagree</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="gap-1.5 text-muted-foreground hover:text-foreground ml-auto"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="font-semibold">{post.comment_count}</span>
            <span className="hidden sm:inline">Comments</span>
          </Button>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <POVComments postId={post.id} onCommentAdded={onUpdated} />
      )}
    </article>
  );
}
