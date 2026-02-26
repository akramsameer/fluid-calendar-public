import { ArticleClusterType } from "@prisma/client";

interface ArticleClusterParams {
  clusterType: ArticleClusterType;
  useCase?: string;
  targetAudience?: string;
  competitor?: string;
  industry?: string;
  role?: string;
  provider?: string;
  focusArea?: string;
  scenario?: string;
  title: string;
  relatedArticles?: { slug: string; title: string }[];
}

export function generateArticlePrompt(params: ArticleClusterParams): string {
  const {
    clusterType,
    title,
    relatedArticles = [],
  } = params;

  const baseContext = `
You are an expert SEO content writer for FluidCalendar, an intelligent calendar and task scheduling application. FluidCalendar helps users manage their time effectively through:
- Smart auto-scheduling that finds optimal times for tasks
- Multi-calendar sync (Google Calendar, Outlook, CalDAV)
- Energy-level based scheduling
- Task prioritization and management
- Time blocking and focus time protection

Write in a professional but approachable tone. Use clear, actionable language. Include specific examples and tips.
`;

  const internalLinkingInstruction = relatedArticles.length > 0
    ? `
Include 5-8 internal links to these related articles within your content naturally:
${relatedArticles.map(a => `- [${a.title}](/learn/${a.slug})`).join("\n")}
`
    : "";

  const structureRequirements = `
CRITICAL LENGTH REQUIREMENT:
- You MUST write a MINIMUM of 1,500 words (target 1,800-2,000 words)
- The content MUST be at least 8,000 characters
- This is a comprehensive, in-depth article - do NOT write a short summary

STRUCTURE REQUIREMENTS:
1. Use proper HTML structure with h2, h3, p tags
2. Include a compelling introduction (2-3 paragraphs, 150+ words)
3. Break content into 5-7 main sections, each with:
   - An h2 heading
   - 3-5 paragraphs of detailed content (200+ words per section)
   - Specific examples and actionable advice
4. Include practical examples and actionable tips throughout
5. Mention FluidCalendar naturally 3-5 times throughout the article
6. End with a comprehensive conclusion and call-to-action to try FluidCalendar
7. Use bullet points and numbered lists where appropriate
8. Do NOT include the title in the output - just the body content
9. Do NOT include any markdown - use HTML tags only
${internalLinkingInstruction}

OUTPUT FORMAT:
Return only the HTML body content. Start directly with the first paragraph or section.
Write the FULL article - do not truncate or summarize. Every section must be fully developed.
`;

  const templatesByType: Record<ArticleClusterType, string> = {
    use_case: `
${baseContext}

Write a comprehensive guide about: "${title}"

This article should help ${params.targetAudience || "professionals"} understand how to use FluidCalendar for ${params.useCase}.

Cover these aspects:
1. The challenge/problem this use case addresses
2. Step-by-step guide to setting up FluidCalendar for this use case
3. Best practices and tips specific to this scenario
4. Common mistakes to avoid
5. Advanced features that help with this use case
6. Real-world examples and success stories

${structureRequirements}
`,

    productivity_tip: `
${baseContext}

Write an actionable productivity guide about: "${title}"

This article should provide practical advice about ${params.useCase} for ${params.targetAudience || "busy professionals"}.

Cover these aspects:
1. Why this productivity strategy matters
2. The science/research behind it (if applicable)
3. Step-by-step implementation guide
4. How FluidCalendar features support this approach
5. Common pitfalls and how to overcome them
6. Quick wins readers can implement today

${structureRequirements}
`,

    feature_guide: `
${baseContext}

Write a detailed feature guide about: "${title}"

This article should help users understand and master ${params.focusArea} in FluidCalendar.

Cover these aspects:
1. What this feature does and why it matters
2. Getting started with the feature
3. Step-by-step configuration guide
4. Advanced settings and customization
5. Tips for getting the most out of this feature
6. Troubleshooting common issues
7. Integration with other FluidCalendar features

${structureRequirements}
`,

    comparison: `
${baseContext}

Write a fair, comprehensive comparison article about: "${title}"

Compare FluidCalendar with ${params.competitor}, focusing on ${params.focusArea}.

Cover these aspects:
1. Overview of both products
2. Feature-by-feature comparison (use a comparison table)
3. Pricing comparison
4. Pros and cons of each
5. Best use cases for each tool
6. User experience comparison
7. Integration capabilities
8. Final verdict with honest recommendations

Be fair to the competitor while highlighting FluidCalendar's unique strengths, especially intelligent scheduling and task management.

${structureRequirements}
`,

    integration: `
${baseContext}

Write a complete integration guide about: "${title}"

Help users integrate FluidCalendar with ${params.provider}.

Cover these aspects:
1. Benefits of integrating these systems
2. Prerequisites and requirements
3. Step-by-step integration setup
4. Sync settings and configuration options
5. Two-way sync behavior explanation
6. Troubleshooting common sync issues
7. Best practices for managing multiple calendars
8. Advanced tips for power users

${structureRequirements}
`,

    industry: `
${baseContext}

Write an industry-specific guide about: "${title}"

This article targets ${params.industry} professionals dealing with ${params.useCase}.

Cover these aspects:
1. Unique scheduling challenges in ${params.industry}
2. How FluidCalendar addresses these specific needs
3. Industry-specific setup recommendations
4. Compliance/regulatory considerations if applicable
5. Case study or example scenarios
6. Integration recommendations for industry-specific tools
7. Tips from industry professionals

${structureRequirements}
`,

    role: `
${baseContext}

Write a role-specific scheduling guide about: "${title}"

This article is for ${params.role}s dealing with ${params.scenario}.

Cover these aspects:
1. Common scheduling challenges for ${params.role}s
2. Time management strategies specific to this role
3. How to configure FluidCalendar for optimal results
4. Daily/weekly workflow recommendations
5. Tips for managing competing priorities
6. Work-life balance strategies
7. Tools and integrations that complement this role

${structureRequirements}
`,

    problem_solution: `
${baseContext}

Write a problem-solving guide about: "${title}"

Address the common problem of ${params.useCase} for ${params.targetAudience || "professionals"}.

Cover these aspects:
1. Deep dive into the problem and its impact
2. Root causes and why traditional solutions fail
3. How FluidCalendar's approach solves this
4. Step-by-step solution implementation
5. Metrics to track improvement
6. Preventing the problem from recurring
7. Related problems and their solutions

${structureRequirements}
`,

    best_practice: `
${baseContext}

Write a best practices guide about: "${title}"

Focus on ${params.focusArea} best practices for ${params.targetAudience || "professionals"}.

Cover these aspects:
1. Why following best practices matters
2. Foundation principles to follow
3. 5-10 specific best practices with explanations
4. Common anti-patterns to avoid
5. How FluidCalendar supports these practices
6. Checklist for self-assessment
7. Next steps for continuous improvement

${structureRequirements}
`,

    seasonal: `
${baseContext}

Write a timely seasonal guide about: "${title}"

This article addresses ${params.scenario} related to ${params.useCase}.

Cover these aspects:
1. Why this time period requires special attention
2. Common challenges during this season
3. Preparation checklist
4. Day-to-day management strategies
5. How FluidCalendar features help during this period
6. Tips for maintaining work-life balance
7. Planning ahead for the next season

${structureRequirements}
`,

    template: `
${baseContext}

Write a template guide about: "${title}"

Help ${params.targetAudience || "users"} set up templates for ${params.useCase}.

Cover these aspects:
1. Benefits of using calendar templates
2. Overview of the template structure
3. Step-by-step template setup
4. Customization options
5. Sample weekly/monthly schedules
6. Tips for adapting templates to different needs
7. Sharing and collaboration with templates
8. Troubleshooting common template issues

${structureRequirements}
`,

    long_tail: `
${baseContext}

Write a focused article about: "${title}"

This addresses the specific topic of ${params.useCase}${params.industry ? ` in ${params.industry}` : ""}${params.role ? ` for ${params.role}s` : ""}.

Cover these aspects:
1. Introduction to the topic
2. Why this matters to the target audience
3. Detailed exploration of the main subject
4. Practical implementation steps
5. How FluidCalendar helps with this
6. Tips and tricks
7. Conclusion with actionable next steps

${structureRequirements}
`,
  };

  return templatesByType[clusterType];
}

export function generateMetaDescription(
  clusterType: ArticleClusterType,
  params: ArticleClusterParams
): string {
  const templates: Record<ArticleClusterType, string> = {
    use_case: `Learn how to use FluidCalendar for ${params.useCase}. ${params.targetAudience ? `Perfect for ${params.targetAudience}.` : ""} Step-by-step guide with practical tips.`,
    productivity_tip: `Boost your productivity with ${params.useCase}. Practical tips and strategies to manage your time better with FluidCalendar.`,
    feature_guide: `Master ${params.focusArea} in FluidCalendar. Complete guide with setup instructions, tips, and best practices.`,
    comparison: `Compare FluidCalendar vs ${params.competitor}. Honest comparison of features, pricing, and use cases to help you choose.`,
    integration: `Complete guide to integrating FluidCalendar with ${params.provider}. Step-by-step setup and sync configuration.`,
    industry: `Calendar management for ${params.industry}. How FluidCalendar helps with ${params.useCase} in your industry.`,
    role: `Time management guide for ${params.role}s. Master ${params.scenario} with FluidCalendar's intelligent scheduling.`,
    problem_solution: `Struggling with ${params.useCase}? Learn how to solve it with FluidCalendar's smart calendar features.`,
    best_practice: `${params.focusArea} best practices for better time management. Expert tips for using FluidCalendar effectively.`,
    seasonal: `Prepare for ${params.scenario} with these calendar management tips. Stay organized during busy periods.`,
    template: `Ready-to-use calendar template for ${params.useCase}. Set up FluidCalendar for success with our guide.`,
    long_tail: `${params.useCase}${params.industry ? ` in ${params.industry}` : ""}. Detailed guide with FluidCalendar tips.`,
  };

  const description = templates[clusterType];
  // Ensure meta description is 155-160 characters max
  return description.length > 160 ? description.substring(0, 157) + "..." : description;
}
