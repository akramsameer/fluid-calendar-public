import { Suspense } from "react";

import JoinPageClient from "./join-page-client";

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <div className="w-full max-w-md p-8 text-center">
            <div className="animate-pulse">
              <div className="mx-auto mb-4 h-8 w-3/4 rounded bg-gray-200"></div>
              <div className="mx-auto mb-6 h-4 w-1/2 rounded bg-gray-200"></div>
              <div className="h-64 rounded bg-gray-200"></div>
            </div>
          </div>
        </div>
      }
    >
      <JoinPageClient />
    </Suspense>
  );
}
