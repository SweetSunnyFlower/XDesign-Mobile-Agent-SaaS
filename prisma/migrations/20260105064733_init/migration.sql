-- CreateTable
CREATE TABLE `Project` (
    `_id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `theme` VARCHAR(191) NULL,
    `thumbnail` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Frame` (
    `_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `htmlContent` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Frame` ADD CONSTRAINT `Frame_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
