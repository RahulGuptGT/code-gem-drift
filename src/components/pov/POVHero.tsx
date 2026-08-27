import { ArrowDown, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function POVHero() {
  const scrollToFeed = () => {
    document.getElementById('pov-feed')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToDiscussion = () => {
    document.getElementById('pov-feed')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative py-16 sm:py-24 lg:py-32 overflow-hidden">
      {/* Subtle pattern background */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <div className="container mx-auto px-4 text-center relative z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          Raw & Unfiltered
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-foreground max-w-4xl mx-auto leading-tight tracking-tight">
          No filters. No fake motivation.
          <span className="block mt-2 text-primary">Just raw truth & real POV.</span>
        </h1>

        {/* Subtext */}
        <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
          Read, react, or challenge the thought. This is where real conversations happen.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
          <Button
            size="lg"
            onClick={scrollToFeed}
            className="min-w-[200px] text-base h-12"
          >
            <ArrowDown className="mr-2 h-5 w-5" />
            Read Thoughts
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={scrollToDiscussion}
            className="min-w-[200px] text-base h-12"
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            Join Discussion
          </Button>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-8 sm:gap-12 mt-12 text-sm text-muted-foreground">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">🔥</div>
            <div>Bold Takes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">💬</div>
            <div>Open Discussion</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">🧠</div>
            <div>Deep Thinking</div>
          </div>
        </div>
      </div>
    </section>
  );
}
