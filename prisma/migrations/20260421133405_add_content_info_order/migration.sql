/*
  Warnings:

  - Added the required column `order` to the `Content` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order` to the `Info` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Content` ADD COLUMN `order` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `Info` ADD COLUMN `order` INTEGER NOT NULL;
