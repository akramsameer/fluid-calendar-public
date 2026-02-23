import { hash } from "bcrypt";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "SetupPasswordService";

/**
 * Service to handle password setup for new lifetime users.
 * @param params - Object containing name, email, and password
 * @returns Promise with result (user and subscription info)
 */
export async function handleSetupPassword({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}) {
  if (!name || !email || !password) {
    throw new Error("Name, email, and password are required.");
  }

  // Check if user already exists
  let user = await prisma.user.findUnique({
    where: { email },
    include: { subscription: true },
  });
  if (user) {
    throw new Error("A user with this email already exists.");
  }

  // Hash the password
  const hashedPassword = await hash(password, 10);

  // Create the user
  user = await prisma.user.create({
    data: {
      email,
      name,
      emailVerified: new Date(), // Trust email since payment was made
      accounts: {
        create: {
          type: "credentials",
          provider: "credentials",
          providerAccountId: email,
          id_token: hashedPassword,
        },
      },
      userSettings: {
        create: {
          theme: "system",
          timeZone: "UTC",
        },
      },
    },
    include: { subscription: true },
  });

  // Assign lifetime subscription
  const subscription = await prisma.subscription.create({
    data: {
      userId: user.id,
      plan: "LIFETIME",
      status: "ACTIVE",
    },
  });

  logger.info(
    "User signed up and assigned to lifetime plan",
    { userId: user.id, email, subscriptionId: subscription.id },
    LOG_SOURCE
  );

  return {
    user: { id: user.id, email: user.email, name: user.name },
    subscription: {
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
    },
    message: "Account created and assigned to lifetime plan.",
  };
}
