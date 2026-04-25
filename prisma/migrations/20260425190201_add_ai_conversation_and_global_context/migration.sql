-- CreateTable
CREATE TABLE `ai_conversation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `resumeId` INTEGER NOT NULL,
    `purpose` ENUM('BASIC_QA', 'DIALOGUE_EDIT', 'RESUME_DIAGNOSIS') NOT NULL DEFAULT 'BASIC_QA',
    `thread_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `last_msg_at` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ai_conversation_thread_id_key`(`thread_id`),
    INDEX `ai_conversation_resumeId_last_msg_at_idx`(`resumeId`, `last_msg_at` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_message` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `conversation_id` INTEGER NOT NULL,
    `seq` INTEGER NOT NULL,
    `role` ENUM('system', 'user', 'assistant', 'tool') NOT NULL,
    `text` TEXT NULL,
    `content_json` JSON NULL,
    `provider_meta` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_message_conversation_id_seq_idx`(`conversation_id`, `seq`),
    UNIQUE INDEX `ai_message_conversation_id_seq_key`(`conversation_id`, `seq`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_tool_call` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `message_id` INTEGER NOT NULL,
    `idempotency_key` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `input` JSON NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `output` JSON NULL,
    `error` TEXT NULL,
    `external_id` VARCHAR(191) NULL,
    `started_at` DATETIME(3) NULL,
    `ended_at` DATETIME(3) NULL,

    INDEX `ai_tool_call_message_id_idx`(`message_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_global_context` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `resumeId` INTEGER NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ai_global_context_resumeId_idx`(`resumeId`),
    UNIQUE INDEX `ai_global_context_resumeId_key_key`(`resumeId`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_checkpointer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `thread_id` VARCHAR(191) NOT NULL,
    `checkpoint_id` VARCHAR(191) NOT NULL,
    `parent_checkpoint_id` VARCHAR(191) NULL,
    `state_json` JSON NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_checkpointer_thread_id_checkpoint_id_idx`(`thread_id`, `checkpoint_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ai_conversation` ADD CONSTRAINT `ai_conversation_resumeId_fkey` FOREIGN KEY (`resumeId`) REFERENCES `Resume`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_message` ADD CONSTRAINT `ai_message_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `ai_conversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_tool_call` ADD CONSTRAINT `ai_tool_call_message_id_fkey` FOREIGN KEY (`message_id`) REFERENCES `ai_message`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_global_context` ADD CONSTRAINT `ai_global_context_resumeId_fkey` FOREIGN KEY (`resumeId`) REFERENCES `Resume`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
