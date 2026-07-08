-- CreateTable
CREATE TABLE "level_definitions" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "min_xp" INTEGER NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "level_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "level_definitions_course_id_level_key" ON "level_definitions"("course_id", "level");

-- AddForeignKey
ALTER TABLE "level_definitions" ADD CONSTRAINT "level_definitions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
