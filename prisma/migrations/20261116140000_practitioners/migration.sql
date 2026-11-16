-- Practitioners (who leads a service) and their many-to-many link to services.
-- CreateTable
CREATE TABLE "Practitioner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameNe" TEXT,
    "role" TEXT,
    "roleNe" TEXT,
    "bio" TEXT NOT NULL,
    "bioNe" TEXT,
    "training" TEXT,
    "trainingNe" TEXT,
    "photoUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Practitioner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PractitionerToService" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PractitionerToService_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Practitioner_position_idx" ON "Practitioner"("position");

-- CreateIndex
CREATE INDEX "_PractitionerToService_B_index" ON "_PractitionerToService"("B");

-- AddForeignKey
ALTER TABLE "_PractitionerToService" ADD CONSTRAINT "_PractitionerToService_A_fkey" FOREIGN KEY ("A") REFERENCES "Practitioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PractitionerToService" ADD CONSTRAINT "_PractitionerToService_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

