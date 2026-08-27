import { Link } from "react-router-dom";
import { ArrowRight, Briefcase, Brain, Gift, Smartphone, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import SocialIcons from "@/components/SocialIcons";
import { useScrollToHash } from "@/hooks/useScrollToHash";

const Home = () => {
  useScrollToHash();

  const highlights = [
    {
      title: "My Portfolio",
      description: "Explore my projects, websites, and tools I've built",
      icon: Briefcase,
      href: "/portfolio",
      color: "bg-blue-50 border-blue-200 hover:bg-blue-100"
    },
    {
      title: "Rahul POV",
      description: "Unfiltered thoughts, raw opinions & public discussions",
      icon: Brain,
      href: "/pov",
      color: "bg-orange-50 border-orange-200 hover:bg-orange-100"
    },
    {
      title: "Referral Zone",
      description: "Exclusive signup bonuses and cashback offers for various apps",
      icon: Gift,
      href: "/referrals",
      color: "bg-purple-50 border-purple-200 hover:bg-purple-100"
    }
  ];

  const quickLinks = [
    { title: "My Apps", icon: Smartphone, href: "/portfolio/apps" },
    { title: "About Me", icon: MessageSquare, href: "/about" },
    { title: "Contact", icon: MessageSquare, href: "/contact" },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section id="hero" className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-background to-primary/5"></div>
        
        <div className="section-container relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="animate-float">
              <h1 className="text-5xl lg:text-7xl font-bold text-primary mb-6">
                Hello, I'm{" "}
                <span className="font-signature text-secondary">
                  Rahul Gupta
                </span>
                !
              </h1>
            </div>
            
            <p className="text-2xl lg:text-3xl text-muted-foreground mb-8">
              <span className="text-secondary font-medium">Student</span> |{" "}
              <span className="text-secondary font-medium">Creator</span> |{" "}
              <span className="text-secondary font-medium">Thinker</span> from Bihar
            </p>
            
            <p className="text-lg lg:text-xl text-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
              Building cool stuff, sharing raw thoughts, and creating tools that actually help people.
            </p>
            
            <div id="actions" className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Button asChild size="lg" className="btn-hero group">
                <Link to="/pov">
                  Read My POVs
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              
              <Button variant="outline" size="lg" asChild className="hover:bg-secondary hover:text-secondary-foreground transition-all duration-300">
                <Link to="/portfolio">
                  View Portfolio
                </Link>
              </Button>
            </div>
            
            <div id="social" className="mb-8">
              <SocialIcons size="lg" />
            </div>
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      <section id="highlights" className="py-20 bg-muted/30">
        <div className="section-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-primary mb-6">
              Explore My World
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Check out what I've been building and thinking about
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {highlights.map((highlight, index) => {
              const Icon = highlight.icon;
              return (
                <Link
                  key={highlight.title}
                  to={highlight.href}
                  className="group"
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  <div className={`card-modern ${highlight.color} h-full transition-all duration-300 group-hover:scale-105`}>
                    <div className="flex flex-col items-center text-center">
                      <div className="mb-6 p-4 rounded-full bg-white shadow-soft">
                        <Icon className="h-8 w-8 text-secondary" />
                      </div>
                      <h3 className="text-xl font-semibold text-primary mb-4">
                        {highlight.title}
                      </h3>
                      <p className="text-muted-foreground mb-6 leading-relaxed">
                        {highlight.description}
                      </p>
                      <div className="mt-auto">
                        <span className="text-secondary font-medium group-hover:underline flex items-center">
                          Explore Now
                          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-12">
        <div className="section-container">
          <div className="flex flex-wrap justify-center gap-4">
            {quickLinks.map(link => {
              const Icon = link.icon;
              return (
                <Button key={link.title} variant="outline" size="lg" asChild>
                  <Link to={link.href}>
                    <Icon className="mr-2 h-4 w-4" />
                    {link.title}
                  </Link>
                </Button>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="py-20">
        <div className="section-container">
          <div className="text-center bg-gradient-to-r from-secondary to-primary rounded-2xl p-12 text-primary-foreground">
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              Got Something on Your Mind?
            </h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Join the discussion on Rahul POV — share your thoughts, challenge ideas, and be part of real conversations.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-primary hover:bg-muted shadow-lg hover:shadow-xl transition-all duration-300"
              asChild
            >
              <Link to="/pov">
                Join the Discussion
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
