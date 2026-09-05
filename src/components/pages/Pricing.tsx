import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Check, Crown, Loader2, Minus, Sparkles } from 'lucide-react';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { createPlanCheckout } from '@/lib/payments.functions';
import { db, tierRank } from '@/integrations/supabase/db';
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
  const location = useLocation();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutSlug, setCheckoutSlug] = useState<string | null>(null);
  const startCheckout = useServerFn(createPlanCheckout);

  const handleSubscribe = async (slug: string) => {
    setCheckoutSlug(slug);
    try {
      const result = await startCheckout({
        data: { planSlug: slug, origin: window.location.origin },
      });
      if (!result.ok || !result.url) {
        toast.error(result.error ?? 'Payment shuru nahi ho paaya');
        setCheckoutSlug(null);
        return;
      }
      window.location.href = result.url;
    } catch {
      toast.error('Payment shuru nahi ho paaya. Thodi der baad try karein.');
      setCheckoutSlug(null);
    }
  };

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

  const signInHref = `/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`;

  // Union of every feature line across plans, in first-seen order.
  const allFeatures = useMemo(() => {
    const seen: string[] = [];
    plans.forEach(plan => {
      (plan.features ?? []).forEach(feature => {
        if (!seen.includes(feature)) seen.push(feature);
      });
    });
    return seen;
  }, [plans]);

  const priceLabel = (plan: Plan) =>
    Number(plan.price_inr) === 0 ? 'Free' : `₹${Number(plan.price_inr).toLocaleString('en-IN')}`;

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
        <>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {plans.map(plan => {
              const isCurrent = user && tier === plan.slug;
              const isDowngrade = user && tierRank(tier) > tierRank(plan.slug);
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
                      <span className="text-3xl font-bold text-primary">{priceLabel(plan)}</span>
                      {Number(plan.price_inr) > 0 && (
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
                    ) : Number(plan.price_inr) === 0 ? (
                      <Button variant="outline" asChild>
                        <Link to={user ? '/account' : signInHref}>
                          {user ? 'Go to account' : 'Create free account'}
                        </Link>
                      </Button>
                    ) : !user ? (
                      <Button asChild>
                        <Link to={signInHref}>Sign in to subscribe</Link>
                      </Button>
                    ) : isDowngrade ? (
                      <Button variant="outline" disabled>
                        Included in your plan
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleSubscribe(plan.slug)}
                        disabled={checkoutSlug !== null}
                      >
                        {checkoutSlug === plan.slug && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {plan.billing_period === 'monthly'
                          ? `Subscribe · ${priceLabel(plan)}/month`
                          : `Get lifetime access · ${priceLabel(plan)}`}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {allFeatures.length > 0 && (
            <div className="mt-16">
              <h2 className="text-2xl font-bold text-primary">Compare plans</h2>
              <div className="mt-6 overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-4 text-left font-semibold">What you get</th>
                      {plans.map(plan => (
                        <th key={plan.id} className="p-4 text-center font-semibold">
                          <div>{plan.name}</div>
                          <div className="text-xs font-normal text-muted-foreground">
                            {priceLabel(plan)}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allFeatures.map((feature, index) => (
                      <tr key={feature} className={index % 2 ? 'bg-muted/20' : ''}>
                        <td className="p-4">{feature}</td>
                        {plans.map(plan => (
                          <td key={plan.id} className="p-4 text-center">
                            {(plan.features ?? []).includes(feature) ? (
                              <Check className="mx-auto h-4 w-4 text-secondary" />
                            ) : (
                              <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Signature monthly renew hota hai; Sovereign ek baar ka lifetime access hai.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
