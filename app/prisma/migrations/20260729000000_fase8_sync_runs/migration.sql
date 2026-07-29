-- CreateEnum
CREATE TYPE "sync_run_status" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');

-- CreateTable
CREATE TABLE "sync_runs" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "sync_run_status" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "students_processed" INTEGER NOT NULL DEFAULT 0,
    "students_skipped" INTEGER NOT NULL DEFAULT 0,
    "students_failed" INTEGER NOT NULL DEFAULT 0,
    "enrollments_created" INTEGER NOT NULL DEFAULT 0,
    "enrollments_updated" INTEGER NOT NULL DEFAULT 0,
    "standings_updated" INTEGER NOT NULL DEFAULT 0,
    "triggered_by" TEXT NOT NULL,
    "triggered_by_user_id" TEXT,
    "message" TEXT,

    CONSTRAINT "sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sync_runs_started_at_idx" ON "sync_runs"("started_at");

