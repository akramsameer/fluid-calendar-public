import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | FluidCalendar",
  description: "Terms of Service for FluidCalendar",
};

export default function TermsPage() {
  return (
    <div className="container max-w-4xl px-4 py-12 mx-auto">
      <h1 className="mb-8 text-3xl font-bold text-gray-900 dark:text-white">
        Terms of Service
      </h1>

      <div className="prose prose-headings:font-semibold prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-p:text-gray-600 prose-p:dark:text-gray-300 prose-li:text-gray-600 prose-li:dark:text-gray-300 dark:prose-invert max-w-none">
        <p className="text-gray-600 dark:text-gray-300">
          Last updated: March 10, 2025
        </p>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-4">
          1. Introduction
        </h2>
        <p>
          Welcome to FluidCalendar. These Terms of Service govern your use of
          our website and services. By accessing or using FluidCalendar, you
          agree to be bound by these Terms.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-4">
          2. Definitions
        </h2>
        <p>
          <strong>&quot;Service&quot;</strong> refers to the FluidCalendar
          application, website, and any related services.
          <br />
          <strong>&quot;User&quot;</strong> refers to individuals who access or
          use the Service.
          <br />
          <strong>&quot;Account&quot;</strong> refers to the user registration
          that allows access to the Service.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-4">
          3. Account Registration and Security
        </h2>
        <p>
          To use certain features of the Service, you must register for an
          account. You agree to provide accurate, current, and complete
          information during the registration process and to update such
          information to keep it accurate, current, and complete.
        </p>
        <p>
          You are responsible for safeguarding your password and for all
          activities that occur under your account. You agree to notify us
          immediately of any unauthorized use of your account.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-4">
          4. User Content
        </h2>
        <p>
          Our Service allows you to post, link, store, share, and otherwise make
          available certain information, text, graphics, or other material. You
          retain any rights that you may have in such content.
        </p>
        <p>
          By posting content to the Service, you grant us the right to use,
          modify, publicly perform, publicly display, reproduce, and distribute
          such content on and through the Service.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-4">
          5. Acceptable Use
        </h2>
        <p>You agree not to use the Service:</p>
        <ul className="mt-4 space-y-2 list-disc list-inside">
          <li>In any way that violates any applicable law or regulation</li>
          <li>
            To transmit any material that is defamatory, offensive, or otherwise
            objectionable
          </li>
          <li>
            To impersonate or attempt to impersonate another person or entity
          </li>
          <li>
            To engage in any activity that interferes with or disrupts the
            Service
          </li>
          <li>
            To attempt to access any parts of the Service that you are not
            authorized to access
          </li>
        </ul>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-4">
          6. Intellectual Property
        </h2>
        <p>
          The Service and its original content, features, and functionality are
          and will remain the exclusive property of FluidCalendar and its
          licensors. The Service is protected by copyright, trademark, and other
          laws.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-4">
          7. Termination
        </h2>
        <p>
          We may terminate or suspend your account and access to the Service
          immediately, without prior notice or liability, for any reason,
          including without limitation if you breach the Terms.
        </p>
        <p>
          Upon termination, your right to use the Service will immediately
          cease. If you wish to terminate your account, you may simply
          discontinue using the Service or contact us to request account
          deletion.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-4">
          8. Limitation of Liability
        </h2>
        <p>
          In no event shall FluidCalendar, nor its directors, employees,
          partners, agents, suppliers, or affiliates, be liable for any
          indirect, incidental, special, consequential, or punitive damages,
          including without limitation, loss of profits, data, use, goodwill, or
          other intangible losses, resulting from your access to or use of or
          inability to access or use the Service.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-4">
          9. Changes to Terms
        </h2>
        <p>
          We reserve the right, at our sole discretion, to modify or replace
          these Terms at any time. We will provide notice of any changes by
          posting the new Terms on this page and updating the &quot;last
          updated&quot; date.
        </p>
        <p>
          Your continued use of the Service after any such changes constitutes
          your acceptance of the new Terms.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-4">
          10. Contact Us
        </h2>
        <p>
          If you have any questions about these Terms, please contact us at
          support@fluidcalendar.com.
        </p>
      </div>
    </div>
  );
}
