## 1. Database Schema & Models

- [ ] 1.1 Add `AICallType` enum to Prisma schema
- [ ] 1.2 Add `AICallLog` model for AI call tracking
- [ ] 1.3 Add `ArticleClusterType` enum with all cluster types
- [ ] 1.4 Add `ArticleClusterStatus` enum
- [ ] 1.5 Add `Article` model with content and SEO fields
- [ ] 1.6 Add `ArticleCluster` model with cluster parameters and tracking
- [ ] 1.7 Add `ArticleGenerationLog` model for generation history
- [ ] 1.8 Run Prisma migration: `npx prisma migrate dev --name add_pseo_models`
- [ ] 1.9 Generate Prisma client

## 2. AI Service Infrastructure

- [ ] 2.1 Create `src/lib/ai-service.ts` with Azure OpenAI integration
- [ ] 2.2 Implement `AIService.generateText()` with tracking
- [ ] 2.3 Implement `AIService.withTrackedAPICall()` wrapper for logging
- [ ] 2.4 Add cost calculation based on Azure OpenAI pricing
- [ ] 2.5 Export singleton `aiService` instance
- [ ] 2.6 Add environment variables to `.env.example`: `AZURE_RESOURCE_NAME`, `AZURE_API_KEY`, `AZURE_DEPLOYMENT_NAME`, `AZURE_SEO_DEPLOYMENT_NAME`
- [ ] 2.7 Add `CRON_SECRET` to environment variables

## 3. Content Generation Pipeline

- [ ] 3.1 Create `src/lib/seo/cluster-data.ts` with cluster type definitions and metadata
- [ ] 3.2 Create `src/lib/seo/cluster-templates.ts` with AI prompt templates per cluster type
- [ ] 3.3 Create `src/lib/seo/seo-generator.ts` with main generation logic
- [ ] 3.4 Implement `generateClusterContent()` function
- [ ] 3.5 Implement `validateContentQuality()` for quality checks
- [ ] 3.6 Implement `calculateContentHash()` for uniqueness detection
- [ ] 3.7 Implement `checkDuplicateContent()` database check
- [ ] 3.8 Implement `findRelatedClusters()` for internal linking

## 4. Cluster Seed Data

- [ ] 4.1 Create `scripts/generate-article-seeds.ts` script
- [ ] 4.2 Define use_case clusters (50 articles)
- [ ] 4.3 Define productivity_tip clusters (100 articles)
- [ ] 4.4 Define feature_guide clusters (80 articles)
- [ ] 4.5 Define comparison clusters (40 articles)
- [ ] 4.6 Define integration clusters (30 articles)
- [ ] 4.7 Define industry clusters (100 articles)
- [ ] 4.8 Define role clusters (80 articles)
- [ ] 4.9 Define problem_solution clusters (120 articles)
- [ ] 4.10 Define best_practice clusters (100 articles)
- [ ] 4.11 Define seasonal clusters (50 articles)
- [ ] 4.12 Define template clusters (50 articles)
- [ ] 4.13 Define long_tail clusters (200 articles)
- [ ] 4.14 Add slug generation utility
- [ ] 4.15 Add priority score calculation

## 5. Cron Job API

- [ ] 5.1 Create `src/app/api/cron/generate-article/route.ts`
- [ ] 5.2 Implement cron secret authentication
- [ ] 5.3 Implement cluster selection (highest priority pending)
- [ ] 5.4 Implement status locking (pending → generating)
- [ ] 5.5 Implement async generation with non-blocking response
- [ ] 5.6 Implement success handling (create Article, update cluster status)
- [ ] 5.7 Implement failure handling (update cluster status, log error)
- [ ] 5.8 Implement email notification trigger on completion

## 6. Admin API Routes

- [ ] 6.1 Create `src/app/api/admin/articles/route.ts` (GET list)
- [ ] 6.2 Implement filtering by status, clusterType
- [ ] 6.3 Implement pagination
- [ ] 6.4 Create `src/app/api/admin/articles/[id]/route.ts` (GET single)
- [ ] 6.5 Create `src/app/api/admin/articles/[id]/generate/route.ts` (POST manual generate)
- [ ] 6.6 Create `src/app/api/admin/articles/[id]/publish/route.ts` (POST publish)
- [ ] 6.7 Create `src/app/api/admin/articles/[id]/skip/route.ts` (POST skip)
- [ ] 6.8 Create `src/app/api/admin/articles/stats/route.ts` (GET statistics)
- [ ] 6.9 Add admin role check middleware to all routes

## 7. Admin Dashboard UI

- [ ] 7.1 Create `src/app/(saas)/admin/articles/page.tsx` server component
- [ ] 7.2 Create `src/app/(saas)/admin/articles/ArticleManagement.tsx` client component
- [ ] 7.3 Implement filter UI (status, cluster type dropdown)
- [ ] 7.4 Implement statistics display (total, by status, cost, tokens)
- [ ] 7.5 Implement article list table with pagination
- [ ] 7.6 Implement manual generate button with loading state
- [ ] 7.7 Implement publish button
- [ ] 7.8 Implement skip button
- [ ] 7.9 Implement article preview modal
- [ ] 7.10 Implement generation log viewer
- [ ] 7.11 Add admin route to settings navigation

## 8. Public Article Routes

- [ ] 8.1 Create `src/app/learn/[slug]/page.tsx` for public article view
- [ ] 8.2 Implement article metadata (title, description, OG tags)
- [ ] 8.3 Create `src/components/seo/ArticleContent.tsx` for rendering HTML content
- [ ] 8.4 Implement structured data (Article schema)
- [ ] 8.5 Style article page with Tailwind (consistent with site design)
- [ ] 8.6 Add related articles section
- [ ] 8.7 Add CTA to FluidCalendar signup

## 9. Sitemap

- [ ] 9.1 Create/update `src/app/sitemap.ts`
- [ ] 9.2 Query all published articles for sitemap
- [ ] 9.3 Set appropriate changeFrequency and priority based on cluster type
- [ ] 9.4 Add static pages (landing, pricing, etc.)
- [ ] 9.5 Set dynamic revalidation (1 hour cache)

## 10. Email Notifications

- [ ] 10.1 Create `emails/ArticleGenerationComplete.tsx` React Email template
- [ ] 10.2 Implement success variant (published, needs_review)
- [ ] 10.3 Implement failure variant with error message
- [ ] 10.4 Add cluster queue statistics section
- [ ] 10.5 Add "Review Articles" CTA button
- [ ] 10.6 Create `src/lib/seo/email.ts` with `sendArticleGenerationNotification()`
- [ ] 10.7 Integrate with existing Resend email infrastructure

## 11. Kubernetes Deployment

- [ ] 11.1 Create `k8s/cron-generate-articles.yml` CronJob manifest
- [ ] 11.2 Configure schedule (0 */12 * * * for 2x daily)
- [ ] 11.3 Add CRON_SECRET from Kubernetes secrets
- [ ] 11.4 Test cron job manually with kubectl

## 12. Testing & Validation

- [ ] 12.1 Create `scripts/test-generate-article.ts` for manual testing
- [ ] 12.2 Test AI service connection and tracking
- [ ] 12.3 Test cluster seed script
- [ ] 12.4 Test cron endpoint with curl
- [ ] 12.5 Test admin dashboard functionality
- [ ] 12.6 Test public article page rendering
- [ ] 12.7 Test sitemap includes articles
- [ ] 12.8 Test email notifications
- [ ] 12.9 Run TypeScript type checking
- [ ] 12.10 Run ESLint

## 13. Documentation

- [ ] 13.1 Add pSEO section to CLAUDE.md
- [ ] 13.2 Document environment variables
- [ ] 13.3 Document admin dashboard usage
- [ ] 13.4 Document cluster seed script
- [ ] 13.5 Document cost monitoring
