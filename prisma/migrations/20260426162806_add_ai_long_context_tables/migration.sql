-- CreateTable
CREATE TABLE `ai_conversation_context_summary` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `conversation_id` INTEGER NOT NULL,
    `rolling_summary` TEXT NOT NULL,
    `covers_up_to_seq` INTEGER NOT NULL DEFAULT 0,
    `version` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ai_conversation_context_summary_conversation_id_key`(`conversation_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_context_compaction_job` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `conversation_id` INTEGER NOT NULL,
    `from_seq` INTEGER NOT NULL,
    `to_seq` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `idempotency_key` VARCHAR(255) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `max_attempts` INTEGER NOT NULL DEFAULT 5,
    `last_error` TEXT NULL,
    `scheduled_at` DATETIME(3) NULL,
    `locked_at` DATETIME(3) NULL,
    `started_at` DATETIME(3) NULL,
    `finished_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ai_context_compaction_job_idempotency_key_key`(`idempotency_key`),
    INDEX `ai_context_compaction_job_conversation_id_status_idx`(`conversation_id`, `status`),
    INDEX `ai_context_compaction_job_status_scheduled_at_idx`(`status`, `scheduled_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_context_chunk` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `conversation_id` INTEGER NOT NULL,
    `start_seq` INTEGER NOT NULL,
    `end_seq` INTEGER NOT NULL,
    `summary` TEXT NOT NULL,
    `produced_by_job_id` INTEGER NULL,
    `source_hash` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_context_chunk_conversation_id_start_seq_idx`(`conversation_id`, `start_seq`),
    INDEX `ai_context_chunk_produced_by_job_id_idx`(`produced_by_job_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ai_conversation_context_summary` ADD CONSTRAINT `ai_conversation_context_summary_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `ai_conversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_context_compaction_job` ADD CONSTRAINT `ai_context_compaction_job_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `ai_conversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_context_chunk` ADD CONSTRAINT `ai_context_chunk_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `ai_conversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_context_chunk` ADD CONSTRAINT `ai_context_chunk_produced_by_job_id_fkey` FOREIGN KEY (`produced_by_job_id`) REFERENCES `ai_context_compaction_job`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
