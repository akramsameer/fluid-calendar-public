/**
 * Test script for article generation
 * Run with: npx tsx scripts/test-generate-article.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Checking for pending clusters...\n");

  // Check pending clusters
  const pendingCount = await prisma.articleCluster.count({
    where: { status: "pending" },
  });

  console.log(`📊 Found ${pendingCount} pending clusters\n`);

  if (pendingCount === 0) {
    console.log("No pending clusters to generate. Run the seed script first.");
    return;
  }

  // Get the highest priority pending cluster
  const cluster = await prisma.articleCluster.findFirst({
    where: { status: "pending" },
    orderBy: [{ priorityScore: "desc" }, { createdAt: "asc" }],
  });

  if (!cluster) {
    console.log("No cluster found");
    return;
  }

  console.log("📝 Selected cluster for generation:");
  console.log(`   ID: ${cluster.id}`);
  console.log(`   Title: ${cluster.title}`);
  console.log(`   Type: ${cluster.clusterType}`);
  console.log(`   Priority: ${cluster.priorityScore}`);
  console.log(`   Slug: ${cluster.slug}`);
  console.log("");

  // Import the generator dynamically to ensure env vars are loaded
  console.log("🚀 Starting article generation...\n");

  const startTime = Date.now();

  try {
    // Update status to generating
    await prisma.articleCluster.update({
      where: { id: cluster.id },
      data: { status: "generating" },
    });

    // Dynamically import to get proper module resolution
    const { generateClusterContent } = await import("../src/lib/seo/seo-generator");

    // Reset the cluster status so the generator can pick it up
    await prisma.articleCluster.update({
      where: { id: cluster.id },
      data: {
        status: "pending",
        generationAttempts: 0,
      },
    });

    const result = await generateClusterContent(cluster.id);

    const durationSecs = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log("\n✅ Generation complete!");
    console.log(`   Success: ${result.success}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Duration: ${durationSecs}s`);

    if (result.article) {
      console.log(`   Article ID: ${result.article.id}`);
      console.log(`   Word Count: ${result.article.wordCount}`);
    }

    if (result.validationIssues.length > 0) {
      console.log("\n⚠️  Validation issues:");
      result.validationIssues.forEach((issue) => {
        console.log(`   - ${issue}`);
      });
    }

    if (result.error) {
      console.log(`\n❌ Error: ${result.error}`);
    }

    // Show article preview
    if (result.article) {
      const article = await prisma.article.findUnique({
        where: { id: result.article.id },
      });

      if (article) {
        console.log("\n📄 Article Preview (first 500 chars):");
        console.log("─".repeat(60));
        const textContent = article.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        console.log(textContent.substring(0, 500) + "...");
        console.log("─".repeat(60));
        console.log(`\n🔗 URL: /learn/${article.slug}`);
      }
    }

  } catch (error) {
    console.error("\n❌ Generation failed:", error);
  }

  // Show updated stats
  console.log("\n📈 Updated cluster stats:");
  const stats = await prisma.articleCluster.groupBy({
    by: ["status"],
    _count: true,
  });
  stats.forEach((s) => {
    console.log(`   ${s.status}: ${s._count}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
