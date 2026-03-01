import { generateUnsubscribeToken } from "../../api/waitlist/unsubscribe/route";

import { prisma } from "@/lib/prisma";

import { logger } from "@/lib/logger";

import { EmailService } from "./email-service";
import { getResend } from "@saas/email/resend";

const LOG_SOURCE = "WaitlistEmail";

/**
 * Utility function to delay execution
 * @param ms Milliseconds to delay
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

    // Send the email using the queue
    const { jobId } = await EmailService.sendEmail({
      from: EmailService.formatSender("FluidCalendar"),
      to: email,
      subject: "Welcome to the FluidCalendar Beta Waitlist",
      html,
    });

    // Send notification to admin
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      try {
        await EmailService.sendEmail({
          from: EmailService.formatSender("FluidCalendar"),
          to: adminEmail,
          subject: "New Waitlist Signup",
          html: `
            <div>
              <h2>New Waitlist Signup</h2>
              <p>A new user has signed up for the waitlist:</p>
              <ul>
                <li><strong>Name:</strong> ${name}</li>
                <li><strong>Email:</strong> ${email}</li>
                <li><strong>Position:</strong> ${position}</li>
                <li><strong>Referral Code:</strong> ${referralCode}</li>
              </ul>
            </div>
          `,
        });

        logger.info(
          "Queued admin notification for waitlist signup",
          { email: adminEmail },
          LOG_SOURCE
        );
      } catch (adminNotificationError) {
        // Log the error but don't fail the main function
        logger.warn(
          "Failed to queue admin notification for waitlist signup",
          {
            error:
              adminNotificationError instanceof Error
                ? adminNotificationError.message
                : "Unknown error",
            email: adminEmail,
          },
          LOG_SOURCE
        );
      }
    }

    logger.info(
      "Queued waitlist confirmation email",
      { email, jobId },
      LOG_SOURCE
    );

    return { success: true, jobId };
  } catch (error) {
    logger.error(
      "Failed to queue waitlist confirmation email",
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
<h1>You're on the FluidCalendar Waitlist!</h1>
<p>Hi {{name}},</p>
<p>Thank you for joining the FluidCalendar waitlist! We'll notify you when your spot is available.</p>
<p>Your current position: {{position}}</p>
<p>Want to move up the list? Share your referral link with friends:</p>
<p><strong>{{referralLink}}</strong></p>
<p>Each person who joins using your link will help you move up in the queue!</p>
<p>Check your current status anytime:</p>
<a href="{{statusLink}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Check Status</a>
<p>Thank you for your interest in FluidCalendar!</p>
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

    // Send the email using the queue
    const { jobId } = await EmailService.sendEmail({
      from: EmailService.formatSender("FluidCalendar"),
      to: email,
      subject: "You're Invited to Join FluidCalendar Beta!",
      html,
    });

    logger.info("Queued invitation email", { email, jobId }, LOG_SOURCE);

    return { success: true, jobId };
  } catch (error) {
    logger.error(
      "Failed to queue invitation email",
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
<h1>You're Invited to Join FluidCalendar Beta!</h1>
<p>Hi {{name}},</p>
<p>We're excited to invite you to join the FluidCalendar beta program! Your spot is now available.</p>
<p>Click the button below to create your account and start using FluidCalendar:</p>
<a href="{{invitationLink}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Join the Beta</a>
<p>This invitation will expire on {{expirationDate}}.</p>
<p>Thank you for your interest in FluidCalendar!</p>
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
    // If this is a position improvement notification, check if the user has opted out
    if (notificationType === "POSITION_IMPROVEMENT") {
      const waitlistEntry = await prisma.waitlist.findUnique({
        where: { email },
        select: { queueNotificationsEnabled: true },
      });

      if (!waitlistEntry?.queueNotificationsEnabled) {
        logger.info(
          "Skipping position improvement notification for opted-out user",
          { email },
          LOG_SOURCE
        );
        return { success: true, skipped: true };
      }
    }

    // Use the template from the database or fall back to the default template
    const template =
      referralTemplate || getDefaultReferralTemplate(notificationType);

    // Generate the referral and status links
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const referralLink = `${baseUrl}/beta?ref=${referralCode}`;
    const statusLink = `${baseUrl}/beta/status?email=${encodeURIComponent(
      email
    )}`;

    // Generate unsubscribe link for position improvement notifications
    const unsubscribeToken = generateUnsubscribeToken(email);
    const unsubscribeLink = `${baseUrl}/api/waitlist/unsubscribe?email=${encodeURIComponent(
      email
    )}&token=${unsubscribeToken}`;

    // Replace common template variables
    let html = template
      .replace(/{{name}}/g, name)
      .replace(/{{referralCount}}/g, referralCount.toString())
      .replace(/{{referralLink}}/g, referralLink)
      .replace(/{{statusLink}}/g, statusLink)
      .replace(/{{unsubscribeLink}}/g, unsubscribeLink);

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

    // Send the email using the queue
    const { jobId } = await EmailService.sendEmail({
      from: EmailService.formatSender("FluidCalendar"),
      to: email,
      subject: getReferralEmailSubject(notificationType),
      html,
    });

    logger.info(
      "Queued referral milestone email",
      {
        email,
        jobId,
        notificationType,
      },
      LOG_SOURCE
    );

    return { success: true, jobId };
  } catch (error) {
    logger.error(
      "Failed to queue referral milestone email",
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
      return "Someone joined FluidCalendar using your referral!";
    case "MILESTONE":
      return "You've reached a referral milestone for FluidCalendar!";
    case "POSITION_IMPROVEMENT":
      return "Your position in the FluidCalendar waitlist has improved!";
    default:
      return "FluidCalendar Waitlist Update";
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
<p>Great news! {{referredName}} just joined the FluidCalendar waitlist using your referral link.</p>
<p>You now have {{referralCount}} referral(s), which helps improve your position in the queue!</p>
<p>Keep sharing your referral link to move up even faster:</p>
<p><strong>{{referralLink}}</strong></p>
<p>Check your current status anytime:</p>
<a href="{{statusLink}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Check Status</a>
<p>Thank you for spreading the word about FluidCalendar!</p>
      `;

    case "MILESTONE":
      return `
<h1>Referral Milestone Reached!</h1>
<p>Hi {{name}},</p>
<p>Congratulations! You've reached {{milestoneCount}} referrals for FluidCalendar.</p>
<p>This is a significant milestone that has greatly improved your position in the waitlist.</p>
<p>Keep sharing your referral link to move up even faster:</p>
<p><strong>{{referralLink}}</strong></p>
<p>Check your current status anytime:</p>
<a href="{{statusLink}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Check Status</a>
<p>Thank you for your continued support of FluidCalendar!</p>
      `;

    case "POSITION_IMPROVEMENT":
      return `
<h1>Your Waitlist Position Has Improved!</h1>
<p>Hi {{name}},</p>
<p>Great news! Your position in the FluidCalendar waitlist has improved by {{positionImprovement}} spots.</p>
<p>Your current position is now {{currentPosition}}.</p>
<p>Keep sharing your referral link to move up even faster:</p>
<p><strong>{{referralLink}}</strong></p>
<p>Check your current status anytime:</p>
<a href="{{statusLink}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Check Status</a>
<p>Thank you for your interest in FluidCalendar!</p>
<p style="margin-top: 32px; font-size: 12px; color: #6B7280;">
  Don't want to receive position update notifications? <a href="{{unsubscribeLink}}" style="color: #4F46E5; text-decoration: underline;">Click here to unsubscribe</a>
</p>
      `;

    default:
      return `
<h1>FluidCalendar Waitlist Update</h1>
<p>Hi {{name}},</p>
<p>We have an update about your position in the FluidCalendar waitlist.</p>
<p>You currently have {{referralCount}} referrals.</p>
<p>Keep sharing your referral link to move up even faster:</p>
<p><strong>{{referralLink}}</strong></p>
<p>Check your current status anytime:</p>
<a href="{{statusLink}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Check Status</a>
<p>Thank you for your interest in FluidCalendar!</p>
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

    // Send the email using the queue
    const { jobId } = await EmailService.sendEmail({
      from: EmailService.formatSender("FluidCalendar"),
      to: email,
      subject: "Reminder: Your FluidCalendar Beta Invitation",
      html,
    });

    logger.info("Queued reminder email", { email, jobId }, LOG_SOURCE);

    return { success: true, jobId };
  } catch (error) {
    logger.error(
      "Failed to queue reminder email",
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
<h1>Reminder: Your FluidCalendar Beta Invitation</h1>
<p>Hi {{name}},</p>
<p>This is a friendly reminder that you've been invited to join the FluidCalendar beta program!</p>
<p>Your invitation is still active, but will expire on {{expirationDate}}.</p>
<p>Click the button below to create your account and start using FluidCalendar:</p>
<a href="{{invitationLink}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Join the Beta</a>
<p>We're excited to have you try out FluidCalendar!</p>
  `;
}

export interface VerificationEmailProps {
  email: string;
  name: string;
  verificationToken: string;
  expirationDate: Date;
}

/**
 * Sends a verification email to a user who signed up for the waitlist
 */
export async function sendVerificationEmail({
  email,
  name,
  verificationToken,
  expirationDate,
}: VerificationEmailProps) {
  try {
    // Generate the verification link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verificationLink = `${baseUrl}/beta/verify?token=${verificationToken}`;

    // Format the expiration date
    const formattedExpirationDate = expirationDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Create HTML email content
    const html = `
      <h1>Verify Your Email for FluidCalendar Waitlist</h1>
      <p>Hi ${name},</p>
      <p>Thanks for signing up for the FluidCalendar waitlist! Please verify your email address to complete your registration.</p>
      <p>Click the button below to verify your email:</p>
      <a href="${verificationLink}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Verify Email</a>
      <p>This verification link will expire on ${formattedExpirationDate}.</p>
      <p>If you didn't sign up for the FluidCalendar waitlist, you can safely ignore this email.</p>
    `;

    // Send the email using the queue
    const { jobId } = await EmailService.sendEmail({
      from: EmailService.formatSender("FluidCalendar"),
      to: email,
      subject: "Verify Your Email for FluidCalendar Waitlist",
      html,
    });

    logger.info("Queued verification email", { email, jobId }, LOG_SOURCE);

    return { success: true, jobId };
  } catch (error) {
    logger.error(
      "Failed to queue verification email",
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
 * Adds a contact to the Resend audience and sends a waitlist confirmation email
 */
export async function addToAudienceAndsendWaitlistConfirmationEmail(props: {
  email: string;
  name: string;
  referralCode: string;
  position: number;
  waitlistTemplate?: string;
}) {
  const { email, name, referralCode, position, waitlistTemplate } = props;

  try {
    // Create contact in Resend audience
    try {
      const resend = await getResend();
      await resend.contacts.create({
        email,
        firstName: name || undefined,
        unsubscribed: false,
        audienceId:
          process.env.RESEND_AUDIENCE_ID ||
          "5eeff6c8-df9f-4dfe-9fb2-e93130d93686",
      });

      // Add delay after Resend API call to avoid rate limiting
      await delay(1000);

      logger.info("Added contact to Resend audience", { email }, LOG_SOURCE);
    } catch (contactError) {
      // Log but continue if contact creation fails
      logger.error(
        "Failed to add contact to Resend audience",
        {
          error:
            contactError instanceof Error
              ? contactError.message
              : "Unknown error",
          email,
        },
        LOG_SOURCE
      );
    }

    // Send the waitlist confirmation email
    await sendWaitlistConfirmationEmail({
      email,
      name,
      referralCode,
      position,
      waitlistTemplate,
    });

    return { success: true };
  } catch (error) {
    logger.error(
      "Error adding to audience and sending waitlist confirmation email",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    throw error;
  }
}
