import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CARTAS } from "../data/cartas";
import { DESPEDIDA, comNome } from "../data/despedida";
import { FOTO_DIR, VIDEO_NUVENS, VIDEO_NUVENS_VOO, asset } from "../config";
import type { Carta } from "../types";

gsap.registerPlugin(useGSAP);

/* =========================================================================
   CARTAS - a coruja nas nuvens e os envelopes que saem da sacola
   -------------------------------------------------------------------------
   Ao entrar, a camera sobe do castelo ate acima das nuvens (video que toca
   uma vez) e emenda no loop da coruja branca carregando uma sacola de pano.
   Os envelopes (foto real, public/img/envelope.webp) voam para fora da
   sacola e se abrem num leque; cada um flutua, inclina em 3D seguindo o
   mouse e sobe na direcao da camera ao passar o mouse. Clicar abre a carta.
   As lidas ficam marcadas neste navegador.
   ========================================================================= */

const CHAVE_LIDAS = "chapeu-despedida:lidas";
const FOTO_ENVELOPE = "img/envelope.webp";
/** O pergaminho da carta aberta: a mesma foto da carta de login, cortada em tercos pelo CSS. */
const FOTO_CARTA = { "--foto": `url("${asset("img/carta-pergaminho.webp")}")` } as CSSProperties;
/** A boca da sacola no quadro do video (fracao de 1920 x 1080): de onde as cartas saem. */
const SACOLA = { fx: 0.49, fy: 0.44 };
/** Quanto antes do fim do voo o loop da coruja entra (cruzam num fade). */
const TROCA_S = 0.7;

function lerLidas(): Set<number> {
  try {
    const bruto = window.localStorage.getItem(CHAVE_LIDAS);
    const lista: unknown = bruto ? JSON.parse(bruto) : [];
    return new Set(Array.isArray(lista) ? lista.filter((n): n is number => typeof n === "number") : []);
  } catch {
    return new Set();
  }
}

function salvarLidas(lidas: Set<number>): void {
  try {
    window.localStorage.setItem(CHAVE_LIDAS, JSON.stringify([...lidas]));
  } catch {
    /* armazenamento bloqueado: vale so nesta sessao */
  }
}

function semMovimento(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface Lugar {
  /** Centro do envelope, em % da tela. */
  x: number;
  y: number;
  /** Inclinacao, em graus. */
  r: number;
  /** Profundidade: as de perto vem na direcao da camera. */
  z: number;
  /** Tamanho relativo (as de longe ficam menores). */
  s: number;
}

/**
 * Onde cada carta cai: espalhadas pelo ceu, sem padrao, longe da coruja
 * (o centro de cima). Mais cartas que lugares ganham um lugar vizinho com
 * um desvio estavel, sem Math.random.
 */
/*
 * A profundidade (z) empurra a carta para longe do centro da tela por causa
 * da perspectiva: as das pontas ficam rasas, as do meio podem vir mais perto.
 */
const LUGARES_TELA: readonly Lugar[] = [
  { x: 37, y: 58, r: -14, z: 10, s: 0.92 },
  { x: 43, y: 76, r: 8, z: 40, s: 1.02 },
  { x: 55, y: 62, r: -5, z: 30, s: 0.9 },
  { x: 63, y: 77, r: 13, z: 40, s: 1.02 },
  { x: 66, y: 55, r: -10, z: 10, s: 0.92 },
  { x: 31, y: 74, r: 16, z: 10, s: 0.98 },
  { x: 53, y: 81, r: -8, z: 50, s: 1.02 },
  { x: 27, y: 53, r: 18, z: 0, s: 0.84 },
  { x: 72, y: 68, r: -16, z: 0, s: 0.94 },
  { x: 74, y: 47, r: 11, z: 0, s: 0.82 },
];
/** Em pe: fileiras de 3 e 2 alternadas, mais para o meio da tela. */
const LUGARES_RETRATO: readonly Lugar[] = [
  { x: 24, y: 46, r: -10, z: 0, s: 0.94 },
  { x: 50, y: 49, r: 5, z: 10, s: 0.96 },
  { x: 76, y: 45, r: -7, z: 0, s: 0.94 },
  { x: 37, y: 58, r: 9, z: 10, s: 0.98 },
  { x: 63, y: 59, r: -10, z: 10, s: 0.98 },
  { x: 24, y: 69, r: 10, z: 0, s: 1 },
  { x: 50, y: 70, r: -5, z: 20, s: 1.02 },
  { x: 76, y: 69, r: 9, z: 0, s: 1 },
  { x: 37, y: 80, r: -8, z: 10, s: 1.02 },
  { x: 63, y: 81, r: 7, z: 10, s: 1.02 },
];

function lugares(n: number, retrato: boolean): Lugar[] {
  const base = retrato ? LUGARES_RETRATO : LUGARES_TELA;
  return Array.from({ length: n }, (_, i) => {
    const l = base[i % base.length]!;
    const volta = Math.floor(i / base.length);
    if (!volta) return l;
    const f = Math.sin(i * 12.9898) * 43758.5453;
    const d = f - Math.floor(f) - 0.5;
    return { ...l, x: Math.min(92, Math.max(8, l.x + d * 14)), y: Math.min(90, l.y + 6 * volta), r: l.r + d * 20 };
  });
}

/** Onde um ponto do video (object-fit: cover) cai na tela. */
function pontoNaTela(fx: number, fy: number): { x: number; y: number } {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const escala = Math.max(w / 1920, h / 1080);
  return { x: (w - 1920 * escala) / 2 + fx * 1920 * escala, y: (h - 1080 * escala) / 2 + fy * 1080 * escala };
}

/** Mesma regra do CSS (max-aspect-ratio: 9/10): no celular a largura so fica certa depois da carga. */
const MIDIA_RETRATO = "(max-aspect-ratio: 9/10)";

function useRetrato(): boolean {
  const [retrato, setRetrato] = useState(() => typeof window !== "undefined" && window.matchMedia(MIDIA_RETRATO).matches);
  useEffect(() => {
    const mq = window.matchMedia(MIDIA_RETRATO);
    const medir = (): void => setRetrato(mq.matches);
    medir();
    mq.addEventListener("change", medir);
    window.addEventListener("resize", medir);
    return () => {
      mq.removeEventListener("change", medir);
      window.removeEventListener("resize", medir);
    };
  }, []);
  return retrato;
}

interface EnvelopeProps {
  carta: Carta;
  indice: number;
  lugar: Lugar;
  lida: boolean;
  onAbrir: () => void;
}

function Envelope({ carta, indice, lugar, lida, onAbrir }: EnvelopeProps) {
  const corpo = useRef<HTMLSpanElement>(null);

  // inclina na direcao do mouse, como se a carta estivesse na mao
  const inclinar = (e: PointerEvent<HTMLButtonElement>): void => {
    if (e.pointerType !== "mouse" || !corpo.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    corpo.current.style.setProperty("--ry", `${px * 22}deg`);
    corpo.current.style.setProperty("--rx", `${-py * 22}deg`);
  };
  const soltar = (): void => {
    corpo.current?.style.setProperty("--ry", "0deg");
    corpo.current?.style.setProperty("--rx", "0deg");
  };

  return (
    <button
      type="button"
      className={`ev${lida ? " lida" : ""}`}
      style={
        {
          "--x": `${lugar.x}%`,
          "--y": `${lugar.y}%`,
          "--r": `${lugar.r}deg`,
          "--z": `${lugar.z}px`,
          "--s": lugar.s,
          "--dur": `${5.5 + (indice % 3) * 0.9}s`,
          "--atraso": `${-indice * 1.3}s`,
        } as CSSProperties
      }
      onClick={onAbrir}
      onPointerMove={inclinar}
      onPointerLeave={soltar}
      aria-label={`Carta de ${carta.de}${lida ? " (lida)" : ""}`}
    >
      <span className="ev-flutua">
        <span className="ev-corpo" ref={corpo}>
          <img src={asset(FOTO_ENVELOPE)} alt="" draggable={false} />
          <span className="ev-de">{carta.de}</span>
          {lida && <span className="ev-lida">lida</span>}
        </span>
      </span>
    </button>
  );
}

interface CartaAbertaProps {
  carta: Carta;
  indice: number;
  total: number;
  /** true na primeira abertura: a carta chega dobrada e desdobra. */
  envelope: boolean;
  onFechar: () => void;
  onAnterior: () => void;
  onProxima: () => void;
}

/**
 * A carta aberta: o mesmo pergaminho de foto da carta de login, dobrado em
 * tres. Na primeira abertura ele chega dobrado e desdobra; depois a escrita
 * aparece em tinta sobre o papel. Navegar entre cartas so troca a escrita.
 */
function CartaAberta({ carta, indice, total, envelope, onFechar, onAnterior, onProxima }: CartaAbertaProps) {
  const palco = useRef<HTMLDivElement>(null);
  const paragrafos = useMemo(
    () =>
      comNome(carta.texto)
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean),
    [carta]
  );
  const data = useMemo(
    () => new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }),
    []
  );

  useEffect(() => {
    const tecla = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onFechar();
      else if (e.key === "ArrowRight") onProxima();
      else if (e.key === "ArrowLeft") onAnterior();
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onFechar, onProxima, onAnterior]);

  useGSAP(
    () => {
      const escrita = ".cl-escrita > *";
      if (!envelope || semMovimento()) {
        gsap.from(escrita, { autoAlpha: 0, y: 6, duration: 0.6, stagger: 0.06, ease: "power2.out" });
        return;
      }
      const tl = gsap.timeline({ defaults: { ease: "power3.inOut" } });
      tl.from(".cl", { y: 140, rotate: 6, scale: 0.8, autoAlpha: 0, duration: 1, ease: "power3.out" })
        // abre como a carta de login: primeiro a aba de cima, depois a de baixo
        .from(".cl .lc-topo", { rotateX: -179, duration: 1 }, "-=0.2")
        .from(".cl .lc-base", { rotateX: 179, duration: 1 }, "-=0.45")
        .set([".cl .lc-topo", ".cl .lc-base"], { clearProps: "transform" })
        // a tinta aparece no papel, linha por linha
        .from(escrita, { autoAlpha: 0, y: 6, filter: "blur(3px)", duration: 0.8, stagger: 0.12, ease: "power2.out" }, "-=0.3")
        .from([".cl-fechar", ".cl-nav"], { autoAlpha: 0, duration: 0.6 }, "<");
    },
    { scope: palco, dependencies: [indice, envelope] }
  );

  return (
    <div className="carta-overlay" role="dialog" aria-modal="true" aria-label={`Carta de ${carta.de}`} onClick={onFechar}>
      <div className="cl-palco" ref={palco} onClick={(e) => e.stopPropagation()}>
        <article className="cl" style={FOTO_CARTA}>
          <div className="lc-folha">
            <section className="lc-painel lc-topo" aria-hidden="true">
              <div className="lc-frente" />
              <div className="lc-verso" />
            </section>
            <section className="lc-painel lc-meio" aria-hidden="true">
              <div className="lc-frente" />
            </section>
            <section className="lc-painel lc-base" aria-hidden="true">
              <div className="lc-frente" />
              <div className="lc-verso" />
            </section>

            {/* a escrita, por cima dos tres tercos (o lacre e o da foto) */}
            <div className="cl-escrita" key={indice}>
              <p className="cl-cabecalho">
                <span aria-hidden="true">✦</span>
                Correio Coruja
                <span aria-hidden="true">✦</span>
              </p>
              <p className="cl-data">{data}</p>
              <div className="cl-corpo">
                {carta.foto && (
                  <figure className="cl-foto">
                    <img src={asset(FOTO_DIR + carta.foto)} alt={`Foto enviada por ${carta.de}`} />
                  </figure>
                )}
                {paragrafos.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              <div className="cl-assinatura">
                <strong>{carta.de}</strong>
                {carta.cargo && <span>{carta.cargo}</span>}
              </div>
            </div>
          </div>
          <button type="button" className="cl-fechar" aria-label="Fechar carta" onClick={onFechar}>
            ×
          </button>
        </article>

        {total > 1 && (
          <nav className="cl-nav">
            <button type="button" className="btn btn-ghost" onClick={onAnterior}>
              ‹ Anterior
            </button>
            <span>
              {indice + 1} / {total}
            </span>
            <button type="button" className="btn btn-ghost" onClick={onProxima}>
              Próxima ›
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}

interface CartasProps {
  onSair: () => void;
  /** Toca o sino de carta aberta. */
  onCartaAberta: () => void;
}

export default function Cartas({ onSair, onCartaAberta }: CartasProps) {
  const [aberta, setAberta] = useState<number | null>(null);
  const [comEnvelope, setComEnvelope] = useState(true);
  const [lidas, setLidas] = useState<Set<number>>(lerLidas);
  // "voo": subindo do castelo; "nuvens": a coruja em loop e as cartas no ar
  const [etapa, setEtapa] = useState<"voo" | "nuvens">(() => (semMovimento() ? "nuvens" : "voo"));
  const raiz = useRef<HTMLDivElement>(null);
  const voo = useRef<HTMLVideoElement>(null);
  const loop = useRef<HTMLVideoElement>(null);
  const retrato = useRetrato();
  const total = CARTAS.length;
  const posicoes = useMemo(() => lugares(total, retrato), [total, retrato]);

  /* ---------- o voo ate as nuvens, e a coruja em loop ---------- */
  const irParaNuvens = useCallback((): void => {
    const l = loop.current;
    if (l) {
      l.currentTime = 0;
      void l.play().catch(() => {});
    }
    setEtapa("nuvens");
  }, []);

  useEffect(() => {
    if (etapa !== "voo") return;
    const v = voo.current;
    if (!v) return;
    let foi = false;
    const trocar = (): void => {
      if (foi) return;
      foi = true;
      irParaNuvens();
    };
    const tempo = (): void => {
      if (Number.isFinite(v.duration) && v.duration - v.currentTime < TROCA_S) trocar();
    };
    v.addEventListener("timeupdate", tempo);
    v.addEventListener("ended", trocar);
    v.addEventListener("error", trocar);
    void v.play().catch(trocar);
    return () => {
      v.removeEventListener("timeupdate", tempo);
      v.removeEventListener("ended", trocar);
      v.removeEventListener("error", trocar);
    };
  }, [etapa, irParaNuvens]);

  /* ---------- as cartas saem da sacola e se abrem em leque ---------- */
  useGSAP(
    () => {
      if (etapa !== "nuvens") return;
      const calmo = semMovimento();
      const boca = pontoNaTela(SACOLA.fx, SACOLA.fy);
      const tl = gsap.timeline({ delay: calmo ? 0 : 0.35 });
      tl.fromTo(
        ".ev",
        {
          x: (_: number, el: Element) => {
            const r = el.getBoundingClientRect();
            return calmo ? 0 : boca.x - (r.left + r.width / 2);
          },
          y: (_: number, el: Element) => {
            const r = el.getBoundingClientRect();
            return calmo ? 0 : boca.y - (r.top + r.height / 2);
          },
          scale: calmo ? 1 : 0.18,
          rotate: (i: number) => (calmo ? 0 : (i % 2 ? 1 : -1) * (40 + i * 9)),
          autoAlpha: 0,
        },
        {
          x: 0,
          y: 0,
          scale: 1,
          rotate: 0,
          autoAlpha: 1,
          duration: calmo ? 0.5 : 1.5,
          ease: "power3.out",
          stagger: calmo ? 0 : 0.13,
        }
      ).fromTo(
        [".mural-topo > *", ".mural-dica", ".mural-rodape > *"],
        { autoAlpha: 0, y: 10 },
        { autoAlpha: 1, y: 0, duration: 1, stagger: 0.08, ease: "power2.out" },
        "-=0.9"
      );
    },
    { scope: raiz, dependencies: [etapa, retrato] }
  );

  const abrir = useCallback(
    (i: number, envelope = true): void => {
      const n = ((i % total) + total) % total;
      setComEnvelope(envelope);
      setAberta(n);
      onCartaAberta();
      setLidas((atual) => {
        if (atual.has(n)) return atual;
        const nova = new Set(atual);
        nova.add(n);
        salvarLidas(nova);
        return nova;
      });
    },
    [total, onCartaAberta]
  );

  const fechar = useCallback(() => setAberta(null), []);
  const anterior = useCallback(() => aberta !== null && abrir(aberta - 1, false), [aberta, abrir]);
  const proxima = useCallback(() => aberta !== null && abrir(aberta + 1, false), [aberta, abrir]);
  const cartaAberta = aberta === null ? undefined : CARTAS[aberta];

  return (
    <div className={`mural mural--${etapa}${aberta !== null ? " mural--lendo" : ""}`} ref={raiz}>
      <div className="mural-fundo" aria-hidden="true">
        <video
          ref={loop}
          className={`mural-video${etapa === "nuvens" ? " on" : ""}`}
          src={asset(VIDEO_NUVENS)}
          muted
          loop
          playsInline
          autoPlay={etapa === "nuvens"}
          preload="auto"
        />
        <video
          ref={voo}
          className={`mural-video mural-video--voo${etapa === "voo" ? " on" : ""}`}
          src={asset(VIDEO_NUVENS_VOO)}
          muted
          playsInline
          preload="auto"
        />
      </div>

      <header className="mural-topo">
        <p className="eyebrow">Correio Coruja</p>
        <h1 className="mural-titulo">
          Cartas para <span>{DESPEDIDA.nome}</span>
        </h1>
      </header>

      <div className="mural-ceu">
        {CARTAS.map((c, i) => (
          <Envelope
            key={i}
            carta={c}
            indice={i}
            lugar={posicoes[i]!}
            lida={lidas.has(i)}
            onAbrir={() => abrir(i)}
          />
        ))}
      </div>

      <p className="mural-dica">
        {lidas.size >= total ? "Você leu todas. Elas ficam aqui sempre que quiser voltar." : "Escolha uma carta para abrir"}
      </p>

      <footer className="mural-rodape">
        <button type="button" className="btn btn-ghost" onClick={onSair}>
          Sair
        </button>
      </footer>

      {cartaAberta && aberta !== null && (
        <CartaAberta
          carta={cartaAberta}
          indice={aberta}
          total={total}
          envelope={comEnvelope}
          onFechar={fechar}
          onAnterior={anterior}
          onProxima={proxima}
        />
      )}
    </div>
  );
}
