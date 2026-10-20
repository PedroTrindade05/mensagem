import type { Carta } from "../types";

/* =========================================================================
   AS CARTAS DA EQUIPE
   -------------------------------------------------------------------------
   Uma carta por pessoa. As de baixo sao EXEMPLOS: troque pelas cartas de
   verdade (nome de quem escreveu, um cargo ou apelido e o texto).

   - foto  (opcional) arquivo em public/fotos/, ex.: foto: "ana.jpg".
   - texto aceita paragrafos: deixe uma linha em branco entre eles.
   - {nome} vira o nome da homenageada.
   ========================================================================= */

export const CARTAS: readonly Carta[] = [
  {
    de: "Gabriel Gonçalves",
    texto: `Thalita,

Obrigado por tudo, desde o primeiro dia. Lá na entrevista você já me fez sentir confortável, como se eu já fizesse parte da equipe. E foi assim todos os dias depois disso.

O seu alto astral fazia toda a diferença: sempre animada, sempre alegre, com uma alegria que irradiava pela sala inteira. Nunca vou esquecer a sua surpresa toda vez que via um front bonito que os meninos tinham feito.

E essa alegria aparecia até nas broncas: você ficava séria quando precisava, e era justamente isso que fazia a gente render mais.

Vai fazer muita falta, chefinha. Tudo de sucesso e de melhor nessa sua nova jornada em outra cidade!`,
  },
  {
    de: "Nome da pessoa",
    cargo: "Exemplo de carta",
    texto: `{nome},

Obrigado por cada café, cada ajuda de última hora e cada risada no meio de um dia corrido. Você deixou tudo mais leve.

Agora é chamada de vídeo, mas a parceria é a mesma.`,
  },
  {
    de: "Nome da pessoa",
    cargo: "Exemplo de carta",
    texto: `Oi, {nome}!

Mudança dá frio na barriga, mas eu tenho certeza de que você vai tirar de letra, como sempre.

Quando bater saudade, é só abrir o chat. A gente responde rapidinho.`,
  },
  {
    de: "Nome da pessoa",
    cargo: "Exemplo de carta",
    texto: `{nome},

Algumas plantas crescem melhor quando mudam de vaso. Tenho certeza de que você vai florescer aí.

Leve um pedacinho da gente na bagagem.`,
  },
  {
    de: "Nome da pessoa",
    cargo: "Exemplo de carta",
    texto: `Cara {nome},

Que a nova casa seja cheia de luz, de gente boa e de dias tranquilos. Você merece cada um deles.

Com carinho, e com saudade antecipada.`,
  },
  {
    de: "Nome da pessoa",
    cargo: "Exemplo de carta",
    texto: `{nome},

Mudou de cidade, mas nunca de equipe. Conta com a gente para tudo.

Um abraço bem apertado.`,
  },
  {
    de: "Nome da pessoa",
    cargo: "Exemplo de carta",
    texto: `Querida {nome},

Lembra daquele dia em que tudo deu errado e você ainda fez a gente rir? É desse jeito que eu vou lembrar de você.

Boa sorte na nova fase. Vai dar tudo certo.`,
  },
  {
    de: "Nome da pessoa",
    cargo: "Exemplo de carta",
    texto: `{nome},

A reunião de segunda não vai ser a mesma sem os seus comentários. Mas a gente promete deixar a câmera ligada para você.

Até a próxima chamada!`,
  },
  {
    de: "Nome da pessoa",
    cargo: "Exemplo de carta",
    texto: `Oi, {nome}!

Que você encontre café bom, vizinhos simpáticos e um caminho tranquilo para o trabalho. O resto você já tem: talento e coração.

Saudade já começou.`,
  },
  {
    de: "Nome da pessoa",
    cargo: "Exemplo de carta",
    texto: `{nome},

Obrigada por ensinar tanta coisa sem nunca fazer ninguém se sentir perdido. Você deixa um jeito de trabalhar que fica aqui com a gente.

Nos vemos em breve, de perto ou pela tela.`,
  },
];
