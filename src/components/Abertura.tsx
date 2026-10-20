import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { DESPEDIDA } from "../data/despedida";
import { asset } from "../config";
import LuzVarinha from "./LuzVarinha";

gsap.registerPlugin(SplitText, useGSAP);

/* =========================================================================
   ABERTURA - "acender as velas"
   -------------------------------------------------------------------------
   O salao comeca so com o luar, as velas apagadas. Um preloader segura a
   tela ate a cena estar pronta; depois o nome dela surge letra por letra,
   prateado de luar. A pessoa SEGURA o botao para acender as velas: o anel
   se completa, as velas acendem em onda pelo salao (CenaChapeu), o nome
   esquenta para dourado e a interface sai de cena enquanto a camera desce.

   O primeiro toque no botao tambem e o gesto que libera o som.
   ========================================================================= */

interface AberturaProps {
  /** O cenario ja tem algo para mostrar (3D pronto ou imagem parada). */
  pronto: boolean;
  /** Atras da tela esta o video do castelo (e nao o salao ao luar). */
  comCastelo: boolean;
  /** Primeiro toque no botao: libera o audio e comeca a musica. */
  onPrimeiroToque: () => void;
  /** O anel completou: as velas comecam a acender. */
  onAcender: () => void;
  /** A interface ja saiu de cena: comeca a cerimonia. */
  onEntrar: () => void;
  onIrParaCartas: () => void;
}

/** Quanto tempo segurar ate acender, em segundos. */
const SEGURAR_S = 1.25;
/** Da faisca ate a interface sumir e a cerimonia comecar. */
const SAIDA_S = 2.7;
/** O preloader fica pelo menos isso na tela, para nao piscar. */
const PRELOADER_MIN_MS = 1400;
/** Se a cena demorar demais, a abertura comeca assim mesmo. */
const PRELOADER_MAX_MS = 9000;

/** O brasao do botao de segurar. */
const BRASAO = "img/brasao.webp";

function semMovimento(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function Abertura({ pronto, comCastelo, onPrimeiroToque, onAcender, onEntrar, onIrParaCartas }: AberturaProps) {
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const [liberada, setLiberada] = useState(false);
  const [segurando, setSegurando] = useState(false);
  const [acesa, setAcesa] = useState(false);
  const progresso = useRef({ p: 0 });
  const tweenSegurar = useRef<gsap.core.Tween | null>(null);
  const tocou = useRef(false);
  const acesaRef = useRef(false);
  const avisos = useRef({ onPrimeiroToque, onAcender, onEntrar });
  avisos.current = { onPrimeiroToque, onAcender, onEntrar };

  /* ---------- preloader: espera a cena e as fontes ---------- */
  useEffect(() => {
    const t0 = performance.now();
    let vivo = true;
    let teto: ReturnType<typeof setTimeout> | undefined;
    const liberar = (): void => {
      if (!vivo) return;
      const falta = Math.max(0, PRELOADER_MIN_MS - (performance.now() - t0));
      setTimeout(() => vivo && setLiberada(true), falta);
    };
    teto = setTimeout(liberar, PRELOADER_MAX_MS);
    if (pronto) {
      const fontes = document.fonts?.ready ?? Promise.resolve();
      void Promise.race([fontes, new Promise((r) => setTimeout(r, 2500))]).then(() => {
        clearTimeout(teto);
        liberar();
      });
    }
    return () => {
      vivo = false;
      clearTimeout(teto);
    };
  }, [pronto]);

  /* ---------- entrada: preloader sai, o nome surge ---------- */
  useGSAP(
    () => {
      if (!liberada) return;
      const calmo = semMovimento();
      const nome = new SplitText(".ab-nome", { type: "chars,words", charsClass: "ab-letra" });
      const lead = new SplitText(".ab-lead", { type: "lines", mask: "lines", linesClass: "ab-linha" });

      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.to(".ab-preloader", { autoAlpha: 0, duration: 0.9, ease: "power2.inOut" })
        .set(".ab-conteudo", { autoAlpha: 1 }, "<0.3")
        .from(".ab-sobre", { y: 18, autoAlpha: 0, duration: 1.4 }, "<0.2")
        .from(
          nome.chars,
          {
            yPercent: calmo ? 0 : 60,
            rotateX: calmo ? 0 : -70,
            autoAlpha: 0,
            duration: calmo ? 0.6 : 1.8,
            stagger: { each: 0.055, from: "center" },
          },
          "<0.25"
        )
        .from(".ab-filete", { scaleX: 0, duration: 1.6, ease: "expo.inOut" }, "<0.6")
        .from(lead.lines, { yPercent: 110, duration: 1.3, stagger: 0.1 }, "<0.35")
        .from(".ab-acao", { y: 24, autoAlpha: 0, duration: 1.4 }, "<0.3")
        .from(".ab-rodape > *", { y: 12, autoAlpha: 0, duration: 1.1, stagger: 0.12 }, "<0.25");

      // o nome respira devagar enquanto espera
      if (!calmo) {
        gsap.to(nome.chars, {
          yPercent: -3,
          duration: 2.6,
          ease: "sine.inOut",
          stagger: { each: 0.12, from: "start", repeat: -1, yoyo: true },
          delay: 3,
        });
      }
      return () => {
        nome.revert();
        lead.revert();
      };
    },
    { scope: raiz, dependencies: [liberada] }
  );

  /* ---------- acender: o anel completou ---------- */
  const acender = useCallback((): void => {
    if (acesaRef.current) return;
    acesaRef.current = true;
    // para a respiracao do nome antes de animar as letras de novo
    gsap.killTweensOf(".ab-letra");
    setAcesa(true);
    setSegurando(false);
    avisos.current.onAcender();

    const calmo = semMovimento();
    const tl = gsap.timeline({ onComplete: () => avisos.current.onEntrar() });
    tl.to(raiz.current, { "--aceso": 1, duration: 1.6, ease: "power2.out" }, 0)
      // o brasao, ja todo colorido, brilha e se dissolve no clarao
      .to(".ab-brasao", { scale: 1.12, duration: 0.35, ease: "power2.out" }, 0)
      .to(".ab-brasao", { scale: 1.3, autoAlpha: 0, duration: 0.9, ease: "expo.out" }, 0.35)
      .to(".ab-clarao", { scale: 7, autoAlpha: 0, duration: 1.3, ease: "expo.out", startAt: { scale: 0.4, autoAlpha: 0.9 } }, 0)
      .to(
        ".ab-letra",
        {
          yPercent: calmo ? 0 : -12,
          duration: 0.5,
          ease: "power2.out",
          stagger: { each: 0.035, from: "center", yoyo: true, repeat: 1 },
        },
        0.05
      )
      .to([".ab-dica", ".ab-rodape > *"], { y: -10, autoAlpha: 0, duration: 0.8, stagger: 0.05, ease: "power2.in" }, 0.25)
      // o brilho quente que sobra no fundo do botao sai junto
      .to(".ab-acao", { autoAlpha: 0, duration: 0.9, ease: "power2.inOut" }, 0.6)
      .to([".ab-sobre", ".ab-lead", ".ab-filete"], { y: -16, autoAlpha: 0, duration: 1, stagger: 0.08, ease: "power2.in" }, 1.1)
      .to(".ab-letra", { y: calmo ? 0 : -40, autoAlpha: 0, duration: 1.1, stagger: { each: 0.03, from: "edges" }, ease: "power2.in" }, 1.45)
      // a cerimonia comeca com a onda das velas ja no fim
      .to({}, { duration: 0.01 }, SAIDA_S);
  }, []);

  /* ---------- segurar: o brasao se enche de cor de baixo para cima ---------- */
  const desenharAnel = useCallback((p: number): void => {
    // o CSS le --segura: recorte da camada colorida, linha de brilho e halo
    raiz.current?.style.setProperty("--segura", p.toFixed(3));
  }, []);

  const comecar = useCallback((): void => {
    if (acesaRef.current) return;
    if (!tocou.current) {
      tocou.current = true;
      avisos.current.onPrimeiroToque();
    }
    setSegurando(true);
    tweenSegurar.current?.kill();
    const falta = 1 - progresso.current.p;
    tweenSegurar.current = gsap.to(progresso.current, {
      p: 1,
      duration: semMovimento() ? 0.05 : SEGURAR_S * falta,
      ease: "power1.in",
      onUpdate: () => desenharAnel(progresso.current.p),
      onComplete: acender,
    });
  }, [acender, desenharAnel]);

  const soltar = useCallback((): void => {
    if (acesaRef.current) return;
    setSegurando(false);
    tweenSegurar.current?.kill();
    tweenSegurar.current = gsap.to(progresso.current, {
      p: 0,
      duration: 0.5,
      ease: "power2.out",
      onUpdate: () => desenharAnel(progresso.current.p),
    });
  }, [desenharAnel]);

  // teclado: segurar Enter ou espaco no botao
  const teclaDesce = (e: React.KeyboardEvent): void => {
    if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
      e.preventDefault();
      comecar();
    }
  };
  const teclaSobe = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      soltar();
    }
  };

  useEffect(
    () => () => {
      tweenSegurar.current?.kill();
    },
    []
  );

  const dica = acesa
    ? ""
    : segurando
      ? "Continue segurando…"
      : comCastelo
        ? "Segure para entrar no castelo"
        : "Segure para acender as velas";

  return (
    <div className={`ab${segurando ? " segurando" : ""}${acesa ? " acesa" : ""}`} ref={raiz}>
      <div className="ab-preloader" aria-live="polite">
        <span className="ab-pre-chama" aria-hidden="true" />
        <span className="ab-pre-texto">Preparando o salão</span>
        <span className="ab-pre-linha" aria-hidden="true" />
      </div>

      <div className="ab-conteudo">
        <main className="ab-centro">
          <p className="ab-sobre">Uma cerimônia para</p>
          <h1 className="ab-nome">{DESPEDIDA.nomeCompleto}</h1>
          <span className="ab-filete" aria-hidden="true" />
          <p className="ab-lead">
            O velho Chapéu Seletor guardou uma mensagem para você.{" "}
            {comCastelo ? "Aumente o som e entre no castelo." : "Aumente o som e acenda as velas do salão."}
          </p>
        </main>

        <div className="ab-acao">
          <button
            ref={botao}
            type="button"
            className="ab-botao"
            aria-label={comCastelo ? "Segure para entrar no castelo e começar a cerimônia" : "Segure para acender as velas e começar a cerimônia"}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              comecar();
            }}
            onPointerUp={soltar}
            onPointerCancel={soltar}
            onLostPointerCapture={soltar}
            onKeyDown={teclaDesce}
            onKeyUp={teclaSobe}
            onContextMenu={(e) => e.preventDefault()}
            disabled={acesa}
          >
            <span className="ab-clarao" aria-hidden="true" />
            {/* o brasao da equipe (public/img/brasao.webp): apagado em espera,
                e a cor sobe de baixo para cima enquanto ela segura (--segura) */}
            <span className="ab-brasao" aria-hidden="true">
              <img className="ab-brasao-apagado" src={asset(BRASAO)} alt="" draggable={false} />
              <img className="ab-brasao-cor" src={asset(BRASAO)} alt="" draggable={false} />
              <span className="ab-brasao-nivel" />
            </span>
          </button>
          <p className="ab-dica" aria-hidden="true">
            {dica}
          </p>
        </div>

        <footer className="ab-rodape">
          <span className="ab-som">
            <span className="ab-ondas" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
            Melhor com som
          </span>
          <button type="button" className="ab-cartas" onClick={onIrParaCartas}>
            Já participei, ver minhas cartas
            <span aria-hidden="true">→</span>
          </button>
        </footer>
      </div>

      {liberada && !acesa && <LuzVarinha />}
    </div>
  );
}
