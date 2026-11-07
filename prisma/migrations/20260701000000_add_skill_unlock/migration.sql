-- CreateTable
CREATE TABLE "SkillUnlock" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "skillId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SkillUnlock_userId_skillId_key" ON "SkillUnlock"("userId", "skillId");

-- AddForeignKey
ALTER TABLE "SkillUnlock" ADD CONSTRAINT "SkillUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
