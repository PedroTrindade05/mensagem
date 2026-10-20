import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  type Group,
  ACESFilmicToneMapping,
  HalfFloatType,
  HemisphereLight,
  PerspectiveCamera,
  PointLight,
  Vector2,
  Vector3,
  WebGLRenderTarget,
} from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import Chapeu from "./chapeu/Chapeu";
import Banco from "./Banco";
import FundoFoto from "./FundoFoto";
import { Faiscas, Poeira } from "./Magia";
import { HOUSES } from "../data/houses";
import { EFEITOS_CINEMA, ENTRADA_CAMERA_MS } from "../config";
import type { Humor } from "./chapeu/expressoes";
import type { LerNivel, LerNumero } from "./tipos";
import type { Fase, HouseKey } from "../types";
import { VELAS_JA_ACESAS, progressoOnda, type EstadoVelas } from "./velas";
import { ControleAparicao, PoDeOuro } from "./EntradaChapeu";
import { APARICAO_FEITA, type EstadoAparicao, type ModoAparicao, type Uniforme } from "./aparicao";

/* =========================================================================
   CENA 3D - Canvas, camera cinematografica, luzes vivas e pos-processamento
   -------------------------------------------------------------------------
   Este arquivo e o pedaco pesado (three + fiber): o Cenario o carrega sob
   demanda, e a interface aparece antes dele.
   ========================================================================= */

export interface CenaChapeuProps {
  fase: Fase;
  /** Casa revelada (acende estandartes, luz e faiscas), ou null. */
  casa: HouseKey | null;
  humor: Humor;
  falando: boolean;
  lerNivel: LerNivel;
  lerLarg: LerNivel;
  lerProgresso: LerNumero;
  /** false = so o luar (tela inicial); ao virar true as velas acendem em onda. */
  velasAcesas: boolean;
  /** Algo cobre a cena inteira (o video do castelo): para de desenhar. */
  pausar: boolean;
  /** Chegou pelo voo do video: a camera corta direto para o Chapeu. */
  cortarCamera: boolean;
  /** O banco e o Chapeu: ja no lugar, escondidos (durante o voo) ou surgindo. */
  aparicao: ModoAparicao;
  onPronto: () => void;
  onFalha: () => void;
}

/**
 * Conta o tempo da onda somando os quadros; roda antes de todo mundo.
 * (Nao usa clock.elapsedTime: o fiber zera o relogio em setFrameloop.)
 */
function ControleVelas({ acesas, velas }: { acesas: boolean; velas: EstadoVelas }) {
  useFrame((_, dt) => {
    if (!acesas) {
      velas.t = -1;
      return;
    }
    if (velas.t >= VELAS_JA_ACESAS) return;
    velas.t = Math.max(velas.t, 0) + Math.min(dt, 0.1);
    // depois da onda, fica "acesa desde sempre"
    if (velas.t > 30) velas.t = VELAS_JA_ACESAS;
  }, -1);
  return null;
}

/* -------------------------------------------------------------------------
   CAMERA - uma pose por fase, com travelling suave entre elas
   ------------------------------------------------------------------------- */

interface Pose {
  pos: [number, number, number];
  alvo: [number, number, number];
}

/** Nevoa leve, so para o Chapeu e o banco assentarem na foto. */
const NEVOA = 0.022;

const POSES: Record<Fase, Pose> = {
  // olhando acima do Chapeu: na abertura so a foto aparece; ele surge
  // de baixo quando a camera desce para a cerimonia
  abertura: { pos: [0, 2.2, 8.5], alvo: [0, 9, -8] },
  // o enquadramento classico do Chapeu no banquinho
  cerimonia: { pos: [0, -0.15, 5.0], alvo: [0, 0.74, 0] },
  // chega mais perto enquanto ele decide
  selecao: { pos: [0, -0.05, 4.5], alvo: [0, 0.85, 0] },
  // tres quartos: o Chapeu a esquerda, o brasao na interface a direita
  revelacao: { pos: [-1.1, 0.05, 7.0], alvo: [1.75, 0.95, -0.6] },
  // recua e olha o salao: fundo vivo para o mural de cartas
  login: { pos: [0, 1.6, 9.5], alvo: [0, 5.5, -12] },
  cartas: { pos: [0.6, 2.2, 10.5], alvo: [0, 6.5, -14] },
};

/** Em pe (celular), a revelacao fica centralizada: a interface vai para baixo. */
const POSE_REVELACAO_RETRATO: Pose = { pos: [0, 0.35, 6.2], alvo: [0, 1.35, 0] };

const FOV_BASE = 31;
/** Meia largura que precisa caber na tela, na distancia do Chapeu. */
const MEIA_LARGURA_CHAPEU = 1.35;

const suave = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function RigCamera({ fase, cortar }: { fase: Fase; cortar: boolean }) {
  const camera = useThree((s) => s.camera);
  const largura = useThree((s) => s.size.width);
  const altura = useThree((s) => s.size.height);
  const retrato = largura / Math.max(altura, 1) < 0.8;

  const estado = useRef({
    de: { pos: new Vector3(...POSES[fase].pos), alvo: new Vector3(...POSES[fase].alvo) },
    para: { pos: new Vector3(...POSES[fase].pos), alvo: new Vector3(...POSES[fase].alvo) },
    inicio: -1,
    duracao: 1,
    fase,
    pos: new Vector3(...POSES[fase].pos),
    alvo: new Vector3(...POSES[fase].alvo),
    mouse: new Vector2(),
  });

  const pose = fase === "revelacao" && retrato ? POSE_REVELACAO_RETRATO : POSES[fase];

  useEffect(() => {
    const e = estado.current;
    e.de.pos.copy(e.pos);
    e.de.alvo.copy(e.alvo);
    e.para.pos.set(...pose.pos);
    e.para.alvo.set(...pose.alvo);
    e.inicio = -1; // marca no proximo quadro
    const descendo = e.fase === "abertura" && fase === "cerimonia";
    // vindo do voo do video, o enquadramento ja e o do Chapeu: corte seco
    e.duracao = descendo ? (cortar ? 0.001 : ENTRADA_CAMERA_MS / 1000) : 2.6;
    e.fase = fase;
    // `cortar` vale o do render em que a fase mudou (o App liga antes)
  }, [fase, pose]);

  useFrame((s, dt) => {
    const e = estado.current;
    const t = s.clock.elapsedTime;
    if (e.inicio < 0) e.inicio = t;
    const k = suave(Math.min((t - e.inicio) / e.duracao, 1));
    e.pos.lerpVectors(e.de.pos, e.para.pos, k);
    e.alvo.lerpVectors(e.de.alvo, e.para.alvo, k);

    // camera na mao: respira devagar, e acompanha um pouco o mouse
    e.mouse.lerp(s.pointer, 1 - Math.exp(-dt * 1.5));
    const cam = camera as PerspectiveCamera;
    cam.position.set(
      e.pos.x + Math.sin(t * 0.13) * 0.08 + e.mouse.x * 0.18,
      e.pos.y + Math.sin(t * 0.17 + 1.3) * 0.04 + e.mouse.y * 0.08,
      e.pos.z
    );
    if (fase === "abertura") {
      // passeia o olhar pelas velas
      cam.lookAt(e.alvo.x + Math.sin(t * 0.07) * 2.2, e.alvo.y + Math.sin(t * 0.05) * 0.8, e.alvo.z);
    } else {
      cam.lookAt(e.alvo.x + Math.sin(t * 0.11) * 0.03, e.alvo.y, e.alvo.z);
    }

    // tela em pe: abre o campo de visao para a aba inteira continuar cabendo
    const aspecto = largura / Math.max(altura, 1);
    const dist = Math.max(cam.position.distanceTo(e.alvo), 1);
    const fovNecessario = (2 * Math.atan(MEIA_LARGURA_CHAPEU / dist / aspecto) * 180) / Math.PI;
    const fov = Math.min(Math.max(FOV_BASE, fovNecessario), 62);
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  });

  return null;
}

/* -------------------------------------------------------------------------
   LUZES - as velas tremem, e a selecao acende a cor da casa
   ------------------------------------------------------------------------- */

function Luzes({ fase, casa, velas }: { fase: Fase; casa: HouseKey | null; velas: EstadoVelas }) {
  const hemi = useRef<HemisphereLight>(null);
  const velas1 = useRef<PointLight>(null);
  const chave = useRef<PointLight>(null);
  const casaLuz = useRef<PointLight>(null);
  const contra = useRef<PointLight>(null);
  const reforco = useRef(0);

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime;
    const segue = 1 - Math.exp(-dt * 1.6);
    const tremor = (f: number, a: number): number =>
      1 + a * (Math.sin(t * 7.3 + f) * 0.5 + Math.sin(t * 13.1 + f * 2.1) * 0.3 + Math.sin(t * 2.3 + f) * 0.2);
    // a luz principal cresce quando o Chapeu decide e no fim da mensagem
    const alvoReforco = fase === "selecao" ? 1.5 : fase === "revelacao" ? 1.35 : fase === "cerimonia" ? 1.1 : 1;
    reforco.current += (alvoReforco - reforco.current) * segue;
    // antes das velas acenderem, o salao vive so do luar
    const g = progressoOnda(velas);
    const luz = 0.06 + 0.94 * g * g;
    if (hemi.current) hemi.current.intensity = 0.35 + 0.45 * g;
    if (velas1.current) velas1.current.intensity = 120 * luz * tremor(0, 0.06);
    if (chave.current) chave.current.intensity = 52 * luz * reforco.current * tremor(4, 0.035);

    const alvoCasa = fase === "revelacao" ? 9 + Math.sin(t * 2) * 1.2 : 0;
    if (casaLuz.current) casaLuz.current.intensity += (alvoCasa - casaLuz.current.intensity) * segue;
    // o vitral da foto fica bem atras do Chapeu: contraluz fria que recorta a silhueta
    const alvoContra = fase === "abertura" ? 4 : 11;
    if (contra.current) contra.current.intensity += (alvoContra - contra.current.intensity) * segue;
  });

  return (
    <>
      {/* ceu: luar azulado; chao: a pedra escura da foto */}
      <hemisphereLight ref={hemi} args={["#8a93b0", "#1c1510", 0.8]} />
      {/* luz principal: as velas acima e a frente, quentes como na foto */}
      <pointLight ref={chave} position={[-1.2, 5.2, 3.4]} color="#ffcf9a" intensity={52} decay={2} />
      {/* contraluz fria do vitral, atras e acima */}
      <pointLight ref={contra} position={[0.2, 3.4, -2.6]} color="#9db6ff" intensity={11} decay={2} distance={10} />
      <directionalLight position={[0.4, 4, -6]} color="#7f9cff" intensity={1.1} />
      {/* as velas do alto, atras do Chapeu: borda quente na copa */}
      <pointLight ref={velas1} position={[0, 6, -7]} color="#ffc48a" intensity={120} decay={2} />
      {/* a cor da casa na revelacao (so existe quando ha casa: cada luz pesa em todo o salao) */}
      {casa && (
        <pointLight ref={casaLuz} position={[1.8, -0.3, 2.4]} color={HOUSES[casa].cor1} intensity={0} decay={2} distance={9} />
      )}
    </>
  );
}

/* -------------------------------------------------------------------------
   POS-PROCESSAMENTO - bloom nas chamas e estrelas, vinheta e grao de filme
   ------------------------------------------------------------------------- */

/** Troca NaN/infinito por preto e limita o HDR antes do bloom. */
const Saneamento = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      bool ruim = !(c.r <= 1e4) || !(c.g <= 1e4) || !(c.b <= 1e4) || !(c.r >= -1e4) || !(c.g >= -1e4) || !(c.b >= -1e4);
      gl_FragColor = ruim ? vec4(0.0, 0.0, 0.0, 1.0) : vec4(clamp(c.rgb, 0.0, 60.0), 1.0);
    }
  `,
};

const Acabamento = {
  uniforms: {
    tDiffuse: { value: null },
    uTempo: { value: 0 },
    uVinheta: { value: 1.1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTempo;
    uniform float uVinheta;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 c = vUv - 0.5;
      // aberracao cromatica leve so nas bordas
      float d = dot(c, c);
      vec2 desvio = c * d * 0.012;
      vec3 cor;
      cor.r = texture2D(tDiffuse, vUv + desvio).r;
      cor.g = texture2D(tDiffuse, vUv).g;
      cor.b = texture2D(tDiffuse, vUv - desvio).b;
      // vinheta
      cor *= mix(1.0, smoothstep(0.85, 0.15, length(c * vec2(1.0, 1.15)) ), 0.55 * uVinheta);
      // toque quente nas sombras, como pelicula
      cor = mix(cor, cor * vec3(1.05, 0.98, 0.9), 0.5);
      // grao
      float g = hash(vUv * 1000.0 + fract(uTempo * 7.1)) - 0.5;
      cor += g * 0.028;
      gl_FragColor = vec4(cor, 1.0);
    }
  `,
};

function PosProcesso() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);

  const { composer, acabamento } = useMemo(() => {
    const alvo = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 2 });
    const c = new EffectComposer(gl, alvo);
    c.addPass(new RenderPass(scene, camera));
    // um unico pixel NaN viraria uma tela preta inteira depois do bloom
    c.addPass(new ShaderPass(Saneamento));
    const bloom = new UnrealBloomPass(new Vector2(256, 256), 0.62, 0.55, 0.78);
    c.addPass(bloom);
    c.addPass(new OutputPass());
    const a = new ShaderPass(Acabamento);
    c.addPass(a);
    return { composer: c, acabamento: a };
  }, [gl, scene, camera]);

  useEffect(() => {
    composer.setPixelRatio(dpr);
    composer.setSize(size.width, size.height);
  }, [composer, size, dpr]);

  useEffect(() => () => composer.dispose(), [composer]);

  useFrame((s, dt) => {
    const u = acabamento.uniforms["uTempo"];
    if (u) u.value = s.clock.elapsedTime;
    composer.render(dt);
  }, 1);

  return null;
}

/** Baixa a resolucao se a maquina nao segurar ~50 fps. */
function Desempenho({ dprMax }: { dprMax: number }) {
  const setDpr = useThree((s) => s.setDpr);
  const m = useRef({ soma: 0, quadros: 0, dpr: dprMax, aquecendo: 2 });
  useFrame((_, dt) => {
    const e = m.current;
    if (e.aquecendo > 0) {
      e.aquecendo -= dt;
      return;
    }
    e.soma += Math.min(dt, 0.25);
    e.quadros++;
    if (e.soma < 2) return;
    const media = e.soma / e.quadros;
    e.soma = 0;
    e.quadros = 0;
    if (media > 1 / 50 && e.dpr > 0.5) {
      e.dpr = Math.max(0.5, e.dpr - 0.15);
      setDpr(e.dpr);
    }
  });
  return null;
}

/**
 * No login e no mural o salao vira fundo borrado: depois que a camera chega,
 * o canvas para de desenhar e a GPU fica livre para as animacoes das cartas.
 * Com o video do castelo cobrindo a tela, ele nem desenha.
 */
function Pausa({ fase, pausar }: { fase: Fase; pausar: boolean }) {
  const setFrameloop = useThree((s) => s.setFrameloop);
  const get = useThree((s) => s.get);
  useEffect(() => {
    if (pausar) {
      if (get().frameloop !== "never") setFrameloop("never");
      return;
    }
    if (fase !== "login" && fase !== "cartas") {
      // so religa se estava parado: setFrameloop zera o relogio da cena
      if (get().frameloop !== "always") setFrameloop("always");
      return;
    }
    const t = setTimeout(() => setFrameloop("never"), 2900);
    return () => clearTimeout(t);
  }, [fase, pausar, setFrameloop, get]);
  return null;
}

export default function CenaChapeu(props: CenaChapeuProps) {
  const { onFalha, fase, casa } = props;
  // so mostra a cena quando a foto e o Chapeu estiverem prontos
  const avisarPronto = useRef(props.onPronto);
  avisarPronto.current = props.onPronto;
  const prontos = useRef({ chapeu: false, foto: false, avisou: false });
  const marcarPronto = (qual: "chapeu" | "foto"): void => {
    const p = prontos.current;
    p[qual] = true;
    if (p.chapeu && p.foto && !p.avisou) {
      p.avisou = true;
      avisarPronto.current();
    }
  };
  // resolucao acima de 1 quase nao aparece nesta cena escura e custa caro
  const dprMax = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 1);
  const cinema = EFEITOS_CINEMA;
  // lido a cada quadro por velas, chamas e luzes (nunca causa re-render)
  const velas = useMemo<EstadoVelas>(() => ({ t: props.velasAcesas ? VELAS_JA_ACESAS : -1 }), []);
  // a entrada do Chapeu (ver aparicao.ts), tambem lida a cada quadro
  const aparicao = useMemo<EstadoAparicao>(() => ({ t: props.aparicao === "escondido" ? -1 : APARICAO_FEITA }), []);
  const surgirBanco = useMemo<Uniforme>(() => ({ value: 1 }), []);
  const surgirChapeu = useMemo<Uniforme>(() => ({ value: 1 }), []);
  const grupoChapeu = useRef<Group>(null);

  // a explosao de faiscas dispara uma vez por revelacao
  const explosao = useRef(0);
  const faseAnterior = useRef(fase);
  if (fase !== faseAnterior.current) {
    if (fase === "revelacao") explosao.current += 1;
    faseAnterior.current = fase;
  }
  const h = casa ? HOUSES[casa] : null;
  const espiral = fase === "revelacao" ? 1 : fase === "selecao" ? 0.55 : fase === "cerimonia" && props.falando ? 0.18 : 0;

  return (
    <Canvas
      className="cena-3d"
      frameloop="always"
      dpr={dprMax}
      // sem pos-processamento, o antialias nativo da tela sai quase de graca
      gl={{ antialias: !cinema, alpha: false, powerPreference: "high-performance" }}
      camera={{ fov: FOV_BASE, near: 0.1, far: 140, position: POSES[fase].pos }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.08;
        gl.domElement.addEventListener("webglcontextlost", (ev) => {
          ev.preventDefault();
          onFalha();
        });
      }}
    >
      <color attach="background" args={["#0b0806"]} />
      <fogExp2 attach="fog" args={["#120e0b", NEVOA]} />
      <ControleVelas acesas={props.velasAcesas} velas={velas} />
      <RigCamera fase={fase} cortar={props.cortarCamera} />
      <Luzes fase={fase} casa={casa} velas={velas} />
      <FundoFoto fase={fase} velas={velas} onCarregada={() => marcarPronto("foto")} onFalha={onFalha} />
      <ControleAparicao
        modo={props.aparicao}
        estado={aparicao}
        surgirBanco={surgirBanco}
        surgirChapeu={surgirChapeu}
        grupo={grupoChapeu}
      />
      <Banco surgir={surgirBanco} />
      <PoDeOuro estado={aparicao} grupo={grupoChapeu} />
      <Pausa fase={fase} pausar={props.pausar} />
      <Poeira quantidade={500} forca={fase === "abertura" ? 0.55 : 0.85} />
      <Faiscas
        explosao={explosao.current}
        espiral={espiral}
        corA={h ? h.cor1 : "#ffd27a"}
        corB={fase === "revelacao" ? "#fff2c8" : "#ffd27a"}
      />
      <group ref={grupoChapeu}>
        <Chapeu
          humor={props.humor}
          vies={null}
          falando={props.falando}
          lerNivel={props.lerNivel}
          lerLarg={props.lerLarg}
          lerProgresso={props.lerProgresso}
          surgir={surgirChapeu}
          onPronto={() => marcarPronto("chapeu")}
          onFalha={onFalha}
        />
      </group>
      {cinema && <PosProcesso />}
      <Desempenho dprMax={dprMax} />
    </Canvas>
  );
}
