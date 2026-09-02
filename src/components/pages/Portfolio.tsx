import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, Github, Briefcase, X } from 'lucide-react';
import { useScrollToHash } from '@/hooks/useScrollToHash';

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  long_description: string;
  image_url: string;
  live_url: string;
  source_url: string;
  tech_stack: string[];
  category: string;
  platform: string | null;
  status: string | null;
  is_featured: boolean;
}

const PLATFORM_OPTIONS = ['Web', 'Android', 'iOS', 'Cross-platform', 'Desktop'];
const STATUS_OPTIONS = ['Live', 'Beta', 'In Development', 'Archived'];

/**
 * URL slugs are plural (/portfolio/apps) while the stored category values are
 * singular ('app'), so incoming slugs are normalised before filtering.
 */
const CATEGORY_SLUG_ALIASES: Record<string, string> = {
  websites: 'website',
  apps: 'app',
  tools: 'tool',
  others: 'other',
};

function normaliseCategory(slug?: string): string {
  if (!slug) return 'all';
  const lower = slug.toLowerCase();
  return CATEGORY_SLUG_ALIASES[lower] ?? lower;
}

const Portfolio = () => {
  useScrollToHash();
  const { category: urlCategory } = useParams();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<PortfolioItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(normaliseCategory(urlCategory));
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const categories = [
    { id: 'all', label: 'All Projects' },
    { id: 'website', label: 'Websites' },
    { id: 'app', label: 'Apps' },
    { id: 'tool', label: 'Tools' },
    { id: 'other', label: 'Other' }
  ];

  useEffect(() => {
    if (urlCategory) {
      setSelectedCategory(normaliseCategory(urlCategory));
    }
  }, [urlCategory]);


  useEffect(() => {
    fetchPortfolioItems();
  }, []);

  useEffect(() => {
    let result = items;
    if (selectedCategory !== 'all') {
      result = result.filter(item => item.category === selectedCategory);
    }
    if (selectedPlatform !== 'all') {
      result = result.filter(item => item.platform === selectedPlatform);
    }
    if (selectedStatus !== 'all') {
      result = result.filter(item => item.status === selectedStatus);
    }
    setFilteredItems(result);
  }, [selectedCategory, selectedPlatform, selectedStatus, items]);

  const fetchPortfolioItems = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('is_visible', true)
      .order('is_featured', { ascending: false })
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching portfolio:', error);
    } else {
      setItems((data || []) as any);
      setFilteredItems((data || []) as any);
    }
    setIsLoading(false);
  };

  return (
    <>

      <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div id="hero" className="text-center mb-12">
            <div className="flex justify-center mb-4">
              <Briefcase className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">My Portfolio</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A collection of websites, applications, and tools I've built
            </p>
          </div>

          <h2 className="sr-only">Filter projects</h2>
          {/* Filter Buttons */}
          <div id="filters" className="flex flex-wrap justify-center gap-2 mb-8">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category.id)}
                className="min-w-[100px]"
              >
                {category.label}
              </Button>
            ))}
          </div>

          {/* Platform / Status Filters */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="w-[170px] min-h-11" aria-label="Filter by platform">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {PLATFORM_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[170px] min-h-11" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>

            {(selectedPlatform !== 'all' || selectedStatus !== 'all' || selectedCategory !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedPlatform('all');
                  setSelectedStatus('all');
                }}
                className="min-h-11"
              >
                <X className="h-4 w-4 mr-1" />
                Clear filters
              </Button>
            )}
          </div>

          {/* Projects Grid */}
          <div id="projects">
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading projects...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No projects found in this category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map((item) => (
                  <Card 
                    key={item.id} 
                    id={`project-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                    className="overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {item.image_url && (
                      <div className="aspect-video overflow-hidden bg-muted">
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-xl">{item.title}</CardTitle>
                        {item.is_featured && (
                          <Badge variant="secondary" className="shrink-0">Featured</Badge>
                        )}
                      </div>
                      <CardDescription className="line-clamp-2">{item.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Platform / Status */}
                      {(item.platform || item.status) && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {item.platform && (
                            <Badge variant="secondary" className="text-xs">{item.platform}</Badge>
                          )}
                          {item.status && (
                            <Badge
                              variant="outline"
                              className={
                                item.status === 'Live' ? 'text-xs border-green-500/50 text-green-600 dark:text-green-400' :
                                item.status === 'Beta' ? 'text-xs border-blue-500/50 text-blue-600 dark:text-blue-400' :
                                item.status === 'Archived' ? 'text-xs border-muted-foreground/50 text-muted-foreground' :
                                'text-xs border-amber-500/50 text-amber-600 dark:text-amber-400'
                              }
                            >
                              {item.status}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Tech Stack */}
                      {item.tech_stack && item.tech_stack.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {item.tech_stack.slice(0, 4).map((tech, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tech}
                            </Badge>
                          ))}
                          {item.tech_stack.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{item.tech_stack.length - 4} more
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        {item.live_url && (
                          <Button
                            size="sm"
                            variant="default"
                            asChild
                            className="flex-1 min-w-[100px]"
                          >
                            <a href={item.live_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Live
                            </a>
                          </Button>
                        )}
                        {item.source_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                            className="flex-1 min-w-[100px]"
                          >
                            <a href={item.source_url} target="_blank" rel="noopener noreferrer">
                              <Github className="h-4 w-4 mr-2" />
                              Source
                            </a>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setSelectedItem(item)}
                          className="flex-1 min-w-[100px]"
                        >
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Details Modal */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedItem.title}</DialogTitle>
                <DialogDescription>{selectedItem.description}</DialogDescription>
              </DialogHeader>

              {selectedItem.image_url && (
                <div className="aspect-video overflow-hidden rounded-lg bg-muted">
                  <img
                    src={selectedItem.image_url}
                    alt={selectedItem.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {selectedItem.long_description && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">About This Project</h3>
                  <p className="text-muted-foreground whitespace-pre-line">
                    {selectedItem.long_description}
                  </p>
                </div>
              )}

              {selectedItem.tech_stack && selectedItem.tech_stack.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Technologies Used</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.tech_stack.map((tech, index) => (
                      <Badge key={index} variant="secondary">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                {selectedItem.live_url && (
                  <Button asChild className="flex-1">
                    <a href={selectedItem.live_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Live Project
                    </a>
                  </Button>
                )}
                {selectedItem.source_url && (
                  <Button variant="outline" asChild className="flex-1">
                    <a href={selectedItem.source_url} target="_blank" rel="noopener noreferrer">
                      <Github className="h-4 w-4 mr-2" />
                      View Source Code
                    </a>
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Portfolio;
