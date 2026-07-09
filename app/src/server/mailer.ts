// E-mail delivery placeholder (decisão do Erick, 2026-07-09).
//
// A plataforma CEA NÃO gerencia senhas — recuperação acontece exclusivamente
// no ecossistema da UTFPR (portal do aluno). O único e-mail previsto é o
// convite de administrador e, hoje, não há SMTP institucional disponível:
// o link do convite é copiado do painel e entregue manualmente.
//
// Se um SMTP da UTFPR for disponibilizado no futuro, implemente o transporte
// aqui (os chamadores já montam a mensagem completa) e nada mais muda.

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
};

export async function sendMail(
  message: MailMessage,
): Promise<{ delivered: boolean }> {
  console.info(
    `[mailer] entrega desativada (sem SMTP) — para=${message.to} assunto="${message.subject}"`,
  );
  return { delivered: false };
}
