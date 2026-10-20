/* =========================================================================
   TIPOS CENTRAIS
   -------------------------------------------------------------------------
   HouseKey amarra o projeto inteiro: se alguem escrever casa: "grifinoira"
   numa carta, o TypeScript acusa na hora, em vez de o selo sair sem cor.
   ========================================================================= */

import type { Humor } from "./cena/chapeu/expressoes";

/** As quatro casas. Usado como chave em todo lugar. */
export type HouseKey = "grifinoria" | "sonserina" | "corvinal" | "lufalufa";

/** Ficha de uma casa. */
export interface House {
  /** Nome com acentuacao normal, usado em textos corridos. */
  nome: string;
  /** Nome em caixa alta, usado no brasao e na revelacao. */
  display: string;
  lema: string;
  /** Inicial desenhada no escudo em SVG e no selo de cera. */
  inicial: string;
  /** Cor principal (metal/destaque). */
  cor1: string;
  /** Cor secundaria (fundo do escudo, cera do selo). */
  cor2: string;
  /** MP3 do veredito desta casa, em public/audio/. */
  audio: string;
  /** PNG do brasao, em public/brasoes/. */
  imagem: string;
}

/** Um trecho da mensagem que o Chapeu fala. */
export interface Fala {
  /** O que aparece na legenda (e o que a voz sintetica le, sem MP3). */
  texto: string;
  /** Cara do Chapeu enquanto fala este trecho. Padrao: "neutro". */
  humor?: Humor;
  /** MP3 gravado deste trecho, em public/audio/. Sem ele, a voz e sintetica. */
  audio?: string;
  /** Pausa depois do trecho, em ms. Padrao: 700. */
  pausaDepois?: number;
}

/** Uma carta do mural. */
export interface Carta {
  /** Quem escreveu. */
  de: string;
  /** Linha pequena abaixo do nome (cargo, apelido, setor...). */
  cargo?: string;
  /** Cor do selo de cera. Sem casa, o selo sai vermelho-lacre. */
  casa?: HouseKey;
  /** O texto. Linhas em branco viram paragrafos. */
  texto: string;
  /** Foto opcional, em public/fotos/. */
  foto?: string;
}

/** Etapas da experiencia. */
export type Fase = "abertura" | "cerimonia" | "selecao" | "revelacao" | "login" | "cartas";
