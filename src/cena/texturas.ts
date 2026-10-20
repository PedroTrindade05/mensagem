import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import { fbmPeriodico, limitar } from "./ruido";

/* =========================================================================
   TEXTURA PROCEDURAL DO BANCO - gerada no carregamento
   (o salao e a foto; so a madeira do banquinho e desenhada aqui)
   ========================================================================= */

function criarCanvas(l: number, a: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = l;
  c.height = a;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("canvas 2d indisponivel");
  return [c, ctx];
}

function texturaDeCor(c: HTMLCanvasElement, repetir: boolean): CanvasTexture {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  if (repetir) {
    t.wrapS = RepeatWrapping;
    t.wrapT = RepeatWrapping;
  }
  t.anisotropy = 4;
  return t;
}

/* -------------------------------------------------------------------------
   MADEIRA: veios verticais
   ------------------------------------------------------------------------- */
export function texturaMadeira(semente: number, tom: [number, number, number]): CanvasTexture {
  const L = 256;
  const A = 512;
  const [c, ctx] = criarCanvas(L, A);
  const img = ctx.createImageData(L, A);
  const px = img.data;
  for (let y = 0; y < A; y++) {
    for (let x = 0; x < L; x++) {
      const p = (y * L + x) * 4;
      const torto = fbmPeriodico(x / 64, y / 128, 4, 3, semente) * 18;
      const veio = Math.sin((x + torto) * 0.32) * 0.5 + 0.5;
      const veioFino = fbmPeriodico(x / 3, y / 48, 85.33, 2, semente + 3);
      const b = 0.62 + veio * 0.22 + veioFino * 0.28;
      px[p] = limitar(tom[0] * b, 0, 255);
      px[p + 1] = limitar(tom[1] * b, 0, 255);
      px[p + 2] = limitar(tom[2] * b, 0, 255);
      px[p + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return texturaDeCor(c, true);
}
