import { useRef } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import HouseCrest from "./HouseCrest";
import { HOUSES } from "../data/houses";
import { DESPEDIDA } from "../data/despedida";
import type { HouseKey } from "../types";

gsap.registerPlugin(SplitText, useGSAP);

/* =========================================================================
   REVELACAO - o nome dela e o convite para o Correio Coruja
   -------------------------------------------------------------------------
   Mesma linguagem da abertura: o nome surge letra por letra em dourado e
   depois ganha um brilho que corre de tempos em tempos; o botao abre as
   cartas.
   ========================================================================= */

interface RevelacaoProps {
  casa: HouseKey | null;
  onAbrirCartas: () => void;
}

function semMovimento(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function Revelacao({ casa, onAbrirCartas }: RevelacaoProps) {
  const raiz = useRef<HTMLDivElement>(null);
  const h = casa ? HOUSES[casa] : null;

  useGSAP(
    () => {
      const calmo = semMovimento();
      const nome = new SplitText(".rv-nome", { type: "chars", charsClass: "rv-letra" });

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
        .from(".rv-ornamento", { scaleX: 0, autoAlpha: 0, duration: 1.3, ease: "expo.inOut" }, "<1")
        .from(".rv-abrir", { autoAlpha: 0, y: 12, duration: 1.1 }, "<0.5");

      return () => nome.revert();
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

        <span className="rv-ornamento" aria-hidden="true">
          <i />
          <b />
          <i />
        </span>

        <button type="button" className="rv-abrir" onClick={onAbrirCartas}>
          <span>Abrir o Correio Coruja</span>
          <span className="rv-abrir-seta" aria-hidden="true">
            →
          </span>
        </button>
      </div>
    </div>
  );
}
