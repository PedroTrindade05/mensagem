import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  ShaderMaterial,
} from "three";
import { criarAleatorio } from "./ruido";

/* =========================================================================
   MAGIA - o que flutua entre a lente e o salao
   -------------------------------------------------------------------------
   - Poeira: graos dourados flutuando na luz das velas.
   - Faiscas: espiral de magia em volta do Chapeu e a explosao da selecao.
   Tudo na GPU: o tempo entra por uniform, nada e recalculado no JS.
   ========================================================================= */

/* -------------------------------------------------------------------------
   POEIRA - graos dourados que flutuam e cintilam
   ------------------------------------------------------------------------- */
const POEIRA_VERT = /* glsl */ `
attribute float aSemente;
uniform float uTempo;
uniform float uPixel;
uniform vec3 uCaixa;
uniform vec3 uCentro;
varying float vBrilho;
void main() {
  float s = aSemente;
  vec3 p = position;
  // sobe devagar e da a volta na caixa
  p.y = mod(p.y + uTempo * (0.05 + s * 0.08) - uCentro.y + uCaixa.y, 2.0 * uCaixa.y) + uCentro.y - uCaixa.y;
  p.x += sin(uTempo * (0.2 + s * 0.3) + s * 40.0) * 0.35;
  p.z += cos(uTempo * (0.15 + s * 0.25) + s * 17.0) * 0.35;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float d = -mv.z;
  gl_PointSize = uPixel * (0.6 + s * 1.2) / max(d, 0.5);
  float pisca = 0.5 + 0.5 * sin(uTempo * (1.5 + s * 3.0) + s * 90.0);
  // some perto das bordas da caixa
  float borda = smoothstep(uCaixa.y, uCaixa.y * 0.7, abs(p.y - uCentro.y));
  vBrilho = pisca * borda * exp(-d * 0.05);
}
`;

const POEIRA_FRAG = /* glsl */ `
uniform vec3 uCor;
uniform float uForca;
varying float vBrilho;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c);
  float a = smoothstep(0.5, 0.0, r);
  a *= a;
  gl_FragColor = vec4(uCor * a * vBrilho * uForca, 1.0);
}
`;

export function Poeira({ quantidade = 600, forca = 1 }: { quantidade?: number; forca?: number }) {
  const centro: [number, number, number] = [0, 3, -5];
  const caixa: [number, number, number] = [7, 5.5, 10];
  const geo = useMemo(() => {
    const rnd = criarAleatorio(311);
    const pos = new Float32Array(quantidade * 3);
    const sem = new Float32Array(quantidade);
    for (let i = 0; i < quantidade; i++) {
      pos[i * 3] = centro[0] + (rnd() * 2 - 1) * caixa[0];
      pos[i * 3 + 1] = centro[1] + (rnd() * 2 - 1) * caixa[1];
      pos[i * 3 + 2] = centro[2] + (rnd() * 2 - 1) * caixa[2];
      sem[i] = rnd();
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    g.setAttribute("aSemente", new BufferAttribute(sem, 1));
    return g;
  }, [quantidade]);
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: POEIRA_VERT,
        fragmentShader: POEIRA_FRAG,
        uniforms: {
          uTempo: { value: 0 },
          uPixel: { value: 60 },
          uCaixa: { value: caixa },
          uCentro: { value: centro },
          uCor: { value: new Color("#ffc983") },
          uForca: { value: forca },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        fog: false,
      }),
    []
  );
  const pontos = useMemo(() => {
    const p = new Points(geo, mat);
    p.frustumCulled = false;
    p.renderOrder = 11;
    return p;
  }, [geo, mat]);
  useEffect(() => () => {
    geo.dispose();
    mat.dispose();
  }, [geo, mat]);
  useFrame((s) => {
    mat.uniforms["uTempo"]!.value = s.clock.elapsedTime;
    mat.uniforms["uPixel"]!.value = 60 * s.viewport.dpr * (s.size.height / 900);
    mat.uniforms["uForca"]!.value = forca;
  });
  return <primitive object={pontos} />;
}

/* -------------------------------------------------------------------------
   FAISCAS - espiral em volta do Chapeu e a explosao da selecao
   ------------------------------------------------------------------------- */
const FAISCA_VERT = /* glsl */ `
attribute vec4 aDado; // x: angulo, y: velocidade, z: vida, w: semente
uniform float uTempo;
uniform float uInicio;
uniform float uEspiral;
uniform float uPixel;
uniform vec3 uOrigem;
varying float vAlfa;
varying float vMistura;
void main() {
  float s = aDado.w;
  vec3 p;
  float alfa = 0.0;
  float t = uTempo - uInicio;
  if (s < 0.55) {
    // explosao: sai da ponta do chapeu e cai com a gravidade
    float vida = aDado.z;
    float k = t / vida;
    vec3 dir = normalize(vec3(cos(aDado.x), 0.6 + s * 1.6, sin(aDado.x)));
    p = uOrigem + vec3(0.0, 1.6, 0.0) + dir * aDado.y * t * 1.6 + vec3(0.0, -1.1, 0.0) * t * t;
    alfa = (k >= 0.0 && k < 1.0) ? (1.0 - k) * (1.0 - k) : 0.0;
  } else {
    // espiral: sobe girando em volta do chapeu
    float ciclo = 5.5;
    float y = mod(s * 37.0 + uTempo * (0.25 + aDado.y * 0.15), ciclo);
    float ang = aDado.x + uTempo * (0.35 + s * 0.3) + y * 0.9;
    float raio = 1.3 + 0.35 * sin(s * 50.0 + uTempo * 0.5) - y * 0.12;
    p = uOrigem + vec3(cos(ang) * raio, y - 1.4, sin(ang) * raio);
    alfa = uEspiral * smoothstep(0.0, 0.8, y) * smoothstep(ciclo, ciclo - 1.5, y);
  }
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float pisca = 0.6 + 0.4 * sin(uTempo * 12.0 + s * 200.0);
  gl_PointSize = uPixel * (0.6 + fract(s * 13.0)) / max(-mv.z, 0.5);
  vAlfa = alfa * pisca;
  vMistura = fract(s * 7.3);
}
`;

const FAISCA_FRAG = /* glsl */ `
uniform vec3 uCorA;
uniform vec3 uCorB;
varying float vAlfa;
varying float vMistura;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c);
  // estrelinha: miolo forte e quatro pontas
  float miolo = smoothstep(0.5, 0.0, r);
  float cruz = max(smoothstep(0.08, 0.0, abs(c.x)) , smoothstep(0.08, 0.0, abs(c.y))) * smoothstep(0.5, 0.1, r);
  float a = miolo * miolo + cruz * 0.6;
  vec3 cor = mix(uCorA, uCorB, vMistura);
  gl_FragColor = vec4(cor * a * vAlfa * 2.2, 1.0);
}
`;

interface FaiscasProps {
  /** Muda de valor para disparar uma explosao. 0 = nenhuma. */
  explosao: number;
  /** 0..1: intensidade da espiral. */
  espiral: number;
  corA: string;
  corB: string;
}

export function Faiscas({ explosao, espiral, corA, corB }: FaiscasProps) {
  const N = 700;
  const geo = useMemo(() => {
    const rnd = criarAleatorio(77);
    const pos = new Float32Array(N * 3);
    const dados = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) {
      dados[i * 4] = rnd() * Math.PI * 2;
      dados[i * 4 + 1] = 0.4 + rnd() * 1.4;
      dados[i * 4 + 2] = 1.4 + rnd() * 2.2;
      dados[i * 4 + 3] = rnd();
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    g.setAttribute("aDado", new BufferAttribute(dados, 4));
    return g;
  }, []);
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: FAISCA_VERT,
        fragmentShader: FAISCA_FRAG,
        uniforms: {
          uTempo: { value: 0 },
          uInicio: { value: -100 },
          uEspiral: { value: 0 },
          uPixel: { value: 40 },
          uOrigem: { value: [0, 0.2, 0] },
          uCorA: { value: new Color(corA) },
          uCorB: { value: new Color(corB) },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        fog: false,
      }),
    []
  );
  const pontos = useMemo(() => {
    const p = new Points(geo, mat);
    p.frustumCulled = false;
    p.renderOrder = 12;
    return p;
  }, [geo, mat]);
  useEffect(() => () => {
    geo.dispose();
    mat.dispose();
  }, [geo, mat]);

  const pedido = useRef(0);
  const espiralAtual = useRef(0);
  useFrame((s, dt) => {
    const u = mat.uniforms;
    u["uTempo"]!.value = s.clock.elapsedTime;
    if (explosao !== pedido.current) {
      pedido.current = explosao;
      if (explosao) u["uInicio"]!.value = s.clock.elapsedTime;
    }
    espiralAtual.current += (espiral - espiralAtual.current) * (1 - Math.exp(-dt * 1.2));
    u["uEspiral"]!.value = espiralAtual.current;
    u["uPixel"]!.value = 46 * s.viewport.dpr * (s.size.height / 900);
    (u["uCorA"]!.value as Color).set(corA);
    (u["uCorB"]!.value as Color).set(corB);
  });
  return <primitive object={pontos} />;
}

