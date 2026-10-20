import type { Carta } from "../types";

/* =========================================================================
   AS CARTAS DA EQUIPE
   -------------------------------------------------------------------------
   Uma carta por pessoa. Cada carta nova entra no fim da lista (sem linha
   cargo: so o nome de quem escreveu e o texto).

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
    de: "Daniels",
    texto: `Oii Thalita,
Nem sempre a gente esteve em perfeita sintonia, mas acho que é justamente isso que torna a amizade que construímos tão especial.

Queria te agradecer pela paciência, pela compreensão e principalmente por saber lidar tão bem com as pessoas, mesmo quando elas não facilitam muito as coisas (e olha que eu sei que já fiz parte desse grupo kkkk).

Também sou muito grato por você ter me dado uma força em alguns momentos importantes, principalmente em um deles que talvez você nem tenha ideia do quanto significou pra mim.

Te desejo muita felicidade e conquistas nessa nova fase! E já que estamos falando de Hogwarts, que não falte um pouquinho de magia nessa nova jornada!
Obrigado por tudo! ❤️`,
  },
  {
    de: "Pedro Toni",
    texto: `Thalita,

Obrigado pelo voto de confiança quando me deu a oportunidade de entrar na Nexus. Foi uma porta importante para mim, e sou grato por ela.

Desde então foi um período de muito aprendizado, com projetos que exigiram bastante e me fizeram crescer. Obrigado por ter acompanhado essa caminhada de perto. Cada fase trouxe desafios diferentes, e levo comigo a experiência de ter passado por eles.

Desejo sucesso no seu próximo caminho, que venham boas oportunidades e que essa nova fase seja muito boa para você.

Um abraço, e até uma próxima.`,
  },
  {
    de: "Pedro Trindade",
    texto: `Thalita,

Você tem um dom estranho: acredita no trabalho da gente até quando a gente mesmo não acredita. Eu não sou designer e você confiou em mim para fazer um mídia kit para dupla sertaneja e as artes para o feirão kkkkkk. Obrigado por essa confiança, de verdade.

Vai ser muito esquisito chegar na Nexus ou na GS e não te encontrar com aquela energia toda logo cedo.

Muita sorte nessa nova jornada! Você vai fazer muita falta aqui perto do time.

Abraço!`,
  },
  {
    de: "Paulo",
    texto: `Muito antes de a gente trabalhar junto, você já acreditava em mim. Foi você que me indicou e me abriu a porta da Nexus, quando eu nunca tinha trabalhado como dev e nunca tinha feito nada que ajudasse alguém com o meu trabalho de dev.

Você foi a minha carta de Hogwarts kkkkkkkkkkkkk. Chegou na hora certa e me mostrou que eu tinha lugar nesse mercado.

Graças a essa oportunidade, hoje eu participo de projetos que entregam valor e me sinto um programador capaz. Isso começou com a sua confiança em mim, e eu nunca vou esquecer.

E tem o seu jeito. Carismática, de bom humor, sempre atenciosa e dedicada com quem tá ao redor. Você faz a gente se sentir cuidado, e isso deixou os meus dias aqui bem melhores.

Obrigado por tudo, de coração. Que a sua nova jornada seja abençoada por Deus e que ele te acompanhe e ilumine, e que a sua alegria continue transformando a vida de quem cruza o seu caminho, como transformou a minha.

Com carinho,`,
  },
];
