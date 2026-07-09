// Seeds the minimum real dataset: campus Santa Helena + its 3 courses with
// the official curricula (source: prisma/data/santa-helena.json), the base
// gamification content (source: prisma/data/gamification-base.json) and the
// mocked logins used while there is no UTFPR integration (Fase 3 decision).
// Idempotent: safe to run repeatedly. Gamification content is create-only so
// re-seeding never overwrites what course coordinators edit via the admin
// panel (Fase 4).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import {
  type AcademicStatus,
  type AdminRole,
  type Degree,
  type Prisma,
  PrismaClient,
  type TrackNodeKind,
} from "../generated/prisma/client.js";
import { applyAcademicStanding } from "../src/server/academic-standing.js";

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

type GamificationFile = {
  courses: {
    course: string;
    achievements: {
      name: string;
      description: string;
      category: string;
      icon: string;
      xpReward: number;
      criteria: Prisma.InputJsonValue;
    }[];
    tracks: {
      name: string;
      description: string;
      nodes: {
        key: string;
        parent: string | null;
        kind: TrackNodeKind;
        name: string;
        description: string;
        icon: string;
        sortOrder: number;
        xpReward: number;
        requires: string[];
      }[];
    }[];
    careers: { name: string; description: string; nodes: string[] }[];
  }[];
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Default leveling table applied to every course; admins can reconfigure it
// per course later (Fase 4). minXp follows a triangular progression.
const DEFAULT_LEVELS = [
  "Calouro",
  "Iniciante",
  "Aprendiz",
  "Explorador",
  "Dedicado",
  "Veterano",
  "Especialista",
  "Mestre",
  "Lenda do Campus",
  "Formando",
].map((title, i) => ({ level: i + 1, minXp: 50 * i * (i + 1), title }));

// Mocked logins (Fase 3, 2026-07-08): real credential validation only comes
// with the UTFPR integration (Fase 8). One student per Santa Helena course
// plus one graduated alumna to exercise the aluno → egresso transition.
const MOCK_PASSWORD = "@teste123";

type MockStudent = {
  name: string;
  ra: string;
  course: string;
  admissionTerm: string;
  standing: {
    status: AcademicStatus;
    currentPeriod?: number;
    graduatedTerm?: string;
  };
};

const MOCK_STUDENTS: MockStudent[] = [
  {
    name: "Alex Silva Demo",
    ra: "a2587246",
    course: "Ciência da Computação",
    admissionTerm: "2023/1",
    standing: { status: "ACTIVE", currentPeriod: 5 },
  },
  {
    name: "Ana Carolina Ribeiro",
    ra: "a2601001",
    course: "Agronomia",
    admissionTerm: "2024/1",
    standing: { status: "ACTIVE", currentPeriod: 3 },
  },
  {
    name: "Bruno Ferreira Lima",
    ra: "a2601002",
    course: "Licenciatura em Ciências Biológicas",
    admissionTerm: "2025/1",
    standing: { status: "ACTIVE", currentPeriod: 2 },
  },
  {
    name: "Mariana Souza Campos",
    ra: "a2190001",
    course: "Ciência da Computação",
    admissionTerm: "2019/1",
    standing: { status: "GRADUATED", graduatedTerm: "2023/2" },
  },
];

function loadJson<T>(file: string): T {
  return JSON.parse(
    readFileSync(resolve(import.meta.dirname, "data", file), "utf8"),
  ) as T;
}

/// Creates/updates a user with a Better Auth credential account.
async function upsertCredentialUser(opts: {
  name: string;
  email: string;
  username?: string;
  password: string;
}) {
  const user = await prisma.user.upsert({
    where: { email: opts.email },
    update: { name: opts.name },
    create: {
      name: opts.name,
      email: opts.email,
      emailVerified: true,
      username: opts.username?.toLowerCase(),
      displayUsername: opts.username,
    },
  });

  const password = await hashPassword(opts.password);
  const account = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });
  if (account) {
    await prisma.account.update({
      where: { id: account.id },
      data: { password },
    });
  } else {
    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password,
      },
    });
  }
  return user;
}

async function grantAdminRole(
  userId: string,
  role: AdminRole,
  scope: { campusId?: string; courseId?: string } = {},
) {
  const existing = await prisma.adminAssignment.findFirst({
    where: {
      userId,
      role,
      campusId: scope.campusId ?? null,
      courseId: scope.courseId ?? null,
    },
  });
  if (!existing) {
    await prisma.adminAssignment.create({
      data: { userId, role, ...scope },
    });
  }
}

async function seedInstitution(data: SeedFile) {
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
      create: {
        campusId: campus.id,
        name: courseData.name,
        degree: courseData.degree,
      },
    });

    const curriculum = await prisma.curriculum.upsert({
      where: {
        courseId_version: {
          courseId: course.id,
          version: courseData.curriculumVersion,
        },
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
          curriculumId_subjectId: {
            curriculumId: curriculum.id,
            subjectId: subject.id,
          },
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

    for (const l of DEFAULT_LEVELS) {
      await prisma.levelDefinition.upsert({
        where: { courseId_level: { courseId: course.id, level: l.level } },
        update: {},
        create: { courseId: course.id, ...l },
      });
    }

    const count = await prisma.curriculumEntry.count({
      where: { curriculumId: curriculum.id },
    });
    console.log(
      `  ${course.name} (${course.degree}) — matriz ${curriculum.version}: ${count} disciplinas`,
    );
  }

  return campus;
}

/// Base gamification content per course. Create-only: coordinators own the
/// content after the first seed (they edit it via the admin panel, Fase 4).
async function seedGamification(data: GamificationFile) {
  for (const courseData of data.courses) {
    const course = await prisma.course.findFirst({
      where: { name: courseData.course },
    });
    if (!course) throw new Error(`Curso não encontrado: ${courseData.course}`);

    for (const a of courseData.achievements) {
      await prisma.achievement.upsert({
        where: { courseId_name: { courseId: course.id, name: a.name } },
        update: {},
        create: {
          courseId: course.id,
          name: a.name,
          description: a.description,
          category: a.category,
          icon: a.icon,
          xpReward: a.xpReward,
          criteria: a.criteria,
        },
      });
    }

    const nodeIdByKey = new Map<string, string>();
    for (const t of courseData.tracks) {
      const track = await prisma.track.upsert({
        where: { courseId_name: { courseId: course.id, name: t.name } },
        update: {},
        create: {
          courseId: course.id,
          name: t.name,
          description: t.description,
        },
      });

      // Nodes are listed parents-first in the JSON (validated by tests).
      for (const n of t.nodes) {
        let node = await prisma.trackNode.findFirst({
          where: { trackId: track.id, name: n.name },
        });
        if (!node) {
          node = await prisma.trackNode.create({
            data: {
              trackId: track.id,
              parentId: n.parent ? nodeIdByKey.get(n.parent) : null,
              kind: n.kind,
              name: n.name,
              description: n.description,
              icon: n.icon,
              sortOrder: n.sortOrder,
              xpReward: n.xpReward,
            },
          });
          for (const code of n.requires) {
            const subject = await prisma.subject.findUnique({
              where: { courseId_code: { courseId: course.id, code } },
            });
            if (!subject)
              throw new Error(
                `Disciplina não encontrada: ${code} (${course.name})`,
              );
            await prisma.trackNodeRequirement.create({
              data: { nodeId: node.id, subjectId: subject.id },
            });
          }
        }
        nodeIdByKey.set(n.key, node.id);
      }
    }

    for (const c of courseData.careers) {
      const career = await prisma.career.upsert({
        where: { courseId_name: { courseId: course.id, name: c.name } },
        update: {},
        create: {
          courseId: course.id,
          name: c.name,
          description: c.description,
        },
      });
      for (const key of c.nodes) {
        const nodeId = nodeIdByKey.get(key);
        if (!nodeId) throw new Error(`Nó de trilha não encontrado: ${key}`);
        await prisma.careerTrackNode.upsert({
          where: { careerId_nodeId: { careerId: career.id, nodeId } },
          update: {},
          create: { careerId: career.id, nodeId },
        });
      }
    }

    console.log(
      `  ${course.name}: ${courseData.achievements.length} conquistas, ` +
        `${courseData.tracks.length} trilha(s), ${courseData.careers.length} carreiras`,
    );
  }
}

async function seedUsers() {
  const adminEmail = process.env.SEED_SUPERADMIN_EMAIL ?? "admin@cea.local";
  const adminPassword = process.env.SEED_SUPERADMIN_PASSWORD ?? "@admin123";
  const admin = await upsertCredentialUser({
    name: "Administração CEA",
    email: adminEmail,
    password: adminPassword,
  });
  await grantAdminRole(admin.id, "SUPER_ADMIN");
  console.log(`  SUPER_ADMIN: ${adminEmail}`);

  for (const s of MOCK_STUDENTS) {
    const course = await prisma.course.findFirst({
      where: { name: s.course },
    });
    if (!course) throw new Error(`Curso não encontrado: ${s.course}`);

    const user = await upsertCredentialUser({
      name: s.name,
      email: `${s.ra}@aluno.mock.utfpr.edu.br`,
      username: s.ra,
      password: MOCK_PASSWORD,
    });

    const profile = await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: { courseId: course.id, admissionTerm: s.admissionTerm },
      create: {
        userId: user.id,
        courseId: course.id,
        ra: s.ra,
        admissionTerm: s.admissionTerm,
      },
    });

    // Mirrored standing goes through the same rule the future UTFPR sync
    // will use — GRADUATED creates the GraduateProfile automatically.
    await applyAcademicStanding(prisma, profile.id, {
      status: s.standing.status,
      currentPeriod: s.standing.currentPeriod ?? null,
      graduatedTerm: s.standing.graduatedTerm ?? null,
    });

    console.log(
      `  ${s.standing.status === "GRADUATED" ? "EGRESSO" : "ALUNO"}: ${s.name} (${s.ra}) — ${s.course}`,
    );
  }

  // Showcase data for the mocked alumna so Fase 7 has something to render.
  const alumna = await prisma.studentProfile.findUnique({
    where: { ra: "a2190001" },
    select: { graduateProfile: { select: { id: true } } },
  });
  if (alumna?.graduateProfile) {
    await prisma.graduateProfile.update({
      where: { id: alumna.graduateProfile.id },
      data: {
        company: "Cooperativa Agroindustrial Lar",
        jobTitle: "Desenvolvedora de Software",
        bio: "Egressa de Ciência da Computação, apaixonada por dados e agro-tech.",
        mentorshipAvailable: true,
        mentorshipAreas: ["Carreira em desenvolvimento", "Primeiro estágio"],
        showInShowcase: true,
      },
    });
  }
}

async function main() {
  await seedInstitution(loadJson<SeedFile>("santa-helena.json"));
  console.log("Gamificação (base inicial):");
  await seedGamification(loadJson<GamificationFile>("gamification-base.json"));
  console.log("Usuários (logins mockados até a integração UTFPR):");
  await seedUsers();
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
