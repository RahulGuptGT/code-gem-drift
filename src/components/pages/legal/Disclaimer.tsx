import LegalLayout from "@/components/legal/LegalLayout";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-2">
    <h2 className="text-xl font-semibold text-foreground">{title}</h2>
    <div className="text-muted-foreground space-y-2">{children}</div>
  </section>
);

const Disclaimer = () => (
  <LegalLayout
    title="Disclaimer"
    description="Important information about the nature of content shared on this website."
    currentPath="/legal/disclaimer"
  >
    <Section title="1. Personal Opinions">
      <p>All content, articles, "POV" posts, and ideas published on this website represent the <strong>personal opinions and views of Rahul Gupta</strong>. They do not represent the views of any organization, institution, or third party.</p>
    </Section>

    <Section title="2. No Guarantee of Accuracy">
      <p>While effort is made to keep information accurate and up-to-date, we make no warranties or guarantees regarding the completeness, reliability, or accuracy of any content. Information may change without notice.</p>
    </Section>

    <Section title="3. Not Professional Advice">
      <p>Content on this website is for <strong>informational and educational purposes only</strong>. It is not intended as:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Legal advice</li>
        <li>Medical advice</li>
        <li>Financial or investment advice</li>
        <li>Career or academic counseling</li>
      </ul>
      <p>Please consult a qualified professional before making decisions based on anything shared here.</p>
    </Section>

    <Section title="4. External Links">
      <p>This website may contain links to third-party websites. We are not responsible for the content, accuracy, or practices of those external sites.</p>
    </Section>

    <Section title="5. Use at Your Own Risk">
      <p>Any action you take based on information from this website is strictly at your own risk. We will not be liable for any losses or damages in connection with the use of our website.</p>
    </Section>
  </LegalLayout>
);

export default Disclaimer;
