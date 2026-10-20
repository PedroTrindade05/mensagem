import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { asset } from "../../config";
import { TOPO_BANCO } from "../Banco";
import type { LerNumero, LerNivel } from "../tipos";
import { aplicarSurgimento, type Uniforme } from "../aparicao";
import { criarMaterialCouro } from "./couro";
import { criarUniformesRosto } from "./deformacao";
import { AnimadorRosto, PRESETS, type Humor, type Rosto } from "./expressoes";
import { carregarModelo, type ModeloChapeu } from "./modelo";

/* =========================================================================
   O CHAPEU - malha do Meshy, couro procedural e rosto animado
   ========================================================================= */

/** Escala do modelo na cena: a aba fica com ~2 de largura, como no video. */
const ESCALA = 1.26;
const URL_MODELO = "models/chapeu.glb";

export interface ChapeuProps {
  humor: Humor;
  vies: Humor | null;
  falando: boolean;
  lerNivel: LerNivel;
  /** Largura da boca pelo timbre da voz (ver useVozChapeu), ou null. */
  lerLarg: LerNivel;
  lerProgresso: LerNumero;
  /** Chamado quando o primeiro quadro com o chapeu ja foi desenhado. */
  onPronto: () => void;
  /** Chamado quando o modelo nao carrega (a cena cai na imagem parada). */
  onFalha: () => void;
  /** 0 = ainda nao existe, 1 = inteiro (ver aparicao.ts). */
  surgir?: Uniforme;
}

/** Ganchos de teste, so em desenvolvimento: fixam um rosto ou um humor. */
interface JanelaTeste extends Window {
  __chapeuRosto?: Partial<Rosto> | null;
  __chapeuHumor?: Humor | null;
  /** 1 boca, 2 pele frontal, 3 oclusao, 4 oco. */
  __chapeuDepurar?: number;
  /** Leitura do estado, para os testes acompanharem a boca. */
  __chapeuEstado?: { nivel: number | null; boca: number; humor: Humor };
}

export default function Chapeu(props: ChapeuProps) {
  const { humor, vies, falando, lerNivel, lerLarg, lerProgresso, surgir } = props;
  const [modelo, setModelo] = useState<ModeloChapeu | null>(null);
  const avisos = useRef(props);
  avisos.current = props;
  const avisouPronto = useRef(false);

  useEffect(() => {
    let vivo = true;
    carregarModelo(asset(URL_MODELO))
      .then((m) => {
        if (vivo) setModelo(m);
      })
      .catch((erro: unknown) => {
        console.warn("[Chapeu] Modelo 3D indisponivel.", erro);
        if (vivo) avisos.current.onFalha();
      });
    return () => {
      vivo = false;
    };
  }, []);

  const uniformes = useMemo(criarUniformesRosto, []);
  const material = useMemo(() => {
    if (!modelo) return null;
    const m = criarMaterialCouro({ uniformes, map: modelo.map, normalMap: modelo.normalMap });
    if (surgir) {
      // surge da ponta para a aba, no espaco do proprio chapeu (ele esta descendo)
      const g = modelo.geometria;
      if (!g.boundingBox) g.computeBoundingBox();
      const caixa = g.boundingBox!;
      const alto = caixa.max.y - caixa.min.y;
      aplicarSurgimento(m, surgir, { chave: "chapeu", espaco: "objeto", base: caixa.max.y, altura: -alto, peso: 0.45, escala: 4.5 / alto });
    }
    return m;
  }, [modelo, uniformes, surgir]);
  useEffect(() => () => material?.dispose(), [material]);

  const animador = useMemo(() => new AnimadorRosto(), []);
  const entrada = useRef({
    humor,
    vies,
    falando,
    nivel: null as number | null,
    progresso: 0,
    brilho: null as number | null,
    ponteiroX: 0,
    ponteiroY: 0,
  });
  entrada.current.humor = humor;
  entrada.current.vies = vies;
  entrada.current.falando = falando;

  useFrame((estado, dt) => {
    if (modelo && !avisouPronto.current) {
      avisouPronto.current = true;
      // espera este quadro sair para a tela antes de mostrar a camada
      requestAnimationFrame(() => avisos.current.onPronto());
    }
    const e = entrada.current;
    if (import.meta.env.DEV) {
      const w = window as JanelaTeste;
      if (w.__chapeuRosto) {
        AnimadorRosto.fixar({ ...PRESETS.neutro, ...w.__chapeuRosto }, uniformes);
        return;
      }
      if (w.__chapeuHumor) e.humor = w.__chapeuHumor;
      const dep = w.__chapeuDepurar ?? 0;
      if (material && (material.defines?.["DEPURAR"] ?? 0) !== dep) {
        material.defines = dep ? { DEPURAR: dep } : {};
        material.needsUpdate = true;
      }
    }
    e.nivel = e.falando ? lerNivel() : 0;
    e.progresso = e.falando ? lerProgresso() : 0;
    e.brilho = e.falando ? lerLarg() : null;
    e.ponteiroX = estado.pointer.x;
    e.ponteiroY = estado.pointer.y;
    animador.passo(dt, e, uniformes);
    if (import.meta.env.DEV) {
      const w = window as JanelaTeste;
      const est = (w.__chapeuEstado ??= { nivel: null, boca: 0, humor: e.humor });
      est.nivel = e.nivel;
      est.boca = uniformes.uBoca.value;
      est.humor = e.humor;
    }
  });

  if (!modelo || !material) return null;
  return (
    <mesh
      geometry={modelo.geometria}
      material={material}
      scale={ESCALA}
      position={[0, TOPO_BANCO - modelo.apoioY * ESCALA, 0]}
      // a deformacao mexe a ponta para fora da esfera de recorte original
      frustumCulled={false}
    />
  );
}
