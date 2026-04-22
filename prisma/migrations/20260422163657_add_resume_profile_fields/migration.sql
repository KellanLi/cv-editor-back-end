-- AlterTable
ALTER TABLE `Resume` ADD COLUMN `birthDate` DATE NULL,
    ADD COLUMN `email` VARCHAR(191) NULL,
    ADD COLUMN `fullName` VARCHAR(191) NULL,
    ADD COLUMN `phone` VARCHAR(191) NULL,
    ADD COLUMN `photoUrl` VARCHAR(191) NULL,
    ADD COLUMN `profileExtra` JSON NULL,
    ADD COLUMN `targetPosition` VARCHAR(191) NULL;
