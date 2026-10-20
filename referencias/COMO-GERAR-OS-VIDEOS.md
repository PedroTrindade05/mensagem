# Como gerar os vídeos da abertura

> Os vídeos atuais já foram gerados (19/10/2026) no Higgsfield: a imagem do
> castelo com o modelo Soul Location (`castelo-primeiro-quadro.png`) e os dois
> vídeos com o Kling 3.0 em modo pro, sem som, usando primeiro e último quadro.
> Este guia fica para quando quiser refazer algum deles.
>
> Desde 20/10/2026 o voo (14 s) é: castelo até a janela (quadros 0 a 113 do
> voo antigo) + um plano Kling de 10 s que começa no quadro 114 (a janela de
> perto) e termina no `quadro-final-do-voo.jpg`: a janela abre, a câmera entra
> no alto do salão e desce até a mesa dos professores. O começo do plano novo
> foi acelerado em rampa (1,8x e 1,35x) para a velocidade da aproximação não
> cair. Fusão de 0,6 s no quadro final e grão leve (libx264 crf 23). O salão
> chega vazio: o banco e o Chapéu se materializam em cena (src/cena/aparicao.ts).

O código já está pronto. É só colocar dois arquivos em `public/video/` com estes
nomes exatos:

| Arquivo | O que é |
|---|---|
| `castelo-noite.mp4` | O castelo de longe, à noite, em loop (fundo da tela inicial) |
| `voo-ate-o-salao.mp4` | O voo de drone: entra pela janela, passa pelo corredor e chega ao salão |

Enquanto eles não existirem, a abertura continua com o salão ao luar e as velas
acendendo. Se só o castelo existir, ele some num fade para o salão.

## Formato

- 16:9, 1920x1080 (1280x720 também serve), 24 ou 30 fps, MP4 (H.264).
- Sem áudio (a música vem do próprio site).
- Castelo: 8 a 12 segundos, com a câmera parada, para o loop não dar pulo.
- Voo: 8 a 15 segundos no total.
- Tamanho: o castelo de preferência abaixo de 15 MB. Se ficar maior, me manda
  que eu comprimo.

## Passo 1: uma imagem do castelo

Gere primeiro uma IMAGEM parada do castelo (Midjourney, DALL·E, Flux etc.). Ela
vira o primeiro quadro dos dois vídeos, e assim o castelo fica igual nos dois.

Prompt sugerido (em inglês, as IAs entendem melhor):

> Cinematic wide shot at night of a vast medieval gothic castle with many towers
> on a cliff above a black lake, a huge full moon rising right behind the
> tallest tower and rim lighting the castle, hundreds of warm glowing windows,
> pine forest in the foreground, thin mist on the lake, deep blue night sky with
> scattered clouds, magical fantasy film look, anamorphic lens, 35mm film grain,
> 16:9

Evite escrever "Hogwarts" ou "Harry Potter": várias IAs bloqueiam nomes de
marca. A descrição acima já chega no visual.

## Passo 2: o castelo em loop

Use a imagem do passo 1 em "imagem para vídeo" (image to video), com a câmera
parada:

> Static locked-off camera, the castle does not move. Owls fly across the frame,
> a small vintage turquoise flying car crosses the sky in the distance, a few
> witches and wizards on broomsticks circle the towers, pine trees sway in the
> wind, clouds drift slowly past the moon, mist moves over the lake, warm
> windows flicker softly. Seamless loop.

Se a IA tiver a opção de "último quadro" (end frame), use a MESMA imagem do
passo 1 como último quadro: assim o loop fecha perfeito.

## Passo 3: o voo até o salão

Este é o mais importante. A IA precisa ter a opção de **primeiro e último
quadro** (first frame / last frame). Kling, Google Veo, Runway e Luma têm.

- **Primeiro quadro:** a imagem do castelo (passo 1).
- **Último quadro:** `referencias/quadro-final-do-voo.jpg` (este arquivo é o
  primeiro quadro da cena ao vivo: o voo PRECISA terminar nele, senão aparece
  uma emenda).

> Smooth cinematic drone flight: the camera flies from the wide night view of
> the castle straight toward one tall arched window high on a tower, enters
> through the window into a long stone corridor lit by flickering torches,
> glides down the corridor and through tall wooden doors into a great hall with
> long tables, keeps flying low down the entire center aisle to the far end of
> the hall, and stops right in front of the raised high table with its carved
> chairs, under the huge stained glass window of the back wall. Candles are
> unlit. One continuous shot, no cuts.

(O salão da cena ao vivo, `public/cena/salao.jpg`, é visto do fundo, em frente à
mesa dos professores. `salao-entrada-antigo.jpg` é a foto anterior, da entrada.)

Se a IA só fizer vídeos curtos (5 a 10 segundos), divida em dois:

1. **Castelo até a janela:** primeiro quadro = imagem do castelo. Termina já do
   lado de dentro, no começo do corredor.
2. **Corredor até o salão:** primeiro quadro = o último quadro do vídeo 1,
   último quadro = `quadro-final-do-voo.jpg`.

Me manda os dois que eu junto num só, sem emenda visível.

## Depois

Coloque os arquivos em `public/video/` e rode `npm run dev`. A tela inicial já
abre com o castelo, e segurar o botão dispara o voo.
