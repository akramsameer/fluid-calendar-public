import Link from "next/link";

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="container flex items-center justify-between h-16 px-4 mx-auto">
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
              Fluid Calendar
            </span>
          </Link>
          <nav className="flex items-center space-x-6">
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              Home
            </Link>
            <Link
              href="/terms"
              className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              Privacy
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="py-8 border-t border-gray-200 dark:border-gray-800">
        <div className="container px-4 mx-auto text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            © {new Date().getFullYear()} Fluid Calendar. All rights reserved.
          </p>
          <div className="flex justify-center mt-4 space-x-6">
            <Link
              href="/terms"
              className="hover:text-gray-900 dark:hover:text-white"
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className="hover:text-gray-900 dark:hover:text-white"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
