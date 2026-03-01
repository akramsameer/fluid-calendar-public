import { prisma } from "@/lib/prisma";
import { RESERVED_USERNAMES, UsernameValidationResult } from "@saas/types/booking";

/**
 * Generate a username from an email address
 * Extracts the part before @ and normalizes it
 */
export function generateUsernameFromEmail(email: string): string {
  // Extract the part before @
  const localPart = email.split("@")[0];

  // Normalize: lowercase, replace non-alphanumeric with hyphens
  let username = localPart
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-") // Replace multiple consecutive hyphens with single
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens

  // Ensure minimum length
  if (username.length < 3) {
    username = username.padEnd(3, "0");
  }

  // Ensure it doesn't start or end with a hyphen (after padding)
  if (username.startsWith("-")) {
    username = "u" + username.substring(1);
  }
  if (username.endsWith("-")) {
    username = username.substring(0, username.length - 1) + "u";
  }

  // Truncate to max length
  if (username.length > 30) {
    username = username.substring(0, 30);
  }

  return username;
}

/**
 * Generate a unique username with collision handling
 * If the base username is taken, append a random suffix
 */
export async function generateUniqueUsername(email: string): Promise<string> {
  const baseUsername = generateUsernameFromEmail(email);

  // Check if the base username is available
  const existing = await prisma.user.findUnique({
    where: { username: baseUsername },
    select: { id: true },
  });

  if (!existing && !RESERVED_USERNAMES.includes(baseUsername)) {
    return baseUsername;
  }

  // Generate a unique username with a random suffix
  let attempts = 0;
  while (attempts < 10) {
    const suffix = generateRandomSuffix(4);
    const candidateUsername = `${baseUsername.substring(0, 24)}-${suffix}`;

    const existingCandidate = await prisma.user.findUnique({
      where: { username: candidateUsername },
      select: { id: true },
    });

    if (!existingCandidate) {
      return candidateUsername;
    }

    attempts++;
  }

  // Fallback: use timestamp-based suffix
  const timestamp = Date.now().toString(36);
  return `${baseUsername.substring(0, 20)}-${timestamp}`;
}

/**
 * Generate a random alphanumeric suffix
 */
function generateRandomSuffix(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Validate a username
 */
export async function validateUsername(
  username: string,
  excludeUserId?: string
): Promise<UsernameValidationResult> {
  // Check format
  if (username.length < 3) {
    return { available: false, reason: "Username must be at least 3 characters" };
  }

  if (username.length > 30) {
    return { available: false, reason: "Username must be at most 30 characters" };
  }

  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(username) && !/^[a-z0-9]$/.test(username)) {
    return {
      available: false,
      reason:
        "Username must start and end with a letter or number, and can only contain lowercase letters, numbers, and hyphens",
    };
  }

  if (username.includes("--")) {
    return { available: false, reason: "Username cannot contain consecutive hyphens" };
  }

  // Check reserved usernames
  if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
    return { available: false, reason: "This username is reserved" };
  }

  // Check if username is taken
  const whereClause: { username: string; id?: { not: string } } = {
    username: username.toLowerCase(),
  };

  if (excludeUserId) {
    whereClause.id = { not: excludeUserId };
  }

  const existing = await prisma.user.findFirst({
    where: whereClause,
    select: { id: true },
  });

  if (existing) {
    return { available: false, reason: "This username is already taken" };
  }

  return { available: true };
}

/**
 * Check if a username is available (quick check for UI)
 */
export async function isUsernameAvailable(
  username: string,
  excludeUserId?: string
): Promise<boolean> {
  const result = await validateUsername(username, excludeUserId);
  return result.available;
}
