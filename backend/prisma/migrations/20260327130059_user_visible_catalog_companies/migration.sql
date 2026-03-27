-- CreateTable
CREATE TABLE "UserVisibleCompany" (
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserVisibleCompany_pkey" PRIMARY KEY ("userId","companyId")
);

-- CreateIndex
CREATE INDEX "UserVisibleCompany_userId_idx" ON "UserVisibleCompany"("userId");

-- CreateIndex
CREATE INDEX "UserVisibleCompany_companyId_idx" ON "UserVisibleCompany"("companyId");

-- AddForeignKey
ALTER TABLE "UserVisibleCompany" ADD CONSTRAINT "UserVisibleCompany_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVisibleCompany" ADD CONSTRAINT "UserVisibleCompany_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
