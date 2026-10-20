import type { Carta } from "../types";

/* =========================================================================
   AS CARTAS DA EQUIPE
   -------------------------------------------------------------------------
   Uma carta por pessoa. As de baixo sao EXEMPLOS assinados por professores
   de Hogwarts: troque pelas cartas de verdade.

   - casa  (opcional) colore o selo de cera: "grifinoria", "sonserina",
           "corvinal" ou "lufalufa".
   - foto  (opcional) arquivo em public/fotos/, ex.: foto: "ana.jpg".
   - texto aceita paragrafos: deixe uma linha em branco entre eles.
   - {nome} vira o nome da homenageada.
   ========================================================================= */

export const CARTAS: readonly Carta[] = [
  {
    de: "Alvo Dumbledore",
    cargo: "Diretor (exemplo)",
    casa: "grifinoria",
    texto: `Querida {nome},

A felicidade pode ser encontrada mesmo nas horas mais sombrias, se a pessoa se lembrar de acender a luz. Você acendeu muitas por aqui.

Que a nova casa te receba com a mesma alegria com que você recebia cada um de nós todas as manhãs.`,
  },
  {
    de: "Minerva McGonagall",
    cargo: "Vice-diretora (exemplo)",
    casa: "grifinoria",
    texto: `{nome},

Não costumo ser sentimental, mas abro uma exceção: vai fazer muita falta ver você chegando com aquele café e a disposição de quem resolve qualquer coisa antes do almoço.

Cinquenta pontos para você. Por tudo.`,
  },
  {
    de: "Rúbeo Hagrid",
    cargo: "Guarda-caça (exemplo)",
    casa: "grifinoria",
    texto: `Ô {nome}!

Num devia tá escrevendo isso, num devia mesmo... mas vou sentir saudade demais. Quando quiser, aparece pra um chá com bolinho de pedra. A porta tá sempre aberta.

Um abraço bem apertado (cuidado com as costelas).`,
  },
  {
    de: "Fílio Flitwick",
    cargo: "Feitiços (exemplo)",
    casa: "corvinal",
    texto: `Cara {nome},

Wingardium leviosa! Que tudo na sua nova jornada flutue com essa leveza que você sempre teve.

Com carinho e um pouquinho de magia.`,
  },
  {
    de: "Pomona Sprout",
    cargo: "Herbologia (exemplo)",
    casa: "lufalufa",
    texto: `{nome}, minha flor,

Algumas plantas crescem melhor quando mudam de vaso. Tenho certeza de que você vai florescer lindamente aí.

Leve um pedacinho da gente nas raízes.`,
  },
  {
    de: "Severo Snape",
    cargo: "Poções (exemplo)",
    casa: "sonserina",
    texto: `{nome}.

Sempre.`,
  },
];
