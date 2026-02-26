import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

import { getResend } from "@/lib/email/resend";
import { logger } from "@/lib/logger";
import { generateIcsFile } from "@/lib/booking/ics";

const LOG_SOURCE = "BookingEmails";
const FROM_EMAIL = "FluidCalendar <noreply@fluidcalendar.com>";

interface GuestConfirmationData {
  guestEmail: string;
  guestName: string;
  hostName: string;
  meetingTitle: string;
  startTime: Date;
  endTime: Date;
  guestTimezone: string;
  videoLink: string | null;
  cancelToken: string;
  bookingId: string;
}

interface HostNotificationData {
  hostEmail: string;
  hostName: string;
  guestName: string;
  guestEmail: string;
  guestNotes: string | null;
  meetingTitle: string;
  startTime: Date;
  endTime: Date;
  videoLink: string | null;
}

interface GuestCancellationData {
  guestEmail: string;
  guestName: string;
  hostName: string;
  meetingTitle: string;
  startTime: Date;
  reason?: string;
}

interface HostCancellationData {
  hostEmail: string;
  hostName: string;
  guestName: string;
  guestEmail: string;
  meetingTitle: string;
  startTime: Date;
}

interface GuestRescheduleData {
  guestEmail: string;
  guestName: string;
  hostName: string;
  meetingTitle: string;
  oldStartTime: Date;
  oldEndTime: Date;
  newStartTime: Date;
  newEndTime: Date;
  guestTimezone: string;
  videoLink: string | null;
  cancelToken: string;
  bookingId: string;
  rescheduledBy: "host" | "guest";
}

interface HostRescheduleData {
  hostEmail: string;
  hostName: string;
  guestName: string;
  guestEmail: string;
  meetingTitle: string;
  oldStartTime: Date;
  newStartTime: Date;
  newEndTime: Date;
  videoLink: string | null;
}

/**
 * Send booking confirmation email to guest
 */
export async function sendBookingConfirmationToGuest(
  data: GuestConfirmationData
): Promise<void> {
  try {
    const resend = await getResend();

    // Format times in guest timezone
    const guestStart = toZonedTime(data.startTime, data.guestTimezone);
    const guestEnd = toZonedTime(data.endTime, data.guestTimezone);

    const formattedDate = format(guestStart, "EEEE, MMMM d, yyyy");
    const formattedTime = `${format(guestStart, "h:mm a")} - ${format(guestEnd, "h:mm a")}`;

    // Generate ICS file
    const icsContent = generateIcsFile({
      title: data.meetingTitle,
      description: `Meeting with ${data.hostName}`,
      startTime: data.startTime,
      endTime: data.endTime,
      location: data.videoLink || undefined,
      organizerName: data.hostName,
    });

    // Build manage URL
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const manageUrl = `${baseUrl}/book/manage/${data.bookingId}?token=${data.cancelToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Booking Confirmed!</h1>

        <p>Hi ${data.guestName},</p>

        <p>Your meeting has been scheduled with ${data.hostName}.</p>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0; color: #333;">${data.meetingTitle}</h2>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${formattedTime} (${data.guestTimezone})</p>
          ${data.videoLink ? `<p style="margin: 5px 0;"><strong>Video Link:</strong> <a href="${data.videoLink}">${data.videoLink}</a></p>` : ""}
        </div>

        <p>A calendar invite has been attached to this email.</p>

        <p style="color: #666; font-size: 14px;">
          Need to make changes? <a href="${manageUrl}">Manage your booking</a>
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

        <p style="color: #999; font-size: 12px;">
          This meeting was scheduled via FluidCalendar.
        </p>
      </div>
    `;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.guestEmail,
      subject: `Confirmed: ${data.meetingTitle} with ${data.hostName}`,
      html,
      attachments: [
        {
          filename: "invite.ics",
          content: Buffer.from(icsContent).toString("base64"),
        },
      ],
    });

    logger.info(
      "Sent booking confirmation email to guest",
      { guestEmail: data.guestEmail },
      LOG_SOURCE
    );
  } catch (error) {
    logger.error(
      "Failed to send booking confirmation email to guest",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    throw error;
  }
}

/**
 * Send booking notification email to host
 */
export async function sendBookingNotificationToHost(
  data: HostNotificationData
): Promise<void> {
  try {
    const resend = await getResend();

    const formattedDate = format(data.startTime, "EEEE, MMMM d, yyyy");
    const formattedTime = `${format(data.startTime, "h:mm a")} - ${format(data.endTime, "h:mm a")} UTC`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">New Booking!</h1>

        <p>Hi ${data.hostName},</p>

        <p>You have a new meeting scheduled.</p>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0; color: #333;">${data.meetingTitle}</h2>
          <p style="margin: 5px 0;"><strong>Guest:</strong> ${data.guestName} (${data.guestEmail})</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${formattedTime}</p>
          ${data.videoLink ? `<p style="margin: 5px 0;"><strong>Video Link:</strong> <a href="${data.videoLink}">${data.videoLink}</a></p>` : ""}
          ${data.guestNotes ? `<p style="margin: 15px 0 5px 0;"><strong>Notes from guest:</strong></p><p style="margin: 5px 0; padding: 10px; background: #fff; border-radius: 4px;">${data.guestNotes}</p>` : ""}
        </div>

        <p>The meeting has been added to your calendar.</p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

        <p style="color: #999; font-size: 12px;">
          This meeting was scheduled via FluidCalendar.
        </p>
      </div>
    `;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.hostEmail,
      subject: `New booking: ${data.meetingTitle} with ${data.guestName}`,
      html,
    });

    logger.info(
      "Sent booking notification email to host",
      { hostEmail: data.hostEmail },
      LOG_SOURCE
    );
  } catch (error) {
    logger.error(
      "Failed to send booking notification email to host",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    throw error;
  }
}

/**
 * Send cancellation email to guest
 */
export async function sendCancellationEmailToGuest(
  data: GuestCancellationData
): Promise<void> {
  try {
    const resend = await getResend();

    const formattedDate = format(data.startTime, "EEEE, MMMM d, yyyy 'at' h:mm a");

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Meeting Cancelled</h1>

        <p>Hi ${data.guestName},</p>

        <p>Your meeting "${data.meetingTitle}" with ${data.hostName} scheduled for ${formattedDate} has been cancelled.</p>

        ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ""}

        <p>If you'd like to reschedule, please visit the booking link again.</p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

        <p style="color: #999; font-size: 12px;">
          This notification was sent via FluidCalendar.
        </p>
      </div>
    `;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.guestEmail,
      subject: `Cancelled: ${data.meetingTitle} with ${data.hostName}`,
      html,
    });

    logger.info(
      "Sent cancellation email to guest",
      { guestEmail: data.guestEmail },
      LOG_SOURCE
    );
  } catch (error) {
    logger.error(
      "Failed to send cancellation email to guest",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    throw error;
  }
}

/**
 * Send cancellation email to host
 */
export async function sendCancellationEmailToHost(
  data: HostCancellationData
): Promise<void> {
  try {
    const resend = await getResend();

    const formattedDate = format(data.startTime, "EEEE, MMMM d, yyyy 'at' h:mm a");

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Meeting Cancelled</h1>

        <p>Hi ${data.hostName},</p>

        <p>${data.guestName} (${data.guestEmail}) has cancelled their meeting.</p>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Meeting:</strong> ${data.meetingTitle}</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
        </div>

        <p>The event has been removed from your calendar.</p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

        <p style="color: #999; font-size: 12px;">
          This notification was sent via FluidCalendar.
        </p>
      </div>
    `;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.hostEmail,
      subject: `Cancelled: ${data.meetingTitle} with ${data.guestName}`,
      html,
    });

    logger.info(
      "Sent cancellation email to host",
      { hostEmail: data.hostEmail },
      LOG_SOURCE
    );
  } catch (error) {
    logger.error(
      "Failed to send cancellation email to host",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    throw error;
  }
}

/**
 * Send reschedule confirmation email to guest
 */
export async function sendRescheduleConfirmationToGuest(
  data: GuestRescheduleData
): Promise<void> {
  try {
    const resend = await getResend();

    // Format times in guest timezone
    const oldStart = toZonedTime(data.oldStartTime, data.guestTimezone);
    const newStart = toZonedTime(data.newStartTime, data.guestTimezone);
    const newEnd = toZonedTime(data.newEndTime, data.guestTimezone);

    const oldFormattedDate = format(oldStart, "EEEE, MMMM d, yyyy 'at' h:mm a");
    const newFormattedDate = format(newStart, "EEEE, MMMM d, yyyy");
    const newFormattedTime = `${format(newStart, "h:mm a")} - ${format(newEnd, "h:mm a")}`;

    // Generate ICS file for new time
    const icsContent = generateIcsFile({
      title: data.meetingTitle,
      description: `Meeting with ${data.hostName}`,
      startTime: data.newStartTime,
      endTime: data.newEndTime,
      location: data.videoLink || undefined,
      organizerName: data.hostName,
    });

    // Build manage URL
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const manageUrl = `${baseUrl}/book/manage/${data.bookingId}?token=${data.cancelToken}`;

    const rescheduledByText = data.rescheduledBy === "host"
      ? `${data.hostName} has rescheduled your meeting.`
      : "Your meeting has been rescheduled.";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Meeting Rescheduled</h1>

        <p>Hi ${data.guestName},</p>

        <p>${rescheduledByText}</p>

        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p style="margin: 0; color: #856404;">
            <strong>Previous time:</strong> <span style="text-decoration: line-through;">${oldFormattedDate}</span>
          </p>
        </div>

        <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h2 style="margin-top: 0; color: #155724;">${data.meetingTitle}</h2>
          <p style="margin: 5px 0; color: #155724;"><strong>New Date:</strong> ${newFormattedDate}</p>
          <p style="margin: 5px 0; color: #155724;"><strong>New Time:</strong> ${newFormattedTime} (${data.guestTimezone})</p>
          ${data.videoLink ? `<p style="margin: 5px 0; color: #155724;"><strong>Video Link:</strong> <a href="${data.videoLink}">${data.videoLink}</a></p>` : ""}
        </div>

        <p>An updated calendar invite has been attached to this email.</p>

        <p style="color: #666; font-size: 14px;">
          Need to make changes? <a href="${manageUrl}">Manage your booking</a>
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

        <p style="color: #999; font-size: 12px;">
          This meeting was scheduled via FluidCalendar.
        </p>
      </div>
    `;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.guestEmail,
      subject: `Rescheduled: ${data.meetingTitle} with ${data.hostName}`,
      html,
      attachments: [
        {
          filename: "invite.ics",
          content: Buffer.from(icsContent).toString("base64"),
        },
      ],
    });

    logger.info(
      "Sent reschedule confirmation email to guest",
      { guestEmail: data.guestEmail },
      LOG_SOURCE
    );
  } catch (error) {
    logger.error(
      "Failed to send reschedule confirmation email to guest",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    throw error;
  }
}

/**
 * Send reschedule notification email to host
 */
export async function sendRescheduleNotificationToHost(
  data: HostRescheduleData
): Promise<void> {
  try {
    const resend = await getResend();

    const oldFormattedDate = format(data.oldStartTime, "EEEE, MMMM d, yyyy 'at' h:mm a");
    const newFormattedDate = format(data.newStartTime, "EEEE, MMMM d, yyyy");
    const newFormattedTime = `${format(data.newStartTime, "h:mm a")} - ${format(data.newEndTime, "h:mm a")} UTC`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Meeting Rescheduled</h1>

        <p>Hi ${data.hostName},</p>

        <p>${data.guestName} (${data.guestEmail}) has rescheduled their meeting.</p>

        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p style="margin: 0; color: #856404;">
            <strong>Previous time:</strong> <span style="text-decoration: line-through;">${oldFormattedDate}</span>
          </p>
        </div>

        <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <p style="margin: 5px 0; color: #155724;"><strong>Meeting:</strong> ${data.meetingTitle}</p>
          <p style="margin: 5px 0; color: #155724;"><strong>New Date:</strong> ${newFormattedDate}</p>
          <p style="margin: 5px 0; color: #155724;"><strong>New Time:</strong> ${newFormattedTime}</p>
          ${data.videoLink ? `<p style="margin: 5px 0; color: #155724;"><strong>Video Link:</strong> <a href="${data.videoLink}">${data.videoLink}</a></p>` : ""}
        </div>

        <p>Your calendar has been updated with the new time.</p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

        <p style="color: #999; font-size: 12px;">
          This notification was sent via FluidCalendar.
        </p>
      </div>
    `;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.hostEmail,
      subject: `Rescheduled: ${data.meetingTitle} with ${data.guestName}`,
      html,
    });

    logger.info(
      "Sent reschedule notification email to host",
      { hostEmail: data.hostEmail },
      LOG_SOURCE
    );
  } catch (error) {
    logger.error(
      "Failed to send reschedule notification email to host",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    throw error;
  }
}
