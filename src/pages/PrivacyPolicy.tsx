import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-full flex flex-col px-6 pt-6 pb-12">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-secondary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-display font-bold">Privacy Policy</h1>
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-sm text-muted-foreground">
        <p className="text-xs text-muted-foreground">Last updated: March 2026</p>

        <section>
          <h2 className="text-base font-semibold text-foreground">1. Data We Collect</h2>
          <p>When you use Resoly, we collect:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Account data:</strong> email, username, age, gender, country.</li>
            <li><strong>Challenge data:</strong> stakes, sessions, check-ins, progress.</li>
            <li><strong>Photos:</strong> gym check-in photos for AI verification (auto-deleted after 30 days).</li>
            <li><strong>Location:</strong> gym coordinates (only when you save your gym).</li>
            <li><strong>Payment data:</strong> processed by Stripe. We never store card details.</li>
            <li><strong>Device tokens:</strong> for push notifications.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">2. How We Use Your Data</h2>
          <ul className="list-disc pl-4 space-y-1">
            <li>Manage your challenges and track progress.</li>
            <li>Verify gym attendance via AI photo analysis.</li>
            <li>Process payments and refunds via Stripe.</li>
            <li>Send push notifications (reminders, challenge updates).</li>
            <li>Connect you with friends on the platform.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">3. Third-Party Services</h2>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Stripe:</strong> payment processing. See <a href="https://stripe.com/privacy" className="text-primary underline" target="_blank" rel="noopener noreferrer">Stripe Privacy Policy</a>.</li>
            <li><strong>Firebase Cloud Messaging:</strong> push notifications.</li>
            <li><strong>Google AI:</strong> photo verification.</li>
            <li><strong>Shopify:</strong> rewards store fulfillment.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">4. Data Retention</h2>
          <ul className="list-disc pl-4 space-y-1">
            <li>Check-in photos: automatically deleted after 30 days.</li>
            <li>Account data: retained until you delete your account.</li>
            <li>Payment records: retained as required by law (typically 7 years).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">5. Your Rights (GDPR)</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Access</strong> your personal data.</li>
            <li><strong>Rectify</strong> inaccurate data.</li>
            <li><strong>Delete</strong> your account and all associated data (Settings → Delete Account).</li>
            <li><strong>Export</strong> your data upon request.</li>
            <li><strong>Object</strong> to processing of your data.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">6. Data Security</h2>
          <p>All data is encrypted in transit (TLS) and at rest. API keys and secrets are stored securely. We follow industry best practices for data protection.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">7. Children</h2>
          <p>Resoly is not intended for children under 16. We do not knowingly collect data from minors.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">8. Contact</h2>
          <p>For any privacy-related questions or GDPR requests:</p>
          <p className="font-medium text-foreground">privacy@resoly.app</p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
