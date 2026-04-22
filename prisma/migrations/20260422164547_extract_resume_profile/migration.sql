-- CreateTable
CREATE TABLE `ResumeProfile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `resumeId` INTEGER NOT NULL,
    `photoUrl` VARCHAR(191) NULL,
    `fullName` VARCHAR(191) NULL,
    `birthDate` DATE NULL,
    `targetPosition` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `profileExtra` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ResumeProfile_resumeId_key`(`resumeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ResumeProfile` ADD CONSTRAINT `ResumeProfile_resumeId_fkey` FOREIGN KEY (`resumeId`) REFERENCES `Resume`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- 从 Resume 回填已有个人信息（与简历 1:1 一行对应）
INSERT INTO `ResumeProfile` (`resumeId`, `photoUrl`, `fullName`, `birthDate`, `targetPosition`, `email`, `phone`, `profileExtra`, `createdAt`, `updatedAt`)
SELECT
    `id`,
    `photoUrl`,
    `fullName`,
    `birthDate`,
    `targetPosition`,
    `email`,
    `phone`,
    `profileExtra`,
    `createdAt`,
    `updatedAt`
FROM `Resume`;

-- AlterTable
ALTER TABLE `Resume` DROP COLUMN `birthDate`,
    DROP COLUMN `email`,
    DROP COLUMN `fullName`,
    DROP COLUMN `phone`,
    DROP COLUMN `photoUrl`,
    DROP COLUMN `profileExtra`,
    DROP COLUMN `targetPosition`;
