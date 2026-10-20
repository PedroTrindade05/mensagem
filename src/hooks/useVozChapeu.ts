import { useCallback, useEffect, useRef, useState } from "react";
import { AUDIO_DIR, GANHO_FALA, STALL_GUARD_MS, VOLUME_FALA, asset } from "../config";

/* =========================================================================
   A VOZ DO CHAPEU
   -------------------------------------------------------------------------
   Tres caminhos, do melhor para o mais simples, e o fluxo nunca trava:

   1. MP3 gravado: toca num <audio> que passa por um AnalyserNode. O volume
      de cada quadro abre e fecha a boca do Chapeu.
   2. Voz sintetica do navegador (speechSynthesis), quando a fala nao tem
      MP3 ou o arquivo falha. A boca segue um ritmo de silabas gerado no
      codigo, e o progresso vem dos eventos de palavra (ou do relogio).
   3. Sem som (mudo, ou sem voz nenhuma): so o relogio, no ritmo de leitura.
      A legenda e a boca andam do mesmo jeito.
   ========================================================================= */

export interface VozChapeu {
  /** Fala um trecho e resolve quando ele termina (ou e pulado). */
  falar: (texto: string, audio?: string) => Promise<void>;
  /** Toca um MP3 de public/audio/; sem o arquivo, espera fallbackMs. */
  tocar: (arquivo: string, fallbackMs: number) => Promise<void>;
  /** Pula o que estiver tocando. */
  pular: () => void;
  /** true enquanto o Chapeu esta falando. */
  falando: boolean;
  /** Volume da fala (0..1), ou null quando a boca deve usar o ritmo proprio. */
  nivelVoz: () => number | null;
  /** Largura da boca pelo timbre (-0.7 "u" ... 1 "i"/"s"), ou null sem analise. */
  largVoz: () => number | null;
  /** Quanto da fala atual ja passou (0..1). */
  progressoVoz: () => number;
  mudo: boolean;
  alternarMudo: () => void;
}

/* -------------------------------------------------------------------------
   ANALISE DO VOLUME DO MP3
   -------------------------------------------------------------------------
   O AudioContext so nasce num gesto, e o elemento so e ligado a ele depois
   que o contexto confirma "running": um grafo mal ligado silenciaria a fala.
   Fora de http(s) (file://) nem tenta: la o analisador devolve silencio.
   ------------------------------------------------------------------------- */

interface Analise {
  ctx: AudioContext;
  analisador: AnalyserNode;
  saida: GainNode;
  dados: Float32Array<ArrayBuffer>;
  /** Cruzamentos por amostra do ultimo quadro: sobem com vogais agudas e chiados. */
  zcr: number;
}

interface AudioComAnalise extends HTMLAudioElement {
  __analise?: Analise;
  __analiseTentada?: boolean;
  __mudo?: boolean;
}

function aplicarMudo(player: AudioComAnalise): void {
  const mudo = player.__mudo === true;
  const a = player.__analise;
  if (a) {
    player.muted = false;
    a.saida.gain.value = mudo ? 0 : GANHO_FALA;
  } else {
    player.muted = mudo;
  }
}

const CHAVE_MUDO = "chapeu-despedida:mudo";

function lerMudoSalvo(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_MUDO) === "1";
  } catch {
    return false;
  }
}

function salvarMudo(mudo: boolean): void {
  try {
    window.localStorage.setItem(CHAVE_MUDO, mudo ? "1" : "0");
  } catch {
    /* armazenamento bloqueado: vale so nesta sessao */
  }
}

type JanelaComWebkit = Window & { webkitAudioContext?: typeof AudioContext };

function prepararAnalise(player: AudioComAnalise): void {
  const atual = player.__analise;
  if (atual) {
    if (atual.ctx.state !== "running") void atual.ctx.resume().catch(() => {});
    return;
  }
  if (player.__analiseTentada) return;
  player.__analiseTentada = true;

  if (!/^https?:$/.test(window.location.protocol)) return;
  const Ctor = window.AudioContext ?? (window as JanelaComWebkit).webkitAudioContext;
  if (!Ctor) return;

  let ctx: AudioContext;
  try {
    ctx = new Ctor();
  } catch {
    return;
  }

  const ligar = (): void => {
    if (ctx.state !== "running" || player.__analise) return;
    try {
      const fonte = ctx.createMediaElementSource(player);
      const saida = ctx.createGain();
      fonte.connect(saida);
      saida.connect(ctx.destination);
      // so a faixa da voz chega ao analisador
      const passaAlta = ctx.createBiquadFilter();
      passaAlta.type = "highpass";
      passaAlta.frequency.value = 140;
      const passaBaixa = ctx.createBiquadFilter();
      passaBaixa.type = "lowpass";
      passaBaixa.frequency.value = 3800;
      const analisador = ctx.createAnalyser();
      analisador.fftSize = 512;
      analisador.smoothingTimeConstant = 0;
      const silencio = ctx.createGain();
      silencio.gain.value = 0;
      fonte.connect(passaAlta);
      passaAlta.connect(passaBaixa);
      passaBaixa.connect(analisador);
      analisador.connect(silencio);
      silencio.connect(ctx.destination);
      player.__analise = { ctx, analisador, saida, dados: new Float32Array(analisador.fftSize), zcr: 0 };
      aplicarMudo(player);
    } catch {
      /* elemento ja ligado a outro contexto (HMR): fica sem analise */
    }
  };

  ctx.addEventListener("statechange", ligar);
  void ctx.resume().then(ligar).catch(() => {});
}

/** RMS do quadro em decibeis, convertido em abertura de boca (0..1). */
function lerNivel(player: AudioComAnalise | null): number | null {
  const a = player?.__analise;
  if (!a || a.ctx.state !== "running") return null;
  a.analisador.getFloatTimeDomainData(a.dados);
  let soma = 0;
  const d = a.dados;
  for (let i = 0; i < d.length; i++) {
    const v = d[i]!;
    soma += v * v;
  }
  const rms = Math.sqrt(soma / d.length);
  // timbre: a voz filtrada cruza o zero pouco no "u" e muito no "i" e no "s"
  let cruzes = 0;
  const corte = rms * 0.15;
  let anterior = d[0]!;
  for (let i = 1; i < d.length; i++) {
    const v = d[i]!;
    if ((v > corte && anterior < -corte) || (v < -corte && anterior > corte)) cruzes++;
    if (Math.abs(v) > corte) anterior = v;
  }
  a.zcr += (cruzes / d.length - a.zcr) * 0.5;
  const db = 20 * Math.log10(rms + 1e-9);
  return Math.min(Math.max((db + 40) / 32, 0), 1);
}

/* -------------------------------------------------------------------------
   VOZ SINTETICA
   ------------------------------------------------------------------------- */

const temSintese = (): boolean => typeof window !== "undefined" && "speechSynthesis" in window;

/** Nomes das vozes masculinas em portugues mais comuns (Windows, macOS, Android). */
const VOZ_GRAVE = /antonio|daniel|donato|fabio|humberto|julio|nicolau|valerio|felipe|ricardo|duarte|cristiano/i;

function escolherVoz(): SpeechSynthesisVoice | null {
  if (!temSintese()) return null;
  const vozes = window.speechSynthesis.getVoices();
  const lang = (v: SpeechSynthesisVoice): string => v.lang.replace("_", "-").toLowerCase();
  const br = vozes.filter((v) => lang(v) === "pt-br");
  const pt = br.length ? br : vozes.filter((v) => lang(v).startsWith("pt"));
  if (!pt.length) return null;
  const nota = (v: SpeechSynthesisVoice): number =>
    (VOZ_GRAVE.test(v.name) ? 4 : 0) + (/natural|online|neural/i.test(v.name) ? 3 : 0) + (/google/i.test(v.name) ? 1 : 0);
  return [...pt].sort((a, b) => nota(b) - nota(a))[0] ?? null;
}

/** Divide em frases curtas: o Chrome corta falas longas no meio. */
function frases(texto: string): string[] {
  return texto
    .split(/(?<=[.!?…])\s+/)
    .map((f) => f.trim())
    .filter(Boolean);
}

/** Caracteres por segundo da leitura sem som (e a estimativa da voz sintetica). */
const LEITURA_CPS = 14;

export function useVozChapeu(): VozChapeu {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pularRef = useRef<(() => void) | null>(null);
  const modoRef = useRef<"mp3" | "sintese" | "relogio">("relogio");
  const progressoRef = useRef<() => number>(() => 0);
  const mudoRef = useRef(false);
  const [falando, setFalando] = useState(false);
  const [mudo, setMudo] = useState(lerMudoSalvo);
  mudoRef.current = mudo;

  if (audioRef.current === null && typeof Audio !== "undefined") {
    audioRef.current = new Audio();
    audioRef.current.preload = "auto";
    audioRef.current.volume = VOLUME_FALA;
  }

  /** So o relogio: legenda e boca andam no ritmo de leitura. */
  const porRelogio = useCallback((texto: string): Promise<void> => {
    const dur = Math.max(2400, (texto.length / LEITURA_CPS) * 1000 + 600);
    const t0 = performance.now();
    modoRef.current = "relogio";
    progressoRef.current = () => Math.min((performance.now() - t0) / dur, 1);
    setFalando(true);
    return new Promise<void>((resolve) => {
      const fim = (): void => {
        clearTimeout(t);
        pularRef.current = null;
        setFalando(false);
        resolve();
      };
      const t = setTimeout(fim, dur);
      pularRef.current = fim;
    });
  }, []);

  const porSintese = useCallback(
    (texto: string): Promise<void> => {
      const voz = escolherVoz();
      if (mudoRef.current || !temSintese() || !voz) return porRelogio(texto);

      const sintese = window.speechSynthesis;
      const partes = frases(texto);
      const total = Math.max(texto.length, 1);
      let feito = 0; // caracteres das frases ja faladas
      let inicioFrase = performance.now();
      let palavra = 0; // ultimo charIndex informado pela voz
      let tamanhoFrase = 0;

      modoRef.current = "sintese";
      progressoRef.current = () => {
        const estimado = ((performance.now() - inicioFrase) / 1000) * LEITURA_CPS;
        const dentro = Math.min(Math.max(palavra, estimado), tamanhoFrase);
        return Math.min((feito + dentro) / total, 1);
      };
      setFalando(true);

      return new Promise<void>((resolve) => {
        let acabou = false;
        let guarda: ReturnType<typeof setTimeout> | undefined;
        // referencias vivas: o Chrome perde o onend de falas recolhidas pelo GC
        const vivas: SpeechSynthesisUtterance[] = [];

        const fim = (): void => {
          if (acabou) return;
          acabou = true;
          clearTimeout(guarda);
          pularRef.current = null;
          sintese.cancel();
          setFalando(false);
          resolve();
        };

        const falarFrase = (i: number): void => {
          if (acabou) return;
          const frase = partes[i];
          if (frase === undefined) {
            fim();
            return;
          }
          const u = new SpeechSynthesisUtterance(frase);
          vivas.push(u);
          u.voice = voz;
          u.lang = voz.lang;
          // um chapeu velho fala devagar e mais grave
          u.rate = 0.9;
          u.pitch = VOZ_GRAVE.test(voz.name) ? 0.8 : 0.65;
          u.volume = VOLUME_FALA;
          tamanhoFrase = frase.length;
          palavra = 0;
          u.onstart = () => {
            inicioFrase = performance.now();
          };
          u.onboundary = (ev) => {
            palavra = ev.charIndex;
          };
          const proxima = (): void => {
            clearTimeout(guarda);
            feito += frase.length + 1;
            falarFrase(i + 1);
          };
          u.onend = proxima;
          u.onerror = proxima;
          clearTimeout(guarda);
          guarda = setTimeout(proxima, (frase.length / 6) * 1000 + 5000);
          inicioFrase = performance.now();
          sintese.speak(u);
        };

        pularRef.current = fim;
        sintese.cancel();
        falarFrase(0);
      });
    },
    [porRelogio]
  );

  const tocarMp3 = useCallback((arquivo: string, aoFalhar: () => Promise<void>): Promise<void> => {
    const player = audioRef.current;
    if (!player) return aoFalhar();

    modoRef.current = "mp3";
    progressoRef.current = () =>
      Number.isFinite(player.duration) && player.duration > 0
        ? Math.min(Math.max(player.currentTime / player.duration, 0), 1)
        : 0;

    return new Promise<void>((resolve) => {
      let acabou = false;
      let guarda: ReturnType<typeof setTimeout> | undefined;

      const limpar = (): void => {
        clearTimeout(guarda);
        player.removeEventListener("ended", fim);
        player.removeEventListener("error", falhou);
        player.removeEventListener("loadedmetadata", meta);
        pularRef.current = null;
      };
      function fim(): void {
        if (acabou) return;
        acabou = true;
        try {
          player!.pause();
        } catch {
          /* ignora */
        }
        limpar();
        setFalando(false);
        resolve();
      }
      function falhou(): void {
        if (acabou) return;
        acabou = true;
        console.warn("[Chapeu] Audio nao encontrado:", asset(AUDIO_DIR + arquivo));
        limpar();
        void aoFalhar().then(resolve);
      }
      function meta(): void {
        if (Number.isFinite(player!.duration) && player!.duration > 0) {
          clearTimeout(guarda);
          guarda = setTimeout(fim, player!.duration * 1000 + 1500);
        }
      }

      player.addEventListener("ended", fim);
      player.addEventListener("error", falhou);
      player.addEventListener("loadedmetadata", meta);
      pularRef.current = fim;
      guarda = setTimeout(fim, STALL_GUARD_MS);

      setFalando(true);
      player.src = asset(AUDIO_DIR + arquivo);
      void player.play().catch(falhou);
    });
  }, []);

  const falar = useCallback(
    (texto: string, audio?: string): Promise<void> =>
      audio ? tocarMp3(audio, () => porSintese(texto)) : porSintese(texto),
    [tocarMp3, porSintese]
  );

  const tocar = useCallback(
    (arquivo: string, fallbackMs: number): Promise<void> =>
      tocarMp3(arquivo, () => porRelogio("x".repeat(Math.round((fallbackMs / 1000) * LEITURA_CPS)))),
    [tocarMp3, porRelogio]
  );

  const pular = useCallback((): void => pularRef.current?.(), []);

  const nivelVoz = useCallback(
    (): number | null => (modoRef.current === "mp3" ? lerNivel(audioRef.current as AudioComAnalise | null) : null),
    []
  );

  const largVoz = useCallback((): number | null => {
    const a = (audioRef.current as AudioComAnalise | null)?.__analise;
    if (modoRef.current !== "mp3" || !a || a.ctx.state !== "running") return null;
    return (Math.min(Math.max((a.zcr - 0.02) / 0.06, 0), 1) - 0.4) * 1.7;
  }, []);

  const progressoVoz = useCallback((): number => progressoRef.current(), []);

  const alternarMudo = useCallback((): void => setMudo((m) => !m), []);

  useEffect(() => {
    const player = audioRef.current as AudioComAnalise | null;
    if (player) {
      player.__mudo = mudo;
      aplicarMudo(player);
    }
    // a voz sintetica nao tem volume ao vivo: cala a frase em curso
    if (mudo && temSintese()) window.speechSynthesis.cancel();
    salvarMudo(mudo);
  }, [mudo]);

  // a analise so nasce num gesto; ao voltar para a aba, retoma o contexto
  useEffect(() => {
    const aoGesto = (): void => {
      const player = audioRef.current;
      if (player) prepararAnalise(player as AudioComAnalise);
    };
    const aoVoltar = (): void => {
      const a = (audioRef.current as AudioComAnalise | null)?.__analise;
      if (!document.hidden && a && a.ctx.state !== "running") void a.ctx.resume().catch(() => {});
    };
    const eventos = ["pointerdown", "keydown", "touchstart"] as const;
    eventos.forEach((ev) => window.addEventListener(ev, aoGesto, { passive: true }));
    document.addEventListener("visibilitychange", aoVoltar);
    // o Chrome entrega a lista de vozes so depois de um tempo
    if (temSintese()) window.speechSynthesis.getVoices();
    return () => {
      eventos.forEach((ev) => window.removeEventListener(ev, aoGesto));
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, []);

  useEffect(() => {
    const player = audioRef.current;
    return () => {
      try {
        player?.pause();
        if (temSintese()) window.speechSynthesis.cancel();
      } catch {
        /* ignora */
      }
    };
  }, []);

  return { falar, tocar, pular, falando, nivelVoz, largVoz, progressoVoz, mudo, alternarMudo };
}
