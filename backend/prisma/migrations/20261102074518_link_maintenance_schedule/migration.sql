/*
  Warnings:

  - A unique constraint covering the columns `[schedule_id]` on the table `maintenance_records` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `maintenance_records` ADD COLUMN `schedule_id` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `maintenance_records_schedule_id_key` ON `maintenance_records`(`schedule_id`);

-- AddForeignKey
ALTER TABLE `maintenance_records` ADD CONSTRAINT `maintenance_records_schedule_id_fkey` FOREIGN KEY (`schedule_id`) REFERENCES `maintenance_schedules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
