import { isSaasEnabled } from "@/lib/config";

import OSLandingPage from "@/components/landing/OSLandingPage";

export default async function Page() {
  if (!isSaasEnabled) {
    return <OSLandingPage />;
  }

  const { default: SaasLandingPage } = await import(
    "@saas/routes/(saas)/page"
  );
  return <SaasLandingPage />;
}
