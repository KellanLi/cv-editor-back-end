/*
  Warnings:

  - You are about to drop the column `type` on the `ContentTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `contentTemplateType` on the `Section` table. All the data in the column will be lost.
  - Added the required column `contentTemplateId` to the `Section` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ContentTemplate` DROP COLUMN `type`;

-- AlterTable
ALTER TABLE `Section` DROP COLUMN `contentTemplateType`,
    ADD COLUMN `contentTemplateId` INTEGER NOT NULL;
