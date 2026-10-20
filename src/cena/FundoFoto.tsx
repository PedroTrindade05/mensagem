import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  LinearMipmapLinearFilter,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
} from "three";
import { asset } from "../config";
import type { Fase } from "../types";
import { DURACAO_ONDA, type EstadoVelas } from "./velas";

/* =========================================================================
   FUNDO FOTO - o Salao Principal de verdade, vivo
   -------------------------------------------------------------------------
   A foto (public/cena/salao.jpg) cobre a tela num quadrado desenhado antes
   de tudo, e um shader da vida a ela:

   - luar: antes das velas, a foto vira noite azulada e cada chama apaga
     (as chamas sao achadas pela cor: pontos claros e quentes);
   - onda: ao acender, a luz quente volta do centro do salao para fora, e
     cada chama da um clarao quando a frente da onda passa por ela;
   - cada vela treme no seu ritmo (uma celula de ruido por vela);
   - nevoa correndo no chao e raios de luar descendo do vitral;
   - parallax com o mouse (o que esta perto anda mais que o fundo);
   - zoom e desfoque de profundidade por fase, para o Chapeu na frente
     ficar em foco como numa lente de cinema.
   ========================================================================= */

const URL_FOTO = "cena/salao.jpg";
const ASPECTO_FOTO = 2400 / 1358;
/**
 * Ponto de fuga do corredor, em coordenadas da foto (0..1, y para cima):
 * o centro da mesa dos professores, no fundo do salao.
 */
const FUGA: [number, number] = [0.5, 0.42];
/** Centro do vitral da ultima parede, de onde descem os raios. */
const VITRAL: [number, number] = [0.5, 0.72];

interface Lente {
  zoom: number;
  /** Desfoque de profundidade (vies do mipmap). */
  foco: number;
  /** Multiplicador de brilho geral. */
  luz: number;
  /** Deslocamento do enquadramento (fracao da foto). */
  x: number;
  y: number;
}

const LENTES: Record<Fase, Lente> = {
  abertura: { zoom: 1.05, foco: 0, luz: 1, x: 0, y: 0.02 },
  cerimonia: { zoom: 1.14, foco: 1.25, luz: 0.92, x: 0, y: 0.04 },
  selecao: { zoom: 1.2, foco: 1.6, luz: 0.85, x: 0, y: 0.05 },
  revelacao: { zoom: 1.1, foco: 1.1, luz: 0.9, x: 0.04, y: 0.03 },
  login: { zoom: 1.08, foco: 2.5, luz: 0.7, x: 0, y: 0 },
  cartas: { zoom: 1.08, foco: 2.5, luz: 0.7, x: 0, y: 0 },
};

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  // ja em coordenadas de tela, sempre atras de tudo
  gl_Position = vec4(position.xy, 0.9999, 1.0);
}
`;

const FRAG = /* glsl */ `
uniform sampler2D uFoto;
uniform float uAspectoTela;
uniform float uAspectoFoto;
uniform float uTempo;
uniform float uOnda;
uniform float uZoom;
uniform float uFoco;
uniform float uLuz;
uniform vec2 uEnquadra;
uniform vec2 uParallax;
uniform vec2 uFuga;
uniform vec2 uVitral;
varying vec2 vUv;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float ruido(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1, 0)), f.x), mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  return 0.5 * ruido(p) + 0.3 * ruido(p * 2.1 + 3.7) + 0.2 * ruido(p * 4.3 + 7.1);
}

void main() {
  // cobre a tela sem distorcer (corta as sobras, como background-size: cover)
  vec2 escala = uAspectoTela > uAspectoFoto ? vec2(1.0, uAspectoFoto / uAspectoTela) : vec2(uAspectoTela / uAspectoFoto, 1.0);
  vec2 uv = (vUv - 0.5) * escala + 0.5;
  uv = (uv - uFuga) / uZoom + uFuga + uEnquadra;
  // parallax: o que esta longe do ponto de fuga (perto da lente) anda mais
  vec2 rel = (uv - uFuga) * vec2(uAspectoFoto, 1.0);
  float perto = smoothstep(0.08, 0.9, length(rel));
  uv += uParallax * (0.25 + perto) * 0.012;
  uv = clamp(uv, vec2(0.001), vec2(0.999));

  vec3 c = texture2D(uFoto, uv, uFoco).rgb;

  // ---- o que e chama, o que e luz de vela, o que e luar ----
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float quente = smoothstep(0.0, 0.12, c.r - c.b);
  float chama = smoothstep(0.42, 0.85, lum) * smoothstep(0.03, 0.18, c.r - c.b);
  float azul = smoothstep(0.015, 0.1, c.b - c.r);

  // cada vela no seu ritmo: uma celula de ruido por vela
  vec2 celula = floor(uv * vec2(96.0, 54.0));
  float h = hash21(celula);
  float tremor = 0.84 + 0.11 * sin(uTempo * (7.0 + h * 5.0) + h * 60.0) + 0.07 * sin(uTempo * (17.0 + h * 9.0) + h * 13.0);
  float tremorLuz = 0.95 + 0.05 * sin(uTempo * 3.1 + uv.x * 9.0) * sin(uTempo * 4.7 + uv.y * 7.0);
  vec3 acesa = c * mix(1.0, tremor, chama) * mix(1.0, tremorLuz, quente * (1.0 - chama));

  // ---- luar: a mesma foto de noite, sem as chamas ----
  float l = dot(c, vec3(0.25, 0.55, 0.2));
  vec3 luar = l * vec3(0.5, 0.64, 1.0) * 0.6;
  luar = mix(luar, c * vec3(0.78, 0.9, 1.12), azul * 0.85);
  luar *= 1.0 - 0.82 * chama;
  luar *= 1.0 - 0.4 * quente * smoothstep(0.01, 0.2, lum);

  // ---- a onda: a luz quente volta do centro do salao para fora ----
  float d = length(rel);
  // a frente da onda e organica, nao reta (ruido suave, sem degraus); fora
  // da onda nada disso e calculado
  bool naOnda = uOnda >= 0.0 && uOnda <= 1.4;
  float atraso = naOnda ? fbm(uv * vec2(14.0, 8.0)) * 0.1 : 0.0;
  float raio = uOnda * 1.3;
  float aceso = uOnda < 0.0 ? 0.0 : uOnda > 1.4 ? 1.0 : 1.0 - smoothstep(raio - 0.16, raio, d + atraso);
  vec3 cor = mix(luar, acesa, aceso);
  // clarao de cada chama quando a frente da onda passa
  float frente = naOnda ? exp(-pow((d + atraso - raio + 0.05) / 0.055, 2.0)) : 0.0;
  cor += c * chama * frente * 2.6;
  cor += vec3(1.0, 0.62, 0.28) * frente * 0.035 * (1.0 - azul);

  // ---- nevoa correndo baixa e raios de luar do vitral ----
  float n = fbm(uv * vec2(3.0, 7.0) + vec2(uTempo * 0.025, uTempo * 0.006));
  float chao = 1.0 - smoothstep(0.15, 0.55, uv.y);
  vec3 corNevoa = mix(vec3(0.07, 0.09, 0.14), vec3(0.11, 0.08, 0.06), aceso);
  cor += corNevoa * n * n * chao * 0.55;
  vec2 dv = (uv - uVitral) * vec2(uAspectoFoto, 1.0);
  float ang = atan(dv.x, -dv.y);
  float raios = pow(ruido(vec2(ang * 9.0, uTempo * 0.08)), 3.0);
  float abaixo = smoothstep(0.0, 0.25, -dv.y) * exp(-length(dv) * 1.8) * (1.0 - smoothstep(0.0, 0.7, abs(ang)));
  cor += vec3(0.32, 0.42, 0.62) * raios * abaixo * (0.09 + 0.05 * (1.0 - aceso));

  gl_FragColor = vec4(cor * uLuz, 1.0);
  #include <colorspace_fragment>
}
`;

interface FundoFotoProps {
  fase: Fase;
  velas: EstadoVelas;
  /** Chamado quando a foto terminou de carregar. */
  onCarregada: () => void;
  onFalha: () => void;
}

export default function FundoFoto({ fase, velas, onCarregada, onFalha }: FundoFotoProps) {
  const largura = useThree((s) => s.size.width);
  const altura = useThree((s) => s.size.height);
  const avisos = useRef({ onCarregada, onFalha });
  avisos.current = { onCarregada, onFalha };

  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          uFoto: { value: null },
          uAspectoTela: { value: 1 },
          uAspectoFoto: { value: ASPECTO_FOTO },
          uTempo: { value: 0 },
          uOnda: { value: -1 },
          uZoom: { value: LENTES[fase].zoom },
          uFoco: { value: LENTES[fase].foco },
          uLuz: { value: LENTES[fase].luz },
          uEnquadra: { value: new Vector2(LENTES[fase].x, LENTES[fase].y) },
          uParallax: { value: new Vector2() },
          uFuga: { value: new Vector2(...FUGA) },
          uVitral: { value: new Vector2(...VITRAL) },
        },
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
        fog: false,
      }),
    // a lente inicial so vale na montagem; depois ela anda por useFrame
    []
  );

  const malha = useMemo(() => {
    const m = new Mesh(new PlaneGeometry(2, 2), mat);
    m.frustumCulled = false;
    m.renderOrder = -1000;
    return m;
  }, [mat]);

  useEffect(() => {
    let vivo = true;
    new TextureLoader().load(
      asset(URL_FOTO),
      (tex) => {
        if (!vivo) return;
        tex.colorSpace = SRGBColorSpace;
        tex.minFilter = LinearMipmapLinearFilter;
        tex.generateMipmaps = true;
        tex.anisotropy = 4;
        mat.uniforms["uFoto"]!.value = tex;
        avisos.current.onCarregada();
      },
      undefined,
      () => vivo && avisos.current.onFalha()
    );
    return () => {
      vivo = false;
      (mat.uniforms["uFoto"]!.value as { dispose?: () => void } | null)?.dispose?.();
      malha.geometry.dispose();
      mat.dispose();
    };
  }, [mat, malha]);

  useEffect(() => {
    mat.uniforms["uAspectoTela"]!.value = largura / Math.max(altura, 1);
  }, [mat, largura, altura]);

  const ponteiro = useRef(new Vector2());
  useFrame((s, dt) => {
    const u = mat.uniforms;
    u["uTempo"]!.value = s.clock.elapsedTime;
    u["uOnda"]!.value = velas.t < 0 ? -1 : velas.t / DURACAO_ONDA;
    // a lente anda devagar de uma fase para a outra
    const alvo = LENTES[fase];
    const k = 1 - Math.exp(-dt * 1.3);
    u["uZoom"]!.value += (alvo.zoom - u["uZoom"]!.value) * k;
    u["uFoco"]!.value += (alvo.foco - u["uFoco"]!.value) * k;
    u["uLuz"]!.value += (alvo.luz - u["uLuz"]!.value) * k;
    const enq = u["uEnquadra"]!.value as Vector2;
    enq.x += (alvo.x - enq.x) * k;
    enq.y += (alvo.y - enq.y) * k;
    ponteiro.current.lerp(s.pointer, 1 - Math.exp(-dt * 2));
    (u["uParallax"]!.value as Vector2).copy(ponteiro.current);
  });

  return <primitive object={malha} />;
}
