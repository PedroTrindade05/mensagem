import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CanvasTexture,
  Color,
  ExtrudeGeometry,
  LatheGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  Shape,
  Vector2,
  Vector3,
} from "three";
import { texturaMadeira } from "./texturas";
import { aplicarSurgimento, type Uniforme } from "./aparicao";

/* =========================================================================
   BANCO - o banquinho do Chapeu, o unico movel em 3D
   -------------------------------------------------------------------------
   O salao e a foto (FundoFoto.tsx). O banco fica na frente dela, com uma
   sombra de contato macia que o assenta no chao de pedra.
   Medidas em unidades da cena (raio da aba = 1): o chao fica em y = -2.4 e
   o tampo logo abaixo da aba.
   ========================================================================= */

export const CHAO = -2.4;
/** Face de cima do tampo do banco: o chapeu se apoia aqui. */
export const TOPO_BANCO = -0.03;

const ESPESSURA_TAMPO = 0.13;

/** Perfil do pe torneado (raio, altura de 0 a 1), de baixo para cima. */
const PERFIL_PE: Array<[number, number]> = [
  [0.0, 0.0], [0.07, 0.0], [0.078, 0.03], [0.07, 0.06], [0.058, 0.1], [0.064, 0.14],
  [0.074, 0.17], [0.064, 0.2], [0.054, 0.3], [0.05, 0.42], [0.056, 0.5], [0.07, 0.54],
  [0.058, 0.58], [0.052, 0.66], [0.056, 0.74], [0.068, 0.78], [0.072, 0.8], [0.072, 1.0], [0.0, 1.0],
];

/** Mancha escura radial: a sombra que o banco faz no chao. */
function texturaSombra(): CanvasTexture {
  const N = 256;
  const c = document.createElement("canvas");
  c.width = N;
  c.height = N;
  const ctx = c.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
    g.addColorStop(0, "rgba(0,0,0,0.85)");
    g.addColorStop(0.35, "rgba(0,0,0,0.55)");
    g.addColorStop(0.7, "rgba(0,0,0,0.15)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, N, N);
  }
  return new CanvasTexture(c);
}

/** surgir: 0 = ainda nao existe, 1 = inteiro (ver aparicao.ts). */
export default function Banco({ surgir }: { surgir?: Uniforme }) {
  const madeira = useMemo(() => texturaMadeira(13, [126, 104, 84]), []);
  const sombra = useMemo(texturaSombra, []);
  const mat = useMemo(() => {
    const m = new MeshStandardMaterial({ map: madeira, color: new Color(0.62, 0.54, 0.46), roughness: 0.8 });
    // se materializa do chao para cima
    if (surgir) {
      aplicarSurgimento(m, surgir, { chave: "banco", espaco: "mundo", base: CHAO, altura: TOPO_BANCO - CHAO, peso: 0.55, escala: 3.2 });
    }
    return m;
  }, [madeira, surgir]);
  const matSombra = useMemo(
    () => new MeshBasicMaterial({ map: sombra, transparent: true, depthWrite: false, color: 0x000000, fog: false }),
    [sombra]
  );
  // tampo com quinas arredondadas: o desgaste tira o canto vivo
  const geoTampo = useMemo(() => {
    const l = 1.36;
    const p = 1.0;
    const r = 0.07;
    const forma = new Shape();
    forma.moveTo(-l / 2 + r, -p / 2);
    forma.lineTo(l / 2 - r, -p / 2);
    forma.quadraticCurveTo(l / 2, -p / 2, l / 2, -p / 2 + r);
    forma.lineTo(l / 2, p / 2 - r);
    forma.quadraticCurveTo(l / 2, p / 2, l / 2 - r, p / 2);
    forma.lineTo(-l / 2 + r, p / 2);
    forma.quadraticCurveTo(-l / 2, p / 2, -l / 2, p / 2 - r);
    forma.lineTo(-l / 2, -p / 2 + r);
    forma.quadraticCurveTo(-l / 2, -p / 2, -l / 2 + r, -p / 2);
    const g = new ExtrudeGeometry(forma, {
      depth: ESPESSURA_TAMPO - 0.04,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 3,
      curveSegments: 6,
    });
    g.rotateX(-Math.PI / 2);
    g.translate(0, TOPO_BANCO - ESPESSURA_TAMPO + 0.02, 0);
    // o veio corre ao longo do tampo
    const uv = g.getAttribute("uv");
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.45 + 0.5, uv.getY(i) * 0.6);
    return g;
  }, []);
  const geoPe = useMemo(() => {
    const pts = PERFIL_PE.map(([r, y]) => new Vector2(r, y - 0.5));
    return new LatheGeometry(pts, 12);
  }, []);
  const pernas = useMemo(() => {
    const out: Array<{ p: Vector3; q: Quaternion; alt: number }> = [];
    const topo = TOPO_BANCO - ESPESSURA_TAMPO;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const a = new Vector3(sx * 0.5, topo, sz * 0.34);
        const b = new Vector3(sx * 0.6, CHAO, sz * 0.43);
        const meio = a.clone().add(b).multiplyScalar(0.5);
        const dir = b.clone().sub(a);
        const alt = dir.length();
        const q = new Quaternion().setFromUnitVectors(new Vector3(0, -1, 0), dir.normalize());
        out.push({ p: meio, q, alt });
      }
    }
    return out;
  }, []);
  useEffect(
    () => () => {
      mat.dispose();
      matSombra.dispose();
      madeira.dispose();
      sombra.dispose();
      geoTampo.dispose();
      geoPe.dispose();
    },
    [mat, matSombra, madeira, sombra, geoTampo, geoPe]
  );

  // a sombra no chao acompanha o banco surgindo
  useFrame(() => {
    const alvo = surgir ? surgir.value : 1;
    if (matSombra.opacity !== alvo) matSombra.opacity = alvo;
  });

  const ySaia = TOPO_BANCO - ESPESSURA_TAMPO - 0.06;
  return (
    <group>
      {/* sombra de contato, colada no chao */}
      <mesh material={matSombra} rotation={[-Math.PI / 2, 0, 0]} position={[0, CHAO + 0.005, 0]} renderOrder={-1}>
        <planeGeometry args={[3.4, 2.6]} />
      </mesh>
      <mesh geometry={geoTampo} material={mat} />
      {/* saia logo abaixo do tampo */}
      <mesh material={mat} position={[0, ySaia, 0.34]}>
        <boxGeometry args={[1.0, 0.12, 0.05]} />
      </mesh>
      <mesh material={mat} position={[0, ySaia, -0.34]}>
        <boxGeometry args={[1.0, 0.12, 0.05]} />
      </mesh>
      <mesh material={mat} position={[0.5, ySaia, 0]}>
        <boxGeometry args={[0.05, 0.12, 0.68]} />
      </mesh>
      <mesh material={mat} position={[-0.5, ySaia, 0]}>
        <boxGeometry args={[0.05, 0.12, 0.68]} />
      </mesh>
      {pernas.map((p, i) => (
        <mesh key={i} geometry={geoPe} material={mat} position={p.p} quaternion={p.q} scale={[1, p.alt, 1]} />
      ))}
      {/* travessas baixas */}
      <mesh material={mat} position={[0, -1.85, 0.405]}>
        <boxGeometry args={[1.14, 0.07, 0.06]} />
      </mesh>
      <mesh material={mat} position={[0, -1.85, -0.405]}>
        <boxGeometry args={[1.14, 0.07, 0.06]} />
      </mesh>
    </group>
  );
}
