/* =========================================================================
   VELAS QUE ACENDEM - a onda da abertura
   -------------------------------------------------------------------------
   Na tela inicial o salao da foto esta so com o luar. Quando a pessoa
   segura o botao, a luz das velas volta em onda a partir do centro do
   salao (FundoFoto.tsx), e as luzes que iluminam o Chapeu sobem junto.
   ========================================================================= */

/** Estado compartilhado, lido a cada quadro (sem re-render). */
export interface EstadoVelas {
  /** Segundos desde que a onda comecou; -1 = apagadas. */
  t: number;
}

/** Valor de t para "acesas desde sempre" (entrar direto pelas cartas, etc.). */
export const VELAS_JA_ACESAS = 1000;

/** Quanto a onda leva para atravessar o salao inteiro, em segundos. */
export const DURACAO_ONDA = 2.6;

/** Progresso geral da onda (0..1), para as luzes da cena. */
export function progressoOnda(e: EstadoVelas): number {
  if (e.t < 0) return 0;
  return Math.min(e.t / DURACAO_ONDA, 1);
}
