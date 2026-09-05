import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { listPovPosts } from '@/lib/content.functions';
import { useScrollToHash } from '@/hooks/useScrollToHash';
import { POVHero } from '@/components/pov/POVHero';
import { POVCategories } from '@/components/pov/POVCategories';
import { POVFeed } from '@/components/pov/POVFeed';

const VALID_CATEGORIES = ['all', 'philosophy', 'society', 'politics', 'personal', 'short_pov'];

export interface POVPost {
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

const LANGUAGES = [
  { id: 'all', label: 'All' },
  { id: 'hindi', label: 'हिंदी' },
  { id: 'english', label: 'English' },
  { id: 'bhojpuri', label: 'भोजपुरी' },
];

export default function RahulPOV() {
  useScrollToHash();
  const { category: catParam } = useParams<{ category?: string }>();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<POVPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const activeCategory = catParam && VALID_CATEGORIES.includes(catParam) ? catParam : 'all';
  const setActiveCategory = (c: string) => {
    navigate(c === 'all' ? '/pov' : `/pov/${c}`);
  };
  const [activeLanguage, setActiveLanguage] = useState('all');

  useEffect(() => {
    fetchPosts();
  }, [activeCategory, activeLanguage]);

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      // Server decides what each plan may read; locked bodies never reach the browser.
      const { posts: rows } = await listPovPosts({
        data: { category: activeCategory, language: activeLanguage },
      });
      setPosts(rows as POVPost[]);
    } catch (err) {
      console.error('POV load error:', err);
      setPosts([]);
    }
    setIsLoading(false);
  };

  return (
    <>

      <div className="min-h-screen bg-background">
        <POVHero />

        {/* Language Switcher */}
        <div className="container mx-auto px-4 pt-6">
          <div className="flex items-center gap-2 justify-center flex-wrap">
            {LANGUAGES.map(lang => (
              <button
                key={lang.id}
                onClick={() => setActiveLanguage(lang.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeLanguage === lang.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        <POVCategories
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        <POVFeed
          posts={posts}
          isLoading={isLoading}
          onPostUpdated={fetchPosts}
        />
      </div>
    </>
  );
}
