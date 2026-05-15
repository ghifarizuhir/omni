-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "managerId" TEXT,
ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "title" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
