-- Add missing columns to ArticleCluster
ALTER TABLE "ArticleCluster" ADD COLUMN "contentHash" TEXT;
ALTER TABLE "ArticleCluster" ADD COLUMN "metadata" TEXT;

-- Remove lastGenerationAt if it exists (not in schema)
ALTER TABLE "ArticleCluster" DROP COLUMN IF EXISTS "lastGenerationAt";
