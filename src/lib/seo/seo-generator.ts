import { createHash } from "crypto";

import { AICallType, ArticleCluster, ArticleClusterStatus } from "@prisma/client";

import { getAIService } from "@/lib/ai";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import { generateArticlePrompt } from "./cluster-templates";

const LOG_SOURCE = "SEOGenerator";

// Minimum word count for auto-publishing
const MIN_WORD_COUNT = 1500;

// Max retry attempts
const MAX_RETRY_ATTEMPTS = 3;

interface ValidationResult {
  isValid: boolean;
  issues: string[];
  wordCount: number;
  hasBrandMention: boolean;
  hasProperStructure: boolean;
  hasPlaceholderText: boolean;
}

interface GenerationResult {
  success: boolean;
  article?: {
    id: string;
    slug: string;
    title: string;
    wordCount: number;
  };
  status: ArticleClusterStatus;
  validationIssues: string[];
  error?: string;
  durationMs: number;
}

export function calculateContentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export function validateContentQuality(content: string): ValidationResult {
  const issues: string[] = [];

  // Count words (strip HTML tags)
  const textContent = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = textContent.split(" ").filter(w => w.length > 0).length;

  if (wordCount < MIN_WORD_COUNT) {
    issues.push(`Word count (${wordCount}) is below minimum (${MIN_WORD_COUNT})`);
  }

  // Check for proper HTML structure
  const hasH2 = content.includes("<h2");
  const hasP = content.includes("<p");
  const hasProperStructure = hasH2 && hasP;

  if (!hasProperStructure) {
    issues.push("Missing proper HTML structure (h2, p tags)");
  }

  // Check for FluidCalendar brand mentions
  const brandMentions = (content.match(/FluidCalendar/gi) || []).length;
  const hasBrandMention = brandMentions >= 3;

  if (!hasBrandMention) {
    issues.push(`Insufficient brand mentions (${brandMentions}, need 3+)`);
  }

  // Check for placeholder text
  const placeholderPatterns = [
    /\[INSERT[^\]]*\]/i,
    /\[ADD[^\]]*\]/i,
    /\[TODO[^\]]*\]/i,
    /PLACEHOLDER/i,
    /Lorem ipsum/i,
    /\{\{[^}]+\}\}/,
  ];

  const hasPlaceholderText = placeholderPatterns.some(p => p.test(content));

  if (hasPlaceholderText) {
    issues.push("Contains placeholder text");
  }

  return {
    isValid: issues.length === 0,
    issues,
    wordCount,
    hasBrandMention,
    hasProperStructure,
    hasPlaceholderText,
  };
}

export async function checkDuplicateContent(contentHash: string, excludeClusterId?: string): Promise<boolean> {
  const existing = await prisma.articleCluster.findFirst({
    where: {
      contentHash,
      id: excludeClusterId ? { not: excludeClusterId } : undefined,
    },
  });
  return !!existing;
}

export async function findRelatedClusters(
  cluster: ArticleCluster,
  limit: number = 8
): Promise<{ slug: string; title: string }[]> {
  // Find published articles from the same cluster type first
  const sameTypeArticles = await prisma.articleCluster.findMany({
    where: {
      status: "published",
      clusterType: cluster.clusterType,
      id: { not: cluster.id },
    },
    select: {
      slug: true,
      title: true,
    },
    take: Math.ceil(limit / 2),
    orderBy: { priorityScore: "desc" },
  });

  // Then get some from other types for diversity
  const otherTypeArticles = await prisma.articleCluster.findMany({
    where: {
      status: "published",
      clusterType: { not: cluster.clusterType },
      id: { not: cluster.id },
    },
    select: {
      slug: true,
      title: true,
    },
    take: limit - sameTypeArticles.length,
    orderBy: { priorityScore: "desc" },
  });

  return [...sameTypeArticles, ...otherTypeArticles];
}

export async function generateClusterContent(clusterId: string): Promise<GenerationResult> {
  const startTime = Date.now();

  // Get cluster with current attempt count
  const cluster = await prisma.articleCluster.findUnique({
    where: { id: clusterId },
  });

  if (!cluster) {
    return {
      success: false,
      status: "failed",
      validationIssues: [],
      error: "Cluster not found",
      durationMs: Date.now() - startTime,
    };
  }

  // Check if max attempts reached
  if (cluster.generationAttempts >= MAX_RETRY_ATTEMPTS) {
    return {
      success: false,
      status: "failed",
      validationIssues: [],
      error: `Max retry attempts (${MAX_RETRY_ATTEMPTS}) reached`,
      durationMs: Date.now() - startTime,
    };
  }

  // Create generation log
  const generationLog = await prisma.articleGenerationLog.create({
    data: {
      clusterId: cluster.id,
      status: "running",
    },
  });

  try {
    // Update cluster status to generating and increment attempts
    await prisma.articleCluster.update({
      where: { id: clusterId },
      data: {
        status: "generating",
        generationAttempts: { increment: 1 },
        errorMessage: null,
      },
    });

    logger.info(
      "Starting content generation",
      {
        clusterId,
        clusterType: cluster.clusterType,
        title: cluster.title,
        attempt: cluster.generationAttempts + 1,
      },
      LOG_SOURCE
    );

    // Get related articles for internal linking
    const relatedArticles = await findRelatedClusters(cluster);

    // Generate prompt
    const prompt = generateArticlePrompt({
      clusterType: cluster.clusterType,
      useCase: cluster.useCase || undefined,
      targetAudience: cluster.targetAudience || undefined,
      competitor: cluster.competitor || undefined,
      industry: cluster.industry || undefined,
      role: cluster.role || undefined,
      provider: cluster.provider || undefined,
      focusArea: cluster.focusArea || undefined,
      scenario: cluster.scenario || undefined,
      title: cluster.title,
      relatedArticles,
    });

    // Generate content with AI
    const aiService = getAIService();
    const result = await aiService.generateText(prompt, {
      type: AICallType.SEO_CONTENT_GENERATION,
      maxTokens: 8000, // SEO content needs more tokens for 1500+ word articles
      temperature: 0.7,
      metadata: {
        clusterId,
        clusterType: cluster.clusterType,
        attempt: cluster.generationAttempts + 1,
      },
    });

    const content = result.text.trim();

    // Validate content quality
    const validation = validateContentQuality(content);

    // Calculate content hash
    const contentHash = calculateContentHash(content);

    // Check for duplicate content
    const isDuplicate = await checkDuplicateContent(contentHash, clusterId);
    if (isDuplicate) {
      validation.issues.push("Content hash matches existing article");
      validation.isValid = false;
    }

    // Create excerpt
    const textContent = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const excerpt = textContent.substring(0, 300) + (textContent.length > 300 ? "..." : "");

    // Determine status based on validation
    const finalStatus: ArticleClusterStatus = validation.isValid ? "published" : "needs_review";

    // Create the article
    const article = await prisma.article.create({
      data: {
        slug: cluster.slug,
        title: cluster.title,
        content,
        excerpt,
        published: validation.isValid,
      },
    });

    // Update cluster with article reference
    await prisma.articleCluster.update({
      where: { id: clusterId },
      data: {
        status: finalStatus,
        articleId: article.id,
        contentHash,
        publishedAt: validation.isValid ? new Date() : null,
        errorMessage: validation.issues.length > 0 ? validation.issues.join("; ") : null,
      },
    });

    const durationMs = Date.now() - startTime;

    // Update generation log
    await prisma.articleGenerationLog.update({
      where: { id: generationLog.id },
      data: {
        status: "success",
        completedAt: new Date(),
        durationMs,
        wordCount: validation.wordCount,
      },
    });

    logger.info(
      "Content generation completed",
      {
        clusterId,
        articleId: article.id,
        status: finalStatus,
        wordCount: validation.wordCount,
        validationIssues: validation.issues,
        durationMs,
      },
      LOG_SOURCE
    );

    return {
      success: true,
      article: {
        id: article.id,
        slug: article.slug,
        title: article.title,
        wordCount: validation.wordCount,
      },
      status: finalStatus,
      validationIssues: validation.issues,
      durationMs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const durationMs = Date.now() - startTime;

    // Update cluster with error
    await prisma.articleCluster.update({
      where: { id: clusterId },
      data: {
        status: "failed",
        errorMessage,
      },
    });

    // Update generation log
    await prisma.articleGenerationLog.update({
      where: { id: generationLog.id },
      data: {
        status: "failure",
        completedAt: new Date(),
        durationMs,
        errorMessage,
        errorStack: error instanceof Error ? error.stack : undefined,
      },
    });

    logger.error(
      "Content generation failed",
      {
        clusterId,
        error: errorMessage,
        durationMs,
      },
      LOG_SOURCE
    );

    return {
      success: false,
      status: "failed",
      validationIssues: [],
      error: errorMessage,
      durationMs,
    };
  }
}

export async function selectNextClusterForGeneration(): Promise<ArticleCluster | null> {
  // Find the highest priority pending cluster
  const cluster = await prisma.articleCluster.findFirst({
    where: {
      status: "pending",
      generationAttempts: { lt: MAX_RETRY_ATTEMPTS },
    },
    orderBy: [
      { priorityScore: "desc" },
      { createdAt: "asc" },
    ],
  });

  return cluster;
}

export async function getClusterStats(): Promise<{
  total: number;
  pending: number;
  generating: number;
  published: number;
  needsReview: number;
  failed: number;
  skipped: number;
}> {
  const [total, pending, generating, published, needsReview, failed, skipped] = await Promise.all([
    prisma.articleCluster.count(),
    prisma.articleCluster.count({ where: { status: "pending" } }),
    prisma.articleCluster.count({ where: { status: "generating" } }),
    prisma.articleCluster.count({ where: { status: "published" } }),
    prisma.articleCluster.count({ where: { status: "needs_review" } }),
    prisma.articleCluster.count({ where: { status: "failed" } }),
    prisma.articleCluster.count({ where: { status: "skipped" } }),
  ]);

  return { total, pending, generating, published, needsReview, failed, skipped };
}
