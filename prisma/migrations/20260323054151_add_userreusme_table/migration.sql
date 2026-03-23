-- DropForeignKey
ALTER TABLE `Section` DROP FOREIGN KEY `Section_resumeId_fkey`;

-- DropIndex
DROP INDEX `Section_resumeId_fkey` ON `Section`;

-- CreateTable
CREATE TABLE `ResumeSection` (
    `resumeId` INTEGER NOT NULL,
    `sectionId` INTEGER NOT NULL,

    PRIMARY KEY (`resumeId`, `sectionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ResumeSection` ADD CONSTRAINT `ResumeSection_resumeId_fkey` FOREIGN KEY (`resumeId`) REFERENCES `Resume`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ResumeSection` ADD CONSTRAINT `ResumeSection_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `Section`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
