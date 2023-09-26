/*
  Warnings:

  - Made the column `timeLimit` on table `Problem` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `Problem` MODIFY `timeLimit` INTEGER NOT NULL DEFAULT 3000;
