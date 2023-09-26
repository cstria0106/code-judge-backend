/*
  Warnings:

  - Made the column `memoryLimit` on table `Problem` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `Problem` MODIFY `memoryLimit` INTEGER NOT NULL DEFAULT 134217728;
