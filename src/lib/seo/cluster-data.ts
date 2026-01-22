import { ArticleClusterType } from "@prisma/client";

export interface ClusterTypeConfig {
  type: ArticleClusterType;
  description: string;
  priorityRange: [number, number];
  targetCount: number;
  requiredParams: string[];
  optionalParams: string[];
}

export const CLUSTER_TYPE_CONFIGS: Record<ArticleClusterType, ClusterTypeConfig> = {
  use_case: {
    type: "use_case",
    description: "Specific use cases for FluidCalendar (team scheduling, family calendars, etc.)",
    priorityRange: [90, 100],
    targetCount: 50,
    requiredParams: ["useCase", "targetAudience"],
    optionalParams: [],
  },
  productivity_tip: {
    type: "productivity_tip",
    description: "Time management and productivity advice",
    priorityRange: [85, 95],
    targetCount: 100,
    requiredParams: ["useCase"],
    optionalParams: ["targetAudience"],
  },
  feature_guide: {
    type: "feature_guide",
    description: "How to use FluidCalendar features",
    priorityRange: [80, 90],
    targetCount: 80,
    requiredParams: ["focusArea"],
    optionalParams: [],
  },
  comparison: {
    type: "comparison",
    description: "FluidCalendar vs competitors",
    priorityRange: [75, 85],
    targetCount: 40,
    requiredParams: ["competitor", "focusArea"],
    optionalParams: [],
  },
  integration: {
    type: "integration",
    description: "Calendar integration guides",
    priorityRange: [70, 80],
    targetCount: 30,
    requiredParams: ["provider"],
    optionalParams: ["focusArea"],
  },
  industry: {
    type: "industry",
    description: "Industry-specific calendaring",
    priorityRange: [65, 75],
    targetCount: 100,
    requiredParams: ["industry", "useCase"],
    optionalParams: [],
  },
  role: {
    type: "role",
    description: "Role-specific tips",
    priorityRange: [60, 70],
    targetCount: 80,
    requiredParams: ["role", "scenario"],
    optionalParams: [],
  },
  problem_solution: {
    type: "problem_solution",
    description: "Common scheduling problems and solutions",
    priorityRange: [55, 65],
    targetCount: 120,
    requiredParams: ["useCase"],
    optionalParams: ["targetAudience"],
  },
  best_practice: {
    type: "best_practice",
    description: "Calendar management best practices",
    priorityRange: [50, 60],
    targetCount: 100,
    requiredParams: ["focusArea"],
    optionalParams: ["targetAudience"],
  },
  seasonal: {
    type: "seasonal",
    description: "Time-based content (new year planning, back to school, etc.)",
    priorityRange: [45, 55],
    targetCount: 50,
    requiredParams: ["useCase", "scenario"],
    optionalParams: [],
  },
  template: {
    type: "template",
    description: "Calendar template guides and examples",
    priorityRange: [40, 50],
    targetCount: 50,
    requiredParams: ["useCase"],
    optionalParams: ["targetAudience"],
  },
  long_tail: {
    type: "long_tail",
    description: "Long-tail keyword articles",
    priorityRange: [35, 45],
    targetCount: 200,
    requiredParams: ["useCase"],
    optionalParams: ["targetAudience", "industry", "role"],
  },
};

// Competitors for comparison articles
export const COMPETITORS = [
  "Motion",
  "Calendly",
  "Cal.com",
  "Reclaim.ai",
  "Clockwise",
  "SavvyCal",
  "Acuity Scheduling",
  "Doodle",
  "Google Calendar",
  "Microsoft Outlook",
];

// Integration providers
export const INTEGRATION_PROVIDERS = [
  "Google Calendar",
  "Microsoft Outlook",
  "Apple Calendar (CalDAV)",
  "iCloud Calendar",
  "Fastmail",
  "Zoho Calendar",
  "Yahoo Calendar",
];

// Industries for industry-specific content
export const INDUSTRIES = [
  "Healthcare",
  "Education",
  "Legal",
  "Real Estate",
  "Financial Services",
  "Consulting",
  "Technology",
  "Marketing",
  "Creative Agencies",
  "Nonprofits",
  "Small Business",
  "Enterprise",
  "Startups",
  "Retail",
  "Manufacturing",
];

// Roles for role-specific content
export const ROLES = [
  "Executive",
  "Manager",
  "Team Lead",
  "Project Manager",
  "Freelancer",
  "Consultant",
  "Entrepreneur",
  "Sales Professional",
  "Remote Worker",
  "Student",
  "Parent",
  "Assistant",
  "HR Professional",
  "Developer",
  "Designer",
];

// Use cases for various cluster types
export const USE_CASES = [
  "Team meeting scheduling",
  "Client appointment booking",
  "Project deadline management",
  "Family calendar coordination",
  "Personal time blocking",
  "Travel planning",
  "Event planning",
  "Interview scheduling",
  "Remote team coordination",
  "Cross-timezone meetings",
  "Recurring meeting management",
  "Buffer time optimization",
  "Energy-based scheduling",
  "Focus time protection",
  "Work-life balance",
  "Task prioritization",
  "Daily planning",
  "Weekly review",
  "Monthly planning",
  "Quarterly goal setting",
];

// Focus areas for feature guides and best practices
export const FOCUS_AREAS = [
  "Auto-scheduling",
  "Calendar sync",
  "Task management",
  "Time blocking",
  "Meeting optimization",
  "Availability management",
  "Buffer time",
  "Energy levels",
  "Notifications",
  "Mobile access",
  "Integrations",
  "Analytics",
  "Sharing calendars",
  "Recurring events",
  "All-day events",
];

// Scenarios for seasonal and role content
export const SCENARIOS = [
  "New Year planning",
  "Q1 goal setting",
  "Back to school",
  "Holiday season",
  "Year-end review",
  "Summer vacation planning",
  "Conference season",
  "Busy season",
  "Slow season",
  "Project kickoff",
  "Product launch",
  "Team onboarding",
  "Performance review period",
  "Budget planning",
  "Strategic planning",
];

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .substring(0, 100);
}

export function calculatePriorityScore(
  clusterType: ArticleClusterType,
  params: Record<string, string | undefined>
): number {
  const config = CLUSTER_TYPE_CONFIGS[clusterType];
  const [min, max] = config.priorityRange;

  // Base score is in the middle of the range
  let score = Math.floor((min + max) / 2);

  // Boost for having all optional params filled
  const filledOptional = config.optionalParams.filter(p => params[p]).length;
  score += filledOptional * 2;

  // Add some randomness to avoid ties
  score += Math.floor(Math.random() * 3);

  // Ensure score is within range
  return Math.max(min, Math.min(max, score));
}
