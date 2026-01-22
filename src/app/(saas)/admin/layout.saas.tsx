export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // SessionProvider is already provided by the root layout via Providers
  // Adding another one here causes nested context issues
  return <>{children}</>;
}
