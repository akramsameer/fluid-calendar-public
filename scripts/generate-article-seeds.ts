/**
 * Article Cluster Seed Generator
 *
 * This script generates ~1,000 article cluster seeds for the pSEO system.
 * Run with: npx tsx scripts/generate-article-seeds.ts
 */

import { PrismaClient, ArticleClusterType } from "@prisma/client";

const prisma = new PrismaClient();

// Cluster type configurations with priority ranges
const CLUSTER_CONFIGS = {
  use_case: { priorityRange: [90, 100], targetCount: 50 },
  productivity_tip: { priorityRange: [85, 95], targetCount: 100 },
  feature_guide: { priorityRange: [80, 90], targetCount: 80 },
  comparison: { priorityRange: [75, 85], targetCount: 40 },
  integration: { priorityRange: [70, 80], targetCount: 30 },
  industry: { priorityRange: [65, 75], targetCount: 100 },
  role: { priorityRange: [60, 70], targetCount: 80 },
  problem_solution: { priorityRange: [55, 65], targetCount: 120 },
  best_practice: { priorityRange: [50, 60], targetCount: 100 },
  seasonal: { priorityRange: [45, 55], targetCount: 50 },
  template: { priorityRange: [40, 50], targetCount: 50 },
  long_tail: { priorityRange: [35, 45], targetCount: 200 },
};

// Data pools
const COMPETITORS = [
  "Motion", "Calendly", "Cal.com", "Reclaim.ai", "Clockwise",
  "SavvyCal", "Acuity Scheduling", "Doodle",
];

const INTEGRATION_PROVIDERS = [
  "Google Calendar", "Microsoft Outlook", "Apple Calendar",
  "iCloud Calendar", "CalDAV",
];

const INDUSTRIES = [
  "Healthcare", "Education", "Legal", "Real Estate", "Financial Services",
  "Consulting", "Technology", "Marketing", "Creative Agencies", "Nonprofits",
  "Small Business", "Enterprise", "Startups", "Retail", "Manufacturing",
];

const ROLES = [
  "Executive", "Manager", "Team Lead", "Project Manager", "Freelancer",
  "Consultant", "Entrepreneur", "Sales Professional", "Remote Worker",
  "Student", "Parent", "Assistant", "HR Professional", "Developer", "Designer",
];

const USE_CASES = [
  "team meeting scheduling", "client appointment booking",
  "project deadline management", "family calendar coordination",
  "personal time blocking", "travel planning", "event planning",
  "interview scheduling", "remote team coordination",
  "cross-timezone meetings", "recurring meeting management",
  "buffer time optimization", "energy-based scheduling",
  "focus time protection", "work-life balance",
  "task prioritization", "daily planning", "weekly review",
  "monthly planning", "quarterly goal setting",
];

const FOCUS_AREAS = [
  "auto-scheduling", "calendar sync", "task management",
  "time blocking", "meeting optimization", "availability management",
  "buffer time", "energy levels", "notifications",
  "mobile access", "integrations", "analytics",
  "sharing calendars", "recurring events", "all-day events",
];

const SCENARIOS = [
  "New Year planning", "Q1 goal setting", "back to school",
  "holiday season", "year-end review", "summer vacation planning",
  "conference season", "busy season", "slow season",
  "project kickoff", "product launch", "team onboarding",
  "performance review period", "budget planning", "strategic planning",
];

const TARGET_AUDIENCES = [
  "busy professionals", "remote workers", "entrepreneurs",
  "team managers", "freelancers", "small business owners",
  "corporate executives", "students", "parents",
  "consultants", "salespeople", "creatives",
];

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 100);
}

function randomPriority(range: [number, number]): number {
  return Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

interface ClusterSeed {
  clusterType: ArticleClusterType;
  slug: string;
  title: string;
  metaDescription: string;
  priorityScore: number;
  useCase?: string;
  targetAudience?: string;
  competitor?: string;
  industry?: string;
  role?: string;
  provider?: string;
  focusArea?: string;
  scenario?: string;
  keywords?: string;
}

function generateUseCaseClusters(count: number): ClusterSeed[] {
  const clusters: ClusterSeed[] = [];
  const combinations: Set<string> = new Set();

  while (clusters.length < count) {
    const useCase = pick(USE_CASES);
    const audience = pick(TARGET_AUDIENCES);
    const key = `${useCase}-${audience}`;

    if (combinations.has(key)) continue;
    combinations.add(key);

    const title = `How to Use FluidCalendar for ${useCase.charAt(0).toUpperCase() + useCase.slice(1)}: A Guide for ${audience.charAt(0).toUpperCase() + audience.slice(1)}`;

    clusters.push({
      clusterType: "use_case",
      slug: generateSlug(title),
      title,
      metaDescription: `Learn how ${audience} can use FluidCalendar for ${useCase}. Step-by-step guide with practical tips.`,
      priorityScore: randomPriority(CLUSTER_CONFIGS.use_case.priorityRange as [number, number]),
      useCase,
      targetAudience: audience,
      keywords: JSON.stringify([useCase, audience, "calendar management", "scheduling"]),
    });
  }

  return clusters;
}

function generateProductivityTipClusters(count: number): ClusterSeed[] {
  const clusters: ClusterSeed[] = [];
  const tips = [
    "Time Blocking Mastery", "The 2-Minute Rule for Calendar Management",
    "Energy Management vs Time Management", "Deep Work Scheduling Strategies",
    "Meeting-Free Days", "Batch Processing Your Calendar",
    "The 80/20 Rule for Scheduling", "Mindful Time Management",
    "Calendar Minimalism", "Strategic Procrastination",
    "The Eisenhower Matrix for Scheduling", "Pomodoro Technique with Calendar Blocking",
    "Weekly Review Rituals", "Morning Routine Optimization",
    "Evening Planning Habits", "Buffer Time Strategies",
    "Context Switching Minimization", "Priority-Based Scheduling",
    "Calendar Decluttering", "Intentional Scheduling",
  ];

  const variations = [
    "Complete Guide", "Ultimate Tips", "Best Practices",
    "Step-by-Step", "Master Class", "Pro Tips",
  ];

  while (clusters.length < count) {
    const tip = pick(tips);
    const variation = pick(variations);
    const audience = pick(TARGET_AUDIENCES);
    const title = `${tip}: ${variation} for ${audience.charAt(0).toUpperCase() + audience.slice(1)}`;
    const slug = generateSlug(title);

    if (clusters.some(c => c.slug === slug)) continue;

    clusters.push({
      clusterType: "productivity_tip",
      slug,
      title,
      metaDescription: `Master ${tip.toLowerCase()} with our ${variation.toLowerCase()}. Practical strategies for ${audience}.`,
      priorityScore: randomPriority(CLUSTER_CONFIGS.productivity_tip.priorityRange as [number, number]),
      useCase: tip.toLowerCase(),
      targetAudience: audience,
      keywords: JSON.stringify([tip.toLowerCase(), "productivity", "time management", audience]),
    });
  }

  return clusters;
}

function generateFeatureGuideClusters(count: number): ClusterSeed[] {
  const clusters: ClusterSeed[] = [];
  const features = [
    "Auto-Scheduling", "Smart Task Scheduling", "Calendar Sync",
    "Multi-Calendar Management", "Task Management", "Energy-Based Scheduling",
    "Time Blocking", "Focus Time", "Buffer Time",
    "Recurring Events", "All-Day Events", "Task Prioritization",
    "Calendar Sharing", "Availability Settings", "Notification Preferences",
    "Mobile App", "Keyboard Shortcuts", "Quick Actions",
    "Project Organization", "Tag Management", "Calendar Views",
  ];

  const angles = [
    "Complete Guide", "Getting Started", "Advanced Tips",
    "Pro Techniques", "Hidden Features", "Best Practices",
  ];

  while (clusters.length < count) {
    const feature = pick(features);
    const angle = pick(angles);
    const title = `FluidCalendar ${feature}: ${angle}`;
    const slug = generateSlug(title);

    if (clusters.some(c => c.slug === slug)) continue;

    clusters.push({
      clusterType: "feature_guide",
      slug,
      title,
      metaDescription: `Master FluidCalendar's ${feature.toLowerCase()} feature. ${angle} with step-by-step instructions.`,
      priorityScore: randomPriority(CLUSTER_CONFIGS.feature_guide.priorityRange as [number, number]),
      focusArea: feature.toLowerCase(),
      keywords: JSON.stringify([feature.toLowerCase(), "FluidCalendar", "guide", "how to"]),
    });
  }

  return clusters;
}

function generateComparisonClusters(count: number): ClusterSeed[] {
  const clusters: ClusterSeed[] = [];
  const comparisonAngles = [
    "Features", "Pricing", "Best for Teams",
    "Best for Freelancers", "Integrations", "Overall",
  ];

  while (clusters.length < count) {
    const competitor = pick(COMPETITORS);
    const angle = pick(comparisonAngles);
    const title = `FluidCalendar vs ${competitor}: ${angle} Comparison (${new Date().getFullYear()})`;
    const slug = generateSlug(title);

    if (clusters.some(c => c.slug === slug)) continue;

    clusters.push({
      clusterType: "comparison",
      slug,
      title,
      metaDescription: `Compare FluidCalendar vs ${competitor}. Honest ${angle.toLowerCase()} comparison to help you choose.`,
      priorityScore: randomPriority(CLUSTER_CONFIGS.comparison.priorityRange as [number, number]),
      competitor,
      focusArea: angle.toLowerCase(),
      keywords: JSON.stringify(["FluidCalendar", competitor, "comparison", "alternative"]),
    });
  }

  return clusters;
}

function generateIntegrationClusters(count: number): ClusterSeed[] {
  const clusters: ClusterSeed[] = [];
  const integrationAngles = [
    "Complete Setup Guide", "Sync Configuration",
    "Two-Way Sync Guide", "Troubleshooting Guide",
    "Best Practices", "Migration Guide",
  ];

  while (clusters.length < count) {
    const provider = pick(INTEGRATION_PROVIDERS);
    const angle = pick(integrationAngles);
    const title = `FluidCalendar + ${provider}: ${angle}`;
    const slug = generateSlug(title);

    if (clusters.some(c => c.slug === slug)) continue;

    clusters.push({
      clusterType: "integration",
      slug,
      title,
      metaDescription: `Complete guide to integrating FluidCalendar with ${provider}. ${angle} with step-by-step instructions.`,
      priorityScore: randomPriority(CLUSTER_CONFIGS.integration.priorityRange as [number, number]),
      provider,
      focusArea: angle.toLowerCase().replace(" guide", ""),
      keywords: JSON.stringify(["FluidCalendar", provider, "integration", "sync"]),
    });
  }

  return clusters;
}

function generateIndustryClusters(count: number): ClusterSeed[] {
  const clusters: ClusterSeed[] = [];

  while (clusters.length < count) {
    const industry = pick(INDUSTRIES);
    const useCase = pick(USE_CASES);
    const title = `Calendar Management for ${industry}: ${useCase.charAt(0).toUpperCase() + useCase.slice(1)}`;
    const slug = generateSlug(title);

    if (clusters.some(c => c.slug === slug)) continue;

    clusters.push({
      clusterType: "industry",
      slug,
      title,
      metaDescription: `How ${industry.toLowerCase()} professionals use FluidCalendar for ${useCase}. Industry-specific tips and strategies.`,
      priorityScore: randomPriority(CLUSTER_CONFIGS.industry.priorityRange as [number, number]),
      industry,
      useCase,
      keywords: JSON.stringify([industry.toLowerCase(), useCase, "calendar", "scheduling"]),
    });
  }

  return clusters;
}

function generateRoleClusters(count: number): ClusterSeed[] {
  const clusters: ClusterSeed[] = [];

  while (clusters.length < count) {
    const role = pick(ROLES);
    const scenario = pick(SCENARIOS);
    const title = `Time Management for ${role}s: Mastering ${scenario}`;
    const slug = generateSlug(title);

    if (clusters.some(c => c.slug === slug)) continue;

    clusters.push({
      clusterType: "role",
      slug,
      title,
      metaDescription: `Essential time management guide for ${role.toLowerCase()}s handling ${scenario.toLowerCase()}. FluidCalendar tips included.`,
      priorityScore: randomPriority(CLUSTER_CONFIGS.role.priorityRange as [number, number]),
      role,
      scenario,
      keywords: JSON.stringify([role.toLowerCase(), scenario.toLowerCase(), "time management", "scheduling"]),
    });
  }

  return clusters;
}

function generateProblemSolutionClusters(count: number): ClusterSeed[] {
  const clusters: ClusterSeed[] = [];
  const problems = [
    "Meeting Overload", "Double Bookings", "Scheduling Conflicts",
    "Calendar Chaos", "Time Zone Confusion", "Last-Minute Cancellations",
    "Overbooking", "No-Shows", "Context Switching",
    "Back-to-Back Meetings", "Unclear Availability", "Calendar Sprawl",
    "Notification Fatigue", "Schedule Creep", "Meeting Bloat",
    "Focus Time Interruptions", "Deadline Misses", "Priority Confusion",
    "Work-Life Blur", "Energy Drain",
  ];

  while (clusters.length < count) {
    const problem = pick(problems);
    const audience = pick(TARGET_AUDIENCES);
    const title = `How to Solve ${problem} for ${audience.charAt(0).toUpperCase() + audience.slice(1)}`;
    const slug = generateSlug(title);

    if (clusters.some(c => c.slug === slug)) continue;

    clusters.push({
      clusterType: "problem_solution",
      slug,
      title,
      metaDescription: `Struggling with ${problem.toLowerCase()}? Learn how ${audience} solve this common problem with FluidCalendar.`,
      priorityScore: randomPriority(CLUSTER_CONFIGS.problem_solution.priorityRange as [number, number]),
      useCase: problem.toLowerCase(),
      targetAudience: audience,
      keywords: JSON.stringify([problem.toLowerCase(), "solution", "scheduling", audience]),
    });
  }

  return clusters;
}

function generateBestPracticeClusters(count: number): ClusterSeed[] {
  const clusters: ClusterSeed[] = [];

  while (clusters.length < count) {
    const focusArea = pick(FOCUS_AREAS);
    const audience = pick(TARGET_AUDIENCES);
    const title = `${focusArea.charAt(0).toUpperCase() + focusArea.slice(1)} Best Practices for ${audience.charAt(0).toUpperCase() + audience.slice(1)}`;
    const slug = generateSlug(title);

    if (clusters.some(c => c.slug === slug)) continue;

    clusters.push({
      clusterType: "best_practice",
      slug,
      title,
      metaDescription: `${focusArea.charAt(0).toUpperCase() + focusArea.slice(1)} best practices every ${audience.split(" ")[0].toLowerCase()} should know. Expert tips for better scheduling.`,
      priorityScore: randomPriority(CLUSTER_CONFIGS.best_practice.priorityRange as [number, number]),
      focusArea,
      targetAudience: audience,
      keywords: JSON.stringify([focusArea, "best practices", audience, "tips"]),
    });
  }

  return clusters;
}

function generateSeasonalClusters(count: number): ClusterSeed[] {
  const clusters: ClusterSeed[] = [];

  while (clusters.length < count) {
    const scenario = pick(SCENARIOS);
    const useCase = pick(USE_CASES);
    const title = `${scenario}: Your Complete ${useCase.charAt(0).toUpperCase() + useCase.slice(1)} Guide`;
    const slug = generateSlug(title);

    if (clusters.some(c => c.slug === slug)) continue;

    clusters.push({
      clusterType: "seasonal",
      slug,
      title,
      metaDescription: `Prepare for ${scenario.toLowerCase()} with our comprehensive ${useCase} guide. Stay organized during busy periods.`,
      priorityScore: randomPriority(CLUSTER_CONFIGS.seasonal.priorityRange as [number, number]),
      scenario,
      useCase,
      keywords: JSON.stringify([scenario.toLowerCase(), useCase, "planning", "calendar"]),
    });
  }

  return clusters;
}

function generateTemplateClusters(count: number): ClusterSeed[] {
  const clusters: ClusterSeed[] = [];
  const templateTypes = [
    "Weekly Schedule", "Daily Planning", "Monthly Review",
    "Project Timeline", "Team Calendar", "Personal Calendar",
    "Work-Life Balance", "Focus Time", "Meeting Schedule",
    "Quarterly Planning",
  ];

  while (clusters.length < count) {
    const template = pick(templateTypes);
    const audience = pick(TARGET_AUDIENCES);
    const title = `${template} Template for ${audience.charAt(0).toUpperCase() + audience.slice(1)}`;
    const slug = generateSlug(title);

    if (clusters.some(c => c.slug === slug)) continue;

    clusters.push({
      clusterType: "template",
      slug,
      title,
      metaDescription: `Ready-to-use ${template.toLowerCase()} template for ${audience}. Set up FluidCalendar for success with our guide.`,
      priorityScore: randomPriority(CLUSTER_CONFIGS.template.priorityRange as [number, number]),
      useCase: template.toLowerCase(),
      targetAudience: audience,
      keywords: JSON.stringify([template.toLowerCase(), "template", audience, "scheduling"]),
    });
  }

  return clusters;
}

function generateLongTailClusters(count: number): ClusterSeed[] {
  const clusters: ClusterSeed[] = [];
  const longTailTopics = [
    "How to schedule meetings across time zones",
    "Best way to manage multiple calendars",
    "How to protect focus time in busy schedule",
    "Best calendar app for ADHD",
    "How to sync work and personal calendars",
    "Calendar strategies for shift workers",
    "How to schedule around childcare",
    "Best meeting times for global teams",
    "How to avoid meeting fatigue",
    "Calendar tips for introverts",
    "How to manage last-minute meetings",
    "Best way to block distractions",
    "How to schedule creative work",
    "Calendar management for couples",
    "How to handle calendar anxiety",
    "Best scheduling strategy for sales calls",
    "How to optimize travel schedules",
    "Calendar tips for night owls",
    "How to manage client appointments",
    "Best way to schedule recurring tasks",
  ];

  const variations = pickN(longTailTopics, count);

  for (const topic of variations) {
    const title = topic.charAt(0).toUpperCase() + topic.slice(1);
    const slug = generateSlug(title);

    if (clusters.some(c => c.slug === slug)) continue;

    const industry = Math.random() > 0.7 ? pick(INDUSTRIES) : undefined;
    const role = Math.random() > 0.7 ? pick(ROLES) : undefined;

    clusters.push({
      clusterType: "long_tail",
      slug,
      title,
      metaDescription: `${title}. Practical tips and strategies with FluidCalendar.`,
      priorityScore: randomPriority(CLUSTER_CONFIGS.long_tail.priorityRange as [number, number]),
      useCase: topic.toLowerCase(),
      industry,
      role,
      keywords: JSON.stringify([...topic.toLowerCase().split(" ").slice(0, 4), "calendar", "scheduling"]),
    });
  }

  // Generate more long-tail clusters by combining different elements
  while (clusters.length < count) {
    const useCase = pick(USE_CASES);
    const industry = Math.random() > 0.5 ? pick(INDUSTRIES) : undefined;
    const role = Math.random() > 0.5 ? pick(ROLES) : undefined;

    let title = useCase.charAt(0).toUpperCase() + useCase.slice(1);
    if (industry && role) {
      title = `${title} for ${role}s in ${industry}`;
    } else if (industry) {
      title = `${title} in ${industry}`;
    } else if (role) {
      title = `${title} Tips for ${role}s`;
    }

    const slug = generateSlug(title);
    if (clusters.some(c => c.slug === slug)) continue;

    clusters.push({
      clusterType: "long_tail",
      slug,
      title,
      metaDescription: `${title}. Expert tips and FluidCalendar strategies.`,
      priorityScore: randomPriority(CLUSTER_CONFIGS.long_tail.priorityRange as [number, number]),
      useCase,
      industry,
      role,
      keywords: JSON.stringify([useCase, industry, role, "scheduling"].filter(Boolean)),
    });
  }

  return clusters;
}

async function main() {
  console.log("🚀 Starting article cluster seed generation...\n");

  // Check if clusters already exist
  const existingCount = await prisma.articleCluster.count();
  if (existingCount > 0) {
    console.log(`⚠️  Found ${existingCount} existing clusters.`);
    console.log("   Run with --force to delete and recreate, or --append to add more.\n");

    const args = process.argv.slice(2);
    if (args.includes("--force")) {
      console.log("🗑️  Deleting existing clusters...");
      await prisma.articleGenerationLog.deleteMany();
      await prisma.article.deleteMany();
      await prisma.articleCluster.deleteMany();
      console.log("   Done.\n");
    } else if (!args.includes("--append")) {
      process.exit(1);
    }
  }

  // Generate clusters for each type
  const allClusters: ClusterSeed[] = [];

  console.log("📝 Generating clusters...");

  const useCaseClusters = generateUseCaseClusters(CLUSTER_CONFIGS.use_case.targetCount);
  console.log(`   use_case: ${useCaseClusters.length}`);
  allClusters.push(...useCaseClusters);

  const productivityClusters = generateProductivityTipClusters(CLUSTER_CONFIGS.productivity_tip.targetCount);
  console.log(`   productivity_tip: ${productivityClusters.length}`);
  allClusters.push(...productivityClusters);

  const featureClusters = generateFeatureGuideClusters(CLUSTER_CONFIGS.feature_guide.targetCount);
  console.log(`   feature_guide: ${featureClusters.length}`);
  allClusters.push(...featureClusters);

  const comparisonClusters = generateComparisonClusters(CLUSTER_CONFIGS.comparison.targetCount);
  console.log(`   comparison: ${comparisonClusters.length}`);
  allClusters.push(...comparisonClusters);

  const integrationClusters = generateIntegrationClusters(CLUSTER_CONFIGS.integration.targetCount);
  console.log(`   integration: ${integrationClusters.length}`);
  allClusters.push(...integrationClusters);

  const industryClusters = generateIndustryClusters(CLUSTER_CONFIGS.industry.targetCount);
  console.log(`   industry: ${industryClusters.length}`);
  allClusters.push(...industryClusters);

  const roleClusters = generateRoleClusters(CLUSTER_CONFIGS.role.targetCount);
  console.log(`   role: ${roleClusters.length}`);
  allClusters.push(...roleClusters);

  const problemClusters = generateProblemSolutionClusters(CLUSTER_CONFIGS.problem_solution.targetCount);
  console.log(`   problem_solution: ${problemClusters.length}`);
  allClusters.push(...problemClusters);

  const bestPracticeClusters = generateBestPracticeClusters(CLUSTER_CONFIGS.best_practice.targetCount);
  console.log(`   best_practice: ${bestPracticeClusters.length}`);
  allClusters.push(...bestPracticeClusters);

  const seasonalClusters = generateSeasonalClusters(CLUSTER_CONFIGS.seasonal.targetCount);
  console.log(`   seasonal: ${seasonalClusters.length}`);
  allClusters.push(...seasonalClusters);

  const templateClusters = generateTemplateClusters(CLUSTER_CONFIGS.template.targetCount);
  console.log(`   template: ${templateClusters.length}`);
  allClusters.push(...templateClusters);

  const longTailClusters = generateLongTailClusters(CLUSTER_CONFIGS.long_tail.targetCount);
  console.log(`   long_tail: ${longTailClusters.length}`);
  allClusters.push(...longTailClusters);

  console.log(`\n📊 Total clusters generated: ${allClusters.length}`);

  // Insert clusters in batches
  console.log("\n💾 Inserting clusters into database...");
  const batchSize = 100;
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < allClusters.length; i += batchSize) {
    const batch = allClusters.slice(i, i + batchSize);

    for (const cluster of batch) {
      try {
        await prisma.articleCluster.create({
          data: cluster,
        });
        inserted++;
      } catch (error) {
        // Skip duplicates
        if ((error as { code?: string }).code === "P2002") {
          skipped++;
        } else {
          console.error(`   Error inserting cluster: ${cluster.slug}`, error);
        }
      }
    }

    console.log(`   Progress: ${Math.min(i + batchSize, allClusters.length)}/${allClusters.length}`);
  }

  console.log(`\n✅ Done!`);
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Skipped (duplicates): ${skipped}`);

  // Print summary
  const summary = await prisma.articleCluster.groupBy({
    by: ["clusterType"],
    _count: true,
  });

  console.log("\n📈 Cluster Summary:");
  for (const item of summary) {
    console.log(`   ${item.clusterType}: ${item._count}`);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  prisma.$disconnect();
  process.exit(1);
});
