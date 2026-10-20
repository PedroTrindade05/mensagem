import { useCallback, useEffect, useMemo, useRef } from "react";
import { AUDIO_DIR, VOLUME_MUSICA, asset } from "../config";

/* =========================================================================
   TRILHA - a musica de fundo (MP3 em public/audio/) e os sininhos
   -------------------------------------------------------------------------
   A musica e o arquivo de DESPEDIDA.musica, em loop, passando por um
   ganho do Web Audio: no iPhone o volume do elemento de audio e fixo, e so
   assim o volume e o mudo funcionam la tambem.

   Celular so libera audio num gesto "completo" (soltar o dedo, clique). O
   primeiro toque no brasao ainda e o dedo encostando; se o navegador barrar
   o play ali, a musica tenta de novo no proximo gesto (soltar o brasao).
   ========================================================================= */

const midi = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);

type Efeito = "revelacao" | "carta" | "selo";

export interface Trilha {
  /** Comeca a tocar. Precisa vir de um gesto (toque ou clique). */
  iniciar: () => void;
  /** Liga/desliga o som. */
  silenciar: (sim: boolean) => void;
  /** Pequenos sinos para momentos especiais. */
  efeito: (qual: Efeito) => void;
}

interface Motor {
  ctx: AudioContext;
  musica: GainNode;
  efeitos: GainNode;
  reverb: ConvolverNode;
  arquivo: HTMLAudioElement | null;
  /** Tira os ouvintes que esperam um gesto para tentar tocar de novo. */
  pararEspera: (() => void) | null;
}

type JanelaComWebkit = Window & { webkitAudioContext?: typeof AudioContext };

function criarReverb(ctx: AudioContext, segundos: number): ConvolverNode {
  const taxa = ctx.sampleRate;
  const n = Math.floor(taxa * segundos);
  const buf = ctx.createBuffer(2, n, taxa);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6);
  }
  const conv = ctx.createConvolver();
  conv.buffer = buf;
  return conv;
}

/** Um sininho: seno com parciais que somem rapido. */
function sino(m: Motor, destino: AudioNode, nota: number, quando: number, vol: number, duracao = 2.4): void {
  const { ctx } = m;
  const f = midi(nota);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, quando);
  g.gain.linearRampToValueAtTime(vol, quando + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, quando + duracao);
  g.connect(destino);
  g.connect(m.reverb);
  const parciais: Array<[number, number, number]> = [
    [1, 1, duracao],
    [2, 0.28, duracao * 0.5],
    [3.01, 0.12, duracao * 0.25],
    [5.4, 0.05, 0.25],
  ];
  for (const [mult, amp, dur] of parciais) {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f * mult;
    const ga = ctx.createGain();
    ga.gain.setValueAtTime(amp, quando);
    ga.gain.exponentialRampToValueAtTime(0.0001, quando + dur);
    o.connect(ga);
    ga.connect(g);
    o.start(quando);
    o.stop(quando + dur + 0.05);
  }
}

/** Colchao de cordas: triangulos levemente desafinados, filtrados. */
function colchao(m: Motor, nota: number, quando: number, duracao: number): void {
  const { ctx } = m;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, quando);
  g.gain.linearRampToValueAtTime(0.05, quando + duracao * 0.35);
  g.gain.linearRampToValueAtTime(0, quando + duracao + 0.4);
  const filtro = ctx.createBiquadFilter();
  filtro.type = "lowpass";
  filtro.frequency.value = 520;
  filtro.connect(g);
  g.connect(m.efeitos);
  g.connect(m.reverb);
  for (const desafino of [-6, 6]) {
    for (const oitava of [0, 12, 19]) {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = midi(nota + oitava);
      o.detune.value = desafino;
      o.connect(filtro);
      o.start(quando);
      o.stop(quando + duracao + 0.5);
    }
  }
}

/** Toca a musica; se o navegador barrar, tenta de novo no proximo gesto. */
function tocarQuandoPuder(m: Motor): void {
  const a = m.arquivo;
  if (!a) return;
  const tentar = (): Promise<void> => {
    void m.ctx.resume().catch(() => {});
    return a.play();
  };
  void tentar().catch(() => {
    const eventos = ["pointerup", "touchend", "click", "keydown"] as const;
    const deNovo = (): void => {
      void tentar().then(() => m.pararEspera?.(), () => {});
    };
    m.pararEspera = (): void => {
      eventos.forEach((ev) => window.removeEventListener(ev, deNovo, true));
      m.pararEspera = null;
    };
    eventos.forEach((ev) => window.addEventListener(ev, deNovo, true));
  });
}

export function useTrilha(arquivo: string): Trilha {
  const motor = useRef<Motor | null>(null);
  const mudo = useRef(false);

  const aplicarVolume = useCallback((rapido = false): void => {
    const m = motor.current;
    if (!m) return;
    const agora = m.ctx.currentTime;
    m.musica.gain.cancelScheduledValues(agora);
    m.musica.gain.setTargetAtTime(mudo.current ? 0 : VOLUME_MUSICA, agora, rapido ? 0.05 : 0.6);
    m.efeitos.gain.setTargetAtTime(mudo.current ? 0 : 0.9, agora, 0.05);
  }, []);

  const iniciar = useCallback((): void => {
    const existente = motor.current;
    if (existente) {
      // cada gesto a mais garante que o som esteja liberado
      void existente.ctx.resume().catch(() => {});
      if (existente.arquivo?.paused) tocarQuandoPuder(existente);
      return;
    }
    const Ctor = window.AudioContext ?? (window as JanelaComWebkit).webkitAudioContext;
    if (!Ctor) return;
    let ctx: AudioContext;
    try {
      ctx = new Ctor();
    } catch {
      return;
    }
    const mestre = ctx.createGain();
    mestre.connect(ctx.destination);
    const musica = ctx.createGain();
    musica.gain.value = 0;
    musica.connect(mestre);
    const efeitos = ctx.createGain();
    efeitos.gain.value = 0.9;
    efeitos.connect(mestre);
    const reverb = criarReverb(ctx, 3.8);
    const molhado = ctx.createGain();
    molhado.gain.value = 0.55;
    reverb.connect(molhado);
    molhado.connect(mestre);

    const m: Motor = { ctx, musica, efeitos, reverb, arquivo: null, pararEspera: null };
    motor.current = m;

    if (arquivo) {
      const a = new Audio(asset(AUDIO_DIR + arquivo));
      a.loop = true;
      a.preload = "auto";
      try {
        // o volume passa pelo ganho (no iPhone o do elemento nao muda)
        ctx.createMediaElementSource(a).connect(musica);
      } catch {
        // sem Web Audio para o elemento: toca direto, com o volume dele
        a.volume = VOLUME_MUSICA;
      }
      m.arquivo = a;
      tocarQuandoPuder(m);
    }
    aplicarVolume();
  }, [arquivo, aplicarVolume]);

  const silenciar = useCallback(
    (sim: boolean): void => {
      mudo.current = sim;
      aplicarVolume(true);
    },
    [aplicarVolume]
  );

  const efeito = useCallback((qual: Efeito): void => {
    const m = motor.current;
    if (!m || mudo.current) return;
    const t = m.ctx.currentTime + 0.02;
    if (qual === "revelacao") {
      // glissando de sinos subindo duas oitavas, e um acorde que fica
      const escala = [64, 66, 67, 71, 72, 76, 78, 79, 83, 84, 88];
      escala.forEach((n, i) => sino(m, m.efeitos, n, t + i * 0.055, 0.07, 2));
      for (const n of [64, 71, 76, 79, 83]) sino(m, m.efeitos, n, t + 0.7, 0.07, 5);
      colchao(m, 40, t + 0.6, 4);
    } else if (qual === "carta") {
      [76, 83, 88].forEach((n, i) => sino(m, m.efeitos, n, t + i * 0.08, 0.06, 1.8));
    } else {
      sino(m, m.efeitos, 72, t, 0.05, 1.2);
    }
  }, []);

  useEffect(
    () => () => {
      const m = motor.current;
      if (!m) return;
      m.pararEspera?.();
      m.arquivo?.pause();
      void m.ctx.close().catch(() => {});
      motor.current = null;
    },
    []
  );

  return useMemo(() => ({ iniciar, silenciar, efeito }), [iniciar, silenciar, efeito]);
}
