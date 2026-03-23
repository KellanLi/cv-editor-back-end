/*
  Warnings:

  - You are about to drop the column `resumeId` on the `Section` table. All the data in the column will be lost.
  - Added the required column `order` to the `InfoTemplate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order` to the `ResumeSection` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `InfoTemplate` ADD COLUMN `order` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `ResumeSection` ADD COLUMN `order` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `Section` DROP COLUMN `resumeId`;
