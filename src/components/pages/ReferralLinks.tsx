import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ExternalLink, Gift, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useScrollToHash } from "@/hooks/useScrollToHash";
import { UniversalLoader } from "@/components/ui/UniversalLoader";

interface ReferralApp {
  id: string;
  name: string;
  description: string;
  offer: string;
  category: string;
  logo: string;
  referral_link: string;
  bg_color: string;
  text_color: string;
  display_order: number;
}

const ReferralLinks = () => {
  useScrollToHash();
  const { category: urlCategory } = useParams();
  const [selectedCategory, setSelectedCategory] = useState(urlCategory || "All");
  const [referralApps, setReferralApps] = useState<ReferralApp[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (urlCategory) {
      // Capitalize first letter for display
      const formattedCategory = urlCategory.charAt(0).toUpperCase() + urlCategory.slice(1);
      setSelectedCategory(formattedCategory === "All" ? "All" : formattedCategory);
    }
  }, [urlCategory]);

  useEffect(() => {
    fetchReferralApps();
    subscribeToChanges();
  }, []);

  const fetchReferralApps = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('referral_links')
        .select('*')
        .eq('is_visible', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      
      setReferralApps((data || []) as any);
      
      // Extract unique categories
      const uniqueCategories = Array.from(new Set(data?.map(app => app.category) || []));
      setCategories(["All", ...uniqueCategories]);
    } catch (error) {
      console.error('Error fetching referral apps:', error);
      toast.error('Failed to load referral links');
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToChanges = () => {
    const channel = supabase
      .channel('referral-links-public-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'referral_links'
        },
        () => {
          fetchReferralApps();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const filteredApps = selectedCategory === "All" 
    ? referralApps 
    : referralApps.filter(app => app.category.toLowerCase() === selectedCategory.toLowerCase());

  return (
    <div className="min-h-screen py-16">
      <div className="section-container">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div id="header" className="text-center mb-12">
            <h1 className="text-4xl lg:text-6xl font-bold text-midnight-blue mb-6">
              Referral Zone
            </h1>
            
            <div className="max-w-3xl mx-auto text-lg leading-relaxed space-y-3">
              <p><strong className="text-foreground">Hello, this is Rahul Gupta.</strong></p>
              <p className="text-muted-foreground">
                Below you'll find referral links for various UPI and other useful apps. Create your account using my 
                referral links to unlock exclusive signup bonuses, cashback, and extra benefits.
              </p>
              <p className="text-electric-blue font-medium">
                Thank you for supporting me!
              </p>
            </div>
          </div>

          {/* Category Tags */}
          <div id="categories" className="mb-12">
            <h2 className="text-2xl font-semibold text-midnight-blue mb-6 text-center">
              Browse by Category
            </h2>
            <div className="flex flex-wrap gap-3 justify-center">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    selectedCategory.toLowerCase() === category.toLowerCase()
                      ? "bg-electric-blue text-white shadow-soft"
                      : "bg-muted text-muted-foreground hover:bg-electric-blue/10 hover:text-electric-blue"
                  }`}
                >
                  <Tag className="inline h-4 w-4 mr-1" />
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Benefits Banner */}
          <div id="benefits" className="card-modern bg-gradient-to-r from-electric-blue/10 to-midnight-blue/10 mb-12">
            <div className="flex items-center justify-center gap-4 text-center">
              <Gift className="h-8 w-8 text-electric-blue" />
              <div>
                <h3 className="text-xl font-semibold text-midnight-blue">
                  🎉 Support My Work & Get Exclusive Benefits!
                </h3>
                <p className="text-muted-foreground mt-2">
                  You support my work by signing up using these links, and you get amazing signup bonuses in return!
                </p>
              </div>
            </div>
          </div>

          {/* Apps Grid */}
          <div id="apps">
            {isLoading ? (
              <div className="text-center py-12">
                <UniversalLoader />
                <p className="mt-4 text-muted-foreground">Loading referral links...</p>
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  {selectedCategory === "All" 
                    ? "No referral links available at the moment" 
                    : `No links found in ${selectedCategory} category`}
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredApps.map((app, index) => (
                  <div
                    key={app.id}
                    id={`app-${app.name.toLowerCase().replace(/\s+/g, '-')}`}
                    className={`card-modern ${app.bg_color} group hover:scale-105 transition-all duration-300`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex flex-col h-full">
                      {/* App Header */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className="text-4xl">{app.logo}</div>
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-midnight-blue">
                            {app.name}
                          </h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${app.text_color} bg-white/70`}>
                            {app.category}
                          </span>
                        </div>
                      </div>

                      {/* App Description */}
                      <p className="text-muted-foreground mb-4 leading-relaxed">
                        {app.description}
                      </p>

                      {/* Offer */}
                      <div className="bg-white/80 rounded-lg p-3 mb-6 border border-white/50">
                        <div className="flex items-start gap-2">
                          <Gift className="h-4 w-4 text-electric-blue mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-medium text-midnight-blue text-sm mb-1">
                              Special Offer
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {app.offer}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* CTA Button */}
                      <div className="mt-auto">
                        <Button
                          asChild
                          className="w-full btn-hero group-hover:shadow-lg"
                        >
                          <a
                            href={app.referral_link}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Refer Now
                            <ExternalLink className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Support Message */}
          <div id="support" className="mt-16 text-center">
            <div className="card-modern bg-gradient-to-r from-electric-blue to-midnight-blue text-white">
              <h3 className="text-2xl font-bold mb-4">
                🙏 Thank You for Your Support!
              </h3>
              <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
                Every signup through these referral links helps me continue building useful tools and resources 
                for students like you. Your support means the world to me!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  variant="secondary"
                  className="bg-white text-midnight-blue hover:bg-gray-100"
                  asChild
                >
                  <a href="/contact">Get in Touch</a>
                </Button>
                <Button 
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-midnight-blue"
                  asChild
                >
                  <a href="/about">Learn More About Me</a>
                </Button>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div id="disclaimer" className="mt-8 text-center">
            <div className="card-modern bg-yellow-50 border-yellow-200">
              <p className="text-sm text-muted-foreground">
                <strong>Disclaimer:</strong> Please read the terms and conditions of each app before signing up. 
                Offers may vary and are subject to change. I may receive a commission when you use these referral links.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralLinks;
