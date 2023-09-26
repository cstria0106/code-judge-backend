/*
  Warnings:

  - You are about to alter the column `memoryLimit` on the `Problem` table. The data in that column could be lost. The data in that column will be cast from `Int` to `UnsignedBigInt`.
  - You are about to alter the column `timeLimit` on the `Problem` table. The data in that column could be lost. The data in that column will be cast from `Int` to `UnsignedInt`.

*/
-- AlterTable
ALTER TABLE `Problem` MODIFY `memoryLimit` BIGINT UNSIGNED NOT NULL DEFAULT 128000000,
    MODIFY `timeLimit` INTEGER UNSIGNED NOT NULL DEFAULT 3000;
