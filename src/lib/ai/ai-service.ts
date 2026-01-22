import { createAzure } from "@ai-sdk/azure";
import { generateText as aiGenerateText } from "ai";

import { AICallType } from "@prisma/client";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "AIService";

// Azure OpenAI pricing per 1M tokens (as of 2024)
// gpt-4o: $5.00 input, $15.00 output
// gpt-4o-mini: $0.15 input, $0.60 output
const PRICING = {
  "gpt-4o": { input: 5.0 / 1_000_000, output: 15.0 / 1_000_000 },
  "gpt-4o-mini": { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
} as const;

type ModelName = keyof typeof PRICING;

interface GenerateTextOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  type: AICallType;
  metadata?: Record<string, unknown>;
}

interface UsageStats {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

interface GenerateTextResult {
  text: string;
  usage: UsageStats;
  durationMs: number;
  cost: number;
  logId: string;
}

function calculateCost(
  modelName: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING[modelName as ModelName] || PRICING["gpt-4o-mini"];
  return inputTokens * pricing.input + outputTokens * pricing.output;
}

export class AIService {
  private azure;
  private defaultModel: string;

  constructor() {
    const resourceName = process.env.AZURE_RESOURCE_NAME;
    const apiKey = process.env.AZURE_API_KEY;

    if (!resourceName || !apiKey) {
      throw new Error(
        "Azure OpenAI configuration missing. Set AZURE_RESOURCE_NAME and AZURE_API_KEY."
      );
    }

    this.azure = createAzure({
      resourceName,
      apiKey,
    });

    this.defaultModel =
      process.env.AZURE_SEO_DEPLOYMENT_NAME ||
      process.env.AZURE_DEPLOYMENT_NAME ||
      "gpt-4o-mini";
  }

  async generateText(
    prompt: string,
    options: GenerateTextOptions
  ): Promise<GenerateTextResult> {
    const {
      model = this.defaultModel,
      maxTokens = 4000,
      temperature = 0.7,
      type,
      metadata,
    } = options;

    const startTime = new Date();

    // Create AI call log record
    const aiCallLog = await prisma.aICallLog.create({
      data: {
        type,
        model,
        startTime,
        prompt: prompt.substring(0, 10000), // Truncate prompt for storage
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    try {
      logger.info(
        "Starting AI generation",
        {
          model,
          type,
          promptLength: prompt.length,
          logId: aiCallLog.id,
        },
        LOG_SOURCE
      );

      const result = await aiGenerateText({
        model: this.azure(model),
        prompt,
        maxOutputTokens: maxTokens,
        temperature,
      });

      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();
      const inputTokens = result.usage?.inputTokens || 0;
      const outputTokens = result.usage?.outputTokens || 0;
      const totalTokens = inputTokens + outputTokens;
      const cost = calculateCost(model, inputTokens, outputTokens);

      // Update AI call log with results
      await prisma.aICallLog.update({
        where: { id: aiCallLog.id },
        data: {
          endTime,
          durationMs,
          response: result.text.substring(0, 50000), // Truncate response for storage
          tokensPrompt: inputTokens,
          tokensCompletion: outputTokens,
          tokensTotal: totalTokens,
          costUsd: cost,
        },
      });

      logger.info(
        "AI generation completed",
        {
          model,
          type,
          durationMs,
          inputTokens,
          outputTokens,
          totalTokens,
          costUsd: cost.toFixed(4),
          logId: aiCallLog.id,
        },
        LOG_SOURCE
      );

      return {
        text: result.text,
        usage: { inputTokens, outputTokens, totalTokens },
        durationMs,
        cost,
        logId: aiCallLog.id,
      };
    } catch (error) {
      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Update AI call log with error
      await prisma.aICallLog.update({
        where: { id: aiCallLog.id },
        data: {
          endTime,
          durationMs,
          error: errorMessage,
        },
      });

      logger.error(
        "AI generation failed",
        {
          model,
          type,
          error: errorMessage,
          logId: aiCallLog.id,
        },
        LOG_SOURCE
      );

      throw error;
    }
  }

  /**
   * Get AI cost statistics for a given time period
   */
  async getCostStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalCost: number;
    totalCalls: number;
    totalTokens: number;
    byType: Record<string, { calls: number; cost: number; tokens: number }>;
    byModel: Record<string, { calls: number; cost: number; tokens: number }>;
  }> {
    const where: { createdAt?: { gte?: Date; lte?: Date } } = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const logs = await prisma.aICallLog.findMany({
      where,
      select: {
        type: true,
        model: true,
        costUsd: true,
        tokensTotal: true,
      },
    });

    const stats = {
      totalCost: 0,
      totalCalls: logs.length,
      totalTokens: 0,
      byType: {} as Record<
        string,
        { calls: number; cost: number; tokens: number }
      >,
      byModel: {} as Record<
        string,
        { calls: number; cost: number; tokens: number }
      >,
    };

    for (const log of logs) {
      const cost = log.costUsd || 0;
      const tokens = log.tokensTotal || 0;

      stats.totalCost += cost;
      stats.totalTokens += tokens;

      // By type
      if (!stats.byType[log.type]) {
        stats.byType[log.type] = { calls: 0, cost: 0, tokens: 0 };
      }
      stats.byType[log.type].calls++;
      stats.byType[log.type].cost += cost;
      stats.byType[log.type].tokens += tokens;

      // By model
      if (!stats.byModel[log.model]) {
        stats.byModel[log.model] = { calls: 0, cost: 0, tokens: 0 };
      }
      stats.byModel[log.model].calls++;
      stats.byModel[log.model].cost += cost;
      stats.byModel[log.model].tokens += tokens;
    }

    return stats;
  }
}

// Singleton instance
let aiServiceInstance: AIService | null = null;

export function getAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
}
