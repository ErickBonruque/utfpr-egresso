import { ExternalLink, Mail, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export type GraduateCardData = {
  name: string;
  bio: string | null;
  jobTitle: string | null;
  company: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  contactEmail: string | null;
  mentorshipAvailable: boolean;
  mentorshipAreas: string[];
  graduatedTerm: string | null;
  courseName: string;
  campusName: string;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

/// One alumni card in the showcase (Fase 7). Mirrors the Fase 5 wireframe
/// (section 06): avatar with initials, name, course + graduation term,
/// job/company, mentorship tag, LinkedIn + contact buttons.
export function GraduateCard({ g }: { g: GraduateCardData }) {
  return (
    <Card className="h-full">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <Avatar className="size-11">
            <AvatarFallback className="bg-brand font-heading font-semibold text-brand-foreground">
              {initials(g.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="truncate font-semibold">{g.name}</p>
            <p className="text-muted-foreground text-xs">
              {g.courseName}
              {g.graduatedTerm ? ` · ${g.graduatedTerm}` : ""}
            </p>
            <p className="text-muted-foreground text-xs">
              Campus {g.campusName}
            </p>
          </div>
        </div>

        {(g.jobTitle || g.company) && (
          <p className="text-sm">
            {g.jobTitle ?? ""}
            {g.jobTitle && g.company ? " · " : ""}
            {g.company ?? ""}
          </p>
        )}

        {g.bio && (
          <p className="line-clamp-3 text-muted-foreground text-sm">{g.bio}</p>
        )}

        {g.mentorshipAvailable && (
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="gap-1">
              <MessageCircle className="size-3" aria-hidden />
              Disponível p/ mentoria
            </Badge>
            {g.mentorshipAreas.map((area) => (
              <Badge key={area} variant="outline" className="font-normal">
                {area}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {g.linkedinUrl && (
            <a
              href={g.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ExternalLink className="size-4" aria-hidden />
              LinkedIn
            </a>
          )}
          {g.githubUrl && (
            <a
              href={g.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ExternalLink className="size-4" aria-hidden />
              GitHub
            </a>
          )}
          {g.contactEmail && (
            <a
              href={`mailto:${g.contactEmail}`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Mail className="size-4" aria-hidden />
              Contato
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
