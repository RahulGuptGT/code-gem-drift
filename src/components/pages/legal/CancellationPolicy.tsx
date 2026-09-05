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
    description="How to cancel your membership and what happens when you do."
    currentPath="/legal/cancellation-policy"
    lastUpdated="September 5, 2026"
  >
    <Section title="1. Membership Plans">
      <p>This website offers the following membership options:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Starter</strong> — free access, nothing to cancel.</li>
        <li><strong>Signature</strong> — a paid recurring (monthly) membership.</li>
        <li><strong>Sovereign</strong> — a paid one-time purchase; since it never renews, there is nothing to cancel.</li>
      </ul>
    </Section>

    <Section title="2. Cancelling a Signature Membership">
      <p>You can cancel your Signature membership at any time by emailing <a href="mailto:rahul@rahulgupta.online" className="text-primary hover:underline">rahul@rahulgupta.online</a> from your registered email address.</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Your access continues until the end of the current paid period.</li>
        <li>After that, your account automatically moves to the free Starter tier — no further charges.</li>
        <li>Cancelling does <strong>not</strong> trigger a refund for the current or past billing periods.</li>
      </ul>
    </Section>

    <Section title="3. One-Time Purchases">
      <p>Sovereign membership, the book, and voluntary contributions ("Fund Rahul") are one-time payments. They cannot be cancelled once completed, and are non-refundable except in the rare cases described in our <a href="/legal/refund-policy" className="text-primary hover:underline">Refund Policy</a> (accidental duplicate, unauthorized, or technical-error payments reported within 7 days).</p>
    </Section>

    <Section title="4. Pending Payments">
      <p>If you started a payment but have not completed it, simply close the payment window — no charge will occur. If money was deducted but you did not receive access, email us with the transaction details and we will resolve it.</p>
    </Section>

    <Section title="5. Contact">
      <p>For any cancellation request or question, email <a href="mailto:rahul@rahulgupta.online" className="text-primary hover:underline">rahul@rahulgupta.online</a> or use the <a href="/contact" className="text-primary hover:underline">contact page</a>. We respond within 3 business days.</p>
    </Section>
  </LegalLayout>
);

export default CancellationPolicy;
