import { ArticleClusterStatus } from "@prisma/client";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import { getClusterStats } from "./seo-generator";

const LOG_SOURCE = "SEOEmail";

interface ArticleGenerationEmailData {
  clusterId: string;
  slug: string;
  title: string;
  status: ArticleClusterStatus;
  wordCount?: number;
  durationMs?: number;
  validationIssues?: string[];
  error?: string;
}

export async function sendArticleGenerationNotification(
  data: ArticleGenerationEmailData,
  generationLogId: string
): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    logger.warn(
      "ADMIN_EMAIL not configured, skipping notification",
      { clusterId: data.clusterId },
      LOG_SOURCE
    );
    return;
  }

  try {
    // Get cluster stats for the email
    const stats = await getClusterStats();

    // Determine email subject based on status
    const statusEmoji = data.status === "published" ? "✅" : data.status === "needs_review" ? "⚠️" : "❌";
    const subject = `${statusEmoji} Article Generation: ${data.title}`;

    // Build email body
    const statusLabel = data.status === "published"
      ? "Published"
      : data.status === "needs_review"
        ? "Needs Review"
        : "Failed";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .stats { background: white; padding: 15px; border-radius: 8px; margin-top: 15px; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center; }
    .stat-item { padding: 10px; }
    .stat-value { font-size: 24px; font-weight: bold; color: #3b82f6; }
    .stat-label { font-size: 12px; color: #6b7280; }
    .success { color: #059669; }
    .warning { color: #d97706; }
    .error { color: #dc2626; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
    .details { margin-top: 15px; padding: 15px; background: white; border-radius: 8px; }
    .detail-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e5e7eb; }
    .issues { margin-top: 15px; padding: 15px; background: #fef3c7; border-radius: 8px; }
    .issues h4 { margin: 0 0 10px 0; color: #92400e; }
    .issues ul { margin: 0; padding-left: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Article Generation ${statusLabel}</h1>
    </div>
    <div class="content">
      <h2>${data.title}</h2>
      <p>
        <strong>Status:</strong>
        <span class="${data.status === 'published' ? 'success' : data.status === 'needs_review' ? 'warning' : 'error'}">
          ${statusLabel}
        </span>
      </p>

      <div class="details">
        <div class="detail-row">
          <span>Slug:</span>
          <span><code>/learn/${data.slug}</code></span>
        </div>
        ${data.wordCount ? `
        <div class="detail-row">
          <span>Word Count:</span>
          <span>${data.wordCount.toLocaleString()} words</span>
        </div>
        ` : ''}
        ${data.durationMs ? `
        <div class="detail-row">
          <span>Generation Time:</span>
          <span>${(data.durationMs / 1000).toFixed(1)}s</span>
        </div>
        ` : ''}
        ${data.error ? `
        <div class="detail-row">
          <span>Error:</span>
          <span class="error">${data.error}</span>
        </div>
        ` : ''}
      </div>

      ${data.validationIssues && data.validationIssues.length > 0 ? `
      <div class="issues">
        <h4>Validation Issues</h4>
        <ul>
          ${data.validationIssues.map(issue => `<li>${issue}</li>`).join('')}
        </ul>
      </div>
      ` : ''}

      <div class="stats">
        <h3 style="margin-top: 0;">Cluster Queue Statistics</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">${stats.pending}</div>
            <div class="stat-label">Pending</div>
          </div>
          <div class="stat-item">
            <div class="stat-value success">${stats.published}</div>
            <div class="stat-label">Published</div>
          </div>
          <div class="stat-item">
            <div class="stat-value warning">${stats.needsReview}</div>
            <div class="stat-label">Needs Review</div>
          </div>
          <div class="stat-item">
            <div class="stat-value error">${stats.failed}</div>
            <div class="stat-label">Failed</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${stats.skipped}</div>
            <div class="stat-label">Skipped</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label">Total</div>
          </div>
        </div>
      </div>

      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.fluidcalendar.com'}/admin/articles" class="button">
        Review Articles
      </a>
    </div>
  </div>
</body>
</html>
`;

    // Try to use the SaaS email service if available
    try {
      // Dynamic import to avoid build issues in open-source version
      const { EmailService } = await import("@/lib/email/email-service.saas");

      await EmailService.sendEmail({
        to: adminEmail,
        subject,
        html: emailHtml,
        from: EmailService.formatSender("FluidCalendar Articles"),
      });

      // Update generation log to mark email as sent
      await prisma.articleGenerationLog.update({
        where: { id: generationLogId },
        data: { emailSent: true },
      });

      logger.info(
        "Article generation notification sent",
        {
          clusterId: data.clusterId,
          status: data.status,
          adminEmail,
        },
        LOG_SOURCE
      );
    } catch {
      // Fallback: try direct Resend if queue fails
      try {
        const { getResend } = await import("@/lib/email/resend");
        const resend = await getResend();

        const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@fluidcalendar.com";
        await resend.emails.send({
          to: adminEmail,
          from: `FluidCalendar Articles <${fromEmail}>`,
          subject,
          html: emailHtml,
        });

        await prisma.articleGenerationLog.update({
          where: { id: generationLogId },
          data: { emailSent: true },
        });

        logger.info(
          "Article generation notification sent (direct)",
          {
            clusterId: data.clusterId,
            status: data.status,
            adminEmail,
          },
          LOG_SOURCE
        );
      } catch (directError) {
        const errorMsg = directError instanceof Error ? directError.message : "Unknown error";

        await prisma.articleGenerationLog.update({
          where: { id: generationLogId },
          data: { emailError: errorMsg },
        });

        logger.error(
          "Failed to send article generation notification",
          {
            clusterId: data.clusterId,
            error: errorMsg,
          },
          LOG_SOURCE
        );
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";

    await prisma.articleGenerationLog.update({
      where: { id: generationLogId },
      data: { emailError: errorMsg },
    });

    logger.error(
      "Error preparing article generation notification",
      {
        clusterId: data.clusterId,
        error: errorMsg,
      },
      LOG_SOURCE
    );
  }
}
