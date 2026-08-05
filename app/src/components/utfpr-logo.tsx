import Image from "next/image";
import { cn } from "@/lib/utils";

/// Marca institucional da UTFPR. Duas variantes porque uma só não sobrevive
/// aos dois tamanhos de uso:
///
/// - `marca` (padrão): só o letreiro UTFPR. É o que entra no chrome, onde a
///   altura útil é de ~24px. Ali a assinatura completa não serve: o subtítulo
///   ocupa ~10% da altura da arte, então a 24px ele mede 2,4px e vira uma
///   listra cinza — pior que não ter.
/// - `assinatura`: letreiro + "UNIVERSIDADE TECNOLÓGICA FEDERAL DO PARANÁ".
///   Quer no mínimo ~48px de altura, então fica nas telas com espaço (login e
///   rodapé da página inicial), onde a instituição precisa aparecer por
///   extenso.
///
/// A troca claro/escuro é por CSS (`dark:`), não por `useTheme()`: o
/// next-themes carimba a classe `.dark` no <html> antes da hidratação — e já
/// resolve "sistema" para uma das duas —, então o CSS acerta de primeira. Com
/// JS a logo trocaria depois da hidratação, reintroduzindo em miniatura o
/// flash de tema que a Fase 5 eliminou.
///
/// As duas versões vão no HTML e o CSS esconde uma. `display:none` tira o
/// elemento da árvore de acessibilidade, então o `alt` repetido nas duas não
/// duplica leitura: o leitor de tela sempre encontra exatamente uma.

const VARIANTS = {
  marca: { file: "utfpr", width: 497, height: 160 },
  assinatura: { file: "utfpr-assinatura", width: 612, height: 224 },
} as const;

/// A altura vem do `className` (`h-6`, `h-12`...); a largura acompanha.
export function UtfprLogo({
  variant = "marca",
  className,
}: {
  variant?: keyof typeof VARIANTS;
  className?: string;
}) {
  const { file, width, height } = VARIANTS[variant];
  const shared = {
    width,
    height,
    // Toda ocorrência hoje está no topo da página; adiar o carregamento só
    // renderia um buraco no cabeçalho. São 5-13 KB.
    loading: "eager" as const,
    alt: "Universidade Tecnológica Federal do Paraná",
  };

  return (
    <>
      <Image
        {...shared}
        src={`/marca/${file}-cor.png`}
        className={cn("w-auto dark:hidden", className)}
      />
      <Image
        {...shared}
        src={`/marca/${file}-branco.png`}
        className={cn("hidden w-auto dark:block", className)}
      />
    </>
  );
}
