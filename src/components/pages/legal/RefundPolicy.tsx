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
    description="Our policy regarding refunds for voluntary contributions and payments."
    currentPath="/legal/refund-policy"
  >
    <Section title="1. Voluntary Contributions">
      <p>All contributions made via the <strong>"Fund Rahul"</strong> page or any future support channels are entirely <strong>voluntary</strong>. They are treated as appreciation rather than payment for goods or services.</p>
    </Section>

    <Section title="2. General Refund Policy">
      <p>Because contributions are voluntary, <strong>refunds are generally not provided</strong>. By contributing, you acknowledge and accept this.</p>
    </Section>

    <Section title="3. Special Cases">
      <p>Refunds may be considered in exceptional circumstances, such as:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Accidental duplicate transactions</li>
        <li>Unauthorized payments (subject to verification)</li>
        <li>Technical errors during payment processing</li>
      </ul>
      <p>Refund requests must be submitted within <strong>7 days</strong> of the transaction.</p>
    </Section>

    <Section title="4. Refund Process">
      <p>If a refund is approved, the amount will be returned to the original payment method within <strong>7–14 business days</strong>, subject to processing times of the payment gateway (Razorpay) and your bank.</p>
    </Section>

    <Section title="5. Disputes">
      <p>For any payment disputes or refund requests, please <a href="/contact" className="text-primary hover:underline">contact us</a> with the transaction ID and a brief explanation. We will respond within 3 business days.</p>
    </Section>
  </LegalLayout>
);

export default RefundPolicy;
