-- CreateEnum
CREATE TYPE "degree" AS ENUM ('BACHELORS', 'LICENTIATE', 'TECHNOLOGY');

-- CreateEnum
CREATE TYPE "track_node_kind" AS ENUM ('CORE', 'BRANCH');

-- CreateEnum
CREATE TYPE "admin_role" AS ENUM ('SUPER_ADMIN', 'CAMPUS_ADMIN', 'COURSE_ADMIN');

-- CreateEnum
CREATE TYPE "enrollment_status" AS ENUM ('IN_PROGRESS', 'APPROVED', 'FAILED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "academic_status" AS ENUM ('ACTIVE', 'LOCKED', 'DROPPED_OUT', 'GRADUATED');

-- CreateTable
CREATE TABLE "campuses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "campus_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "degree" "degree" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "workload_hours" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curricula" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curricula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_entries" (
    "id" TEXT NOT NULL,
    "curriculum_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "period" INTEGER NOT NULL,
    "is_elective" BOOLEAN NOT NULL DEFAULT false,
    "elective_group" TEXT,

    CONSTRAINT "curriculum_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "icon" TEXT,
    "xp_reward" INTEGER NOT NULL DEFAULT 0,
    "criteria" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracks" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "track_nodes" (
    "id" TEXT NOT NULL,
    "track_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "kind" "track_node_kind" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "xp_reward" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "track_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "track_node_requirements" (
    "id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,

    CONSTRAINT "track_node_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "careers" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "careers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_track_nodes" (
    "career_id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,

    CONSTRAINT "career_track_nodes_pkey" PRIMARY KEY ("career_id","node_id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_assignments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "admin_role" NOT NULL,
    "campus_id" TEXT,
    "course_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "ra" TEXT NOT NULL,
    "admission_term" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "graduate_profiles" (
    "id" TEXT NOT NULL,
    "student_profile_id" TEXT NOT NULL,
    "company" TEXT,
    "job_title" TEXT,
    "linkedin_url" TEXT,
    "github_url" TEXT,
    "bio" TEXT,
    "mentorship_available" BOOLEAN NOT NULL DEFAULT false,
    "mentorship_areas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "show_in_showcase" BOOLEAN NOT NULL DEFAULT false,
    "graduated_term" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "graduate_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievement_progress" (
    "id" TEXT NOT NULL,
    "student_profile_id" TEXT NOT NULL,
    "achievement_id" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "unlocked_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievement_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "student_profile_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "status" "enrollment_status" NOT NULL,
    "grade" DECIMAL(4,2),
    "attendance" DECIMAL(5,2),
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_standings" (
    "id" TEXT NOT NULL,
    "student_profile_id" TEXT NOT NULL,
    "status" "academic_status" NOT NULL,
    "current_period" INTEGER,
    "gpa" DECIMAL(5,4),
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academic_standings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campuses_code_key" ON "campuses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "courses_campus_id_name_key" ON "courses"("campus_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_course_id_code_key" ON "subjects"("course_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "curricula_course_id_version_key" ON "curricula"("course_id", "version");

-- CreateIndex
CREATE INDEX "curriculum_entries_curriculum_id_period_idx" ON "curriculum_entries"("curriculum_id", "period");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_entries_curriculum_id_subject_id_key" ON "curriculum_entries"("curriculum_id", "subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_course_id_name_key" ON "achievements"("course_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "tracks_course_id_name_key" ON "tracks"("course_id", "name");

-- CreateIndex
CREATE INDEX "track_nodes_track_id_idx" ON "track_nodes"("track_id");

-- CreateIndex
CREATE UNIQUE INDEX "track_node_requirements_node_id_subject_id_key" ON "track_node_requirements"("node_id", "subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "careers_course_id_name_key" ON "careers"("course_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "admin_assignments_user_id_idx" ON "admin_assignments"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_user_id_key" ON "student_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_ra_key" ON "student_profiles"("ra");

-- CreateIndex
CREATE INDEX "student_profiles_course_id_idx" ON "student_profiles"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "graduate_profiles_student_profile_id_key" ON "graduate_profiles"("student_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "achievement_progress_student_profile_id_achievement_id_key" ON "achievement_progress"("student_profile_id", "achievement_id");

-- CreateIndex
CREATE INDEX "enrollments_subject_id_idx" ON "enrollments"("subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_student_profile_id_subject_id_term_key" ON "enrollments"("student_profile_id", "subject_id", "term");

-- CreateIndex
CREATE UNIQUE INDEX "academic_standings_student_profile_id_key" ON "academic_standings"("student_profile_id");

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_campus_id_fkey" FOREIGN KEY ("campus_id") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curricula" ADD CONSTRAINT "curricula_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_entries" ADD CONSTRAINT "curriculum_entries_curriculum_id_fkey" FOREIGN KEY ("curriculum_id") REFERENCES "curricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_entries" ADD CONSTRAINT "curriculum_entries_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_nodes" ADD CONSTRAINT "track_nodes_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_nodes" ADD CONSTRAINT "track_nodes_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "track_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_node_requirements" ADD CONSTRAINT "track_node_requirements_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "track_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_node_requirements" ADD CONSTRAINT "track_node_requirements_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "careers" ADD CONSTRAINT "careers_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_track_nodes" ADD CONSTRAINT "career_track_nodes_career_id_fkey" FOREIGN KEY ("career_id") REFERENCES "careers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_track_nodes" ADD CONSTRAINT "career_track_nodes_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "track_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_assignments" ADD CONSTRAINT "admin_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "graduate_profiles" ADD CONSTRAINT "graduate_profiles_student_profile_id_fkey" FOREIGN KEY ("student_profile_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_progress" ADD CONSTRAINT "achievement_progress_student_profile_id_fkey" FOREIGN KEY ("student_profile_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_progress" ADD CONSTRAINT "achievement_progress_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_profile_id_fkey" FOREIGN KEY ("student_profile_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_standings" ADD CONSTRAINT "academic_standings_student_profile_id_fkey" FOREIGN KEY ("student_profile_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
