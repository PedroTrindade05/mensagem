import { Component, lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { assetUrl } from "../config";
import type { Humor } from "./chapeu/expressoes";
import type { LerNivel, LerNumero } from "./tipos";
import type { Fase, HouseKey } from "../types";
import VideoAbertura, { type EtapaVideo, type VideosDisponiveis } from "./VideoAbertura";
import type { ModoAparicao } from "./aparicao";

/* =========================================================================
   CENARIO - a foto do Salao Principal com o Chapeu em 3D, atras da interface
   -------------------------------------------------------------------------
   - O 3D (three + fiber) e carregado sob demanda: a interface aparece na
     hora, e a foto parada segura a tela ate o primeiro quadro com o chapeu.
   - Sem WebGL, com prefers-reduced-motion, ou se o modelo/contexto falhar:
     fica so a foto parada.
   ========================================================================= */

const CenaChapeu = lazy(() => import("./CenaChapeu"));

/** A mesma foto que o 3D usa de fundo (FundoFoto.tsx). */
const IMAGENS_PARADAS = {
  "--cena-paisagem": `url("${assetUrl("cena/salao.jpg")}")`,
  "--cena-retrato": `url("${assetUrl("cena/salao.jpg")}")`,
} as CSSProperties;

interface CenarioProps {
  fase: Fase;
  /** Casa revelada, ou null. */
  casa: HouseKey | null;
  humor: Humor;
  /** true enquanto uma fala do Chapeu esta no ar. */
  falando: boolean;
  /** Volume atual da fala (0..1), ou null sem analise de audio. */
  lerNivel: LerNivel;
  /** Largura da boca pelo timbre da voz, ou null. */
  lerLarg: LerNivel;
  /** Progresso da fala atual (0..1). */
  lerProgresso: LerNumero;
  /** false = salao so com o luar; ao virar true as velas acendem em onda. */
  velasAcesas: boolean;
  /** Avisa quando ha algo para ver: o primeiro quadro 3D, ou a imagem parada. */
  onPronto: () => void;
  /** Videos da abertura: castelo em loop, voo, ou nenhum. */
  etapaVideo: EtapaVideo;
  onVideos: (v: VideosDisponiveis) => void;
  onFimVoo: () => void;
  /** O castelo cobre a tela inteira: o 3D pode parar de desenhar. */
  esconder3d: boolean;
  /** Chegou pelo voo: a camera corta direto para o Chapeu, sem descer do teto. */
  cortarCamera: boolean;
  /** O banco e o Chapeu: ja no lugar, escondidos (durante o voo) ou surgindo. */
  aparicao: ModoAparicao;
}

function temWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!c.getContext("webgl2");
  } catch {
    return false;
  }
}

function useMovimentoReduzido(): boolean {
  const [reduzido, setReduzido] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mudou = (): void => setReduzido(mq.matches);
    mq.addEventListener("change", mudou);
    return () => mq.removeEventListener("change", mudou);
  }, []);
  return reduzido;
}

/** Se o chunk 3D falhar ao carregar ou quebrar, a festa segue com a imagem. */
class Protecao extends Component<{ children: ReactNode; onErro: () => void }, { erro: boolean }> {
  override state = { erro: false };
  static getDerivedStateFromError(): { erro: boolean } {
    return { erro: true };
  }
  override componentDidCatch(erro: unknown): void {
    console.warn("[Chapeu] Cena 3D indisponivel, usando a imagem parada.", erro);
    this.props.onErro();
  }
  override render(): ReactNode {
    return this.state.erro ? null : this.props.children;
  }
}

export default function Cenario(props: CenarioProps) {
  const [webgl, setWebgl] = useState(() => typeof document !== "undefined" && temWebGL());
  const [pronto, setPronto] = useState(false);
  const reduzido = useMovimentoReduzido();
  const usar3d = webgl && !reduzido;
  const avisar = useRef(props.onPronto);
  avisar.current = props.onPronto;

  // sem 3D (ou se ele falhar), a imagem parada ja e o cenario pronto
  useEffect(() => {
    if (!usar3d || pronto) avisar.current();
  }, [usar3d, pronto]);

  return (
    <div className="stage-bg" data-fase={props.fase} aria-hidden="true">
      {/* fundo em CSS por baixo de tudo, e a imagem parada por cima dele */}
      <div className="cena-css" />
      {/* com o 3D, a foto parada so aparece se ele falhar (a abertura e de luar) */}
      {!usar3d && <div className="cena-parada" style={IMAGENS_PARADAS} />}

      {usar3d && (
        <div className={`cena-3d-camada${pronto ? " on" : ""}`}>
          <Protecao onErro={() => setWebgl(false)}>
            <Suspense fallback={null}>
              <CenaChapeu
                fase={props.fase}
                casa={props.casa}
                humor={props.humor}
                falando={props.falando}
                lerNivel={props.lerNivel}
                lerLarg={props.lerLarg}
                lerProgresso={props.lerProgresso}
                velasAcesas={props.velasAcesas}
                pausar={props.esconder3d && pronto}
                cortarCamera={props.cortarCamera}
                aparicao={props.aparicao}
                onPronto={() => setPronto(true)}
                onFalha={() => setWebgl(false)}
              />
            </Suspense>
          </Protecao>
        </div>
      )}

      {/* o castelo a noite e o voo ate o salao, por cima da cena */}
      <VideoAbertura etapa={props.etapaVideo} onDisponiveis={props.onVideos} onFimVoo={props.onFimVoo} />

      {/* escurece topo e base para o texto ficar legivel sobre a cena */}
      <div className="scrim" />
    </div>
  );
}
