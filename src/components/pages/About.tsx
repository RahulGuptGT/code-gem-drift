import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import SocialIcons from "@/components/SocialIcons";
import { ArrowRight } from "lucide-react";
import { Helmet } from "react-helmet";
import { useScrollToHash } from "@/hooks/useScrollToHash";

const About = () => {
  useScrollToHash();

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Rahul Gupta",
    jobTitle: "Student & Creator",
    url: "https://rahulgupta.site/about",
    sameAs: [
      "https://rahulgupta.site",
      "https://www.rahulgupta.online",
    ],
  };

  return (
    <div className="min-h-screen py-16">
      <Helmet>
        <title>About Rahul Gupta — Student & Creator from Bihar</title>
        <meta name="description" content="Meet Rahul Gupta — a Class 12 PCMB student from Bihar building study tools, POVs, and apps to make learning more accessible." />
        <link rel="canonical" href="https://rahulgupta.site/about" />
        <meta property="og:title" content="About Rahul Gupta" />
        <meta property="og:description" content="Student & creator from Bihar building study tools and POVs." />
        <meta property="og:url" content="https://rahulgupta.site/about" />
        <script type="application/ld+json">{JSON.stringify(personJsonLd)}</script>
      </Helmet>
      <div className="section-container">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div id="header" className="text-center mb-16">
            <h1 className="text-4xl lg:text-6xl font-bold text-midnight-blue mb-6">
              About Me
            </h1>
            <p className="text-xl text-muted-foreground">
              Get to know the person behind this website
            </p>
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Profile Image */}
            <div id="profile" className="text-center lg:text-left">
              <div className="inline-block relative">
                <div className="w-64 h-64 lg:w-80 lg:h-80 rounded-full bg-gradient-to-br from-electric-blue to-midnight-blue p-1 mx-auto lg:mx-0">
                  <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-6xl lg:text-8xl">👨‍🎓</span>
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 bg-electric-blue text-white p-3 rounded-full shadow-lg animate-pulse-soft">
                  <span className="text-2xl">📚</span>
                </div>
              </div>
            </div>

            {/* Bio Content */}
            <div id="bio" className="space-y-6">
              <div className="card-modern">
                <h2 className="text-2xl font-semibold text-midnight-blue mb-4">
                  Hello! I'm Rahul Gupta
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    Born and raised in the beautiful state of <strong className="text-foreground">Bihar</strong>, 
                    I'm a passionate student currently preparing for my Class 12th board examinations in PCMB 
                    (Physics, Chemistry, Mathematics, and Biology).
                  </p>
                  
                  <p>
                    My journey as a student has been filled with challenges and discoveries that have shaped 
                    my vision for the future. I believe that <strong className="text-electric-blue">education 
                    is the key to transforming not just individual lives, but entire communities</strong>.
                  </p>
                  
                  <p>
                    Through this website, I aim to share my learning experiences, provide helpful resources 
                    for fellow students, and create a platform that serves multiple purposes - from academic 
                    preparation to practical tools that can benefit students across Bihar and beyond.
                  </p>
                </div>
              </div>

              <div id="dreams" className="card-modern">
                <h3 className="text-xl font-semibold text-midnight-blue mb-3">
                  My Dreams for Bihar
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  I envision a Bihar where every student has access to quality educational resources and 
                  opportunities. My goal is to leverage technology and community spirit to bridge the 
                  educational gap and empower the next generation of leaders from our state.
                </p>
              </div>

              <div id="interests" className="card-modern">
                <h3 className="text-xl font-semibold text-midnight-blue mb-3">
                  My Interests
                </h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Web Development", "Educational Technology", "Science Research", 
                    "Community Building", "Digital Innovation", "Student Mentoring"
                  ].map((interest) => (
                    <span 
                      key={interest}
                      className="px-3 py-1 bg-electric-blue/10 text-electric-blue rounded-full text-sm font-medium"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Social Links and Contact */}
          <div id="connect" className="mt-16 text-center">
            <div className="card-modern inline-block">
              <h3 className="text-2xl font-semibold text-midnight-blue mb-6">
                Let's Connect!
              </h3>
              
              <div className="mb-8">
                <SocialIcons size="lg" />
              </div>
              
              <div className="space-y-4">
                <Button asChild className="btn-hero group">
                  <Link to="/contact">
                    Contact Rahul
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                
                <p className="text-sm text-muted-foreground">
                  Feel free to reach out for collaborations, questions, or just to say hello!
                </p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div id="journey" className="mt-16">
            <div className="bg-gradient-to-r from-electric-blue/10 to-midnight-blue/10 rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-semibold text-midnight-blue mb-4">
                Join My Journey
              </h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Follow along as I prepare for my board exams, build useful tools for students, 
                and work towards making education more accessible for everyone.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild variant="default">
                  <Link to="/portfolio">View My Portfolio</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/pov">Read My POVs</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
