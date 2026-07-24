// Student progress view model (Fase 6): loads the UTFPR mirror + the course
// gamification config, runs the pure engine (src/lib/engine.ts) and persists
// achievement unlocks. One query batch per request, deduped with React
// cache() so layout and page share the same load.

import { cache } from "react";
import type { CareerTreeNode } from "@/lib/career-tree";
import { type Criteria, validateCriteria } from "@/lib/criteria";
import {
  evaluateCriteria,
  type LevelResolution,
  resolveLevel,
  resolveNodeStates,
} from "@/lib/engine";
import { requireStudent } from "@/server/actor";
import { prisma } from "@/server/db";

export type AchievementView = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string | null;
  xpReward: number;
  criteria: Criteria | null;
  state: "unlocked" | "in-progress" | "locked";
  progress: number;
  unlockedAt: Date | null;
};

export type TrackNodeDetail = {
  id: string;
  name: string;
  description: string | null;
  xpReward: number;
  state: "done" | "in-progress" | "locked";
  progress: number;
  requirements: { subjectName: string; code: string; approved: boolean }[];
  careers: string[];
};

export type CurriculumPeriodView = {
  period: number;
  entries: {
    code: string;
    name: string;
    workloadHours: number;
    isElective: boolean;
    status: "APPROVED" | "IN_PROGRESS" | "FAILED" | "PENDING";
  }[];
};

export type TermHistoryView = {
  term: string;
  entries: {
    code: string;
    name: string;
    status: "APPROVED" | "IN_PROGRESS" | "FAILED" | "WITHDRAWN";
    grade: number | null;
    attendance: number | null;
  }[];
};

export type StudentProgress = {
  profile: {
    id: string;
    name: string;
    ra: string;
    admissionTerm: string | null;
    bio: string | null;
    linkedinUrl: string | null;
    githubUrl: string | null;
    isGraduate: boolean;
  };
  course: { id: string; name: string; campusName: string };
  standing: {
    status: "ACTIVE" | "LOCKED" | "DROPPED_OUT" | "GRADUATED" | null;
    currentPeriod: number | null;
    /// CR na escala 0–10 (o espelho guarda 0–1).
    gpa: number | null;
  };
  workload: { approvedHours: number; totalHours: number; pct: number };
  xp: { total: number; level: LevelResolution };
  achievements: AchievementView[];
  tracks: {
    id: string;
    name: string;
    description: string | null;
    nodes: CareerTreeNode[];
    details: Map<string, TrackNodeDetail>;
  }[];
  curriculum: CurriculumPeriodView[];
  history: TermHistoryView[];
};

/// Loads and computes everything the student portal renders. Also syncs the
/// AchievementProgress table (create/update on change) so unlockedAt is
/// stable — the engine recomputes state, the row remembers when it happened.
export const getStudentProgress = cache(async (): Promise<StudentProgress> => {
  const actor = await requireStudent();
  // requireStudent guarantees actor.student.
  const profileId = actor.student?.profileId as string;

  const profile = await prisma.studentProfile.findUniqueOrThrow({
    where: { id: profileId },
    include: {
      user: { select: { name: true } },
      course: { include: { campus: { select: { name: true } } } },
      academicStanding: true,
      graduateProfile: { select: { id: true } },
      enrollments: {
        include: { subject: { select: { code: true, name: true } } },
      },
      achievementProgress: true,
    },
  });

  const [curriculum, achievements, tracks, levels] = await Promise.all([
    prisma.curriculum.findFirst({
      where: { courseId: profile.courseId, isActive: true },
      include: {
        entries: {
          include: {
            subject: {
              select: { code: true, name: true, workloadHours: true },
            },
          },
          orderBy: [{ period: "asc" }],
        },
      },
    }),
    prisma.achievement.findMany({
      where: { courseId: profile.courseId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.track.findMany({
      where: { courseId: profile.courseId },
      orderBy: { name: "asc" },
      include: {
        nodes: {
          orderBy: { sortOrder: "asc" },
          include: {
            requirements: {
              include: {
                subject: { select: { code: true, name: true } },
              },
            },
            careers: {
              include: { career: { select: { name: true } } },
            },
          },
        },
      },
    }),
    prisma.levelDefinition.findMany({
      where: { courseId: profile.courseId },
      orderBy: { level: "asc" },
    }),
  ]);

  // ── Facts from the mirror ────────────────────────────────────────────
  const approvedSubjectCodes = new Set(
    profile.enrollments
      .filter((e) => e.status === "APPROVED")
      .map((e) => e.subject.code),
  );

  const statusBySubjectCode = new Map<string, string>();
  for (const e of profile.enrollments) {
    const previous = statusBySubjectCode.get(e.subject.code);
    // APPROVED wins over a past FAILED; IN_PROGRESS over FAILED.
    if (previous === "APPROVED") continue;
    if (previous === "IN_PROGRESS" && e.status === "FAILED") continue;
    statusBySubjectCode.set(e.subject.code, e.status);
  }

  // ── Workload (% of mandatory hours approved) ─────────────────────────
  const mandatory = (curriculum?.entries ?? []).filter((e) => !e.isElective);
  const totalHours = mandatory.reduce(
    (sum, e) => sum + e.subject.workloadHours,
    0,
  );
  const approvedHours = mandatory
    .filter((e) => approvedSubjectCodes.has(e.subject.code))
    .reduce((sum, e) => sum + e.subject.workloadHours, 0);
  const workloadPct =
    totalHours === 0 ? 0 : Math.round((approvedHours / totalHours) * 100);

  // ── Best grade per subject (0–10, highest across attempts) ───────────
  const bestGradeBySubject = new Map<string, number>();
  for (const e of profile.enrollments) {
    if (e.grade === null) continue;
    const grade = Number(e.grade);
    const previous = bestGradeBySubject.get(e.subject.code);
    if (previous === undefined || grade > previous) {
      bestGradeBySubject.set(e.subject.code, grade);
    }
  }

  // ── Periods fully approved (every mandatory subject of the period has
  //    an APPROVED enrollment). Drives the approved_full_period criteria.
  const mandatoryByPeriod = new Map<number, Set<string>>();
  for (const entry of mandatory) {
    let set = mandatoryByPeriod.get(entry.period);
    if (!set) {
      set = new Set();
      mandatoryByPeriod.set(entry.period, set);
    }
    set.add(entry.subject.code);
  }
  const fullyApprovedPeriods = new Set<number>();
  for (const [period, codes] of mandatoryByPeriod) {
    let all = true;
    for (const code of codes) {
      if (!approvedSubjectCodes.has(code)) {
        all = false;
        break;
      }
    }
    if (all && codes.size > 0) fullyApprovedPeriods.add(period);
  }

  const gpa =
    profile.academicStanding?.gpa == null
      ? null
      : Number(profile.academicStanding.gpa) * 10;

  const facts = {
    approvedSubjectCodes,
    bestGradeBySubject,
    gpa,
    currentPeriod: profile.academicStanding?.currentPeriod ?? null,
    workloadPct,
    fullyApprovedPeriods,
  };

  // ── Achievements ─────────────────────────────────────────────────────
  const progressRows = new Map(
    profile.achievementProgress.map((p) => [p.achievementId, p]),
  );
  const achievementViews: AchievementView[] = [];
  const syncOps: Promise<unknown>[] = [];

  for (const achievement of achievements) {
    let criteria: Criteria | null = null;
    if (achievement.criteria !== null) {
      try {
        criteria = validateCriteria(achievement.criteria);
      } catch {
        criteria = null; // corrupt/legacy criteria behaves as manual
      }
    }

    const row = progressRows.get(achievement.id);
    const manuallyUnlocked = criteria === null && row?.unlockedAt != null;
    const evaluation = evaluateCriteria(criteria, facts);
    const unlocked = evaluation.met || manuallyUnlocked;
    const progress = manuallyUnlocked ? 100 : evaluation.progress;

    const unlockedAt = unlocked ? (row?.unlockedAt ?? new Date()) : null;
    if (
      row === undefined ||
      row.progress !== progress ||
      (row.unlockedAt === null) !== (unlockedAt === null)
    ) {
      syncOps.push(
        prisma.achievementProgress.upsert({
          where: {
            studentProfileId_achievementId: {
              studentProfileId: profile.id,
              achievementId: achievement.id,
            },
          },
          update: { progress, unlockedAt },
          create: {
            studentProfileId: profile.id,
            achievementId: achievement.id,
            progress,
            unlockedAt,
          },
        }),
      );
    }

    achievementViews.push({
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      category: achievement.category,
      icon: achievement.icon,
      xpReward: achievement.xpReward,
      criteria,
      state: unlocked ? "unlocked" : progress > 0 ? "in-progress" : "locked",
      progress,
      unlockedAt,
    });
  }
  await Promise.all(syncOps);

  // ── Tracks ───────────────────────────────────────────────────────────
  let nodeXp = 0;
  const trackViews = tracks.map((track) => {
    const states = resolveNodeStates(
      track.nodes.map((n) => ({
        id: n.id,
        parentId: n.parentId,
        requiredSubjectCodes: n.requirements.map((r) => r.subject.code),
      })),
      facts,
    );

    const nodes: CareerTreeNode[] = [];
    const details = new Map<string, TrackNodeDetail>();
    for (const node of track.nodes) {
      // biome-ignore lint/style/noNonNullAssertion: resolveNodeStates covers every input node
      const evaluation = states.get(node.id)!;
      if (evaluation.state === "done") nodeXp += node.xpReward;
      nodes.push({
        id: node.id,
        parentId: node.parentId,
        title: node.name,
        subtitle: node.description,
        icon: node.icon,
        xp: node.xpReward,
        state: evaluation.state,
        progress: evaluation.progress,
      });
      details.set(node.id, {
        id: node.id,
        name: node.name,
        description: node.description,
        xpReward: node.xpReward,
        state: evaluation.state,
        progress: evaluation.progress,
        requirements: node.requirements.map((r) => ({
          subjectName: r.subject.name,
          code: r.subject.code,
          approved: approvedSubjectCodes.has(r.subject.code),
        })),
        careers: node.careers.map((c) => c.career.name),
      });
    }
    return {
      id: track.id,
      name: track.name,
      description: track.description,
      nodes,
      details,
    };
  });

  // ── XP & level ───────────────────────────────────────────────────────
  const achievementXp = achievementViews
    .filter((a) => a.state === "unlocked")
    .reduce((sum, a) => sum + a.xpReward, 0);
  const totalXp = achievementXp + nodeXp;
  const level = resolveLevel(levels, totalXp);

  // ── Curriculum map ───────────────────────────────────────────────────
  const periods = new Map<number, CurriculumPeriodView>();
  for (const entry of curriculum?.entries ?? []) {
    const view = periods.get(entry.period) ?? {
      period: entry.period,
      entries: [],
    };
    view.entries.push({
      code: entry.subject.code,
      name: entry.subject.name,
      workloadHours: entry.subject.workloadHours,
      isElective: entry.isElective,
      status:
        (statusBySubjectCode.get(entry.subject.code) as
          | "APPROVED"
          | "IN_PROGRESS"
          | "FAILED"
          | undefined) ?? "PENDING",
    });
    periods.set(entry.period, view);
  }

  // ── History by term ──────────────────────────────────────────────────
  const terms = new Map<string, TermHistoryView>();
  for (const e of profile.enrollments) {
    const view = terms.get(e.term) ?? { term: e.term, entries: [] };
    view.entries.push({
      code: e.subject.code,
      name: e.subject.name,
      status: e.status,
      grade: e.grade === null ? null : Number(e.grade),
      attendance: e.attendance === null ? null : Number(e.attendance),
    });
    terms.set(e.term, view);
  }
  for (const view of terms.values()) {
    view.entries.sort((a, b) => a.code.localeCompare(b.code));
  }

  return {
    profile: {
      id: profile.id,
      name: profile.user.name,
      ra: profile.ra,
      admissionTerm: profile.admissionTerm,
      bio: profile.bio,
      linkedinUrl: profile.linkedinUrl,
      githubUrl: profile.githubUrl,
      isGraduate: profile.graduateProfile !== null,
    },
    course: {
      id: profile.course.id,
      name: profile.course.name,
      campusName: profile.course.campus.name,
    },
    standing: {
      status: profile.academicStanding?.status ?? null,
      currentPeriod: facts.currentPeriod,
      gpa,
    },
    workload: {
      approvedHours,
      totalHours,
      pct: workloadPct,
    },
    xp: { total: totalXp, level },
    achievements: achievementViews,
    tracks: trackViews,
    curriculum: [...periods.values()].sort((a, b) => a.period - b.period),
    history: [...terms.values()].sort((a, b) => b.term.localeCompare(a.term)),
  };
});
