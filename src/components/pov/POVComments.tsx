import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Send, User, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  author_name: string;
  content: string;
  is_anonymous: boolean;
  created_at: string;
}

interface POVCommentsProps {
  postId: string;
  onCommentAdded: () => void;
}

export function POVComments({ postId, onCommentAdded }: POVCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('pov_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setComments(data);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedContent = content.trim();
    const trimmedName = name.trim();
    
    if (!trimmedContent) {
      toast.error('Please write a comment');
      return;
    }
    if (trimmedContent.length > 1000) {
      toast.error('Comment must be under 1000 characters');
      return;
    }
    if (!isAnonymous && !trimmedName) {
      toast.error('Please enter your name or switch to anonymous');
      return;
    }
    if (trimmedName.length > 50) {
      toast.error('Name must be under 50 characters');
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from('pov_comments').insert({
      post_id: postId,
      author_name: isAnonymous ? 'Anonymous' : trimmedName,
      content: trimmedContent,
      is_anonymous: isAnonymous,
    });

    if (error) {
      toast.error('Failed to post comment');
    } else {
      toast.success('Comment posted!');
      setContent('');
      fetchComments();
      onCommentAdded();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="border-t border-border bg-muted/30 p-5 sm:p-6">
      {/* Comment List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-3 bg-muted rounded w-1/4 mb-2" />
              <div className="h-3 bg-muted rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-4 mb-6">
          {comments.map(comment => (
            <div key={comment.id} className="bg-card rounded-lg p-3 sm:p-4 border border-border">
              <div className="flex items-center gap-2 mb-1.5">
                {comment.is_anonymous ? (
                  <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className="font-semibold text-sm text-foreground">{comment.author_name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-foreground/80 whitespace-pre-line">{comment.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-6">No comments yet. Be the first to share your POV!</p>
      )}

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center gap-3">
          {!isAnonymous && (
            <Input
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="flex-1 h-10"
              maxLength={50}
            />
          )}
          <div className="flex items-center gap-2 shrink-0">
            <Switch
              id="anonymous"
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
            />
            <Label htmlFor="anonymous" className="text-xs text-muted-foreground cursor-pointer">
              Anonymous
            </Label>
          </div>
        </div>
        <div className="flex gap-2">
          <Textarea
            placeholder="Share your POV..."
            value={content}
            onChange={e => setContent(e.target.value)}
            className="min-h-[60px] flex-1 resize-none"
            maxLength={1000}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isSubmitting || !content.trim()}
            className="h-[60px] w-[60px] shrink-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
