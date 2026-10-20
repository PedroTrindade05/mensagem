/* =========================================================================
   CONFIGURACAO RAPIDA
   -------------------------------------------------------------------------
   Os MP3 ficam em  public/audio/ , os brasoes em  public/brasoes/  e as
   fotos das cartas em  public/fotos/ . O Vite serve a pasta public/ na
   raiz, entao o caminho final e simplesmente "audio/<arquivo>.mp3".
   ========================================================================= */

/** Monta o caminho de um arquivo dentro de public/ (funciona em dev e no build). */
export const asset = (path: string): string =>
  `${import.meta.env.BASE_URL}${path}`;

export const AUDIO_DIR = "audio/";
export const IMG_DIR = "brasoes/";
export const FOTO_DIR = "fotos/";

/* Qualidade */

/**
 * Bloom (brilho nas chamas e estrelas), vinheta e grao feitos na GPU.
 * Fica lindo, mas pesa muito em placa de video integrada (notebook comum):
 * desligado por padrao. Para testar num PC forte, abra o endereco com
 * ?cinema=1 no final, ou troque para true aqui.
 */
export const EFEITOS_CINEMA =
  typeof window !== "undefined" && new URLSearchParams(window.location.search).get("cinema") === "1";

/* Videos da abertura (opcionais) */

/**
 * O castelo a noite, em loop, atras da tela inicial; e o voo do drone que
 * entra por uma janela, passa pelo corredor e chega ao salao. O voo precisa
 * TERMINAR no quadro referencias/quadro-final-do-voo.jpg (o salao ao luar),
 * para a cena ao vivo assumir sem emenda.
 *
 * Sem os arquivos, a abertura usa a foto do salao ao luar e as velas
 * acendendo em onda; sem so o voo, o castelo some num fade para o salao.
 */
export const VIDEO_CASTELO = "video/castelo-noite.mp4";
export const VIDEO_VOO = "video/voo-ate-o-salao.mp4";
/** Mural de cartas: a camera sobe do castelo ate as nuvens (toca uma vez)... */
export const VIDEO_NUVENS_VOO = "video/voo-ate-as-nuvens.mp4";
/** ...e emenda na coruja com a sacola de cartas, em loop. */
export const VIDEO_NUVENS = "video/nuvens-coruja.mp4";

/* Volumes (0 a 1) */

/** Volume das falas do Chapeu. */
export const VOLUME_FALA = 1;
/**
 * Reforco da voz acima do volume maximo do elemento de audio (+3 dB). As
 * falas tem pico em -3.9 dB, entao ainda sobra folga e nada distorce.
 */
export const GANHO_FALA = 1.4;
/** Volume da musica de fundo, no mesmo nivel o tempo todo. */
export const VOLUME_MUSICA = 0.55;

/* Tempos (em milissegundos) */

/** Fade da troca de tela. Precisa bater com --fade do styles.css. */
export const FADE_MS = 700;
/** A camera desce do teto encantado ate o Chapeu. */
export const ENTRADA_CAMERA_MS = 6500;
/** Vindo do voo: o Chapeu surge no ar e pousa no banco nesta hora (as velas acendem). */
export const POUSO_CHAPEU_MS = 3000;
/** Destrava se o audio congelar sem disparar nenhum evento. */
export const STALL_GUARD_MS = 30000;
/** Espera do veredito quando o MP3 da casa falta. */
export const RESULT_FALLBACK_MS = 3200;
/** Depois disso aparece o botao de pular a fala. */
export const SKIP_AFTER_MS = 1600;
/** Pausa padrao entre um trecho da mensagem e o seguinte. */
export const PAUSA_FALAS_MS = 700;
