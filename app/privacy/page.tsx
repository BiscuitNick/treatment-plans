import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-4xl py-16 px-6">
      <h1 className="text-4xl font-bold tracking-tight mb-8">Privacy Policy</h1>

      <div className="prose prose-gray max-w-none space-y-6">
        <p className="text-lg text-muted-foreground">
          Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">1. Introduction</h2>
          <p className="text-muted-foreground">
            SessionSync (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting the privacy of healthcare
            providers and their patients. This Privacy Policy explains how we collect, use, disclose,
            and safeguard information when you use our AI-powered treatment planning platform.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">2. Information We Collect</h2>
          <h3 className="text-xl font-medium">Account Information</h3>
          <p className="text-muted-foreground">
            When you create an account, we collect your name, email address, professional credentials,
            and other information necessary to verify your identity as a healthcare provider.
          </p>
          <h3 className="text-xl font-medium">Session Data</h3>
          <p className="text-muted-foreground">
            We process audio recordings and transcripts of therapy sessions that you upload to generate
            treatment plans. This data is processed securely and in compliance with healthcare privacy regulations.
          </p>
          <h3 className="text-xl font-medium">Usage Information</h3>
          <p className="text-muted-foreground">
            We collect information about how you interact with our platform, including features used,
            pages visited, and actions taken.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">3. How We Use Your Information</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>To provide and maintain our treatment planning services</li>
            <li>To process session recordings and generate treatment plans</li>
            <li>To improve our AI models and service quality</li>
            <li>To communicate with you about your account and updates</li>
            <li>To ensure compliance with healthcare regulations</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">4. Data Security</h2>
          <p className="text-muted-foreground">
            We implement industry-standard security measures to protect your data, including encryption
            in transit and at rest, access controls, and regular security audits. All patient health
            information is handled in accordance with HIPAA requirements.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">5. Data Retention</h2>
          <p className="text-muted-foreground">
            We retain your data only for as long as necessary to provide our services and comply with
            legal obligations. You may request deletion of your data at any time by contacting us.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">6. Your Rights</h2>
          <p className="text-muted-foreground">
            You have the right to access, correct, or delete your personal information. You may also
            request a copy of your data or restrict certain processing activities.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">7. Contact Us</h2>
          <p className="text-muted-foreground">
            If you have questions about this Privacy Policy or our data practices, please contact our
            privacy team at privacy@sessionsync.com.
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
