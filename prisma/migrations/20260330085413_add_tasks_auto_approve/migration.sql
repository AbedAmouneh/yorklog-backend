-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('todo', 'in_progress', 'done');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'task_assigned';

-- DropForeignKey
ALTER TABLE "timesheet_entries" DROP CONSTRAINT "timesheet_entries_task_type_id_fkey";

-- AlterTable
ALTER TABLE "timesheet_entries" ADD COLUMN     "task_id" TEXT,
ALTER COLUMN "status" SET DEFAULT 'approved',
ALTER COLUMN "task_type_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" VARCHAR(500),
    "status" "TaskStatus" NOT NULL DEFAULT 'todo',
    "due_date" DATE,
    "estimated_hours" DOUBLE PRECISION,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "project_id" TEXT NOT NULL,
    "task_type_id" TEXT,
    "assigned_to_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_task_type_id_fkey" FOREIGN KEY ("task_type_id") REFERENCES "task_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_task_type_id_fkey" FOREIGN KEY ("task_type_id") REFERENCES "task_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
