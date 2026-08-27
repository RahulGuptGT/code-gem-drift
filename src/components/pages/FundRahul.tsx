import { invokeFn } from '@/lib/invokeFn';
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Heart, Sparkles, Users, Target, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const PRESET_AMOUNTS = [50, 100, 200, 500, 1000];

const donationSchema = z.object({
  name: z.string().trim().max(100).optional().or(z.literal("")),
  message: z.string().trim().max(500).optional().or(z.literal("")),
  amount: z.number().min(10, "Minimum ₹10").max(1000000, "Amount too large"),
});

interface Supporter {
  id: string;
  display_name: string;
  amount: number;
  created_at: string;
}

declare global {
  interface Window { Razorpay?: any }
}

const loadRazorpayScript = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

const FundRahul = () => {
  const [amount, setAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [thankYou, setThankYou] = useState<{ name: string; message: string } | null>(null);
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [isTestMode, setIsTestMode] = useState(false);

  useEffect(() => {
    document.title = "Support My Work | Fund Rahul";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Voluntarily support Rahul's independent work, tools, and ideas. Honest, optional, no pressure.");
  }, []);

  const loadSupporters = async () => {
    const { data } = await supabase.rpc("get_public_supporters");
    if (data) setSupporters(data as Supporter[]);
  };

  useEffect(() => {
    loadSupporters();
    const channel = supabase
      .channel("donations-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "donations" }, () => loadSupporters())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const finalAmount = customAmount ? Number(customAmount) : amount;

  const handleSupport = async () => {
    const parsed = donationSchema.safeParse({ name, message, amount: finalAmount });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid input");
      return;
    }

    setSubmitting(true);
    try {
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Razorpay SDK failed to load");

      const { data, error } = await invokeFn("razorpay-create-order", {
        body: { amount: finalAmount, name: name.trim() || null, message: message.trim() || null },
      });
      if (error) throw error;
      if (!data?.order_id) throw new Error("Order creation failed");

      setIsTestMode((data.key_id as string).startsWith("rzp_test_"));

      const rzp = new window.Razorpay({
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        order_id: data.order_id,
        name: "Rahul Gupta",
        description: "Voluntary support",
        prefill: { name: name.trim() || undefined },
        notes: { donation_id: data.donation_id, message: message.trim() || "" },
        theme: { color: "#6366f1" },
        handler: async (resp: any) => {
          try {
            const { error: vErr } = await invokeFn("razorpay-verify-payment", {
              body: {
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
                donation_id: data.donation_id,
              },
            });
            if (vErr) throw vErr;
            setThankYou({ name: name.trim() || "Friend", message: message.trim() });
            toast.success("Payment successful! Thank you ❤️");
            setName(""); setMessage(""); setCustomAmount(""); setAmount(100);
          } catch (e) {
            console.error(e);
            toast.error("Payment captured but verification failed. We'll reconcile shortly.");
          } finally {
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => { setSubmitting(false); toast.info("Payment cancelled"); },
        },
      });

      rzp.on("payment.failed", (resp: any) => {
        console.error("payment.failed", resp);
        toast.error(resp?.error?.description || "Payment failed");
        setSubmitting(false);
      });

      rzp.open();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  if (thankYou) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/10 p-6">
        <Card className="max-w-lg w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Heart className="w-8 h-8 text-primary fill-primary" />
            </div>
            <h1 className="text-3xl font-bold">Thank you, {thankYou.name} ❤️</h1>
            <p className="text-muted-foreground">
              Your support means a lot. Your contribution has been received.
            </p>
            {thankYou.message && (
              <div className="bg-muted/50 rounded-lg p-4 text-sm italic">"{thankYou.message}"</div>
            )}
            <Button onClick={() => setThankYou(null)} variant="outline" className="mt-4">Back to page</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/5">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-20 space-y-12">
        <header className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" /> Voluntary support
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Support My Work</h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            If my work, thoughts, or systems have helped you, you can support me voluntarily. No pressure — just appreciation.
          </p>
          {isTestMode && (
            <Badge variant="outline" className="border-yellow-500/50 text-yellow-600">Test Mode</Badge>
          )}
        </header>

        <section className="grid md:grid-cols-3 gap-4">
          {[
            { icon: Sparkles, title: "Building openly", text: "Tools, systems, and ideas — shared freely." },
            { icon: Target, title: "Long-term vision", text: "Personal growth & public impact." },
            { icon: Users, title: "Independent", text: "No sponsors. Your support keeps it honest." },
          ].map((item) => (
            <Card key={item.title} className="border-border/50">
              <CardContent className="p-5 space-y-2">
                <item.icon className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.text}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <Card className="border-primary/20 shadow-lg">
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Choose an amount</h2>
              <p className="text-sm text-muted-foreground">Any amount is appreciated.</p>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {PRESET_AMOUNTS.map((preset) => (
                <Button
                  key={preset}
                  variant={!customAmount && amount === preset ? "default" : "outline"}
                  onClick={() => { setAmount(preset); setCustomAmount(""); }}
                >
                  ₹{preset}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom">Or enter custom amount (min ₹10)</Label>
              <Input id="custom" type="number" min={10} placeholder="₹"
                value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your name (optional)</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Anonymous" maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="msg">Message (optional)</Label>
                <Input id="msg" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Leave a note…" maxLength={500} />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-3xl font-bold">₹{finalAmount || 0}</p>
              </div>
              <Button size="lg" onClick={handleSupport}
                disabled={submitting || !finalAmount || finalAmount < 10} className="gap-2">
                <Heart className="w-4 h-4" />
                {submitting ? "Processing…" : "Support Now"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Secure payments via Razorpay — UPI, cards, netbanking, wallets supported.
            </p>
          </CardContent>
        </Card>

        {supporters.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Recent Supporters
            </h2>
            <div className="space-y-3">
              {supporters.map((s) => (
                <Card key={s.id} className="border-border/50">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium truncate">{s.display_name || "Anonymous"}</p>
                        <span className="text-sm font-semibold text-primary">₹{s.amount}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default FundRahul;
