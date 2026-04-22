/*
  Warnings:

  - You are about to drop the column `createdAt` on the `ResumeProfile` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `ResumeProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `ResumeProfile` DROP COLUMN `createdAt`,
    DROP COLUMN `updatedAt`;
