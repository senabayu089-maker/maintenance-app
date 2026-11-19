-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `username` VARCHAR(50) NOT NULL,
    `email` VARCHAR(150) NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('ADMIN', 'TECHNICIAN', 'USER') NOT NULL DEFAULT 'USER',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pc_assets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `asset_code` VARCHAR(50) NOT NULL,
    `pc_name` VARCHAR(150) NOT NULL,
    `hostname` VARCHAR(150) NULL,
    `location` VARCHAR(150) NOT NULL,
    `department` VARCHAR(150) NULL,
    `assigned_to` VARCHAR(150) NULL,
    `processor` VARCHAR(150) NULL,
    `motherboard` VARCHAR(150) NULL,
    `ram` VARCHAR(100) NULL,
    `storage` VARCHAR(150) NULL,
    `gpu` VARCHAR(150) NULL,
    `operating_system` VARCHAR(150) NULL,
    `purchase_date` DATETIME(3) NULL,
    `warranty_end` DATETIME(3) NULL,
    `status` ENUM('ACTIVE', 'MAINTENANCE', 'BROKEN', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pc_assets_asset_code_key`(`asset_code`),
    INDEX `pc_assets_location_idx`(`location`),
    INDEX `pc_assets_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `maintenance_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `maintenance_code` VARCHAR(50) NOT NULL,
    `asset_id` INTEGER NOT NULL,
    `technician_id` INTEGER NOT NULL,
    `maintenance_date` DATETIME(3) NOT NULL,
    `maintenance_type` ENUM('PREVENTIVE', 'CORRECTIVE', 'TROUBLESHOOTING', 'HARDWARE_UPGRADE', 'SOFTWARE_MAINTENANCE') NOT NULL,
    `description` TEXT NOT NULL,
    `action_taken` TEXT NULL,
    `findings` TEXT NULL,
    `result` ENUM('NORMAL', 'NEEDS_REPAIR', 'WAITING_PARTS', 'NOT_OPERATIONAL') NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `next_maintenance_date` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `maintenance_records_maintenance_code_key`(`maintenance_code`),
    INDEX `maintenance_records_asset_id_idx`(`asset_id`),
    INDEX `maintenance_records_technician_id_idx`(`technician_id`),
    INDEX `maintenance_records_maintenance_date_idx`(`maintenance_date`),
    INDEX `maintenance_records_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `maintenance_signatures` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `maintenance_id` INTEGER NOT NULL,
    `signer_id` INTEGER NOT NULL,
    `signer_name` VARCHAR(150) NOT NULL,
    `signer_role` ENUM('TECHNICIAN', 'USER') NOT NULL,
    `signature_image` TEXT NOT NULL,
    `signed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `maintenance_signatures_maintenance_id_signer_role_key`(`maintenance_id`, `signer_role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `maintenance_schedules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `asset_id` INTEGER NOT NULL,
    `created_by_id` INTEGER NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `scheduled_date` DATETIME(3) NOT NULL,
    `repeat_months` INTEGER NULL,
    `status` ENUM('SCHEDULED', 'COMPLETED', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `maintenance_schedules_scheduled_date_status_idx`(`scheduled_date`, `status`),
    INDEX `maintenance_schedules_asset_id_idx`(`asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `maintenance_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `maintenance_id` INTEGER NOT NULL,
    `changed_by` INTEGER NOT NULL,
    `old_status` ENUM('PENDING', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'CANCELLED') NULL,
    `new_status` ENUM('PENDING', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'CANCELLED') NOT NULL,
    `remarks` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `maintenance_history_maintenance_id_idx`(`maintenance_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `maintenance_records` ADD CONSTRAINT `maintenance_records_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `pc_assets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_records` ADD CONSTRAINT `maintenance_records_technician_id_fkey` FOREIGN KEY (`technician_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_signatures` ADD CONSTRAINT `maintenance_signatures_maintenance_id_fkey` FOREIGN KEY (`maintenance_id`) REFERENCES `maintenance_records`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_signatures` ADD CONSTRAINT `maintenance_signatures_signer_id_fkey` FOREIGN KEY (`signer_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_schedules` ADD CONSTRAINT `maintenance_schedules_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `pc_assets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_schedules` ADD CONSTRAINT `maintenance_schedules_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_history` ADD CONSTRAINT `maintenance_history_maintenance_id_fkey` FOREIGN KEY (`maintenance_id`) REFERENCES `maintenance_records`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
