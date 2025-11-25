import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-4xl py-16 px-6">
      <h1 className="text-4xl font-bold tracking-tight mb-8">Terms of Service</h1>

      <div className="prose prose-gray max-w-none space-y-6">
        <p className="text-lg text-muted-foreground">
          Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground">
            By accessing or using SessionSync (&quot;the Service&quot;), you agree to be bound by these Terms
            of Service. If you do not agree to these terms, please do not use the Service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">2. Eligibility</h2>
          <p className="text-muted-foreground">
            The Service is intended for licensed healthcare professionals. By using the Service, you
            represent that you are a licensed mental health professional authorized to provide therapy
            services in your jurisdiction.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">3. Description of Service</h2>
          <p className="text-muted-foreground">
            SessionSync provides AI-powered tools to assist healthcare providers in generating
            treatment plans from therapy session recordings. The Service includes transcription,
            analysis, and documentation features.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">4. Professional Responsibility</h2>
          <p className="text-muted-foreground">
            The Service is a tool to assist clinical decision-making, not a replacement for professional
            judgment. You are solely responsible for reviewing, modifying, and approving all treatment
            plans before use. AI-generated content should always be verified for accuracy and appropriateness.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">5. Patient Consent</h2>
          <p className="text-muted-foreground">
            You are responsible for obtaining appropriate patient consent before recording therapy sessions
            and uploading them to the Service. You must comply with all applicable laws and regulations
            regarding patient privacy and consent.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">6. Account Security</h2>
          <p className="text-muted-foreground">
            You are responsible for maintaining the security of your account credentials. You must
            immediately notify us of any unauthorized access or security breach.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">7. Prohibited Uses</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>Using the Service for any unlawful purpose</li>
            <li>Uploading content without proper authorization or consent</li>
            <li>Attempting to access other users&apos; data</li>
            <li>Interfering with or disrupting the Service</li>
            <li>Reverse engineering or attempting to extract source code</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">8. Intellectual Property</h2>
          <p className="text-muted-foreground">
            The Service and its original content, features, and functionality are owned by SessionSync
            and are protected by copyright, trademark, and other intellectual property laws.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">9. Disclaimer of Warranties</h2>
          <p className="text-muted-foreground">
            The Service is provided &quot;as is&quot; without warranties of any kind. We do not guarantee that
            AI-generated content will be error-free or suitable for any particular purpose.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">10. Limitation of Liability</h2>
          <p className="text-muted-foreground">
            To the maximum extent permitted by law, SessionSync shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages resulting from your use of the Service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">11. Changes to Terms</h2>
          <p className="text-muted-foreground">
            We reserve the right to modify these terms at any time. We will notify you of significant
            changes via email or through the Service. Continued use constitutes acceptance of modified terms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">12. Contact Information</h2>
          <p className="text-muted-foreground">
            For questions about these Terms of Service, please contact us at legal@sessionsync.com.
          </p>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t">
        <Link href="/" className="text-primary hover:underline">
          &larr; Back to Home
        </Link>
      </div>
    </div>
  );
}
