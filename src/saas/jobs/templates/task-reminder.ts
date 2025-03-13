import { format } from "@/lib/date-utils";

/**
 * Interface for task data needed in reminder templates
 */
export interface TaskReminderData {
  id: string;
  title: string;
  dueDate?: Date | null;
  priority?: string | null;
  description?: string | null;
  project?: {
    name?: string;
  } | null;
}

/**
 * Generate the HTML for a task reminder email
 * @param userName The user's name
 * @param task The task details
 * @returns HTML string for the email
 */
export function generateTaskReminderHtml(
  userName: string,
  task: TaskReminderData
): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://fluidcalendar.com";
  const taskUrl = `${baseUrl}/tasks/${task.id}`;
  const dueDate = task.dueDate
    ? format(task.dueDate, "MMMM d, yyyy")
    : "No due date";
  const priority = task.priority
    ? task.priority.charAt(0).toUpperCase() +
      task.priority.slice(1).toLowerCase()
    : "None";

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Reminder</title>
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
          .task-card {
            background-color: #f9fafb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            border-left: 4px solid #4f46e5;
          }
          .task-title {
            font-size: 20px;
            font-weight: bold;
            margin-top: 0;
            margin-bottom: 10px;
          }
          .task-details {
            margin-bottom: 20px;
          }
          .task-detail {
            display: flex;
            margin-bottom: 5px;
          }
          .detail-label {
            font-weight: bold;
            width: 100px;
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
          .footer {
            text-align: center;
            color: #6b7280;
            font-size: 14px;
            margin-top: 30px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Task Reminder</h1>
          <p>Hi ${userName},</p>
          <p>This is a reminder about your task:</p>
        </div>
        
        <div class="task-card">
          <h2 class="task-title">${task.title}</h2>
          
          <div class="task-details">
            <div class="task-detail">
              <span class="detail-label">Due Date:</span>
              <span>${dueDate}</span>
            </div>
            
            <div class="task-detail">
              <span class="detail-label">Priority:</span>
              <span>${priority}</span>
            </div>
            
            ${
              task.project?.name
                ? `
            <div class="task-detail">
              <span class="detail-label">Project:</span>
              <span>${task.project.name}</span>
            </div>
            `
                : ""
            }
            
            ${
              task.description
                ? `
            <div class="task-detail">
              <span class="detail-label">Description:</span>
              <span>${task.description}</span>
            </div>
            `
                : ""
            }
          </div>
          
          <a href="${taskUrl}" class="cta-button">View Task</a>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${baseUrl}" class="cta-button">Open Fluid Calendar</a>
        </div>
        
        <div class="footer">
          <p>This email was sent to you as part of your Fluid Calendar subscription.</p>
          <p>© ${new Date().getFullYear()} Fluid Calendar. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate the plain text version of the task reminder email
 * @param userName The user's name
 * @param task The task details
 * @returns Plain text string for the email
 */
export function generateTaskReminderText(
  userName: string,
  task: TaskReminderData
): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://fluidcalendar.com";
  const taskUrl = `${baseUrl}/tasks/${task.id}`;
  const dueDate = task.dueDate
    ? format(task.dueDate, "MMMM d, yyyy")
    : "No due date";
  const priority = task.priority
    ? task.priority.charAt(0).toUpperCase() +
      task.priority.slice(1).toLowerCase()
    : "None";

  return `
TASK REMINDER

Hi ${userName},

This is a reminder about your task:

${task.title}

Due Date: ${dueDate}
Priority: ${priority}
${task.project?.name ? `Project: ${task.project.name}` : ""}
${task.description ? `\nDescription: ${task.description}` : ""}

View your task: ${taskUrl}

Visit your dashboard: ${baseUrl}

This email was sent to you as part of your Fluid Calendar subscription.
© ${new Date().getFullYear()} Fluid Calendar. All rights reserved.
  `;
}
