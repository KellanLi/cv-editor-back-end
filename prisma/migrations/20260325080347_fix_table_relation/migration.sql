/*
  Warnings:

  - You are about to drop the column `sectionId` on the `ContentTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Section` table. All the data in the column will be lost.
  - You are about to drop the `ResumeSection` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `name` to the `ContentTemplate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `ContentTemplate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contentTemplateType` to the `Section` table without a default value. This is not possible if the table is not empty.
  - Added the required column `resumeId` to the `Section` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `ContentTemplate` DROP FOREIGN KEY `ContentTemplate_sectionId_fkey`;

-- DropForeignKey
ALTER TABLE `ResumeSection` DROP FOREIGN KEY `ResumeSection_resumeId_fkey`;

-- DropForeignKey
ALTER TABLE `ResumeSection` DROP FOREIGN KEY `ResumeSection_sectionId_fkey`;

-- DropIndex
DROP INDEX `ContentTemplate_sectionId_key` ON `ContentTemplate`;

-- AlterTable
ALTER TABLE `ContentTemplate` DROP COLUMN `sectionId`,
    ADD COLUMN `name` VARCHAR(191) NOT NULL,
    ADD COLUMN `type` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Section` DROP COLUMN `name`,
    ADD COLUMN `contentTemplateType` VARCHAR(191) NOT NULL,
    ADD COLUMN `resumeId` INTEGER NOT NULL;

-- DropTable
DROP TABLE `ResumeSection`;

-- AddForeignKey
ALTER TABLE `Section` ADD CONSTRAINT `Section_resumeId_fkey` FOREIGN KEY (`resumeId`) REFERENCES `Resume`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
