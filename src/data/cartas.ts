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
    de: "Pedro Toni",
    texto: `Thalita,

Obrigado pelo voto de confiança quando me deu a oportunidade de entrar na Nexus. Foi uma porta importante para mim, e sou grato por ela.

Desde então foi um período de muito aprendizado, com projetos que exigiram bastante e me fizeram crescer. Obrigado por ter acompanhado essa caminhada de perto. Cada fase trouxe desafios diferentes, e levo comigo a experiência de ter passado por eles.

Desejo sucesso no seu próximo caminho, que venham boas oportunidades e que essa nova fase seja muito boa para você.

Um abraço, e até uma próxima.`,
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
