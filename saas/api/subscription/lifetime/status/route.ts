import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_STATUS,
} from "@saas/lib/stripe/constants";

export async function GET(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const email = token?.email;

  if (!email) {
    return NextResponse.json({ hasLifetimeAccess: false });
  }

  const user = await prisma.user.findUnique({
    where: {
      email: email,
    },
    include: {
      subscription: true,
    },
  });

  return NextResponse.json({
    hasLifetimeAccess:
      user?.subscription?.plan === SUBSCRIPTION_PLANS.LIFETIME &&
      user?.subscription?.status === SUBSCRIPTION_STATUS.ACTIVE,
  });
}
