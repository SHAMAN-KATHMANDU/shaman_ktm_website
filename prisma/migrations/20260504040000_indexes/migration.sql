-- Faster date-range queries on Product / BlogPost dashboards.
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");
CREATE INDEX "BlogPost_createdAt_idx" ON "BlogPost"("createdAt");
