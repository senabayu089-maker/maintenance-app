-- DropForeignKey
ALTER TABLE `maintenance_signatures` DROP FOREIGN KEY `maintenance_signatures_signer_id_fkey`;

-- DropIndex
DROP INDEX `maintenance_signatures_signer_id_fkey` ON `maintenance_signatures`;

-- AlterTable
ALTER TABLE `maintenance_signatures` MODIFY `signer_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `maintenance_signatures` ADD CONSTRAINT `maintenance_signatures_signer_id_fkey` FOREIGN KEY (`signer_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
