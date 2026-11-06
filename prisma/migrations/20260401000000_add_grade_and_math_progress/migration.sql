-- AlterTable
ALTER TABLE "SpellingWord" ADD COLUMN     "grade" INTEGER,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "syllables" INTEGER,
ADD COLUMN     "tier" TEXT,
ADD COLUMN     "unitId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "grade" INTEGER;

-- CreateTable
CREATE TABLE "MathSkillProgress" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "skillId" TEXT NOT NULL,
    "levelIndex" INTEGER NOT NULL DEFAULT 0,
    "recent" JSONB NOT NULL DEFAULT '[]',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "mastered" BOOLEAN NOT NULL DEFAULT false,
    "masteredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MathSkillProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MathAttempt" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "skillId" TEXT NOT NULL,
    "levelIndex" INTEGER NOT NULL DEFAULT 0,
    "prompt" TEXT NOT NULL,
    "expected" TEXT NOT NULL,
    "given" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "ms" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MathAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MathSkillProgress_userId_idx" ON "MathSkillProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MathSkillProgress_userId_skillId_key" ON "MathSkillProgress"("userId", "skillId");

-- CreateIndex
CREATE INDEX "MathAttempt_userId_skillId_createdAt_idx" ON "MathAttempt"("userId", "skillId", "createdAt");

-- CreateIndex
CREATE INDEX "SpellingWord_grade_tier_idx" ON "SpellingWord"("grade", "tier");

-- CreateIndex
CREATE INDEX "SpellingWord_grade_unitId_idx" ON "SpellingWord"("grade", "unitId");

-- AddForeignKey
ALTER TABLE "MathSkillProgress" ADD CONSTRAINT "MathSkillProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MathAttempt" ADD CONSTRAINT "MathAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

