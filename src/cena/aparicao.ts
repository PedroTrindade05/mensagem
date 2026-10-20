import { Color, type Material } from "three";
import { POUSO_CHAPEU_MS } from "../config";

/* =========================================================================
   APARICAO - o banquinho e o Chapeu surgem do po de ouro
   -------------------------------------------------------------------------
   Quando o voo termina, o salao esta vazio ao luar. Faiscas douradas se
   juntam e o banquinho se materializa do chao para cima; logo depois o
   Chapeu surge no ar (da ponta para a aba), desce flutuando, girando
   devagar, e pousa no banco com um leve amasso. O pouso acende as velas.

   O tempo e um objeto mutavel lido a cada quadro (como as velas), e o
   "materializar" e um dissolve com borda incandescente injetado no
   material de cada um.
   ========================================================================= */

export type ModoAparicao = "visivel" | "escondido" | "surgindo";

export interface EstadoAparicao {
  /** Segundos desde que comecou a surgir; -1 = escondido. */
  t: number;
}

/** Depois da aparicao, fica "parado no banco desde sempre". */
export const APARICAO_FEITA = 1000;

/** Roteiro, em segundos desde a chegada no salao. */
export const ROTEIRO = {
  banco: [0.15, 1.6] as const,
  chapeu: [0.75, 2.2] as const,
  descida: [1.15, 3.0] as const,
  giro: [0.75, 3.1] as const,
  // o App acende as velas nessa mesma hora
  pouso: POUSO_CHAPEU_MS / 1000,
  fim: POUSO_CHAPEU_MS / 1000 + 1.6,
};

/** Altura acima do banco em que o Chapeu surge. */
export const ALTURA_SURGIR = 0.62;

export const faixa = (t: number, [a, b]: readonly [number, number]): number =>
  Math.min(Math.max((t - a) / (b - a), 0), 1);

export const suaveIO = (x: number): number => x * x * x * (x * (x * 6 - 15) + 10);
export const suaveSai = (x: number): number => 1 - Math.pow(1 - x, 3);

export interface Uniforme {
  value: number;
}

interface OpcoesSurgir {
  /** Chave unica do shader (cada material com o seu). */
  chave: string;
  /** "mundo" para o que nao se mexe; "objeto" para o que anda (o padrao nao escorrega). */
  espaco: "mundo" | "objeto";
  /** Onde o surgimento comeca (y) e quanto anda ate o fim (negativo = de cima para baixo). */
  base: number;
  altura: number;
  /** 0 = so ruido; 1 = so a altura. */
  peso: number;
  /** Tamanho do ruido. */
  escala: number;
}

const GLSL_SURGIR = /* glsl */ `
uniform float uSurgir;
uniform float uSurgBase;
uniform float uSurgAltura;
uniform float uSurgPeso;
uniform float uSurgEscala;
uniform vec3 uSurgCor;
varying vec3 vSurgPos;
float surgHash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
float surgRuido(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(surgHash(i), surgHash(i + vec3(1, 0, 0)), f.x), mix(surgHash(i + vec3(0, 1, 0)), surgHash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(surgHash(i + vec3(0, 0, 1)), surgHash(i + vec3(1, 0, 1)), f.x), mix(surgHash(i + vec3(0, 1, 1)), surgHash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
`;

/**
 * Ensina um material a se materializar: abaixo de uSurgir = 1 ele some em
 * manchas de ruido, com a borda acesa em dourado. Encadeia com o que o
 * material ja fazia no onBeforeCompile.
 */
export function aplicarSurgimento(mat: Material, surgir: Uniforme, o: OpcoesSurgir): void {
  const anterior = mat.onBeforeCompile.bind(mat);
  const chaveAnterior = mat.customProgramCacheKey.bind(mat);
  const extras = {
    uSurgir: surgir,
    uSurgBase: { value: o.base },
    uSurgAltura: { value: o.altura },
    uSurgPeso: { value: o.peso },
    uSurgEscala: { value: o.escala },
    uSurgCor: { value: new Color(1.0, 0.42, 0.1) },
  };
  mat.onBeforeCompile = (sh, renderer) => {
    anterior(sh, renderer);
    Object.assign(sh.uniforms, extras);
    const pos = o.espaco === "mundo" ? "(modelMatrix * vec4(position, 1.0)).xyz" : "position";
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>\nvarying vec3 vSurgPos;`)
      .replace("#include <project_vertex>", `vSurgPos = ${pos};\n#include <project_vertex>`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>\n${GLSL_SURGIR}`)
      .replace(
        "#include <clipping_planes_fragment>",
        /* glsl */ `#include <clipping_planes_fragment>
        // inteiro, nada disto roda (o desvio e o mesmo para todos os pixels)
        float surgBorda = 0.0;
        if (uSurgir < 0.999) {
          float surgN = 0.62 * surgRuido(vSurgPos * uSurgEscala) + 0.38 * surgRuido(vSurgPos * uSurgEscala * 2.7 + 5.3);
          float surgH = clamp((vSurgPos.y - uSurgBase) / uSurgAltura, 0.0, 1.0);
          float surgV = mix(surgN, surgH, uSurgPeso);
          float surgLim = uSurgir * 1.25 - 0.12;
          if (surgV > surgLim) discard;
          surgBorda = 1.0 - smoothstep(0.0, 0.035, surgLim - surgV);
        }`
      )
      .replace(
        "#include <opaque_fragment>",
        /* glsl */ `#include <opaque_fragment>
        // brasa: a borda some dentro da cor do material, sem estourar em branco
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uSurgCor * 1.4, surgBorda * 0.85);`
      );
  };
  mat.customProgramCacheKey = () => `${chaveAnterior()}|surgir:${o.chave}`;
  mat.needsUpdate = true;
}
