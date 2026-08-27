import { Brain, Users, Landmark, Heart, Zap } from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All Posts', icon: Zap, description: 'Everything' },
  { id: 'philosophy', label: 'Philosophy', icon: Brain, description: 'Life & meaning' },
  { id: 'society', label: 'Society Reality', icon: Users, description: 'Real world truths' },
  { id: 'politics', label: 'Politics', icon: Landmark, description: 'Bihar focus' },
  { id: 'personal', label: 'Personal', icon: Heart, description: 'My thoughts' },
  { id: 'short_pov', label: 'Short POVs', icon: Zap, description: 'Quick takes' },
];

interface POVCategoriesProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export function POVCategories({ activeCategory, onCategoryChange }: POVCategoriesProps) {
  return (
    <section className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`group relative p-4 rounded-xl border transition-all text-left ${
                isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-[1.02]'
                  : 'bg-card text-card-foreground border-border hover:border-primary/30 hover:shadow-md'
              }`}
            >
              <Icon className={`h-5 w-5 mb-2 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
              <div className="font-semibold text-sm">{cat.label}</div>
              <div className={`text-xs mt-0.5 ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                {cat.description}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
