-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "canvasWidth" INTEGER NOT NULL,
    "canvasHeight" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TemplateElement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "zIndex" INTEGER NOT NULL,
    "variableKey" TEXT NOT NULL,
    "src" TEXT,
    "defaultText" TEXT,
    "fontSize" INTEGER,
    "color" TEXT,
    "maxLines" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TemplateElement_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Template_name_key" ON "Template"("name");

-- CreateIndex
CREATE INDEX "TemplateElement_templateId_idx" ON "TemplateElement"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateElement_templateId_variableKey_key" ON "TemplateElement"("templateId", "variableKey");
