-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "key" TEXT,
    "publicId" TEXT,
    "data" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Document_tenantId_kind_idx" ON "Document"("tenantId", "kind");

-- CreateIndex
CREATE INDEX "Document_tenantId_kind_publicId_idx" ON "Document"("tenantId", "kind", "publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_tenantId_kind_key_key" ON "Document"("tenantId", "kind", "key");
