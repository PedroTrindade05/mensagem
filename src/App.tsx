import { useCallback, useEffect, useRef, useState } from "react";

import Cenario from "./cena/Cenario";
import BotaoTelaCheia from "./components/BotaoTelaCheia";
import Abertura from "./components/Abertura";
import Legenda from "./components/Legenda";
import Revelacao from "./components/Revelacao";
import Login from "./components/Login";
import Cartas from "./components/Cartas";
import type { Humor } from "./cena/chapeu/expressoes";

import { useVozChapeu } from "./hooks/useVozChapeu";
import { useTrilha } from "./hooks/useTrilha";
import { DESPEDIDA, comNome } from "./data/despedida";
import { HOUSES } from "./data/houses";
import { ENTRADA_CAMERA_MS, FADE_MS, PAUSA_FALAS_MS, POUSO_CHAPEU_MS, RESULT_FALLBACK_MS, SKIP_AFTER_MS } from "./config";
import type { Fase } from "./types";
import type { VideosDisponiveis } from "./cena/VideoAbertura";
import type { ModoAparicao } from "./cena/aparicao";

/* =========================================================================
   A DESPEDIDA - o fluxo
   -------------------------------------------------------------------------
   abertura  -> o salao escuro; o clique libera o som e a camera desce
   cerimonia -> o Chapeu acorda e fala a mensagem, trecho por trecho
   selecao   -> ele pensa... e anuncia a casa (DESPEDIDA.casa)
   revelacao -> o nome dela e o convite para as cartas
   login     -> o Correio Coruja so abre com usuario e senha
   cartas    -> o mural de envelopes

   #cartas no endereco abre direto no login (para ela voltar depois).
   ========================================================================= */

const esperar = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const CHAVE_SESSAO = "chapeu-despedida:entrou";

function jaEntrou(): boolean {
  try {
    return window.sessionStorage.getItem(CHAVE_SESSAO) === "1";
  } catch {
    return false;
  }
}

function faseInicial(): Fase {
  if (typeof window === "undefined") return "abertura";
  if (window.location.hash === "#cartas") return jaEntrou() ? "cartas" : "login";
  return "abertura";
}

export default function App() {
  const [fase, setFase] = useState<Fase>(faseInicial);
  const [visivel, setVisivel] = useState(true);
  const [trecho, setTrecho] = useState(0);
  const [mostrarPular, setMostrarPular] = useState(false);
  const [acordado, setAcordado] = useState(false);
  // a tela inicial comeca so com o luar; as velas acendem quando ela segura o botao
  const [velasAcesas, setVelasAcesas] = useState(() => faseInicial() !== "abertura");
  const [cenaPronta, setCenaPronta] = useState(false);
  // videos opcionais da abertura: o castelo em loop e o voo ate o salao
  const [videos, setVideos] = useState<VideosDisponiveis | null>(null);
  const [voando, setVoando] = useState(false);
  const [saiuDoCastelo, setSaiuDoCastelo] = useState(false);
  const [chegouVoando, setChegouVoando] = useState(false);
  // durante o voo o salao esta vazio; na chegada o banco e o Chapeu surgem
  const [aparicao, setAparicao] = useState<ModoAparicao>("visivel");

  const voz = useVozChapeu();
  const trilha = useTrilha(DESPEDIDA.musica);
  // a cerimonia roda num async: este id cancela a anterior se ela for reiniciada
  const execucao = useRef(0);

  /** Troca de fase com a interface esmaecendo. */
  const irPara = useCallback(async (proxima: Fase): Promise<void> => {
    setVisivel(false);
    await esperar(FADE_MS * 0.8);
    setFase(proxima);
    setVisivel(true);
  }, []);

  // a musica segue no mesmo volume com a voz; som desligado vale para as duas
  useEffect(() => trilha.silenciar(voz.mudo), [voz.mudo, trilha]);

  // #cartas no endereco acompanha o login e o mural
  useEffect(() => {
    const quer = fase === "login" || fase === "cartas" ? "#cartas" : "";
    if (window.location.hash !== quer) {
      window.history.replaceState(null, "", quer || window.location.pathname + window.location.search);
    }
  }, [fase]);

  // voltar para a tela inicial apaga as velas e volta ao castelo: o ritual recomeca
  useEffect(() => {
    if (fase !== "abertura") return;
    setVelasAcesas(false);
    setSaiuDoCastelo(false);
    setChegouVoando(false);
    setAparicao("visivel");
  }, [fase]);

  // a cor da casa tinge a interface na revelacao
  useEffect(() => {
    if (fase === "revelacao" && DESPEDIDA.casa) document.body.dataset["house"] = DESPEDIDA.casa;
    else delete document.body.dataset["house"];
  }, [fase]);

  /* ---------- a cerimonia inteira ---------- */
  const cerimonia = useCallback(async (vindoDoVoo = false): Promise<void> => {
    const id = ++execucao.current;
    const vivo = (): boolean => execucao.current === id;

    setAcordado(false);
    setTrecho(0);
    if (vindoDoVoo) {
      // o voo termina no salao vazio ao luar: corte seco para a cena ao vivo.
      // O banquinho e o Chapeu surgem do po de ouro, ele desce flutuando e,
      // quando pousa, as velas acendem em onda e ele acorda
      setChegouVoando(true);
      setAparicao("surgindo");
      setFase("cerimonia");
      setVisivel(true);
      await esperar(POUSO_CHAPEU_MS - 120);
      if (!vivo()) return;
      setVelasAcesas(true);
      await esperar(1700);
    } else {
      await irPara("cerimonia");
      // a camera desce do teto; o Chapeu acorda quando ela chega
      await esperar(ENTRADA_CAMERA_MS * 0.82);
    }
    if (!vivo()) return;
    setAcordado(true);
    await esperar(1100);

    for (let i = 0; i < DESPEDIDA.falas.length; i++) {
      if (!vivo()) return;
      const fala = DESPEDIDA.falas[i]!;
      setTrecho(i);
      await voz.falar(comNome(fala.texto), fala.audio);
      await esperar(fala.pausaDepois ?? PAUSA_FALAS_MS);
    }
    if (!vivo()) return;

    const casa = DESPEDIDA.casa;
    if (casa) {
      await irPara("selecao");
      await esperar(500);
      setMostrarPular(false);
      const t = setTimeout(() => setMostrarPular(true), SKIP_AFTER_MS);
      await Promise.all([voz.tocar(HOUSES[casa].audio, RESULT_FALLBACK_MS), esperar(2800)]);
      clearTimeout(t);
      setMostrarPular(false);
      if (!vivo()) return;
    }
    await irPara("revelacao");
  }, [irPara, voz]);

  // com o video do voo, quem comeca a cerimonia e o fim do voo (fimDoVoo)
  const entrar = useCallback((): void => {
    trilha.iniciar();
    if (!videos?.voo) void cerimonia();
  }, [trilha, cerimonia, videos]);

  const acenderVelas = useCallback((): void => {
    if (videos?.voo) {
      setAparicao("escondido");
      setVoando(true);
      return;
    }
    setSaiuDoCastelo(true);
    setVelasAcesas(true);
  }, [videos]);

  const fimDoVoo = useCallback((): void => {
    setVoando(false);
    void cerimonia(true);
  }, [cerimonia]);

  const irParaCartas = useCallback((): void => {
    trilha.iniciar();
    setVelasAcesas(true);
    execucao.current++;
    voz.pular();
    void irPara(jaEntrou() ? "cartas" : "login");
  }, [trilha, voz, irPara]);

  const entrouNoCorujal = useCallback((): void => {
    try {
      window.sessionStorage.setItem(CHAVE_SESSAO, "1");
    } catch {
      /* sem armazenamento: pede o login de novo na proxima vez */
    }
    trilha.efeito("revelacao");
    void irPara("cartas");
  }, [trilha, irPara]);

  const sair = useCallback((): void => {
    try {
      window.sessionStorage.removeItem(CHAVE_SESSAO);
    } catch {
      /* ignora */
    }
    void irPara("abertura");
  }, [irPara]);

  /* ---------- a cara do Chapeu ---------- */
  const fala = DESPEDIDA.falas[trecho];
  const humor: Humor =
    fase === "abertura" || (fase === "cerimonia" && !acordado)
      ? "dormindo"
      : fase === "cerimonia"
        ? fala?.humor ?? "neutro"
        : fase === "selecao"
          ? "pensativo"
          : fase === "revelacao"
            ? "triunfante"
            : "satisfeito";

  return (
    <>
      <BotaoTelaCheia />
      <Cenario
        fase={fase}
        casa={DESPEDIDA.casa}
        humor={humor}
        falando={voz.falando}
        lerNivel={voz.nivelVoz}
        lerLarg={voz.largVoz}
        lerProgresso={voz.progressoVoz}
        velasAcesas={velasAcesas}
        onPronto={() => setCenaPronta(true)}
        // a carta de login fica na frente do castelo em loop
        etapaVideo={fase === "login" ? "castelo" : fase !== "abertura" ? "fim" : voando ? "voo" : saiuDoCastelo ? "fim" : "castelo"}
        onVideos={setVideos}
        onFimVoo={fimDoVoo}
        // o mural tem os proprios videos (as nuvens) cobrindo a tela inteira
        esconder3d={fase === "cartas" || (!!videos?.castelo && ((fase === "abertura" && !voando && !saiuDoCastelo) || fase === "login"))}
        cortarCamera={chegouVoando}
        aparicao={aparicao}
      />
      <main id="app" data-fase={fase}>
        <section className={`screen${visivel ? " is-active" : ""}`}>
          {fase === "abertura" && (
            <Abertura
              pronto={cenaPronta && videos !== null}
              comCastelo={!!videos?.castelo}
              onPrimeiroToque={trilha.iniciar}
              onAcender={acenderVelas}
              onEntrar={entrar}
              onIrParaCartas={irParaCartas}
            />
          )}

          {fase === "cerimonia" && fala && acordado && (
            <Legenda
              texto={comNome(fala.texto)}
              lerProgresso={voz.progressoVoz}
            />
          )}

          {fase === "selecao" && (
            <div className="selecao">
              <p className="selecao-texto">
                Hmm<span className="reticencias"><i>.</i><i>.</i><i>.</i></span>
              </p>
              <button
                type="button"
                className={`btn btn-ghost btn-pular${mostrarPular ? " on" : ""}`}
                onClick={voz.pular}
                tabIndex={mostrarPular ? 0 : -1}
              >
                Revelar agora ›
              </button>
            </div>
          )}

          {fase === "revelacao" && <Revelacao casa={DESPEDIDA.casa} onAbrirCartas={irParaCartas} />}

          {fase === "login" && <Login onEntrar={entrouNoCorujal} onVoltar={() => void irPara("abertura")} />}

          {fase === "cartas" && (
            <Cartas onSair={sair} onCartaAberta={() => trilha.efeito("carta")} />
          )}
        </section>
      </main>
    </>
  );
}
