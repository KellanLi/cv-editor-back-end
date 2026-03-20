/*
  Warnings:

  - You are about to drop the `ContentTemplateInfoTemplate` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `contentTemplateId` to the `InfoTemplate` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `ContentTemplateInfoTemplate` DROP FOREIGN KEY `ContentTemplateInfoTemplate_contentTemplateId_fkey`;

-- DropForeignKey
ALTER TABLE `ContentTemplateInfoTemplate` DROP FOREIGN KEY `ContentTemplateInfoTemplate_infoTemplateId_fkey`;

-- AlterTable
ALTER TABLE `InfoTemplate` ADD COLUMN `contentTemplateId` INTEGER NOT NULL;

-- DropTable
DROP TABLE `ContentTemplateInfoTemplate`;

-- AddForeignKey
ALTER TABLE `InfoTemplate` ADD CONSTRAINT `InfoTemplate_contentTemplateId_fkey` FOREIGN KEY (`contentTemplateId`) REFERENCES `ContentTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
