-- AlterTable
ALTER TABLE "User" ADD COLUMN     "guestSeat" INTEGER,
ADD COLUMN     "guestTokenHash" TEXT,
ADD COLUMN     "isGuest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastActiveAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_guestSeat_key" ON "User"("guestSeat");

-- CreateIndex
CREATE UNIQUE INDEX "User_guestTokenHash_key" ON "User"("guestTokenHash");

