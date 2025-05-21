import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import { Meeting } from "../utils/meeting-utils";
import { Task } from "../utils/task-utils";

/**
 * Generate the HTML for a daily summary email
 * @param userName The user's name
 * @param date The date for the summary
 * @param meetings The user's meetings for the day
 * @param tasks The user's top tasks
 * @returns HTML string for the email
 */
export function generateDailySummaryHtml(
  userName: string,
  date: Date,
  meetings: Meeting[],
  tasks: Task[]
): string {
  const formattedDate = format(date, "EEEE, MMMM do, yyyy");
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://fluidcalendar.com";

  // Default timezone to UTC if not specified in the first meeting
  const userTimezone =
    meetings.length > 0 && meetings[0].timezone ? meetings[0].timezone : "UTC";

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Daily Summary</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #4f46e5;
            margin-bottom: 10px;
          }
          .header p {
            color: #6b7280;
            font-size: 18px;
          }
          .section {
            margin-bottom: 30px;
            padding: 20px;
            border-radius: 8px;
            background-color: #f9fafb;
          }
          .section h2 {
            color: #4f46e5;
            margin-top: 0;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 10px;
          }
          .meeting {
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid #e5e7eb;
          }
          .meeting:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
          }
          .meeting-time {
            font-weight: bold;
            color: #4b5563;
          }
          .meeting-title {
            font-size: 16px;
            font-weight: bold;
            margin: 5px 0;
          }
          .meeting-location {
            color: #6b7280;
            font-size: 14px;
          }
          .task {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid #e5e7eb;
          }
          .task:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
          }
          .task-priority {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 10px;
            flex-shrink: 0;
          }
          .priority-HIGH {
            background-color: #ef4444;
          }
          .priority-MEDIUM {
            background-color: #f59e0b;
          }
          .priority-LOW {
            background-color: #10b981;
          }
          .task-details {
            flex-grow: 1;
          }
          .task-title {
            font-weight: bold;
            margin: 0;
          }
          .task-due {
            color: #6b7280;
            font-size: 14px;
            margin: 5px 0 0 0;
          }
          .footer {
            text-align: center;
            color: #6b7280;
            font-size: 14px;
            margin-top: 30px;
          }
          .cta-button {
            display: inline-block;
            background-color: #4f46e5;
            color: #ffffff !important;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 5px;
            font-weight: bold;
            margin-top: 10px;
          }
          .no-items {
            color: #6b7280;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Your Daily Summary</h1>
          <p>${formattedDate}</p>
        </div>
        
        <div class="section">
          <h2>Today&apos;s Meetings</h2>
          ${
            meetings.length > 0
              ? meetings
                  .map(
                    (meeting) => `
            <div class="meeting">
              <div class="meeting-time">
                ${
                  meeting.isAllDay
                    ? "All day"
                    : `${formatInTimeZone(meeting.startTime, userTimezone, "h:mm a")} - ${formatInTimeZone(
                        meeting.endTime,
                        userTimezone,
                        "h:mm a"
                      )}`
                }
              </div>
              <div class="meeting-title">${meeting.title}</div>
              ${
                meeting.location
                  ? `<div class="meeting-location">📍 ${meeting.location}</div>`
                  : ""
              }
              ${
                meeting.calendarName
                  ? `<div class="meeting-calendar">📅 ${meeting.calendarName}</div>`
                  : ""
              }
            </div>
          `
                  )
                  .join("")
              : '<p class="no-items">No meetings scheduled for today.</p>'
          }
        </div>
        
        <div class="section">
          <h2>Top Tasks</h2>
          ${
            tasks.length > 0
              ? tasks
                  .map(
                    (task) => `
            <div class="task">
              <div class="task-priority priority-${task.priority}"></div>
              <div class="task-details">
                <p class="task-title">${task.title}</p>
                ${
                  task.dueDate
                    ? `<p class="task-due">Due: ${format(
                        task.dueDate,
                        "MMM d, yyyy"
                      )}</p>`
                    : ""
                }
                ${
                  task.projectName
                    ? `<p class="task-project">Project: ${task.projectName}</p>`
                    : ""
                }
              </div>
            </div>
          `
                  )
                  .join("")
              : '<p class="no-items">No priority tasks for today.</p>'
          }
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${baseUrl}" class="cta-button">Open FluidCalendar</a>
        </div>
        
        <div class="footer">
          <p>This email was sent to you as part of your FluidCalendar subscription.</p>
          <p>To unsubscribe from daily emails, visit Settings > Notifications in FluidCalendar.</p>
          <p>© ${new Date().getFullYear()} FluidCalendar. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate the plain text version of the daily summary email
 * @param userName The user's name
 * @param date The date for the summary
 * @param meetings The user's meetings for the day
 * @param tasks The user's top tasks
 * @returns Plain text string for the email
 */
export function generateDailySummaryText(
  userName: string,
  date: Date,
  meetings: Meeting[],
  tasks: Task[]
): string {
  const formattedDate = format(date, "EEEE, MMMM do, yyyy");
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://fluidcalendar.com";

  // Default timezone to UTC if not specified in the first meeting
  const userTimezone =
    meetings.length > 0 && meetings[0].timezone ? meetings[0].timezone : "UTC";

  let text = `YOUR DAILY SUMMARY - ${formattedDate}\n\n`;

  // Meetings section
  text += `TODAY'S MEETINGS:\n`;
  text += `=================\n\n`;

  if (meetings.length > 0) {
    meetings.forEach((meeting) => {
      const time = meeting.isAllDay
        ? "All day"
        : `${formatInTimeZone(meeting.startTime, userTimezone, "h:mm a")} - ${formatInTimeZone(
            meeting.endTime,
            userTimezone,
            "h:mm a"
          )}`;

      text += `${time}\n`;
      text += `${meeting.title}\n`;

      if (meeting.location) {
        text += `Location: ${meeting.location}\n`;
      }

      if (meeting.calendarName) {
        text += `Calendar: ${meeting.calendarName}\n`;
      }

      text += `\n`;
    });
  } else {
    text += `No meetings scheduled for today.\n\n`;
  }

  // Tasks section
  text += `TOP TASKS:\n`;
  text += `==========\n\n`;

  if (tasks.length > 0) {
    tasks.forEach((task) => {
      const priority = {
        HIGH: "!!!",
        MEDIUM: "!!",
        LOW: "!",
      }[task.priority];

      text += `${priority} ${task.title}\n`;

      if (task.dueDate) {
        text += `Due: ${format(task.dueDate, "MMM d, yyyy")}\n`;
      }

      if (task.projectName) {
        text += `Project: ${task.projectName}\n`;
      }

      text += `\n`;
    });
  } else {
    text += `No priority tasks for today.\n\n`;
  }

  text += `Visit your dashboard: ${baseUrl}\n\n`;
  text += `This email was sent to you as part of your FluidCalendar subscription.\n`;
  text += `To unsubscribe from daily emails, visit Settings > Notifications in FluidCalendar.\n`;
  text += `© ${new Date().getFullYear()} FluidCalendar. All rights reserved.`;

  return text;
}
