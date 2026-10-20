import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  ShaderMaterial,
  Vector3,
  type Group,
  type PointLight,
} from "three";
import { CHAO, TOPO_BANCO } from "./Banco";
import { criarAleatorio } from "./ruido";
import {
  ALTURA_SURGIR,
  APARICAO_FEITA,
  ROTEIRO,
  faixa,
  suaveIO,
  suaveSai,
  type EstadoAparicao,
  type ModoAparicao,
  type Uniforme,
} from "./aparicao";

/* =========================================================================
   APARICAO - quem conduz a entrada do Chapeu (ver aparicao.ts)
   ------------------------------------------------------------------------- */

interface ControleProps {
  modo: ModoAparicao;
  estado: EstadoAparicao;
  surgirBanco: Uniforme;
  surgirChapeu: Uniforme;
  grupo: RefObject<Group>;
}

/** Anda o roteiro, materializa os dois e leva o Chapeu do ar ate o banco. */
export function ControleAparicao({ modo, estado, surgirBanco, surgirChapeu, grupo }: ControleProps) {
  const luz = useRef<PointLight>(null);

  useFrame((s, dt) => {
    const e = estado;
    if (modo === "escondido") e.t = -1;
    else if (modo === "visivel") e.t = APARICAO_FEITA;
    else if (e.t < 0) e.t = 0;
    else if (e.t < APARICAO_FEITA) {
      e.t += Math.min(dt, 0.1);
      if (e.t > ROTEIRO.fim) e.t = APARICAO_FEITA;
    }

    const t = e.t;
    const feita = t >= APARICAO_FEITA;
    surgirBanco.value = t < 0 ? 0 : feita ? 1 : suaveIO(faixa(t, ROTEIRO.banco));
    surgirChapeu.value = t < 0 ? 0 : feita ? 1 : suaveSai(faixa(t, ROTEIRO.chapeu));

    const g = grupo.current;
    if (g) {
      if (feita || t < 0) {
        g.position.set(0, 0, 0);
        g.rotation.set(0, 0, 0);
        g.scale.setScalar(1);
      } else {
        // flutua no ar, desce como pena e gira devagar ate ficar de frente
        const k = suaveIO(faixa(t, ROTEIRO.descida));
        const solto = 1 - k;
        const relogio = s.clock.elapsedTime;
        const giro = 1 - suaveSai(faixa(t, ROTEIRO.giro));
        g.position.set(
          Math.sin(t * 1.3) * 0.05 * solto,
          ALTURA_SURGIR * solto + Math.sin(relogio * 2.1) * 0.035 * solto,
          0
        );
        g.rotation.set(
          Math.cos(t * 1.7) * 0.05 * solto,
          -1.25 * giro,
          Math.sin(t * 2.3) * 0.075 * solto
        );
        // no pouso, a aba assenta: amassa um pouco e volta, como couro velho
        const d = t - ROTEIRO.pouso;
        const amasso = d > 0 ? 0.075 * Math.exp(-d * 4.2) * Math.sin(d * 11) : 0;
        g.scale.set(1 + amasso * 0.55, 1 - amasso, 1 + amasso * 0.55);
      }
    }

    // um brilho quente acompanha o Chapeu enquanto ele surge no escuro
    if (luz.current) {
      const brilho = t < 0 || feita ? 0 : faixa(t, [0.2, 1.4]) * (1 - faixa(t, [ROTEIRO.pouso, ROTEIRO.fim]));
      luz.current.intensity = 3.2 * brilho;
      luz.current.position.set(0, 1.6 + (g?.position.y ?? 0), 1.8);
    }
  }, -1);

  return <pointLight ref={luz} color="#ffb766" intensity={0} decay={2} distance={7} />;
}

/* -------------------------------------------------------------------------
   PO DE OURO - faiscas que se juntam no banco, no Chapeu, e a poeira do pouso
   ------------------------------------------------------------------------- */

const PO_VERT = /* glsl */ `
attribute vec3 aInicio;
attribute vec3 aFim;
attribute vec4 aDado; // x: atraso, y: duracao, z: alvo (0 banco, 1 chapeu, 2 pouso), w: semente
uniform float uT;
uniform vec3 uChapeu;
uniform float uPixel;
varying float vAlfa;
varying float vMistura;
void main() {
  float t = uT - aDado.x;
  float k = clamp(t / aDado.y, 0.0, 1.0);
  float e = 1.0 - pow(1.0 - k, 3.0);
  vec3 p;
  float alfa;
  if (aDado.z < 1.5) {
    // converge em espiral para um ponto do banco ou do Chapeu (que anda)
    vec3 alvo = aDado.z < 0.5 ? aFim : uChapeu + aFim;
    float lado = fract(aDado.w * 7.0) > 0.5 ? 1.0 : -1.0;
    float ang = (1.0 - e) * 2.4 * lado;
    vec3 fora = aInicio * (1.0 - e);
    fora.xz = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * fora.xz;
    p = alvo + fora;
    alfa = smoothstep(0.0, 0.2, k) * (1.0 - smoothstep(0.82, 1.0, k));
  } else {
    // a poeira que o pouso levanta, rente ao tampo do banco
    p = aFim + aInicio * e;
    p.y += 0.25 * e - 0.35 * k * k;
    alfa = 1.0 - k;
  }
  alfa *= step(0.0, t) * step(t, aDado.y);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float pisca = 0.65 + 0.35 * sin(uT * 14.0 + aDado.w * 200.0);
  gl_PointSize = uPixel * (0.5 + fract(aDado.w * 13.0)) / max(-mv.z, 0.5);
  vAlfa = alfa * pisca;
  vMistura = fract(aDado.w * 3.7);
}
`;

const PO_FRAG = /* glsl */ `
uniform vec3 uCorA;
uniform vec3 uCorB;
varying float vAlfa;
varying float vMistura;
void main() {
  if (vAlfa <= 0.001) discard;
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c);
  float miolo = smoothstep(0.5, 0.0, r);
  float cruz = max(smoothstep(0.07, 0.0, abs(c.x)), smoothstep(0.07, 0.0, abs(c.y))) * smoothstep(0.5, 0.1, r);
  float a = miolo * miolo + cruz * 0.5;
  gl_FragColor = vec4(mix(uCorA, uCorB, vMistura) * a * vAlfa * 3.6, 1.0);
}
`;

const N_BANCO = 320;
const N_CHAPEU = 420;
const N_POUSO = 180;

export function PoDeOuro({ estado, grupo }: { estado: EstadoAparicao; grupo: RefObject<Group> }) {
  const geo = useMemo(() => {
    const rnd = criarAleatorio(4242);
    const n = N_BANCO + N_CHAPEU + N_POUSO;
    const inicio = new Float32Array(n * 3);
    const fim = new Float32Array(n * 3);
    const dado = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const alvo = i < N_BANCO ? 0 : i < N_BANCO + N_CHAPEU ? 1 : 2;
      let ini: [number, number, number];
      let f: [number, number, number];
      let atraso: number;
      let duracao: number;
      if (alvo < 2) {
        // de longe: uma casca em volta, mais para cima e para os lados
        const ang = rnd() * Math.PI * 2;
        const raio = 1.6 + rnd() * 2.4;
        ini = [Math.cos(ang) * raio, (rnd() * 1.6 - 0.3) * raio * 0.6, Math.sin(ang) * raio * 0.7];
        if (alvo === 0) {
          // um ponto qualquer do banquinho
          f = [(rnd() * 2 - 1) * 0.62, CHAO + rnd() * (TOPO_BANCO - CHAO), (rnd() * 2 - 1) * 0.45];
          // as primeiras ja estao no ar quando o voo corta para a cena
          atraso = -0.3 + rnd() * 1.3;
          duracao = 0.75 + rnd() * 0.55;
        } else {
          // um ponto do cone do Chapeu, relativo a ele
          const h = Math.pow(rnd(), 1.4);
          const r = (h < 0.08 ? 1.0 : 0.62 * (1 - h)) * Math.sqrt(rnd());
          const a = rnd() * Math.PI * 2;
          f = [Math.cos(a) * r, 0.05 + h * 1.85, Math.sin(a) * r];
          atraso = 0.45 + rnd() * 1.45;
          duracao = 0.7 + rnd() * 0.5;
        }
      } else {
        // poeira do pouso: sai da beira da aba, para fora e um pouco para cima
        const a = rnd() * Math.PI * 2;
        f = [Math.cos(a) * 0.95, TOPO_BANCO + 0.02, Math.sin(a) * 0.75];
        const v = 0.35 + rnd() * 0.75;
        ini = [Math.cos(a) * v, rnd() * 0.12, Math.sin(a) * v * 0.8];
        atraso = ROTEIRO.pouso + rnd() * 0.12;
        duracao = 0.8 + rnd() * 0.7;
      }
      inicio.set(ini, i * 3);
      fim.set(f, i * 3);
      dado.set([atraso, duracao, alvo, rnd()], i * 4);
    }
    const g = new BufferGeometry();
    // a posicao e calculada no shader; o atributo so define a contagem
    g.setAttribute("position", new BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("aInicio", new BufferAttribute(inicio, 3));
    g.setAttribute("aFim", new BufferAttribute(fim, 3));
    g.setAttribute("aDado", new BufferAttribute(dado, 4));
    return g;
  }, []);

  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: PO_VERT,
        fragmentShader: PO_FRAG,
        uniforms: {
          uT: { value: -1 },
          uChapeu: { value: new Vector3() },
          uPixel: { value: 40 },
          uCorA: { value: new Color("#ffcf7a") },
          uCorB: { value: new Color("#fff4d6") },
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
    p.renderOrder = 13;
    return p;
  }, [geo, mat]);

  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat]
  );

  useFrame((s) => {
    const u = mat.uniforms;
    const t = estado.t;
    // fora da aparicao, nada a desenhar
    pontos.visible = t >= 0 && t < APARICAO_FEITA;
    if (!pontos.visible) return;
    u["uT"]!.value = t;
    if (grupo.current) (u["uChapeu"]!.value as Vector3).copy(grupo.current.position);
    u["uPixel"]!.value = 85 * s.viewport.dpr * (s.size.height / 900);
  });

  return <primitive object={pontos} />;
}
