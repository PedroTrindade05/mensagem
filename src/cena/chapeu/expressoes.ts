import type { UniformesRosto } from "./deformacao";

/* =========================================================================
   EXPRESSOES - presets, molas e a fala
   -------------------------------------------------------------------------
   Cada parametro do rosto persegue um alvo com uma mola criticamente
   amortecida: troca de humor nunca salta, e a boca, com mola bem mais dura,
   acompanha a voz sem atraso perceptivel. Nada aqui aloca por quadro.
   ========================================================================= */

export type Humor =
  | "neutro"
  | "falando"
  | "pensativo"
  | "surpreso"
  | "satisfeito"
  | "triunfante"
  | "desconfiado"
  | "dormindo";

export interface Rosto {
  boca: number;
  cantos: number;
  sobr: number;
  sobrAssim: number;
  apertar: number;
  nariz: number;
  pontaX: number;
  pontaZ: number;
  estica: number;
  /** Inclinacao da copa para os lados e para frente/tras (a aba fica parada). */
  inclinaX: number;
  inclinaZ: number;
  /** Giro da copa sobre a aba: olhar para um lado. */
  gira: number;
  /** Largura da boca: > 0 larga ("i"), < 0 redonda e saliente ("u"). */
  larg: number;
  /** Sorriso torto: so um canto da boca sobe. */
  torto: number;
}

const CHAVES = [
  "boca",
  "cantos",
  "sobr",
  "sobrAssim",
  "apertar",
  "nariz",
  "pontaX",
  "pontaZ",
  "estica",
  "inclinaX",
  "inclinaZ",
  "gira",
  "larg",
  "torto",
] as const satisfies ReadonlyArray<keyof Rosto>;

const rosto = (r: Partial<Rosto>): Rosto => ({
  boca: 0,
  cantos: 0,
  sobr: 0,
  sobrAssim: 0,
  apertar: 0,
  nariz: 0,
  pontaX: 0,
  pontaZ: 0,
  estica: 0,
  inclinaX: 0,
  inclinaZ: 0,
  gira: 0,
  larg: 0,
  torto: 0,
  ...r,
});

/** Intensidade total de cada humor. A malha ja nasce de cara fechada. */
export const PRESETS: Readonly<Record<Humor, Rosto>> = {
  neutro: rosto({ apertar: 0.1 }),
  falando: rosto({ sobr: 0.25, apertar: 0.05, inclinaZ: 0.1 }),
  pensativo: rosto({
    boca: -0.45, cantos: -0.35, sobr: -0.55, sobrAssim: 0.9, apertar: 0.5, nariz: 0.45, pontaX: 0.05,
    inclinaX: 0.35, inclinaZ: -0.05, gira: -0.18, torto: 0.25,
  }),
  surpreso: rosto({
    boca: 0.5, sobr: 1.15, apertar: -0.25, estica: 0.8, pontaZ: -0.07, inclinaZ: -0.55, larg: -0.2,
  }),
  satisfeito: rosto({
    cantos: 0.8, sobr: 0.4, apertar: 0.35, estica: 0.2, inclinaX: 0.12, inclinaZ: 0.1, torto: 0.2,
  }),
  triunfante: rosto({
    boca: 0.15, cantos: 1.15, sobr: 0.75, apertar: 0.3, estica: 0.55, pontaZ: -0.1, inclinaZ: -0.4, larg: 0.35,
  }),
  desconfiado: rosto({
    boca: -0.25, cantos: -0.3, sobr: -0.25, sobrAssim: -1, apertar: 0.7, nariz: 0.3,
    inclinaX: -0.3, inclinaZ: 0.05, gira: 0.3, torto: -0.7,
  }),
  // na estante, antes da cerimonia: olhos fechados e a copa caida para a frente
  dormindo: rosto({
    boca: -0.35, cantos: -0.1, sobr: -0.45, apertar: 1.05, nariz: 0.2, pontaZ: 0.07, inclinaX: 0.15, inclinaZ: 0.55,
  }),
};

/** Frequencia natural de cada mola (rad/s): maior = mais rapido. */
const RIGIDEZ: Readonly<Record<keyof Rosto, number>> = {
  boca: 38,
  cantos: 7,
  sobr: 9,
  sobrAssim: 5,
  apertar: 12,
  nariz: 8,
  pontaX: 2.6,
  pontaZ: 2.6,
  estica: 5,
  inclinaX: 4,
  inclinaZ: 5.5,
  gira: 3.5,
  larg: 18,
  torto: 6,
};

export interface EntradaRosto {
  humor: Humor;
  /** Humor que tinge a fala (a reacao a cada resposta). */
  vies: Humor | null;
  falando: boolean;
  /** Volume da voz agora (0..1), ou null sem analise de audio. */
  nivel: number | null;
  /** 0..1 do audio em curso; o veredito vira triunfo no fim da fala. */
  progresso: number;
  /** Largura da boca sugerida pela voz (-0.7 = "u" redondo ... 1 = "i" ou "s" largo), ou null sem analise. */
  brilho: number | null;
  /** Posicao do cursor na tela (-1..1): o Chapeu olha para ele. */
  ponteiroX: number;
  ponteiroY: number;
}

/** Pequeno gerador deterministico: o ritmo da fala varia sem Math.random. */
function criarSorteio(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class AnimadorRosto {
  readonly atual: Rosto = rosto({});
  private readonly vel: Rosto = rosto({});
  private readonly alvo: Rosto = rosto({});
  private readonly sorteio = criarSorteio(97);
  private tempo = 0;

  // voz: envelope rapido (boca) e lento (para achar o ataque das silabas)
  private envRapido = 0;
  private envLento = 0;
  private esperaSilaba = 0;
  private pulsoSobr = 0;
  private pulsoCabeca = 0;
  private humorAnterior: Humor | null = null;
  /** Largura da boca da silaba atual, no ciclo procedural. */
  private largSilaba = 0;
  private pulsoPontaX = 0;
  private pulsoPontaZ = 0;
  private sinalPulso = 1;

  // ciclo de silabas quando nao ha analise de audio
  private fase = 0;
  private freqSilaba = 4.5;
  private ampSilaba = 0.8;
  private pausa = 0;

  // piscada: um apertar curto de tempos em tempos
  private proximaPiscada = 2.5;
  private piscada = 0;

  /** Avanca dt segundos e escreve o resultado nos uniforms. */
  passo(dtBruto: number, e: EntradaRosto, u: UniformesRosto): void {
    const dt = Math.min(Math.max(dtBruto, 0), 0.1);
    this.tempo += dt;
    const t = this.tempo;

    // ---- voz -> abertura da boca ----
    let voz = 0;
    if (e.falando) {
      voz = e.nivel ?? this.silabaProcedural(dt);
    }
    // ataque rapido, soltura um pouco mais lenta: a boca fecha entre silabas
    const kA = 1 - Math.exp(-dt / 0.025);
    const kR = 1 - Math.exp(-dt / 0.085);
    this.envRapido += (voz - this.envRapido) * (voz > this.envRapido ? kA : kR);
    this.envLento += (voz - this.envLento) * (1 - Math.exp(-dt / 0.35));

    // ataque de silaba: sobrancelha e ponta dao um tranco junto
    this.esperaSilaba -= dt;
    if (e.falando && this.esperaSilaba <= 0 && this.envRapido - this.envLento > 0.16) {
      this.esperaSilaba = 0.2 + this.sorteio() * 0.15;
      this.pulsoSobr = 0.6 + this.sorteio() * 0.6;
      this.sinalPulso = this.sorteio() < 0.8 ? 1 : -1;
      this.pulsoPontaX += (this.sorteio() - 0.5) * 0.09;
      this.pulsoPontaZ += (this.sorteio() - 0.35) * 0.04;
      // a cabeca dá um cabeceio curto junto com a silaba
      this.pulsoCabeca += 0.12 + this.sorteio() * 0.14;
    }
    const decai = Math.exp(-dt / 0.28);
    this.pulsoSobr *= decai;
    this.pulsoCabeca *= Math.exp(-dt / 0.2);
    this.pulsoPontaX *= Math.exp(-dt / 0.9);
    this.pulsoPontaZ *= Math.exp(-dt / 0.9);

    // ---- humor de base ----
    let humor: Humor = e.humor;
    if (e.falando && humor === "neutro") humor = "falando";
    // o veredito: pensa enquanto fala, e no fim anuncia de peito estufado
    if (e.falando && humor === "pensativo" && e.progresso > 0.62) humor = "triunfante";
    const base = PRESETS[humor];
    const vies = e.vies ? PRESETS[e.vies] : null;
    for (const k of CHAVES) {
      this.alvo[k] = vies ? base[k] * 0.45 + vies[k] * 0.55 : base[k];
    }

    // ---- tranco ao mudar de humor: a mola ganha velocidade e passa do ponto ----
    if (this.humorAnterior !== null && this.humorAnterior !== humor) {
      switch (humor) {
        case "surpreso":
          this.vel.inclinaZ -= 3.2;
          this.vel.sobr += 3;
          break;
        case "triunfante":
          this.vel.inclinaZ -= 2.2;
          this.vel.estica += 1.5;
          break;
        case "desconfiado":
          this.vel.gira += 2.2;
          this.vel.inclinaX -= 1.2;
          break;
        case "satisfeito":
          this.vel.inclinaZ += 1.4;
          this.vel.inclinaX += 0.6;
          break;
        case "pensativo":
          this.vel.inclinaX += 1.2;
          this.vel.gira -= 0.8;
          break;
        default:
          break;
      }
    }
    this.humorAnterior = humor;

    // ---- camadas por cima do humor ----
    const fala = this.envRapido;
    // quem fala solta os labios apertados do preset
    this.alvo.boca = this.alvo.boca * (1 - Math.min(fala * 4, 1)) + fala * 0.9;
    this.alvo.sobr += this.pulsoSobr * 0.32 * this.sinalPulso + fala * 0.12;
    this.alvo.estica += fala * 0.18;
    this.alvo.nariz += fala * 0.15;

    // forma da boca: o brilho da voz separa o "u" (redondo) do "i" e do "s" (largo)
    const brilho = e.brilho ?? this.largSilaba;
    this.alvo.larg += brilho * Math.min(fala * 3, 1);
    // falando, a copa se inclina para a frente e balanca no ritmo
    this.alvo.inclinaZ += fala * 0.12 + this.pulsoCabeca;
    this.alvo.inclinaX += this.pulsoSobr * 0.05 * this.sinalPulso;

    // olha para o cursor e passeia o olhar devagar (menos dormindo)
    const acordado = humor === "dormindo" ? 0.15 : 1;
    this.alvo.gira += (e.ponteiroX * 0.4 + Math.sin(t * 0.23) * 0.05 + Math.sin(t * 0.61 + 2) * 0.02) * acordado;
    this.alvo.inclinaZ -= e.ponteiroY * 0.1 * acordado;
    this.alvo.inclinaX += (Math.sin(t * 0.37) * 0.03 + e.ponteiroX * 0.06) * acordado;
    this.alvo.inclinaZ += Math.sin(t * 0.5 + 1) * 0.015;

    // a ponta tem inercia: atrasa em relacao ao corpo e passa do ponto
    const lim = (v: number, m: number): number => Math.max(-m, Math.min(m, v));
    this.alvo.pontaX += lim(-this.vel.inclinaX * 0.045 - this.vel.gira * 0.03, 0.1);
    this.alvo.pontaZ += lim(-this.vel.inclinaZ * 0.045, 0.1);

    // ponta: balanco lento sempre; na fala ele cresce e ganha os trancos
    const balanco = e.falando ? 2.2 : 1;
    this.alvo.pontaX += Math.sin(t * 0.53) * 0.022 * balanco + Math.sin(t * 1.31 + 1.7) * 0.008 + this.pulsoPontaX;
    this.alvo.pontaZ += Math.sin(t * 0.41 + 0.6) * 0.012 * balanco + this.pulsoPontaZ;
    if (humor === "pensativo") {
      // a ponta enrola devagar para um lado e volta, como quem matuta
      this.alvo.pontaX += Math.sin(t * 0.35) * 0.09;
      this.alvo.pontaZ += 0.03 + Math.sin(t * 0.27 + 1) * 0.02;
    }

    // piscada (fora da fala)
    this.proximaPiscada -= dt;
    if (this.proximaPiscada <= 0) {
      this.proximaPiscada = 2.8 + this.sorteio() * 3.5;
      if (!e.falando && e.humor !== "dormindo") this.piscada = 1;
    }
    this.piscada = Math.max(0, this.piscada - dt / 0.22);
    this.alvo.apertar += Math.sin(this.piscada * Math.PI) * 0.75;

    // ---- molas ----
    for (const k of CHAVES) {
      const w = RIGIDEZ[k];
      // subpassos: a mola da boca e dura e o quadro pode ser longo
      const n = dt * w > 0.3 ? Math.ceil((dt * w) / 0.3) : 1;
      const h = dt / n;
      let x = this.atual[k];
      let v = this.vel[k];
      const a = this.alvo[k];
      for (let i = 0; i < n; i++) {
        v += (w * w * (a - x) - 2 * w * v) * h;
        x += v * h;
      }
      this.atual[k] = x;
      this.vel[k] = v;
    }

    // ---- uniforms ----
    const r = this.atual;
    u.uBoca.value = Math.min(Math.max(r.boca, -0.8), 1.15);
    u.uCantos.value = Math.min(Math.max(r.cantos, -1.2), 1.2);
    u.uSobr.value = Math.min(Math.max(r.sobr, -1.2), 1.3);
    u.uSobrAssim.value = Math.min(Math.max(r.sobrAssim, -1.2), 1.2);
    u.uApertar.value = Math.min(Math.max(r.apertar, -0.4), 1.2);
    u.uNariz.value = Math.min(Math.max(r.nariz, 0), 1);
    u.uPontaX.value = r.pontaX;
    u.uPontaZ.value = r.pontaZ;
    u.uEstica.value = Math.min(Math.max(r.estica, -1), 1);
    // dormindo, respira fundo e devagar
    u.uInclinaX.value = Math.min(Math.max(r.inclinaX, -0.9), 0.9);
    u.uInclinaZ.value = Math.min(Math.max(r.inclinaZ, -0.9), 0.9);
    u.uGira.value = Math.min(Math.max(r.gira, -0.7), 0.7);
    u.uLarg.value = Math.min(Math.max(r.larg, -1), 1);
    u.uTorto.value = Math.min(Math.max(r.torto, -1), 1);
    u.uRespira.value = humor === "dormindo" ? Math.sin(t * 0.7) * 1.4 : Math.sin(t * 1.15) * (e.falando ? 0.5 : 1);
  }

  /** Abertura de boca sintetica, so quando o audio nao pode ser analisado. */
  private silabaProcedural(dt: number): number {
    if (this.pausa > 0) {
      this.pausa -= dt;
      return 0;
    }
    this.fase += dt * this.freqSilaba;
    if (this.fase >= 1) {
      this.fase -= 1;
      this.freqSilaba = 3.4 + this.sorteio() * 2.6;
      this.ampSilaba = 0.45 + this.sorteio() * 0.55;
      this.largSilaba = (this.sorteio() - 0.4) * 1.6;
      if (this.sorteio() < 0.12) this.pausa = 0.15 + this.sorteio() * 0.3;
    }
    return Math.pow(Math.sin(this.fase * Math.PI), 0.8) * this.ampSilaba;
  }

  /** Aplica um rosto direto nos uniforms, sem mola (folha de expressoes). */
  static fixar(r: Rosto, u: UniformesRosto): void {
    u.uBoca.value = r.boca;
    u.uCantos.value = r.cantos;
    u.uSobr.value = r.sobr;
    u.uSobrAssim.value = r.sobrAssim;
    u.uApertar.value = r.apertar;
    u.uNariz.value = r.nariz;
    u.uPontaX.value = r.pontaX;
    u.uPontaZ.value = r.pontaZ;
    u.uEstica.value = r.estica;
    u.uInclinaX.value = r.inclinaX;
    u.uInclinaZ.value = r.inclinaZ;
    u.uGira.value = r.gira;
    u.uLarg.value = r.larg;
    u.uTorto.value = r.torto;
    u.uRespira.value = 0;
  }
}
