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
    description="The rules and conditions that govern your use of this website."
    currentPath="/legal/terms-and-conditions"
  >
    <Section title="1. Acceptance of Terms">
      <p>By accessing or using this website, you agree to be bound by these Terms & Conditions. If you do not agree, please discontinue use of the site.</p>
    </Section>

    <Section title="2. Website Usage Rules">
      <ul className="list-disc pl-6 space-y-1">
        <li>You agree to use the website lawfully and respectfully.</li>
        <li>You will not attempt to disrupt, exploit, or overload the website.</li>
        <li>You will not use automated tools to scrape or misuse content.</li>
      </ul>
    </Section>

    <Section title="3. Intellectual Property">
      <p>All content on this website — including text, graphics, logos, code, and original media — is the intellectual property of <strong>Rahul Gupta</strong>, unless otherwise noted. You may not reproduce, distribute, or republish content without permission.</p>
    </Section>

    <Section title="4. User Responsibilities">
      <ul className="list-disc pl-6 space-y-1">
        <li>You are responsible for any content you submit (messages, comments, etc.).</li>
        <li>You must not submit harmful, offensive, or illegal content.</li>
        <li>You agree not to impersonate others or misrepresent your identity.</li>
      </ul>
    </Section>

    <Section title="5. Limitation of Liability">
      <p>This website is provided on an "as-is" basis. We make no warranties regarding accuracy, availability, or fitness for any particular purpose. We are not liable for any direct, indirect, or incidental damages resulting from use of this website.</p>
    </Section>

    <Section title="6. Changes to Terms">
      <p>We reserve the right to update these Terms at any time. Continued use of the website after changes constitutes acceptance of the new Terms.</p>
    </Section>

    <Section title="7. Governing Law">
      <p>These Terms are governed by the laws of India. Any disputes shall be resolved in the appropriate courts of jurisdiction.</p>
    </Section>
  </LegalLayout>
);

export default TermsAndConditions;
