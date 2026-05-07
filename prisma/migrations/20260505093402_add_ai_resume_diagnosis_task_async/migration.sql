-- CreateTable
CREATE TABLE `ai_resume_diagnosis_task` (
    `id` VARCHAR(64) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `resume_id` INTEGER NOT NULL,
    `status` ENUM('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'QUEUED',
    `active_key` VARCHAR(64) NULL,
    `request_payload` JSON NULL,
    `report` JSON NULL,
    `error_message` TEXT NULL,
    `failure_category` VARCHAR(32) NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `started_at` DATETIME(3) NULL,
    `finished_at` DATETIME(3) NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ai_resume_diagnosis_task_active_key_key`(`active_key`),
    INDEX `ai_resume_diagnosis_task_user_id_resume_id_status_idx`(`user_id`, `resume_id`, `status`),
    INDEX `ai_resume_diagnosis_task_status_created_at_idx`(`status`, `created_at`),
    INDEX `ai_resume_diagnosis_task_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ai_resume_diagnosis_task` ADD CONSTRAINT `ai_resume_diagnosis_task_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_resume_diagnosis_task` ADD CONSTRAINT `ai_resume_diagnosis_task_resume_id_fkey` FOREIGN KEY (`resume_id`) REFERENCES `Resume`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
