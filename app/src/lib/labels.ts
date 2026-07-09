// pt-BR labels for domain enums (código em inglês, UI em pt-BR — regra fixa 5).

export const DEGREE_LABEL: Record<string, string> = {
  BACHELORS: "Bacharelado",
  LICENTIATE: "Licenciatura",
  TECHNOLOGY: "Tecnologia",
};

export const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Administração geral",
  CAMPUS_ADMIN: "Administração de campus",
  COURSE_ADMIN: "Coordenação de curso",
};

export const ACADEMIC_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Cursando",
  LOCKED: "Trancado",
  DROPPED_OUT: "Desistente",
  GRADUATED: "Formado(a)",
};

export const TRACK_NODE_KIND_LABEL: Record<string, string> = {
  CORE: "Progressão",
  BRANCH: "Especialização",
};
