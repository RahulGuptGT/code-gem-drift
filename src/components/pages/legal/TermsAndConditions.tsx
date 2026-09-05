import LegalLayout from "@/components/legal/LegalLayout";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-2">
    <h2 className="text-xl font-semibold text-foreground">{title}</h2>
    <div className="text-muted-foreground space-y-2">{children}</div>
  </section>
);

const TermsAndConditions = () => (
  <LegalLayout
    title="Terms & Conditions"
    description="The rules and conditions that govern your use of this website and its memberships."
    currentPath="/legal/terms-and-conditions"
    lastUpdated="September 5, 2026"
  >
    <Section title="1. Acceptance of Terms">
      <p>By accessing or using this website, creating an account, or purchasing a membership or digital product, you agree to be bound by these Terms & Conditions. If you do not agree, please discontinue use of the site.</p>
    </Section>

    <Section title="2. Accounts">
      <ul className="list-disc pl-6 space-y-1">
        <li>You must provide accurate information when creating an account.</li>
        <li>You are responsible for keeping your login credentials confidential.</li>
        <li>One account is for one person — sharing your account or access with others is not allowed.</li>
      </ul>
    </Section>

    <Section title="3. Memberships & Access">
      <p>This website offers three membership tiers:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Starter</strong> — free tier with access to publicly available content.</li>
        <li><strong>Signature</strong> — a paid monthly membership unlocking additional posts and book chapters.</li>
        <li><strong>Sovereign</strong> — a paid one-time purchase unlocking all current content.</li>
      </ul>
      <p>Gated POV posts and book chapters are only accessible while the required membership is active. If a Signature membership lapses or is cancelled, gated access ends at the close of the paid period.</p>
    </Section>

    <Section title="4. Payments & Pricing">
      <ul className="list-disc pl-6 space-y-1">
        <li>Payments are processed via <strong>Instamojo</strong> (memberships and digital purchases) and <strong>Razorpay</strong> (voluntary contributions).</li>
        <li>Prices are listed in INR and may change in the future; existing paid members will be informed of changes in advance.</li>
        <li>Refunds and cancellations are governed by our <a href="/legal/refund-policy" className="text-primary hover:underline">Refund Policy</a> and <a href="/legal/cancellation-policy" className="text-primary hover:underline">Cancellation Policy</a>. As a rule, we do not offer refunds — please review plans and free preview content carefully before purchasing.</li>
      </ul>
    </Section>

    <Section title="5. Content & Intellectual Property">
      <p>All content on this website — including posts, the book and its chapters, text, graphics, logos, and code — is the intellectual property of <strong>Rahul Gupta</strong>, unless otherwise noted. You may <strong>not</strong>:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Copy, redistribute, republish, or resell any content (free or paid).</li>
        <li>Share gated/member-only content publicly or with non-members.</li>
        <li>Use automated tools to scrape or bulk-download the site.</li>
      </ul>
    </Section>

    <Section title="6. Acceptable Use">
      <ul className="list-disc pl-6 space-y-1">
        <li>Use the website lawfully and respectfully.</li>
        <li>Do not attempt to disrupt, exploit, or bypass access controls or payment systems.</li>
        <li>Do not submit harmful, offensive, or illegal content, or impersonate others.</li>
      </ul>
    </Section>

    <Section title="7. Termination">
      <p>We reserve the right to suspend or terminate accounts that violate these Terms — including account sharing, content piracy, payment fraud, or abuse of the referral system — without refund.</p>
    </Section>

    <Section title="8. Limitation of Liability">
      <p>This website and its content are provided on an "as-is" basis. We make no warranties regarding accuracy, availability, or fitness for any particular purpose. We are not liable for any direct, indirect, or incidental damages resulting from use of this website.</p>
    </Section>

    <Section title="9. Changes to Terms">
      <p>We may update these Terms from time to time. Continued use of the website after changes constitutes acceptance of the new Terms.</p>
    </Section>

    <Section title="10. Governing Law & Contact">
      <p>These Terms are governed by the laws of India. For any questions, email <a href="mailto:rahul@rahulgupta.online" className="text-primary hover:underline">rahul@rahulgupta.online</a> or use the <a href="/contact" className="text-primary hover:underline">contact page</a>.</p>
    </Section>
  </LegalLayout>
);

export default TermsAndConditions;
