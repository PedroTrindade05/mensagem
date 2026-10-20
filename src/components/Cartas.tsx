import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { CARTAS } from "../data/cartas";
import { DESPEDIDA, comNome } from "../data/despedida";
import { HOUSES } from "../data/houses";
import { FOTO_DIR, asset } from "../config";
import type { Carta } from "../types";

/* =========================================================================
   MURAL DE CARTAS - os envelopes que as corujas deixaram
   -------------------------------------------------------------------------
   Clicar num envelope quebra o selo, abre a aba e a carta sobe e se
   desenrola em pergaminho. As lidas ficam marcadas neste navegador.
   ========================================================================= */

const CHAVE_LIDAS = "chapeu-despedida:lidas";

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

/** Cor da cera do selo: a da casa, ou o vermelho-lacre classico. */
function corSelo(c: Carta): string {
  return c.casa ? HOUSES[c.casa].cor2 : "#7a1414";
}

/** Inclinacao e atraso de cada envelope: estavel, sem Math.random. */
function jeito(i: number): CSSProperties {
  const r = Math.sin(i * 12.9898 + 4.1) * 43758.5453;
  const f = r - Math.floor(r);
  return {
    "--inclina": `${(f - 0.5) * 7}deg`,
    "--atraso": `${0.15 + i * 0.12}s`,
  } as CSSProperties;
}

const iniciais = (nome: string): string =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

interface EnvelopeProps {
  carta: Carta;
  indice: number;
  lida: boolean;
  onAbrir: () => void;
}

function Envelope({ carta, indice, lida, onAbrir }: EnvelopeProps) {
  return (
    <button
      type="button"
      className={`envelope${lida ? " lida" : ""}`}
      style={{ ...jeito(indice), "--cera": corSelo(carta) } as CSSProperties}
      onClick={onAbrir}
      aria-label={`Carta de ${carta.de}${lida ? " (lida)" : ""}`}
    >
      <span className="envelope-corpo">
        <span className="envelope-aba" />
        <span className="envelope-para">Para {DESPEDIDA.nome}</span>
        <span className="envelope-de">{carta.de}</span>
        {carta.cargo && <span className="envelope-cargo">{carta.cargo}</span>}
        <span className="selo">
          <span>{iniciais(carta.de)}</span>
        </span>
        {lida && <span className="envelope-lida">lida</span>}
      </span>
    </button>
  );
}

interface CartaAbertaProps {
  carta: Carta;
  indice: number;
  total: number;
  /** false ao navegar entre cartas: vai direto ao pergaminho. */
  envelope: boolean;
  onFechar: () => void;
  onAnterior: () => void;
  onProxima: () => void;
}

function CartaAberta({ carta, indice, total, envelope, onFechar, onAnterior, onProxima }: CartaAbertaProps) {
  const [etapa, setEtapa] = useState<"envelope" | "pergaminho">(envelope ? "envelope" : "pergaminho");
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
    if (!envelope) {
      setEtapa("pergaminho");
      return;
    }
    setEtapa("envelope");
    const t = setTimeout(() => setEtapa("pergaminho"), 1650);
    return () => clearTimeout(t);
  }, [carta, envelope]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onFechar();
      else if (e.key === "ArrowRight") onProxima();
      else if (e.key === "ArrowLeft") onAnterior();
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onFechar, onProxima, onAnterior]);

  return (
    <div className="carta-overlay" role="dialog" aria-modal="true" aria-label={`Carta de ${carta.de}`} onClick={onFechar}>
      {etapa === "envelope" ? (
        <div className="abrindo-envelope" style={{ "--cera": corSelo(carta) } as CSSProperties} key={`e${indice}`}>
          <div className="ae-fundo" />
          <div className="ae-carta" />
          <div className="ae-frente" />
          <div className="ae-aba" />
          <div className="ae-selo">
            <span>{iniciais(carta.de)}</span>
          </div>
        </div>
      ) : (
        <article className="pergaminho" key={`p${indice}`} onClick={(e) => e.stopPropagation()}>
          <button type="button" className="fechar" aria-label="Fechar carta" onClick={onFechar}>
            ×
          </button>
          <div className="pergaminho-rolo pergaminho-rolo--topo" aria-hidden="true" />
          <div className="pergaminho-miolo">
            <p className="pergaminho-data">{data}</p>
            {carta.foto && (
              <figure className="polaroid">
                <img src={asset(FOTO_DIR + carta.foto)} alt={`Foto enviada por ${carta.de}`} />
              </figure>
            )}
            {paragrafos.map((p, i) => (
              <p key={i} className="pergaminho-texto" style={{ animationDelay: `${0.5 + i * 0.25}s` }}>
                {p}
              </p>
            ))}
            <div className="assinatura" style={{ animationDelay: `${0.6 + paragrafos.length * 0.25}s` }}>
              <span className="assinatura-nome">{carta.de}</span>
              {carta.cargo && <span className="assinatura-cargo">{carta.cargo}</span>}
            </div>
          </div>
          <div className="pergaminho-rolo pergaminho-rolo--base" aria-hidden="true" />
          {total > 1 && (
            <nav className="pergaminho-nav">
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
        </article>
      )}
    </div>
  );
}

interface CartasProps {
  onSair: () => void;
  onReverCerimonia: () => void;
  /** Toca o sino de carta aberta. */
  onCartaAberta: () => void;
}

export default function Cartas({ onSair, onReverCerimonia, onCartaAberta }: CartasProps) {
  const [aberta, setAberta] = useState<number | null>(null);
  const [comEnvelope, setComEnvelope] = useState(true);
  const [lidas, setLidas] = useState<Set<number>>(lerLidas);
  const total = CARTAS.length;

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
    <div className="mural">
      <header className="mural-topo">
        <p className="eyebrow">Correio Coruja</p>
        <h1 className="mural-titulo">
          Cartas para <span>{DESPEDIDA.nome}</span>
        </h1>
        <p className="mural-sub">
          {lidas.size >= total
            ? "Você leu todas. Elas ficam guardadas aqui sempre que quiser voltar."
            : "Toque num envelope para quebrar o selo."}
        </p>
      </header>

      <div className="mural-grade">
        {CARTAS.map((c, i) => (
          <Envelope key={i} carta={c} indice={i} lida={lidas.has(i)} onAbrir={() => abrir(i)} />
        ))}
      </div>

      <footer className="mural-rodape">
        <button type="button" className="btn btn-ghost" onClick={onReverCerimonia}>
          Rever a cerimônia
        </button>
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
