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
    description="How we collect, use, and protect your personal information on this website."
    currentPath="/legal/privacy-policy"
    lastUpdated="September 5, 2026"
  >
    <Section title="1. Information We Collect">
      <p>When you interact with this website, we may collect the following information:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Account Information</strong> — name and email address when you sign up or log in.</li>
        <li><strong>Membership & Purchase Data</strong> — the plan you hold (Starter, Signature, Sovereign), payment status, and purchase history. Card and banking details are never stored on our servers.</li>
        <li><strong>Reading Activity</strong> — book chapters and posts you read, and your reading progress, so members can resume where they left off.</li>
        <li><strong>Referral Activity</strong> — referral links you create or use, and related statistics.</li>
        <li><strong>Messages & Feedback</strong> — content you voluntarily share via contact forms or email.</li>
        <li><strong>Usage Data</strong> — anonymous analytics such as pages visited, device type, and browser used.</li>
      </ul>
    </Section>

    <Section title="2. How We Use Your Information">
      <ul className="list-disc pl-6 space-y-1">
        <li>To create and manage your account and membership access.</li>
        <li>To process payments and deliver the content you purchased.</li>
        <li>To respond to your messages, refund requests, and inquiries.</li>
        <li>To improve the website experience and content.</li>
        <li>To maintain security, prevent fraud, and enforce our terms.</li>
      </ul>
    </Section>

    <Section title="3. Payments">
      <p>Payments are processed securely by trusted third-party gateways:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Instamojo</strong> — for membership plans and digital purchases.</li>
        <li><strong>Razorpay</strong> — for voluntary contributions ("Fund Rahul").</li>
      </ul>
      <p>Your card, UPI, or banking details are entered directly on the gateway's secure pages and are governed by their privacy policies. We only receive a payment confirmation and reference ID.</p>
    </Section>

    <Section title="4. Third-Party Services">
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Supabase</strong> — secure data storage and authentication.</li>
        <li><strong>Instamojo / Razorpay</strong> — payment processing.</li>
        <li><strong>Hosting providers</strong> — to deliver the website to your browser.</li>
      </ul>
      <p>Each of these services has its own privacy policy governing how they handle data. We never sell your personal information to anyone.</p>
    </Section>

    <Section title="5. Data Protection">
      <p>We implement reasonable security measures — including encrypted connections and row-level access controls — to protect your information from unauthorized access, alteration, or disclosure. However, no method of transmission over the internet is 100% secure.</p>
    </Section>

    <Section title="6. Your Rights">
      <p>You may request access to, correction of, or deletion of your personal data at any time by emailing <a href="mailto:rahul@rahulgupta.online" className="text-primary hover:underline">rahul@rahulgupta.online</a>. Deleting your account also ends any membership access without refund.</p>
    </Section>

    <Section title="7. Contact">
      <p>For any privacy-related questions, email <a href="mailto:rahul@rahulgupta.online" className="text-primary hover:underline">rahul@rahulgupta.online</a> or use the <a href="/contact" className="text-primary hover:underline">contact page</a>.</p>
    </Section>
  </LegalLayout>
);

export default PrivacyPolicy;
