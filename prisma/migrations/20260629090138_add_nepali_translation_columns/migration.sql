-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "messageNe" TEXT;

-- AlterTable
ALTER TABLE "BlogCategory" ADD COLUMN     "descriptionNe" TEXT,
ADD COLUMN     "nameNe" TEXT;

-- AlterTable
ALTER TABLE "BlogPost" ADD COLUMN     "bodyMarkdownNe" TEXT,
ADD COLUMN     "excerptNe" TEXT,
ADD COLUMN     "seoDescriptionNe" TEXT,
ADD COLUMN     "seoTitleNe" TEXT,
ADD COLUMN     "titleNe" TEXT;

-- AlterTable
ALTER TABLE "Bundle" ADD COLUMN     "descriptionNe" TEXT,
ADD COLUMN     "seoDescriptionNe" TEXT,
ADD COLUMN     "seoTitleNe" TEXT,
ADD COLUMN     "titleNe" TEXT;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "nameNe" TEXT;

-- AlterTable
ALTER TABLE "Collection" ADD COLUMN     "seoDescriptionNe" TEXT,
ADD COLUMN     "seoTitleNe" TEXT,
ADD COLUMN     "subtitleNe" TEXT,
ADD COLUMN     "titleNe" TEXT;

-- AlterTable
ALTER TABLE "Element" ADD COLUMN     "energyDescriptionNe" TEXT,
ADD COLUMN     "nameNe" TEXT,
ADD COLUMN     "natureSourceNe" TEXT;

-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "bodyMarkdownNe" TEXT,
ADD COLUMN     "seoDescriptionNe" TEXT,
ADD COLUMN     "seoTitleNe" TEXT,
ADD COLUMN     "titleNe" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "descriptionNe" TEXT,
ADD COLUMN     "nameNe" TEXT,
ADD COLUMN     "seoDescriptionNe" TEXT,
ADD COLUMN     "seoTitleNe" TEXT;

-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN     "altNe" TEXT;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "durationNe" TEXT,
ADD COLUMN     "nameNe" TEXT,
ADD COLUMN     "seoDescriptionNe" TEXT,
ADD COLUMN     "seoTitleNe" TEXT,
ADD COLUMN     "summaryNe" TEXT,
ADD COLUMN     "whatToExpectNe" JSONB;

-- AlterTable
ALTER TABLE "Showroom" ADD COLUMN     "addressNe" TEXT,
ADD COLUMN     "nameNe" TEXT;
