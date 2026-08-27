import LegalLayout from "@/components/legal/LegalLayout";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-2">
    <h2 className="text-xl font-semibold text-foreground">{title}</h2>
    <div className="text-muted-foreground space-y-2">{children}</div>
  </section>
);

const PrivacyPolicy = () => (
  <LegalLayout
    title="Privacy Policy"
    description="How I collect, use, and protect your personal information on this website."
    currentPath="/legal/privacy-policy"
  >
    <Section title="1. Information We Collect">
      <p>When you interact with this website, we may collect the following information:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Name & Contact Details</strong> — when you submit a contact form or leave a message.</li>
        <li><strong>Messages & Feedback</strong> — content you voluntarily share with us.</li>
        <li><strong>Payment Information</strong> — for future contributions, payments will be processed securely via <strong>Razorpay</strong>. We do not store your card or banking details on our servers.</li>
        <li><strong>Usage Data</strong> — anonymous analytics such as pages visited, device type, and browser used.</li>
      </ul>
    </Section>

    <Section title="2. How We Use Your Information">
      <ul className="list-disc pl-6 space-y-1">
        <li>To respond to your messages and inquiries.</li>
        <li>To improve the website experience and content.</li>
        <li>To process voluntary contributions (when payment integration is live).</li>
        <li>To maintain security and prevent abuse.</li>
      </ul>
    </Section>

    <Section title="3. Third-Party Services">
      <p>We rely on trusted third-party services to operate this website:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Razorpay</strong> — for payment processing (when enabled).</li>
        <li><strong>Supabase</strong> — for secure data storage and authentication.</li>
        <li><strong>Hosting providers</strong> — to deliver the website to your browser.</li>
      </ul>
      <p>Each of these services has its own privacy policy governing how they handle data.</p>
    </Section>

    <Section title="4. Data Protection">
      <p>We implement reasonable security measures to protect your information from unauthorized access, alteration, or disclosure. However, no method of transmission over the internet is 100% secure.</p>
    </Section>

    <Section title="5. Your Rights">
      <p>You may request access to, correction of, or deletion of your personal data at any time by contacting us.</p>
    </Section>

    <Section title="6. Contact">
      <p>For any privacy-related questions, please reach out via the <a href="/contact" className="text-primary hover:underline">contact page</a>.</p>
    </Section>
  </LegalLayout>
);

export default PrivacyPolicy;
