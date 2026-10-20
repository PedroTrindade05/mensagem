import type { Fala, HouseKey } from "../types";

/* =========================================================================
   A DESPEDIDA - tudo que a equipe precisa trocar esta aqui (e em cartas.ts)
   -------------------------------------------------------------------------
   {nome} em qualquer texto vira o primeiro nome dela, e {nomeCompleto} o
   nome inteiro.

   VOZ DO CHAPEU
   Cada fala tem um MP3 gerado com a voz clonada do Chapeu, em
   public/audio/despedida/. SE VOCE MUDAR O TEXTO de um trecho, apague a linha
   audio dele (ou gere outro MP3): senao a voz continua falando o texto antigo.
   Sem MP3, o navegador le o texto com a voz sintetica. A legenda aparece nos
   dois casos.
   ========================================================================= */

export const DESPEDIDA = {
  /** Como ela aparece na mensagem e nas cartas. */
  nome: "Thalita",
  /** Nome inteiro, no convite da abertura. */
  nomeCompleto: "Thalita Dias",

  /**
   * Casa em que o Chapeu "seleciona" ela no fim da cerimonia. null (o
   * padrao) pula a selecao e vai direto da mensagem para as cartas.
   */
  casa: null as HouseKey | null,

  /** Frase que aparece sob o nome dela, no fim da mensagem. */
  dedicatoria: "Mudou de cidade, mas nunca de equipe.",

  /**
   * Acesso ao mural de cartas. O usuario ignora maiusculas e acentos.
   * Atencao: e uma brincadeira, nao uma seguranca de verdade. Quem abrir o
   * codigo do site consegue ler as cartas.
   */
  acesso: {
    usuario: "thalita",
    senha: "alohomora",
    /** Aparece depois do segundo erro. "" esconde a dica. */
    dica: "O feitiço que abre qualquer porta.",
  },

  /** Musica de fundo (MP3 em public/audio/), em loop. "" deixa sem musica. */
  musica: "trilha/leaving-hogwarts.mp3",

  /** A mensagem do Chapeu, trecho por trecho. */
  falas: [
    {
      texto: "Ora, ora! Há muito tempo ninguém me tirava da estante para uma ocasião tão especial!",
      humor: "surpreso",
      audio: "despedida/fala1.mp3",
    },
    {
      texto:
        "{nomeCompleto}... Hmm, deixe-me ver o que há aqui dentro. Bondade, de sobra. Alegria, em abundância. E um bom humor que ilumina qualquer sala.",
      humor: "satisfeito",
      audio: "despedida/fala2.mp3",
    },
    {
      texto:
        "Você fez uma magia que não está em nenhum livro de feitiços: transformou dias comuns em dias felizes. Um sorriso na hora certa, uma ajuda que ninguém pediu, uma risada que enchia a sala inteira.",
      humor: "satisfeito",
      audio: "despedida/fala3.mp3",
    },
    {
      texto: "Agora é hora de fazer as malas e mudar de cidade. Novas ruas, novos caminhos, uma nova casa para chamar de lar.",
      humor: "neutro",
      audio: "despedida/fala4.mp3",
      pausaDepois: 1100,
    },
    {
      texto:
        "Mas isso não é uma despedida. Você continua sendo parte desta equipe, e para quem conhece magia, distância nunca foi problema: estamos a apenas uma chave de portal de você.",
      humor: "satisfeito",
      audio: "despedida/fala5.mp3",
      pausaDepois: 900,
    },
    {
      texto:
        "Que essa nova fase tenha a sorte de uma gota de Felix Felicis, a coragem de quem enfrenta dragões e a mesma luz que você sempre trouxe para nós.",
      humor: "triunfante",
      audio: "despedida/fala6.mp3",
    },
    {
      texto: "E para você nunca esquecer disso, seus amigos mandaram corujas com palavras que só você pode ler. Abra com calma, {nome}... e com o coração.",
      humor: "satisfeito",
      audio: "despedida/fala7.mp3",
      pausaDepois: 500,
    },
  ] satisfies Fala[] as readonly Fala[],
};

/** Troca {nome} e {nomeCompleto} pelo nome da homenageada. */
export function comNome(texto: string): string {
  return texto.replaceAll("{nomeCompleto}", DESPEDIDA.nomeCompleto).replaceAll("{nome}", DESPEDIDA.nome);
}
