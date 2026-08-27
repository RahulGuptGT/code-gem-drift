import LegalLayout from "@/components/legal/LegalLayout";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-2">
    <h2 className="text-xl font-semibold text-foreground">{title}</h2>
    <div className="text-muted-foreground space-y-2">{children}</div>
  </section>
);

const CancellationPolicy = () => (
  <LegalLayout
    title="Cancellation Policy"
    description="Information about cancelling subscriptions or recurring payments."
    currentPath="/legal/cancellation-policy"
  >
    <Section title="1. No Subscriptions Currently">
      <p>At this time, this website does <strong>not offer any subscription-based products or services</strong>. All contributions are one-time and voluntary.</p>
    </Section>

    <Section title="2. No Recurring Payments">
      <p>We do not currently auto-charge or set up recurring billing on any payment method. Each contribution is a single, manual transaction initiated by you.</p>
    </Section>

    <Section title="3. Future Updates">
      <p>If subscription-based services are introduced in the future (such as monthly support tiers, premium content, or memberships), this Cancellation Policy will be updated to reflect:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>How to cancel a subscription</li>
        <li>When cancellations take effect</li>
        <li>Whether prorated refunds apply</li>
      </ul>
    </Section>

    <Section title="4. Cancelling a Pending Contribution">
      <p>If you initiated a contribution but the payment has not yet completed, simply close the payment window — no charge will occur. If you have already paid and need help, please refer to the <a href="/legal/refund-policy" className="text-primary hover:underline">Refund Policy</a>.</p>
    </Section>

    <Section title="5. Contact">
      <p>For any cancellation-related questions, please <a href="/contact" className="text-primary hover:underline">contact us</a>.</p>
    </Section>
  </LegalLayout>
);

export default CancellationPolicy;
