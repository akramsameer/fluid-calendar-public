import { Suspense } from "react";
import JoinPageClient from "./join-page-client";

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-md p-8 text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-4 mx-auto w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded mb-6 mx-auto w-1/2"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      }
    >
      <JoinPageClient />
    </Suspense>
  );
}
