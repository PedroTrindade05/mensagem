import type { House, HouseKey } from "../types";

/* =========================================================================
   AS QUATRO CASAS
   -------------------------------------------------------------------------
   audio  -> MP3 do veredito final (public/audio/)
   imagem -> PNG opcional do brasao (public/brasoes/). Se o arquivo existir,
             ele e usado; se nao, o brasao desenhado em SVG entra no lugar.
   ========================================================================= */

export const HOUSES: Record<HouseKey, House> = {
  grifinoria: {
    nome: "Grifinória",
    display: "GRIFINÓRIA",
    lema: "Onde moram os corajosos de coração, a ousadia e o cavalheirismo.",
    inicial: "G",
    cor1: "#d3a625",
    cor2: "#7f0909",
    audio: "resultado_grifinoria.mp3",
    imagem: "brasao_grifinoria.png",
  },
  sonserina: {
    nome: "Sonserina",
    display: "SONSERINA",
    lema: "Astúcia, ambição e determinação para chegar aonde ninguém chegou.",
    inicial: "S",
    cor1: "#2a9d5c",
    cor2: "#1a472a",
    audio: "resultado_sonserina.mp3",
    imagem: "brasao_sonserina.png",
  },
  corvinal: {
    nome: "Corvinal",
    display: "CORVINAL",
    lema: "Sabedoria, engenho e uma mente sempre faminta por respostas.",
    inicial: "C",
    cor1: "#7ba7e0",
    cor2: "#0e1a40",
    audio: "resultado_corvinal.mp3",
    imagem: "brasao_corvinal.png",
  },
  lufalufa: {
    nome: "Lufa-Lufa",
    display: "LUFA-LUFA",
    lema: "Lealdade, paciência e um trabalho justo feito com o coração.",
    inicial: "L",
    cor1: "#f0c75e",
    cor2: "#726255",
    audio: "resultado_lufalufa.mp3",
    imagem: "brasao_lufalufa.png",
  },
};

/**
 * As chaves das casas, tipadas.
 * Object.keys() devolve string[], por isso o cast explícito aqui. É o único
 * ponto do projeto onde ele é necessário, e é seguro porque HOUSES é
 * Record<HouseKey, House>.
 */
export const HOUSE_KEYS = Object.keys(HOUSES) as readonly HouseKey[];
