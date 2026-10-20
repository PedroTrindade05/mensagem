import { useEffect, useMemo, useState } from "react";

/* =========================================================================
   LEGENDA - a fala do Chapeu aparece palavra por palavra, no ritmo da voz
   ========================================================================= */

interface LegendaProps {
  texto: string;
  /** Progresso da fala atual (0..1), lido a cada quadro. */
  lerProgresso: () => number;
}

export default function Legenda({ texto, lerProgresso }: LegendaProps) {
  const palavras = useMemo(() => texto.split(/\s+/).filter(Boolean), [texto]);
  const [visiveis, setVisiveis] = useState(0);

  useEffect(() => {
    setVisiveis(0);
    let raf = 0;
    const passo = (): void => {
      // a legenda corre um pouquinho na frente da voz: le-se antes de ouvir
      const n = Math.ceil(Math.min(lerProgresso() * 1.08 + 0.02, 1) * palavras.length);
      setVisiveis((v) => (n > v ? n : v));
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [palavras, lerProgresso]);

  return (
    <div className="legenda-area">
      <div className="legenda" key={texto} aria-live="polite">
        <p className="legenda-texto">
          {palavras.map((p, i) => (
            <span key={i} className={i < visiveis ? "palavra on" : "palavra"}>
              {p}{" "}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
