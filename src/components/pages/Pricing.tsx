import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Crown, Sparkles } from 'lucide-react';
import { db } from '@/integrations/supabase/db';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { UniversalLoader } from '@/components/ui/UniversalLoader';

interface Plan {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  price_inr: number;
  billing_period: string | null;
  features: string[] | null;
  is_highlighted: boolean;
}

export default function Pricing() {
  const { user, tier } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    db.from('plans')
      .select('id, slug, name, tagline, price_inr, billing_period, features, is_highlighted')
      .eq('is_visible', true)
      .order('display_order', { ascending: true })
      .then(({ data }: any) => {
        if (!active) return;
        setPlans((data ?? []) as Plan[]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="section-container py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-primary md:text-5xl">Choose your access</h1>
        <p className="mt-4 text-muted-foreground">
          Public writing sabke liye free hai. Deeper essays aur book chapters members ke liye.
        </p>
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <UniversalLoader />
        </div>
      ) : (
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plans.map(plan => {
            const isCurrent = tier === plan.slug;
            return (
              <Card
                key={plan.id}
                className={`card-modern relative flex flex-col ${
                  plan.is_highlighted ? 'border-secondary shadow-soft ring-1 ring-secondary/40' : ''
                }`}
              >
                {plan.is_highlighted && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most popular</Badge>
                )}
                <CardHeader className="space-y-2">
                  <div className="flex items-center gap-2">
                    {plan.slug === 'sovereign' ? (
                      <Crown className="h-5 w-5 text-secondary" />
                    ) : plan.slug === 'signature' ? (
                      <Sparkles className="h-5 w-5 text-secondary" />
                    ) : null}
                    <h2 className="text-xl font-semibold">{plan.name}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.tagline}</p>
                  <div className="pt-2">
                    <span className="text-3xl font-bold text-primary">
                      {plan.price_inr === 0 ? 'Free' : `₹${plan.price_inr.toLocaleString('en-IN')}`}
                    </span>
                    {plan.price_inr > 0 && (
                      <span className="ml-1 text-sm text-muted-foreground">
                        {plan.billing_period === 'monthly' ? '/month' : ' one-time'}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-6">
                  <ul className="space-y-2 text-sm">
                    {(plan.features ?? []).map(feature => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <Button variant="outline" disabled>
                      Your current plan
                    </Button>
                  ) : plan.price_inr === 0 ? (
                    <Button variant="outline" asChild>
                      <Link to={user ? '/account' : '/auth'}>
                        {user ? 'Go to account' : 'Create free account'}
                      </Link>
                    </Button>
                  ) : (
                    <Button disabled title="Payments coming soon">
                      Coming soon
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
