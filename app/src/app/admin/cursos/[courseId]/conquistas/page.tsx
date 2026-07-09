import { ConfirmButton } from "@/components/admin/confirm-button";
import { CriteriaBuilder } from "@/components/admin/criteria-builder";
import { FormDialog } from "@/components/admin/form-dialog";
import { GamIcon } from "@/components/admin/gam-icon";
import { IconPicker } from "@/components/admin/icon-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type Criteria,
  describeCriteria,
  validateCriteria,
} from "@/lib/criteria";
import { requireManageableCourse } from "@/server/admin-scope";
import { prisma } from "@/server/db";
import {
  createAchievement,
  deleteAchievement,
  toggleAchievementActive,
  updateAchievement,
} from "./actions";

export const dynamic = "force-dynamic";

function safeCriteria(value: unknown): Criteria | null {
  if (value == null) return null;
  try {
    return validateCriteria(value);
  } catch {
    return null;
  }
}

function AchievementFields({
  categories,
  subjects,
  defaults,
}: {
  categories: string[];
  subjects: { code: string; name: string }[];
  defaults?: {
    name: string;
    description: string;
    category: string;
    icon: string | null;
    xpReward: number;
    criteria: Criteria | null;
  };
}) {
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" defaultValue={defaults?.name} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="xpReward">XP</Label>
          <Input
            id="xpReward"
            name="xpReward"
            type="number"
            min={0}
            defaultValue={defaults?.xpReward ?? 50}
            required
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={defaults?.description}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category">Categoria</Label>
        <Input
          id="category"
          name="category"
          list="achievement-categories"
          placeholder="Acadêmica, Programação, Marcos…"
          defaultValue={defaults?.category}
          required
        />
        <datalist id="achievement-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Ícone</Label>
        <IconPicker defaultValue={defaults?.icon} />
      </div>
      <CriteriaBuilder
        subjects={subjects}
        defaultCriteria={defaults?.criteria ?? null}
      />
    </>
  );
}

export default async function CourseAchievementsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  await requireManageableCourse(courseId);

  const [achievements, subjects] = await Promise.all([
    prisma.achievement.findMany({
      where: { courseId },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.subject.findMany({
      where: { courseId },
      orderBy: { code: "asc" },
      select: { code: true, name: true },
    }),
  ]);

  const categories = [...new Set(achievements.map((a) => a.category))];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          {achievements.length} conquista(s). O critério de desbloqueio é
          avaliado pelo motor de gamificação (Fase 6) sobre as matrículas dos
          alunos.
        </p>
        <FormDialog
          wide
          title="Nova conquista"
          submitLabel="Criar conquista"
          action={createAchievement.bind(null, courseId)}
          trigger={<Button>Nova conquista</Button>}
        >
          <AchievementFields categories={categories} subjects={subjects} />
        </FormDialog>
      </div>

      {categories.map((category) => (
        <section key={category} className="flex flex-col gap-2">
          <h2 className="font-medium text-sm">{category}</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {achievements
              .filter((a) => a.category === category)
              .map((achievement) => {
                const criteria = safeCriteria(achievement.criteria);
                return (
                  <Card
                    key={achievement.id}
                    className={achievement.isActive ? undefined : "opacity-60"}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <GamIcon name={achievement.icon} />
                        </span>
                        <CardTitle className="text-base">
                          {achievement.name}
                        </CardTitle>
                        <Badge variant="secondary" className="ml-auto shrink-0">
                          {achievement.xpReward} XP
                        </Badge>
                        {!achievement.isActive ? (
                          <Badge variant="outline">Inativa</Badge>
                        ) : null}
                      </div>
                      <CardDescription>
                        {achievement.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-xs">
                        {describeCriteria(criteria)}
                      </p>
                    </CardContent>
                    <CardFooter className="gap-2">
                      <FormDialog
                        wide
                        title={`Editar ${achievement.name}`}
                        action={updateAchievement.bind(null, achievement.id)}
                        trigger={
                          <Button variant="outline" size="sm">
                            Editar
                          </Button>
                        }
                      >
                        <AchievementFields
                          categories={categories}
                          subjects={subjects}
                          defaults={{
                            name: achievement.name,
                            description: achievement.description,
                            category: achievement.category,
                            icon: achievement.icon,
                            xpReward: achievement.xpReward,
                            criteria,
                          }}
                        />
                      </FormDialog>
                      <ConfirmButton
                        action={toggleAchievementActive.bind(
                          null,
                          achievement.id,
                        )}
                        confirmMessage={`${achievement.isActive ? "Desativar" : "Ativar"} a conquista "${achievement.name}"?`}
                      >
                        {achievement.isActive ? "Desativar" : "Ativar"}
                      </ConfirmButton>
                      <ConfirmButton
                        action={deleteAchievement.bind(null, achievement.id)}
                        confirmMessage={`Excluir "${achievement.name}"? O progresso dos alunos nesta conquista será apagado. Prefira desativar.`}
                      >
                        Excluir
                      </ConfirmButton>
                    </CardFooter>
                  </Card>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
