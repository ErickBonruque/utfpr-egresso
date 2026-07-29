// Revisão da Fase 7: "egresso não acessa funções de aluno e vice-versa".
//
// Leitura da regra à luz da decisão da Fase 7 (o egresso é um aluno com
// extras e reaproveita `/painel`): o que precisa ficar separado são as
// funções que de fato pertencem a um papel só —
//   · perfil de egresso  → só quem já se formou escreve;
//   · funções de admin   → nenhum aluno/egresso alcança;
//   · portal do aluno    → admin sem StudentProfile fica de fora.
import { describe, expect, it } from "vitest";
import {
  type Actor,
  canAccessStudentPortal,
  canEditGraduateProfile,
  canGrantAdmin,
  canManageCampus,
  canManageCourse,
  canViewStudent,
  isAdmin,
  primaryRole,
} from "../src/lib/authz";

const CAMPUS = "campus-sh";
const COURSE = { id: "course-eng", campusId: CAMPUS };

function actor(partial: Partial<Actor>): Actor {
  return { userId: "u1", grants: [], student: null, ...partial };
}

const aluno = actor({
  student: {
    profileId: "sp-aluno",
    courseId: COURSE.id,
    campusId: CAMPUS,
    isGraduate: false,
  },
});
const egresso = actor({
  userId: "u2",
  student: {
    profileId: "sp-egresso",
    courseId: COURSE.id,
    campusId: CAMPUS,
    isGraduate: true,
  },
});
const admin = actor({
  userId: "u3",
  grants: [{ role: "SUPER_ADMIN", campusId: null, courseId: null }],
});
/// Admin que também estuda: o sistema permite (grants e StudentProfile são
/// independentes), então os guards têm de valer para os dois lados.
const adminAluno = actor({
  userId: "u4",
  grants: [{ role: "COURSE_ADMIN", campusId: null, courseId: COURSE.id }],
  student: {
    profileId: "sp-admin",
    courseId: COURSE.id,
    campusId: CAMPUS,
    isGraduate: false,
  },
});

describe("perfil de egresso", () => {
  it("só o egresso edita o próprio perfil de egresso", () => {
    expect(canEditGraduateProfile(egresso)).toBe(true);
    expect(canEditGraduateProfile(aluno)).toBe(false);
  });

  it("admin não edita perfil de egresso pelo portal", () => {
    expect(canEditGraduateProfile(admin)).toBe(false);
    expect(canEditGraduateProfile(adminAluno)).toBe(false);
  });
});

describe("portal do aluno", () => {
  it("aluno e egresso entram (o egresso reaproveita /painel)", () => {
    expect(canAccessStudentPortal(aluno)).toBe(true);
    expect(canAccessStudentPortal(egresso)).toBe(true);
  });

  it("admin sem perfil de aluno não entra", () => {
    expect(canAccessStudentPortal(admin)).toBe(false);
    expect(canAccessStudentPortal(adminAluno)).toBe(true);
  });
});

describe("funções de admin ficam fora do alcance do egresso", () => {
  it("egresso não é admin nem gerencia campus/curso", () => {
    expect(isAdmin(egresso)).toBe(false);
    expect(canManageCampus(egresso, CAMPUS)).toBe(false);
    expect(canManageCourse(egresso, COURSE)).toBe(false);
  });

  it("egresso não concede papel de admin (escalada bloqueada)", () => {
    expect(
      canGrantAdmin(egresso, {
        role: "COURSE_ADMIN",
        campusId: null,
        courseId: COURSE.id,
      }),
    ).toBe(false);
  });

  it("egresso vê a si mesmo, não o histórico de outro aluno", () => {
    expect(
      canViewStudent(egresso, { profileId: "sp-egresso", course: COURSE }),
    ).toBe(true);
    expect(
      canViewStudent(egresso, { profileId: "sp-aluno", course: COURSE }),
    ).toBe(false);
  });

  it("formar-se não muda nada de privilégio administrativo", () => {
    expect(primaryRole(aluno)).toBe("ALUNO");
    expect(primaryRole(egresso)).toBe("EGRESSO");
    expect(isAdmin(aluno)).toBe(isAdmin(egresso));
    expect(canManageCourse(aluno, COURSE)).toBe(
      canManageCourse(egresso, COURSE),
    );
  });
});
