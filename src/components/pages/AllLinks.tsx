import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, Home, Info, Mail, Briefcase, 
  ExternalLink, Gift, Smartphone, Map, Brain,
  Hash
} from 'lucide-react';
import { ROUTES, HASH_SECTIONS, buildRouteWithHash } from '@/config/routes';

interface SiteLink {
  name: string;
  path: string;
  description: string;
  category: string;
  icon: any;
  isHash?: boolean;
}

const AllLinks = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const allLinks: SiteLink[] = [
    { name: 'Home', path: ROUTES.HOME, description: 'Main homepage with introduction', category: 'Main Pages', icon: Home },
    { name: 'Home → Hero Section', path: buildRouteWithHash(ROUTES.HOME, HASH_SECTIONS.HOME.HERO), description: 'Hero introduction section', category: 'Main Pages', icon: Hash, isHash: true },
    { name: 'Home → Highlights', path: buildRouteWithHash(ROUTES.HOME, HASH_SECTIONS.HOME.HIGHLIGHTS), description: 'Explore My World section', category: 'Main Pages', icon: Hash, isHash: true },
    
    { name: 'About', path: ROUTES.ABOUT, description: 'Learn more about me', category: 'Main Pages', icon: Info },
    { name: 'Contact', path: ROUTES.CONTACT, description: 'Get in touch with me', category: 'Main Pages', icon: Mail },

    { name: 'Rahul POV', path: ROUTES.FEATURES.POV.ROOT, description: 'Unfiltered thoughts & public discussion', category: 'Features', icon: Brain },

    { name: 'Referral Links', path: ROUTES.FEATURES.REFERRALS.ROOT, description: 'Exclusive offers and referral programs', category: 'Referrals', icon: Gift },
    { name: 'Referrals → UPI Apps', path: '/referrals/upi', description: 'UPI payment app referrals', category: 'Referrals', icon: Gift },
    { name: 'Referrals → Shopping', path: '/referrals/shopping', description: 'Shopping app referrals', category: 'Referrals', icon: Gift },

    { name: 'Portfolio', path: ROUTES.FEATURES.PORTFOLIO.ROOT, description: 'View my projects and work', category: 'Portfolio', icon: Briefcase },
    { name: 'Portfolio → Websites', path: '/portfolio/websites', description: 'Website projects', category: 'Portfolio', icon: Briefcase },
    { name: 'Portfolio → Apps', path: '/portfolio/apps', description: 'Mobile app projects', category: 'Portfolio', icon: Briefcase },


    { name: 'Site Map', path: ROUTES.SITE_MAP, description: 'Complete site map with all pages', category: 'Navigation', icon: Map },
  ];

  const categories = Array.from(new Set(allLinks.map(link => link.category)));

  const filteredLinks = allLinks.filter(link =>
    link.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedLinks = categories.map(category => ({
    category,
    links: filteredLinks.filter(link => link.category === category)
  })).filter(group => group.links.length > 0);

  return (
    <>

      <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Map className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">Site Map</h1>
            <p className="text-lg text-muted-foreground">
              Complete navigation to every page and section
            </p>
          </div>

          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search pages..."
                aria-label="Search pages"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-6">
            {groupedLinks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No pages found.</p>
                </CardContent>
              </Card>
            ) : (
              groupedLinks.map(({ category, links }) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {category}
                      <Badge variant="secondary">{links.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {links.map((link) => {
                        const Icon = link.icon;
                        return (
                          <Link
                            key={link.path}
                            to={link.path}
                            className={`flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors group ${
                              link.isHash ? 'pl-8 border-l-2 border-muted' : ''
                            }`}
                          >
                            <div className="shrink-0 mt-1">
                              <Icon className={`h-4 w-4 ${link.isHash ? 'text-muted-foreground' : 'text-primary'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-foreground group-hover:text-primary transition-colors text-sm">
                                {link.name}
                              </h3>
                              <p className="text-xs text-muted-foreground mt-0.5">{link.description}</p>
                              <p className="text-xs text-primary/70 mt-1 font-mono">{link.path}</p>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                          </Link>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>Total: {allLinks.length} links available</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default AllLinks;
