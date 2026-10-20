import { useRef } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import HouseCrest from "./HouseCrest";
import { HOUSES } from "../data/houses";
import { DESPEDIDA, comNome } from "../data/despedida";
import type { HouseKey } from "../types";

gsap.registerPlugin(SplitText, useGSAP);

/* =========================================================================
   REVELACAO - o nome dela, a dedicatoria e a carta que a coruja trouxe
   -------------------------------------------------------------------------
   Mesma linguagem da abertura: o nome surge letra por letra em dourado e
   depois ganha um brilho que corre de tempos em tempos; a dedicatoria
   aparece palavra por palavra; um envelope lacrado chega voando e fica
   flutuando. Passar o mouse abre a aba e a carta aparece; clicar nele (ou
   no botao) abre o Correio Coruja.
   ========================================================================= */

interface RevelacaoProps {
  casa: HouseKey | null;
  onAbrirCartas: () => void;
}

function semMovimento(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Destaca o fim da dedicatoria ("..., mas nunca de equipe."): o que vem depois da virgula. */
function partirDedicatoria(texto: string): [string, string] {
  const i = texto.lastIndexOf(",");
  return i < 0 ? [texto, ""] : [texto.slice(0, i + 1), texto.slice(i + 1)];
}

export default function Revelacao({ casa, onAbrirCartas }: RevelacaoProps) {
  const raiz = useRef<HTMLDivElement>(null);
  const h = casa ? HOUSES[casa] : null;
  const [inicio, destaque] = partirDedicatoria(comNome(DESPEDIDA.dedicatoria));
  const inicial = DESPEDIDA.nome.charAt(0).toUpperCase();

  useGSAP(
    () => {
      const calmo = semMovimento();
      const nome = new SplitText(".rv-nome", { type: "chars", charsClass: "rv-letra" });
      const dedica = new SplitText(".rv-dedica", { type: "words", wordsClass: "rv-palavra" });

      const tl = gsap.timeline({ defaults: { ease: "expo.out" }, delay: 0.35 });
      tl.from(".rv-sobre-linha", { scaleX: 0, duration: 1.4, ease: "expo.inOut", stagger: 0.1 })
        .from(".rv-sobre-texto", { autoAlpha: 0, y: 8, duration: 1.3 }, "<0.25")
        .from(
          nome.chars,
          {
            yPercent: calmo ? 0 : 70,
            rotateX: calmo ? 0 : -80,
            autoAlpha: 0,
            duration: calmo ? 0.6 : 1.9,
            stagger: { each: 0.07, from: "center" },
            onComplete: () => {
              // o nome volta a ser um texto so, para o brilho dourado correr nele
              nome.revert();
              raiz.current?.querySelector(".rv-nome")?.classList.add("brilha");
            },
          },
          "<0.15"
        )
        .from(
          dedica.words,
          { autoAlpha: 0, y: calmo ? 0 : 14, filter: "blur(8px)", duration: 1.2, stagger: 0.07, ease: "power3.out" },
          "<0.8"
        )
        .from(".rv-ornamento", { scaleX: 0, autoAlpha: 0, duration: 1.3, ease: "expo.inOut" }, "<0.6")
        // a coruja deixa a carta: ela chega do alto, girando, e assenta
        .from(
          ".rv-carta",
          {
            x: calmo ? 0 : 180,
            y: calmo ? 0 : -260,
            rotate: calmo ? 0 : 32,
            scale: calmo ? 1 : 0.7,
            autoAlpha: 0,
            duration: calmo ? 0.6 : 1.9,
            ease: "power3.out",
          },
          "<0.15"
        )
        .from(".rv-convite > *", { autoAlpha: 0, y: 12, duration: 1.1, stagger: 0.14 }, "<1");

      // depois de pousar, a carta flutua devagar
      if (!calmo) {
        tl.add(
          gsap.to(".rv-carta-flutua", { y: -7, rotate: -1.2, duration: 2.8, ease: "sine.inOut", yoyo: true, repeat: -1 }),
          ">-0.6"
        );
      }

      return () => {
        nome.revert();
        dedica.revert();
      };
    },
    { scope: raiz }
  );

  return (
    <div className="revelacao" ref={raiz}>
      <div className="rv-box">
        <p className="rv-sobre">
          <span className="rv-sobre-linha" aria-hidden="true" />
          <span className="rv-sobre-texto">Com carinho, de toda a equipe</span>
          <span className="rv-sobre-linha" aria-hidden="true" />
        </p>

        {h && casa && <HouseCrest casa={casa} />}
        <h1 className="rv-nome">{DESPEDIDA.nome}</h1>

        <p className="rv-dedica">
          {inicio}
          {destaque && <strong className="rv-dedica-destaque">{destaque}</strong>}
        </p>

        <span className="rv-ornamento" aria-hidden="true">
          <i />
          <b />
          <i />
        </span>

        <button type="button" className="rv-carta" onClick={onAbrirCartas} aria-label="Abrir o Correio Coruja">
          <span className="rv-carta-flutua">
            <span className="rv-env">
              <span className="rv-env-fundo" />
              <span className="rv-env-papel">
                <i />
                <i />
                <i />
              </span>
              <span className="rv-env-frente" />
              <span className="rv-env-aba" />
              <span className="rv-env-selo">{inicial}</span>
            </span>
          </span>
        </button>

        <div className="rv-convite">
          <p>As corujas trouxeram cartas para você.</p>
          <button type="button" className="rv-abrir" onClick={onAbrirCartas}>
            <span>Abrir o Correio Coruja</span>
            <span className="rv-abrir-seta" aria-hidden="true">
              →
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
