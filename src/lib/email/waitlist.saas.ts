import { Resend } from "resend";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "WaitlistEmail";
const resend = new Resend(process.env.RESEND_API_KEY);

interface WaitlistConfirmationEmailProps {
  email: string;
  name: string;
  referralCode: string;
  position: number;
  waitlistTemplate?: string;
}

export async function sendWaitlistConfirmationEmail({
  email,
  name,
  referralCode,
  position,
  waitlistTemplate,
}: WaitlistConfirmationEmailProps) {
  try {
    // Use the template from the database or fall back to the default template
    const template = waitlistTemplate || getDefaultWaitlistTemplate();

    // Generate the referral and status links
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const referralLink = `${baseUrl}/beta?ref=${referralCode}`;
    const statusLink = `${baseUrl}/beta/status?email=${encodeURIComponent(
      email
    )}`;

    // Replace template variables
    const html = template
      .replace(/{{name}}/g, name)
      .replace(/{{position}}/g, position.toString())
      .replace(/{{referralLink}}/g, referralLink)
      .replace(/{{statusLink}}/g, statusLink);

    // Send the email
    const { data, error } = await resend.emails.send({
      from: `Fluid Calendar <${
        process.env.RESEND_FROM_EMAIL || "noreply@fluidcalendar.com"
      }>`,
      to: email,
      subject: "Welcome to the Fluid Calendar Beta Waitlist",
      html,
    });

    if (error) {
      throw new Error(error.message);
    }

    logger.info(
      "Sent waitlist confirmation email",
      { email, messageId: data?.id || "unknown" },
      LOG_SOURCE
    );

    return { success: true, messageId: data?.id };
  } catch (error) {
    logger.error(
      "Failed to send waitlist confirmation email",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        email,
      },
      LOG_SOURCE
    );

    throw error;
  }
}

function getDefaultWaitlistTemplate(): string {
  return `
<h1>You're on the Fluid Calendar Waitlist!</h1>
<p>Hi {{name}},</p>
<p>Thank you for joining the Fluid Calendar waitlist! We'll notify you when your spot is available.</p>
<p>Your current position: {{position}}</p>
<p>Want to move up the list? Share your referral link with friends:</p>
<p><strong>{{referralLink}}</strong></p>
<p>Each person who joins using your link will help you move up in the queue!</p>
<p>Check your current status anytime:</p>
<a href="{{statusLink}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Check Status</a>
<p>Thank you for your interest in Fluid Calendar!</p>
`;
}

export interface InvitationEmailProps {
  email: string;
  name: string;
  invitationToken: string;
  expirationDate: Date;
  customMessage?: string;
  invitationTemplate?: string;
}

/**
 * Sends an invitation email to a waitlist user
 */
export async function sendInvitationEmail({
  email,
  name,
  invitationToken,
  expirationDate,
  customMessage,
  invitationTemplate,
}: InvitationEmailProps) {
  try {
    // Use the template from the database or fall back to the default template
    const template = invitationTemplate || getDefaultInvitationTemplate();

    // Generate the invitation link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const invitationLink = `${baseUrl}/beta/join?token=${invitationToken}`;

    // Format the expiration date
    const formattedExpirationDate = expirationDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Replace template variables
    let html = template
      .replace(/{{name}}/g, name)
      .replace(/{{invitationLink}}/g, invitationLink)
      .replace(/{{expirationDate}}/g, formattedExpirationDate);

    // Add custom message if provided
    if (customMessage) {
      html = html.replace(
        /<p>We're excited to invite you/,
        `<p>${customMessage}</p><p>We're excited to invite you`
      );
    }

    // Send the email
    const { data, error } = await resend.emails.send({
      from: `Fluid Calendar <${
        process.env.RESEND_FROM_EMAIL || "noreply@fluidcalendar.com"
      }>`,
      to: email,
      subject: "You're Invited to Join Fluid Calendar Beta!",
      html,
    });

    if (error) {
      throw new Error(error.message);
    }

    logger.info(
      "Sent invitation email",
      { email, messageId: data?.id || "unknown" },
      LOG_SOURCE
    );

    return { success: true, messageId: data?.id };
  } catch (error) {
    logger.error(
      "Failed to send invitation email",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        email,
      },
      LOG_SOURCE
    );

    throw error;
  }
}

/**
 * Default invitation email template
 */
function getDefaultInvitationTemplate(): string {
  return `
<h1>You're Invited to Join Fluid Calendar Beta!</h1>
<p>Hi {{name}},</p>
<p>We're excited to invite you to join the Fluid Calendar beta program! Your spot is now available.</p>
<p>Click the button below to create your account and start using Fluid Calendar:</p>
<a href="{{invitationLink}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Join the Beta</a>
<p>This invitation will expire on {{expirationDate}}.</p>
<p>Thank you for your interest in Fluid Calendar!</p>
  `;
}

export interface ReferralMilestoneEmailProps {
  email: string;
  name: string;
  referralCode: string;
  referralCount: number;
  notificationType: "NEW_REFERRAL" | "MILESTONE" | "POSITION_IMPROVEMENT";
  referredName?: string;
  referredEmail?: string;
  milestoneCount?: number;
  currentPosition?: number;
  positionImprovement?: number;
  referralTemplate?: string;
}

/**
 * Sends a referral milestone notification email
 */
export async function sendReferralMilestoneEmail({
  email,
  name,
  referralCode,
  referralCount,
  notificationType,
  referredName,
  referredEmail,
  milestoneCount,
  currentPosition,
  positionImprovement,
  referralTemplate,
}: ReferralMilestoneEmailProps) {
  try {
    // Use the template from the database or fall back to the default template
    const template =
      referralTemplate || getDefaultReferralTemplate(notificationType);

    // Generate the referral and status links
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const referralLink = `${baseUrl}/beta?ref=${referralCode}`;
    const statusLink = `${baseUrl}/beta/status?email=${encodeURIComponent(
      email
    )}`;

    // Replace common template variables
    let html = template
      .replace(/{{name}}/g, name)
      .replace(/{{referralCount}}/g, referralCount.toString())
      .replace(/{{referralLink}}/g, referralLink)
      .replace(/{{statusLink}}/g, statusLink);

    // Replace notification-specific variables
    switch (notificationType) {
      case "NEW_REFERRAL":
        html = html
          .replace(/{{referredName}}/g, referredName || "Someone")
          .replace(/{{referredEmail}}/g, referredEmail || "");
        break;
      case "MILESTONE":
        html = html.replace(
          /{{milestoneCount}}/g,
          milestoneCount?.toString() || ""
        );
        break;
      case "POSITION_IMPROVEMENT":
        html = html
          .replace(/{{currentPosition}}/g, currentPosition?.toString() || "")
          .replace(
            /{{positionImprovement}}/g,
            positionImprovement?.toString() || ""
          );
        break;
    }

    // Send the email
    const { data, error } = await resend.emails.send({
      from: `Fluid Calendar <${
        process.env.RESEND_FROM_EMAIL || "noreply@fluidcalendar.com"
      }>`,
      to: email,
      subject: getReferralEmailSubject(notificationType),
      html,
    });

    if (error) {
      throw new Error(error.message);
    }

    logger.info(
      "Sent referral milestone email",
      {
        email,
        messageId: data?.id || "unknown",
        notificationType,
      },
      LOG_SOURCE
    );

    return { success: true, messageId: data?.id };
  } catch (error) {
    logger.error(
      "Failed to send referral milestone email",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        email,
        notificationType,
      },
      LOG_SOURCE
    );

    throw error;
  }
}

/**
 * Get the appropriate subject line for the referral email
 */
function getReferralEmailSubject(
  notificationType: "NEW_REFERRAL" | "MILESTONE" | "POSITION_IMPROVEMENT"
): string {
  switch (notificationType) {
    case "NEW_REFERRAL":
      return "Someone joined Fluid Calendar using your referral!";
    case "MILESTONE":
      return "You've reached a referral milestone for Fluid Calendar!";
    case "POSITION_IMPROVEMENT":
      return "Your position in the Fluid Calendar waitlist has improved!";
    default:
      return "Fluid Calendar Waitlist Update";
  }
}

/**
 * Get the default template for the referral notification email
 */
function getDefaultReferralTemplate(
  notificationType: "NEW_REFERRAL" | "MILESTONE" | "POSITION_IMPROVEMENT"
): string {
  switch (notificationType) {
    case "NEW_REFERRAL":
      return `
<h1>Someone Joined Using Your Referral!</h1>
<p>Hi {{name}},</p>
<p>Great news! {{referredName}} just joined the Fluid Calendar waitlist using your referral link.</p>
<p>You now have {{referralCount}} referral(s), which helps improve your position in the queue!</p>
<p>Keep sharing your referral link to move up even faster:</p>
<p><strong>{{referralLink}}</strong></p>
<p>Check your current status anytime:</p>
<a href="{{statusLink}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Check Status</a>
<p>Thank you for spreading the word about Fluid Calendar!</p>
      `;

    case "MILESTONE":
      return `
<h1>Referral Milestone Reached!</h1>
<p>Hi {{name}},</p>
<p>Congratulations! You've reached {{milestoneCount}} referrals for Fluid Calendar.</p>
<p>This is a significant milestone that has greatly improved your position in the waitlist.</p>
<p>Keep sharing your referral link to move up even faster:</p>
<p><strong>{{referralLink}}</strong></p>
<p>Check your current status anytime:</p>
<a href="{{statusLink}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Check Status</a>
<p>Thank you for your continued support of Fluid Calendar!</p>
      `;

    case "POSITION_IMPROVEMENT":
      return `
<h1>Your Waitlist Position Has Improved!</h1>
<p>Hi {{name}},</p>
<p>Great news! Your position in the Fluid Calendar waitlist has improved by {{positionImprovement}} spots.</p>
<p>Your current position is now {{currentPosition}}.</p>
<p>Keep sharing your referral link to move up even faster:</p>
<p><strong>{{referralLink}}</strong></p>
<p>Check your current status anytime:</p>
<a href="{{statusLink}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Check Status</a>
<p>Thank you for your interest in Fluid Calendar!</p>
      `;

    default:
      return `
<h1>Fluid Calendar Waitlist Update</h1>
<p>Hi {{name}},</p>
<p>We have an update about your position in the Fluid Calendar waitlist.</p>
<p>You currently have {{referralCount}} referrals.</p>
<p>Keep sharing your referral link to move up even faster:</p>
<p><strong>{{referralLink}}</strong></p>
<p>Check your current status anytime:</p>
<a href="{{statusLink}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Check Status</a>
<p>Thank you for your interest in Fluid Calendar!</p>
      `;
  }
}

export interface ReminderEmailProps {
  email: string;
  name: string;
  invitationToken: string;
  expirationDate: Date;
  reminderTemplate?: string;
}

/**
 * Sends a reminder email to a user who has been invited but hasn't registered
 */
export async function sendReminderEmail({
  email,
  name,
  invitationToken,
  expirationDate,
  reminderTemplate,
}: ReminderEmailProps) {
  try {
    // Use the template from the database or fall back to the default template
    const template = reminderTemplate || getDefaultReminderTemplate();

    // Generate the invitation link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const invitationLink = `${baseUrl}/beta/join?token=${invitationToken}`;

    // Format the expiration date
    const formattedExpirationDate = expirationDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Replace template variables
    const html = template
      .replace(/{{name}}/g, name)
      .replace(/{{invitationLink}}/g, invitationLink)
      .replace(/{{expirationDate}}/g, formattedExpirationDate);

    // Send the email
    const { data, error } = await resend.emails.send({
      from: `Fluid Calendar <${
        process.env.RESEND_FROM_EMAIL || "noreply@fluidcalendar.com"
      }>`,
      to: email,
      subject: "Reminder: Your Fluid Calendar Beta Invitation",
      html,
    });

    if (error) {
      throw new Error(error.message);
    }

    logger.info(
      "Sent reminder email",
      { email, messageId: data?.id || "unknown" },
      LOG_SOURCE
    );

    return { success: true, messageId: data?.id };
  } catch (error) {
    logger.error(
      "Failed to send reminder email",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        email,
      },
      LOG_SOURCE
    );

    throw error;
  }
}

/**
 * Default reminder email template
 */
function getDefaultReminderTemplate(): string {
  return `
<h1>Reminder: Your Fluid Calendar Beta Invitation</h1>
<p>Hi {{name}},</p>
<p>This is a friendly reminder that you've been invited to join the Fluid Calendar beta program!</p>
<p>Your invitation is still active, but will expire on {{expirationDate}}.</p>
<p>Click the button below to create your account and start using Fluid Calendar:</p>
<a href="{{invitationLink}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Join the Beta</a>
<p>We're excited to have you try out Fluid Calendar!</p>
  `;
}
