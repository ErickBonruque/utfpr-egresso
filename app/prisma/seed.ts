// Seeds the minimum real dataset: campus Santa Helena + its 3 courses with
// the official curricula (source: prisma/data/santa-helena.json).
// Idempotent: safe to run repeatedly (upserts everywhere).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Degree } from "../generated/prisma/client.js";

type SeedSubject = {
  code: string;
  name: string;
  workloadHours: number;
  period: number;
  isElective: boolean;
  electiveGroup: string | null;
};

type SeedFile = {
  campus: { code: string; name: string; city: string };
  courses: {
    name: string;
    degree: Degree;
    curriculumVersion: string;
    subjects: SeedSubject[];
  }[];
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const data: SeedFile = JSON.parse(
    readFileSync(resolve(import.meta.dirname, "data/santa-helena.json"), "utf8"),
  );

  const campus = await prisma.campus.upsert({
    where: { code: data.campus.code },
    update: { name: data.campus.name, city: data.campus.city },
    create: { ...data.campus },
  });
  console.log(`Campus ${campus.name} (${campus.code})`);

  for (const courseData of data.courses) {
    const course = await prisma.course.upsert({
      where: { campusId_name: { campusId: campus.id, name: courseData.name } },
      update: { degree: courseData.degree },
      create: { campusId: campus.id, name: courseData.name, degree: courseData.degree },
    });

    const curriculum = await prisma.curriculum.upsert({
      where: {
        courseId_version: { courseId: course.id, version: courseData.curriculumVersion },
      },
      update: {},
      create: { courseId: course.id, version: courseData.curriculumVersion },
    });

    for (const s of courseData.subjects) {
      const subject = await prisma.subject.upsert({
        where: { courseId_code: { courseId: course.id, code: s.code } },
        update: { name: s.name, workloadHours: s.workloadHours },
        create: {
          courseId: course.id,
          code: s.code,
          name: s.name,
          workloadHours: s.workloadHours,
        },
      });

      await prisma.curriculumEntry.upsert({
        where: {
          curriculumId_subjectId: { curriculumId: curriculum.id, subjectId: subject.id },
        },
        update: {
          period: s.period,
          isElective: s.isElective,
          electiveGroup: s.electiveGroup,
        },
        create: {
          curriculumId: curriculum.id,
          subjectId: subject.id,
          period: s.period,
          isElective: s.isElective,
          electiveGroup: s.electiveGroup,
        },
      });
    }

    const count = await prisma.curriculumEntry.count({
      where: { curriculumId: curriculum.id },
    });
    console.log(
      `  ${course.name} (${course.degree}) — matriz ${curriculum.version}: ${count} disciplinas`,
    );
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
