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
    lastUpdated="September 5, 2026"
  >
    <Section title="1. Personal Opinions">
      <p>All content on this website — articles, "POV" posts, the book and its chapters — represents the <strong>personal opinions and views of Rahul Gupta</strong>. It does not represent the views of any organization, institution, employer, or third party.</p>
    </Section>

    <Section title="2. Not Professional Advice">
      <p>Content on this website, whether free or paid, is for <strong>informational and educational purposes only</strong>. It is not intended as:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Legal advice</li>
        <li>Medical or psychological advice</li>
        <li>Financial or investment advice</li>
        <li>Career or academic counseling</li>
      </ul>
      <p>Please consult a qualified professional before making decisions based on anything shared here.</p>
    </Section>

    <Section title="3. No Guarantee of Results">
      <p>Nothing on this website guarantees any specific outcome — financial, professional, academic, or otherwise. Strategies and experiences shared are personal and may not work the same way for you. Any action you take based on this content is strictly at your own risk.</p>
    </Section>

    <Section title="4. No Guarantee of Accuracy">
      <p>While effort is made to keep information accurate and up-to-date, we make no warranties regarding the completeness, reliability, or accuracy of any content. Information may change without notice.</p>
    </Section>

    <Section title="5. External Links">
      <p>This website may contain links to third-party websites and tools. We are not responsible for the content, accuracy, or practices of those external sites.</p>
    </Section>

    <Section title="6. Paid Content">
      <p>Purchasing a membership or the book grants you <strong>access to digital content</strong>, not personalized advice, coaching, or any guaranteed result. Purchases are governed by our <a href="/legal/refund-policy" className="text-primary hover:underline">Refund Policy</a> — as a rule, refunds are not offered, except in the rare cases described there.</p>
    </Section>

    <Section title="7. Contact">
      <p>Questions about this disclaimer? Email <a href="mailto:rahul@rahulgupta.online" className="text-primary hover:underline">rahul@rahulgupta.online</a> or use the <a href="/contact" className="text-primary hover:underline">contact page</a>.</p>
    </Section>
  </LegalLayout>
);

export default Disclaimer;
