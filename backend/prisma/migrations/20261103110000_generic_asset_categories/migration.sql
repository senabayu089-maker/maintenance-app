-- =====================================================
-- MIGRATION: GENERIC ASSET AND ASSET CATEGORIES
-- =====================================================

-- 1. Hapus seluruh data maintenance lama
DELETE FROM `maintenance_history`;

DELETE FROM `maintenance_signatures`;

DELETE FROM `maintenance_records`;

DELETE FROM `maintenance_schedules`;


-- 2. Lepaskan foreign key inventaris lama
ALTER TABLE `maintenance_records`
DROP FOREIGN KEY `maintenance_records_asset_id_fkey`;

ALTER TABLE `maintenance_schedules`
DROP FOREIGN KEY `maintenance_schedules_asset_id_fkey`;


-- 3. Hapus tabel inventaris lama
DROP TABLE `pc_assets`;


-- 4. Buat tabel kategori aset
CREATE TABLE `asset_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `asset_categories_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


-- 5. Buat tabel aset generik
CREATE TABLE `assets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `asset_code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `category_id` INTEGER NOT NULL,
    `brand` VARCHAR(150) NULL,
    `model` VARCHAR(150) NULL,
    `serial_number` VARCHAR(150) NULL,
    `location` VARCHAR(150) NULL,
    `department` VARCHAR(150) NULL,
    `assigned_to` VARCHAR(150) NULL,
    `purchase_date` DATETIME(3) NULL,
    `warranty_end` DATETIME(3) NULL,
    `status` ENUM('ACTIVE', 'MAINTENANCE', 'BROKEN', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `specifications` JSON NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `assets_asset_code_key`(`asset_code`),
    INDEX `assets_category_id_idx`(`category_id`),
    INDEX `assets_location_idx`(`location`),
    INDEX `assets_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


-- 6. Hubungkan aset dengan kategori
ALTER TABLE `assets`
ADD CONSTRAINT `assets_category_id_fkey`
FOREIGN KEY (`category_id`)
REFERENCES `asset_categories`(`id`)
ON DELETE RESTRICT
ON UPDATE CASCADE;


-- 7. Hubungkan maintenance dengan tabel assets
ALTER TABLE `maintenance_records`
ADD CONSTRAINT `maintenance_records_asset_id_fkey`
FOREIGN KEY (`asset_id`)
REFERENCES `assets`(`id`)
ON DELETE RESTRICT
ON UPDATE CASCADE;


ALTER TABLE `maintenance_schedules`
ADD CONSTRAINT `maintenance_schedules_asset_id_fkey`
FOREIGN KEY (`asset_id`)
REFERENCES `assets`(`id`)
ON DELETE RESTRICT
ON UPDATE CASCADE;


-- 8. Tambahkan kategori awal
INSERT INTO `asset_categories`
    (`name`, `description`, `is_active`, `created_at`, `updated_at`)
VALUES
    ('PC', 'Personal Computer dan perangkat komputer', 1, NOW(3), NOW(3)),
    ('Printer', 'Printer dan perangkat pencetakan', 1, NOW(3), NOW(3)),
    ('Alat Kesehatan', 'Peralatan medis dan kesehatan', 1, NOW(3), NOW(3)),
    ('UPS', 'Uninterruptible Power Supply', 1, NOW(3), NOW(3)),
    ('Perangkat Jaringan', 'Router, switch, access point, dan perangkat jaringan', 1, NOW(3), NOW(3));