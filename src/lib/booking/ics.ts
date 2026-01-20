import { format } from "date-fns";

interface IcsEventData {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  organizerName?: string;
  organizerEmail?: string;
}

/**
 * Generate an ICS file content for a calendar event
 */
export function generateIcsFile(data: IcsEventData): string {
  const uid = `${Date.now()}-${Math.random().toString(36).substring(7)}@fluidcalendar.com`;

  const formatIcsDate = (date: Date): string => {
    return format(date, "yyyyMMdd'T'HHmmss'Z'");
  };

  const escapeIcsText = (text: string): string => {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");
  };

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FluidCalendar//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(data.startTime)}`,
    `DTEND:${formatIcsDate(data.endTime)}`,
    `SUMMARY:${escapeIcsText(data.title)}`,
  ];

  if (data.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(data.description)}`);
  }

  if (data.location) {
    lines.push(`LOCATION:${escapeIcsText(data.location)}`);
  }

  if (data.organizerName || data.organizerEmail) {
    const organizer = data.organizerEmail
      ? `ORGANIZER;CN=${escapeIcsText(data.organizerName || "Host")}:mailto:${data.organizerEmail}`
      : `ORGANIZER;CN=${escapeIcsText(data.organizerName || "Host")}:`;
    lines.push(organizer);
  }

  lines.push("STATUS:CONFIRMED");
  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}
