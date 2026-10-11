import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SupportContactLine from '../../components/SupportContactLine';

const EFFECTIVE_DATE = '11 October 2026';

/**
 * Public Privacy Policy — store listings and account surfaces link here.
 * English body (standard for legal / Play / App Store); chrome uses i18n.
 */
export default function PrivacyPolicy() {
  const { t } = useTranslation();

  return (
    <div className="min-h-[100dvh] bg-app-bg text-app-text">
      <div className="mx-auto max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
        <p className="text-sm font-semibold tracking-tight text-teal-700 dark:text-teal-300">Niku</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-app-text-strong sm:text-3xl">
          {t('privacy.title')}
        </h1>
        <p className="mt-2 text-sm text-app-muted">
          {t('privacy.effectiveDate', { date: EFFECTIVE_DATE })}
        </p>

        <div className="privacy-prose mt-8 space-y-6 text-[15px] leading-relaxed text-app-text">
          <section className="space-y-2">
            <h2>1. Who we are</h2>
            <p>
              Niku (also shown as ንቁ in SMS) is a gym management platform. Gym owners and staff use
              Niku on the web and in the mobile app to manage members, plans, check-ins, payments
              recorded in the system, and related operations.
            </p>
            <p>
              When a gym uses Niku, that gym is typically the organization responsible for its
              members&apos; data. Niku operates the platform and processes data to provide the
              service, secure accounts, and support gym owners.
            </p>
          </section>

          <section className="space-y-2">
            <h2>2. Information we collect</h2>
            <p>Depending on how you use Niku, we may process:</p>
            <ul>
              <li>
                <strong>Account and gym details</strong> — names, usernames, phone numbers, optional
                email, gym name, city/location, branch details, and role (for example owner or front
                desk).
              </li>
              <li>
                <strong>Member records entered by the gym</strong> — member name, phone, optional
                photo, plan and membership dates, status, check-in / visit history, and payment
                records the gym enters in Niku (manual recording; no card gateway in the current
                product).
              </li>
              <li>
                <strong>Authentication data</strong> — passwords (stored hashed), SMS one-time codes
                for signup and password reset, and session information.
              </li>
              <li>
                <strong>Messaging identifiers</strong> — when Telegram is linked for a gym or member,
                identifiers needed to deliver messages through Telegram (for example chat linkage).
              </li>
              <li>
                <strong>Technical and diagnostics data</strong> — basic device/app or browser
                information, IP address as seen by our servers, and optional crash/error reports
                (for example via Sentry) when that monitoring is enabled. We aim not to put passwords,
                OTP codes, or unnecessary personal content into error reports.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2>3. How we use information</h2>
            <p>We use personal data to:</p>
            <ul>
              <li>Provide, maintain, and improve the Niku service</li>
              <li>Authenticate users and protect accounts (including SMS OTP)</li>
              <li>
                Send operational messages the product supports — SMS for verification codes only;
                Telegram for member notices and gym license/trial alerts when linked; email backup
                for some gym license notices where configured
              </li>
              <li>Show dashboards, reports, and activity the gym staff request</li>
              <li>Provide customer support and respond to requests</li>
              <li>Monitor reliability and security, and meet legal obligations</li>
            </ul>
            <p>We do not sell personal data.</p>
          </section>

          <section className="space-y-2">
            <h2>4. Legal bases (where applicable)</h2>
            <p>
              We process data as needed to provide the service gyms request, to take steps before a
              contract (for example signup), with consent where required (for example optional
              messaging channels), for legitimate interests such as securing the platform, and where
              the law requires it. Gyms are responsible for having a valid reason to enter member
              data into Niku.
            </p>
          </section>

          <section className="space-y-2">
            <h2>5. Sharing</h2>
            <p>We share data only as needed to run Niku, including with:</p>
            <ul>
              <li>
                <strong>Service providers</strong> — hosting, database, email/SMS/Telegram delivery,
                and error monitoring providers that process data on our instructions
              </li>
              <li>
                <strong>The gym that uses the account</strong> — owners and authorized staff see
                member and gym data for their gym
              </li>
              <li>
                <strong>Authorities</strong> — when required by applicable law or to protect rights
                and safety
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2>6. International processing</h2>
            <p>
              Niku may use cloud infrastructure and vendors that store or process data outside
              Ethiopia. If you use Niku, you understand that data may be transferred to and processed
              in other countries where those providers operate, subject to their safeguards and
              applicable law.
            </p>
          </section>

          <section className="space-y-2">
            <h2>7. Retention</h2>
            <p>
              We keep personal data while an account or gym workspace is active and for a reasonable
              period afterward as needed for backups, disputes, security, and legal requirements.
              Gyms control when member records are updated or removed in the product; platform-level
              deletion requests can be made through support.
            </p>
          </section>

          <section className="space-y-2">
            <h2>8. Security</h2>
            <p>
              We use technical and organizational measures appropriate to the service, including
              access controls, hashed passwords, and transport encryption (HTTPS). No method of
              transmission or storage is completely secure.
            </p>
          </section>

          <section className="space-y-2">
            <h2>9. Your choices and rights</h2>
            <ul>
              <li>
                <strong>Gym staff / owners</strong> — update profile and password in the app; request
                account help via support contacts shown in the product when configured.
              </li>
              <li>
                <strong>Gym members</strong> — contact your gym for access, correction, or deletion of
                membership data the gym holds in Niku. You can unlink Telegram where the product
                provides that control.
              </li>
            </ul>
            <p>
              Depending on applicable law (including Ethiopia&apos;s Personal Data Protection
              Proclamation where it applies), you may have rights to access, correct, delete, or
              object to certain processing. We will respond to valid requests within a reasonable
              time.
            </p>
          </section>

          <section className="space-y-2">
            <h2>10. Children</h2>
            <p>
              Niku is directed at gym businesses and adult staff. It is not intended for children to
              create accounts. If a gym enrolls a minor member, the gym is responsible for obtaining
              any required consent from a parent or guardian.
            </p>
          </section>

          <section className="space-y-2">
            <h2>11. Changes</h2>
            <p>
              We may update this Privacy Policy from time to time. The effective date at the top will
              change when we do. Continued use of Niku after an update means you acknowledge the
              revised policy.
            </p>
          </section>

          <section className="space-y-2">
            <h2>12. Contact</h2>
            <p>
              For privacy questions about the Niku platform, use the support contact below when
              available, or the contact method provided with your gym&apos;s Niku subscription.
            </p>
            <SupportContactLine className="pt-1" />
            <p className="text-sm text-app-muted">
              This page is a general privacy notice for the product. It is not legal advice. If you
              need advice for your gym or jurisdiction, consult a qualified professional.
            </p>
          </section>
        </div>

        <p className="mt-10 text-sm">
          <Link to="/login" className="font-medium text-teal-700 hover:underline dark:text-teal-300">
            {t('privacy.backToSignIn')}
          </Link>
        </p>
      </div>

      <style>{`
        .privacy-prose h2 {
          font-size: 1.05rem;
          font-weight: 600;
          color: var(--app-text-strong, inherit);
          letter-spacing: -0.01em;
        }
        .privacy-prose ul {
          list-style: disc;
          padding-left: 1.25rem;
          display: grid;
          gap: 0.5rem;
        }
        .privacy-prose li strong {
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
