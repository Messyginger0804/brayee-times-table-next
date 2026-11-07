-- AlterTable
ALTER TABLE "User" ADD COLUMN     "savedAt" TIMESTAMP(3),
ADD COLUMN     "savedCadet" BOOLEAN NOT NULL DEFAULT false;

