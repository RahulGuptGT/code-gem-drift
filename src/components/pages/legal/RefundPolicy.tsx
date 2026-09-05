import LegalLayout from "@/components/legal/LegalLayout";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-2">
    <h2 className="text-xl font-semibold text-foreground">{title}</h2>
    <div className="text-muted-foreground space-y-2">{children}</div>
  </section>
);

const RefundPolicy = () => (
  <LegalLayout
    title="Refund Policy"
    description="Our policy regarding refunds for membership plans, the book, and voluntary contributions."
    currentPath="/legal/refund-policy"
    lastUpdated="September 5, 2026"
  >
    <Section title="1. No Refunds, Generally">
      <p>We <strong>do not offer refunds</strong> on membership plans (Signature, Sovereign), the book, or any other digital purchase made on this website. Digital content is delivered instantly, so all sales are treated as final.</p>
      <p><strong>Please review everything carefully before you pay.</strong> Free chapters of the book, free POV posts, and full plan details are openly available so you know exactly what you are buying. By completing a purchase, you confirm that you have reviewed the plan and accept this no-refund policy.</p>
    </Section>

    <Section title="2. Rare Cases — 7-Day Refund Window">
      <p>In rare, exceptional situations, a refund <strong>may</strong> be considered if requested within <strong>7 days</strong> of the transaction:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Accidental or duplicate payment (charged twice for the same purchase)</li>
        <li>Unauthorized transaction made without your consent (subject to verification)</li>
        <li>A technical error where payment succeeded but access was never delivered, and we could not fix it</li>
      </ul>
      <p>Approval of these refunds is entirely at our discretion after verifying the payment records. Change of mind, not using the membership, or "didn't like the content" are <strong>not</strong> valid grounds for a refund.</p>
    </Section>

    <Section title="3. Voluntary Contributions">
      <p>Contributions made via the <strong>"Fund Rahul"</strong> page are voluntary donations. They are non-refundable, except in the rare cases listed above.</p>
    </Section>

    <Section title="4. How to Request a Refund">
      <p>Email <a href="mailto:rahul@rahulgupta.online" className="text-primary hover:underline">rahul@rahulgupta.online</a> within 7 days of the transaction with:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>The email address used for your account / purchase</li>
        <li>Transaction ID or payment reference (from Instamojo or Razorpay)</li>
        <li>Date and amount of the payment</li>
        <li>A brief explanation of the issue</li>
      </ul>
      <p>We respond within <strong>3 business days</strong>.</p>
    </Section>

    <Section title="5. Refund Processing">
      <p>If a refund is approved, the amount is returned to the original payment method within <strong>7–14 business days</strong>, subject to processing times of the payment gateway (Instamojo / Razorpay) and your bank.</p>
    </Section>

    <Section title="6. Questions">
      <p>For any payment or refund questions, email <a href="mailto:rahul@rahulgupta.online" className="text-primary hover:underline">rahul@rahulgupta.online</a> or use the <a href="/contact" className="text-primary hover:underline">contact page</a>.</p>
    </Section>
  </LegalLayout>
);

export default RefundPolicy;
