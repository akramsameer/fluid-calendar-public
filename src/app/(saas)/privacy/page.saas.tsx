import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | FluidCalendar",
  description: "Privacy Policy for FluidCalendar",
};

export default function PrivacyPage() {
  return (
    <div className="container max-w-4xl px-4 py-12 mx-auto">
      <h1 className="mb-8 text-3xl font-bold text-gray-900 dark:text-white">
        Privacy Policy
      </h1>

      <div className="prose prose-headings:font-semibold prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-p:text-gray-600 prose-p:dark:text-gray-300 prose-li:text-gray-600 prose-li:dark:text-gray-300 dark:prose-invert max-w-none">
        <p className="text-gray-600 dark:text-gray-300">
          Last updated: March 10, 2025
        </p>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-4">
          1. Introduction
        </h2>
        <p>
          At FluidCalendar, we respect your privacy and are committed to
          protecting your personal data. This Privacy Policy explains how we
          collect, use, and safeguard your information when you use our service.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-4">
          2. Information We Collect
        </h2>
        <p>
          We collect several types of information from and about users of our
          Service, including:
        </p>
        <ul className="mt-4 space-y-2 list-disc list-inside">
          <li>
            <strong>Personal Data:</strong> Name, email address, and other
            contact information you provide when registering for an account or
            contacting us.
          </li>
          <li>
            <strong>Calendar Data:</strong> Information from connected
            calendars, including event details, attendees, and scheduling
            preferences.
          </li>
          <li>
            <strong>Usage Data:</strong> Information about how you use our
            Service, including features accessed, time spent, and actions taken.
          </li>
          <li>
            <strong>Device Information:</strong> Information about the device
            you use to access our Service, including IP address, browser type,
            and operating system.
          </li>
        </ul>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-4">
          3. How We Use Your Information
        </h2>
        <p>We use the information we collect to:</p>
        <ul className="mt-4 space-y-2 list-disc list-inside">
          <li>Provide, maintain, and improve our Service</li>
          <li>Process and complete transactions</li>
          <li>Send you technical notices, updates, and support messages</li>
          <li>Respond to your comments, questions, and requests</li>
          <li>Understand how users interact with our Service</li>
          <li>Detect, prevent, and address technical issues</li>
          <li>Protect against harmful or unlawful activity</li>
        </ul>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-4">
          4. Data Sharing and Disclosure
        </h2>
        <p>We may share your information in the following situations:</p>
        <ul className="mt-4 space-y-2 list-disc list-inside">
          <li>
            <strong>With Service Providers:</strong> We may share your
            information with third-party vendors who provide services on our
            behalf, such as hosting, data analysis, and customer service.
          </li>
          <li>
            <strong>For Legal Reasons:</strong> We may disclose your information
            if required by law or in response to valid requests by public
            authorities.
          </li>
          <li>
            <strong>With Your Consent:</strong> We may share your information
            with third parties when you have given us your consent to do so.
          </li>
          <li>
            <strong>Business Transfers:</strong> In connection with any merger,
            sale of company assets, financing, or acquisition of all or a
            portion of our business.
          </li>
        </ul>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-4">
          5. Data Security
        </h2>
        <p>
          We implement appropriate security measures to protect your personal
          information from unauthorized access, alteration, disclosure, or
          destruction. However, no method of transmission over the Internet or
          electronic storage is 100% secure, and we cannot guarantee absolute
          security.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-4">
          6. Your Data Protection Rights
        </h2>
        <p>
          Depending on your location, you may have the following rights
          regarding your personal data:
        </p>
        <ul className="mt-4 space-y-2 list-disc list-inside">
          <li>The right to access your personal data</li>
          <li>The right to rectify inaccurate or incomplete data</li>
          <li>The right to erasure (the &quot;right to be forgotten&quot;)</li>
          <li>The right to restrict processing of your data</li>
          <li>The right to data portability</li>
          <li>The right to object to processing of your data</li>
          <li>The right to withdraw consent at any time</li>
        </ul>
        <p>
          To exercise these rights, please contact us using the information
          provided in the &quot;Contact Us&quot; section.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-4">
          7. Data Retention and Deletion
        </h2>
        <p>
          We retain your personal data for as long as necessary to provide you
          with our services and as required to fulfill our legal obligations.
        </p>
        <p>For Google user data specifically:</p>
        <ul className="mt-4 space-y-2 list-disc list-inside">
          <li>
            Calendar data is stored in our database for the purpose of providing
            the service and is retained for as long as you maintain an active
            account.
          </li>
          <li>
            Authentication tokens are stored securely and refreshed as needed to
            maintain calendar synchronization.
          </li>
          <li>
            When you disconnect a Google Calendar, we delete the associated
            authentication tokens.
          </li>
          <li>
            When you delete your account, we permanently delete all your
            personal data, including Google Calendar data and authentication
            tokens, within 30 days.
          </li>
          <li>
            You can request immediate deletion of your data at any time by
            contacting us at privacy@fluidcalendar.com.
          </li>
        </ul>
        <p>
          We may retain certain information in anonymized or aggregated form,
          but not in a way that would identify you personally.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-4">
          8. Children&apos;s Privacy
        </h2>
        <p>
          Our Service is not intended for children under the age of 13. We do
          not knowingly collect personal information from children under 13. If
          you are a parent or guardian and believe your child has provided us
          with personal information, please contact us.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-4">
          9. Third-Party Services
        </h2>
        <p>
          Our Service may contain links to third-party websites or services that
          are not owned or controlled by us. We have no control over and assume
          no responsibility for the content, privacy policies, or practices of
          any third-party websites or services.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-4">
          10. Changes to This Privacy Policy
        </h2>
        <p>
          We may update our Privacy Policy from time to time. We will notify you
          of any changes by posting the new Privacy Policy on this page and
          updating the &quot;last updated&quot; date.
        </p>
        <p>
          You are advised to review this Privacy Policy periodically for any
          changes. Changes to this Privacy Policy are effective when they are
          posted on this page.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-4">
          11. Contact Us
        </h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us
          at privacy@fluidcalendar.com.
        </p>
      </div>
    </div>
  );
}
