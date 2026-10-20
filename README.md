# Uma Última Cerimônia

Uma despedida com tema de Harry Potter, feita para rodar no navegador numa festa
surpresa. O Chapéu Seletor em 3D acorda no Salão Principal, fala uma mensagem da
equipe para a homenageada, "seleciona" ela na casa favorita e entrega as cartas
que cada colega escreveu. Depois da festa ela pode voltar ao site, entrar com
usuário e senha e reler todas as cartas.

## Como funciona

1. **Abertura.** O salão aparece só com o luar, as velas apagadas. O nome dela
   surge letra por letra e um botão pede para **segurar** e acender as velas.
   Ao completar o anel, a luz das velas volta em onda a partir do centro do
   salão, o nome esquenta para dourado e a cerimônia começa (o primeiro toque
   também libera o som do navegador).

   **Com os vídeos** (`public/video/castelo-noite.mp4` e
   `voo-ate-o-salao.mp4`), o fundo da tela inicial é o castelo à noite em loop.
   Segurar o botão dispara o voo de drone pela janela até o salão. O voo termina
   no mesmo quadro em que a cena ao vivo começa, e as velas acendem revelando o
   Chapéu. Como gerar os vídeos: `referencias/COMO-GERAR-OS-VIDEOS.md`.
2. **Cerimônia.** A câmera desce até o Chapéu, que acorda e fala a mensagem
   trecho por trecho, com legenda palavra por palavra e cara diferente em cada
   trecho. Uma caixinha de música toca baixinho e abaixa sozinha enquanto ele fala.
3. **Encerramento.** Faíscas giram em volta do Chapéu, e aparecem o nome dela,
   uma dedicatória e o aviso de que as corujas trouxeram cartas. (Com `casa`
   preenchida, antes disso o Chapéu pensa e anuncia a casa, com brasão.)
4. **Correio Coruja.** Tela de login em pergaminho. Usuário e senha certos abrem
   o mural.
5. **Mural de cartas.** Um envelope por colega, com selo de cera na cor da casa.
   Clicar quebra o selo, abre a aba, a carta sobe e se desenrola em pergaminho.
   As cartas lidas ficam marcadas. Setas do teclado passam de uma carta para outra
   e Esc fecha.

O endereço com `#cartas` no final (ex.: `http://localhost:5173/#cartas`) abre
direto no login, para ela voltar só às cartas.

## O que a equipe precisa trocar

Tudo fica em dois arquivos:

### `src/data/despedida.ts`

| Campo | O que é |
|---|---|
| `nome` / `nomeCompleto` | Primeiro nome e nome inteiro. `{nome}` e `{nomeCompleto}` nos textos viram esses nomes. |
| `casa` | `null` (padrão) vai direto da mensagem para as cartas. Uma casa (`"grifinoria"`…) liga a seleção com brasão. |
| `dedicatoria` | Frase sob o brasão. |
| `acesso` | `usuario`, `senha` e uma `dica` que aparece depois do segundo erro. O usuário ignora maiúsculas e acentos. |
| `musica` | MP3 de fundo opcional em `public/audio/`. Vazio usa a caixinha de música gerada no navegador. |
| `falas` | A mensagem do Chapéu. Cada trecho tem `texto`, `humor` (`neutro`, `surpreso`, `satisfeito`, `triunfante`, `desconfiado`), `audio` opcional e `pausaDepois` opcional. |

### `src/data/cartas.ts`

Uma entrada por colega: `de`, `cargo` (opcional), `casa` (opcional, colore o
selo), `texto` e `foto` (opcional, arquivo em `public/fotos/`). Linha em branco
no texto vira parágrafo. As cartas que vêm no projeto são exemplos assinados por
professores de Hogwarts: troque pelas de verdade.

## A voz do Chapéu

As 7 falas da mensagem foram geradas com uma **voz clonada** a partir das falas
originais do Chapéu (as do questionário antigo, guardadas em
`public/audio/originais/`), e ficam em `public/audio/despedida/fala1.mp3` a
`fala7.mp3`. A boca do Chapéu abre e fecha com o volume de cada gravação.

**Se mudar o texto de um trecho** em `src/data/despedida.ts`, a voz continua
dizendo o texto antigo: gere um MP3 novo com a mesma voz (ou apague a linha
`audio` daquele trecho, e o navegador lê o novo texto com a voz sintética).

- **Sem o MP3:** o navegador lê o texto com a voz sintética em português que
  tiver instalada, e a boca segue um ritmo de sílabas.
- **Sem som:** o botão de alto-falante cala tudo. A legenda e a boca continuam no
  ritmo de leitura.

## O Chapéu em 3D

A malha do Chapéu é uma só e parada; tudo que se mexe é feito no shader:

- **Corpo:** a copa se inclina e gira sobre a aba (que fica apoiada no banco).
  Ele olha para o cursor do mouse, passeia o olhar sozinho, respira e balança.
  A ponta tem inércia: atrasa em relação ao corpo e passa do ponto.
- **Expressões:** neutro, surpreso, satisfeito, triunfante, desconfiado,
  pensativo e dormindo. Cada uma combina sobrancelhas, olhos apertados, cantos e
  largura da boca, sorriso torto, inclinação e giro. Ao mudar de expressão ele
  dá um tranco (leva um susto, estufa o peito, vira o rosto).
- **Rugas:** dobras na testa quando as sobrancelhas sobem, vincos entre elas
  quando franze e pés de galinha quando aperta os olhos ou sorri.
- **Fala:** a boca abre com o volume da voz e muda de forma com o timbre (redonda
  no "u", larga no "i" e no "s"), e a cabeça dá um cabeceio em cada sílaba.

## O cenário

O salão é uma foto (`public/cena/salao.jpg`) e só o Chapéu e o banquinho são
3D, na frente dela. Um shader (`src/cena/FundoFoto.tsx`) dá vida à foto:

- **luar:** na abertura, a mesma foto em noite azulada, com cada chama apagada
  (as chamas são achadas pela cor: pontos claros e quentes);
- **onda das velas:** ao acender, a luz quente volta do centro do salão para
  fora, e cada chama dá um clarão quando a frente da onda passa;
- **vida:** cada vela treme no seu ritmo, a névoa corre baixa no chão e raios de
  luar descem do vitral;
- **lente:** parallax com o mouse, zoom e desfoque de profundidade por fase, com
  o Chapéu em foco na frente;
- poeira dourada e faíscas mágicas em 3D entre a lente e o salão, vinheta e grão
  de filme em CSS.

Para trocar o salão, basta substituir `salao.jpg` por outra foto em 16:9; o ponto
de fuga e o vitral ficam em `FUGA` e `VITRAL` no `FundoFoto.tsx`.

O bloom de verdade (feito na GPU) vem desligado, porque pesa muito em placa de
vídeo integrada. Num PC com placa dedicada, abra o endereço com `?cinema=1` no
final para ligar. Se a máquina ficar abaixo de ~50 fps, a resolução baixa sozinha,
e no login e no mural a cena para de desenhar. Sem WebGL 2 ou com "reduzir
movimento" ligado no sistema, aparece a foto parada.

## Como rodar

Requer Node.js e npm.

```bash
npm install
npm run dev
```

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (também abre pelo celular no mesmo Wi-Fi). |
| `npm run typecheck` | Só a checagem de tipos. |
| `npm run build` | Checagem de tipos e build em `dist/`. |
| `npm run preview` | Serve a pasta `dist/`. |

Para a festa, use o build (`npm run build` e `npm run preview`) num computador
ligado à TV, em tela cheia (tecla **F**). O `dist/` precisa ser servido por HTTP:
abrir o `index.html` com dois cliques não funciona.

### Publicar para ela acessar depois

O `dist/` é um site estático: dá para publicar em qualquer hospedagem estática
(Netlify, Vercel, GitHub Pages…). **Atenção:** o login é uma brincadeira, não uma
proteção de verdade. As cartas ficam dentro do código do site, e quem souber
abrir as ferramentas do navegador consegue lê-las. Não coloque nada que não
possa ficar público.

## Controles

| Controle | O que faz |
|---|---|
| Alto-falante (canto superior direito) | Liga/desliga voz e música. |
| Tela cheia, ou tecla **F** | Entra e sai da tela cheia. |
| "Avançar" | Pula o trecho em curso. |
| Setas e Esc | Navegam e fecham as cartas. |

## Estrutura

```
src/
├─ App.tsx                 o fluxo das fases
├─ config.ts               tempos, volumes e caminhos
├─ types.ts
├─ data/
│  ├─ despedida.ts         nome, casa, senha e a mensagem do Chapéu
│  ├─ cartas.ts            as cartas da equipe
│  └─ houses.ts            as quatro casas
├─ hooks/
│  ├─ useVozChapeu.ts      MP3 com análise de volume, ou voz sintética
│  ├─ useTrilha.ts         caixinha de música e sinos, em Web Audio
│  └─ useTelaCheia.ts
├─ cena/
│  ├─ Cenario.tsx          imagem parada + cena 3D carregada sob demanda
│  ├─ CenaChapeu.tsx       câmera, luzes e pós-processamento
│  ├─ FundoFoto.tsx        a foto do salão viva: luar, onda das velas, névoa, lente
│  ├─ Banco.tsx            o banquinho do Chapéu e a sombra no chão
│  ├─ velas.ts             o tempo da onda de acender as velas
│  ├─ Magia.tsx            poeira e faíscas
│  └─ chapeu/              o Chapéu: modelo, couro, rosto e expressões
└─ components/
   ├─ Abertura.tsx
   ├─ Legenda.tsx
   ├─ Revelacao.tsx
   ├─ Login.tsx
   ├─ Cartas.tsx           mural, envelope abrindo e pergaminho
   ├─ HouseCrest.tsx
   └─ ControlesTela.tsx
```

## Créditos e aviso legal

- **Modelo 3D do Chapéu:** gerado com [Meshy AI](https://www.meshy.ai/), sob a
  licença [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.pt-br).
  O arquivo do repositório é uma versão modificada (malha limpa, normais
  suavizadas, compressão meshopt e um atributo de superfície para o shader).
- **Vozes do veredito:** geradas com o [fish.audio](https://fish.audio/), sujeitas
  aos termos do serviço.
- **Cena, animação e código:** Pedro Toni com o Claude (Anthropic).

Projeto de fã, não oficial e sem fins comerciais, feito para uma festa
particular. Não tem vínculo com a Warner Bros. Entertainment, a Wizarding World
Digital ou J.K. Rowling. Harry Potter, o Chapéu Seletor, Hogwarts, as casas e os
seus brasões são marcas e obras dos seus titulares. As imagens em
`public/brasoes/` não têm fonte registrada e não são cobertas pela licença do
repositório.

O código está sob a licença MIT (ver [`LICENSE`](LICENSE)), que cobre só o
código escrito para este projeto.
