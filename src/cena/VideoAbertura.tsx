import { useEffect, useRef, useState } from "react";
import { VIDEO_CASTELO, VIDEO_VOO, asset } from "../config";

/* =========================================================================
   VIDEO DA ABERTURA - o castelo a noite e o voo ate o salao
   -------------------------------------------------------------------------
   Dois <video> por cima da cena 3D:
   - castelo: loop mudo atras da tela inicial;
   - voo: toca uma vez quando a pessoa entra, e termina no mesmo quadro em
     que a cena ao vivo comeca (o salao ao luar). No fim ele some num fade
     curto e a cena 3D assume.

   Os arquivos sao opcionais: cada um avisa se carregou ou se falta, e o
   App escolhe o caminho (com ou sem video).
   ========================================================================= */

export type EtapaVideo = "castelo" | "voo" | "fim";

export interface VideosDisponiveis {
  castelo: boolean;
  voo: boolean;
}

interface VideoAberturaProps {
  etapa: EtapaVideo;
  /** Quais videos existem (chamado uma vez cada, quando se sabe). */
  onDisponiveis: (v: VideosDisponiveis) => void;
  /** O voo acabou (ou falhou): a cena ao vivo assume. */
  onFimVoo: () => void;
}

/** O voo some um pouco antes do fim, para a cena ja estar desenhando por baixo. */
const FADE_FINAL_S = 0.6;

type Estado = "carregando" | "ok" | "ausente";

export default function VideoAbertura({ etapa, onDisponiveis, onFimVoo }: VideoAberturaProps) {
  const castelo = useRef<HTMLVideoElement>(null);
  const voo = useRef<HTMLVideoElement>(null);
  const [estado, setEstado] = useState<{ castelo: Estado; voo: Estado }>({ castelo: "carregando", voo: "carregando" });
  const [vooSaindo, setVooSaindo] = useState(false);
  const avisos = useRef({ onDisponiveis, onFimVoo });
  avisos.current = { onDisponiveis, onFimVoo };
  const terminou = useRef(false);

  // quando os dois estados forem conhecidos, avisa o App
  useEffect(() => {
    if (estado.castelo === "carregando" || estado.voo === "carregando") return;
    avisos.current.onDisponiveis({ castelo: estado.castelo === "ok", voo: estado.voo === "ok" });
  }, [estado]);

  // um arquivo que nunca responde conta como ausente
  useEffect(() => {
    const t = setTimeout(() => {
      setEstado((e) => ({
        castelo: e.castelo === "carregando" ? "ausente" : e.castelo,
        voo: e.voo === "carregando" ? "ausente" : e.voo,
      }));
    }, 12000);
    return () => clearTimeout(t);
  }, []);

  // o voo comeca
  useEffect(() => {
    const v = voo.current;
    if (etapa !== "voo" || !v) return;
    terminou.current = false;
    const acabar = (): void => {
      if (terminou.current) return;
      terminou.current = true;
      avisos.current.onFimVoo();
    };
    const tempo = (): void => {
      if (Number.isFinite(v.duration) && v.duration - v.currentTime < FADE_FINAL_S) {
        setVooSaindo(true);
        acabar();
      }
    };
    v.currentTime = 0;
    v.addEventListener("timeupdate", tempo);
    v.addEventListener("ended", acabar);
    v.addEventListener("error", acabar);
    void v.play().catch(acabar);
    return () => {
      v.removeEventListener("timeupdate", tempo);
      v.removeEventListener("ended", acabar);
      v.removeEventListener("error", acabar);
    };
  }, [etapa]);

  // fora da tela inicial o castelo para de decodificar
  useEffect(() => {
    const c = castelo.current;
    if (!c) return;
    if (etapa === "castelo") void c.play().catch(() => {});
    else if (etapa === "fim") c.pause();
  }, [etapa]);

  // o voo cobre o castelo; os dois cruzam num fade curto
  const mostrarCastelo = estado.castelo === "ok" && etapa === "castelo";
  const mostrarVoo = estado.voo === "ok" && etapa === "voo" && !vooSaindo;

  return (
    <div className={`video-abertura${etapa === "fim" ? " fim" : ""}`} aria-hidden="true">
      <video
        ref={castelo}
        className={`video-camada${mostrarCastelo ? " on" : ""}`}
        src={asset(VIDEO_CASTELO)}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        onCanPlay={() => setEstado((e) => (e.castelo === "carregando" ? { ...e, castelo: "ok" } : e))}
        onError={() => setEstado((e) => ({ ...e, castelo: "ausente" }))}
      />
      <video
        ref={voo}
        className={`video-camada video-voo${mostrarVoo ? " on" : ""}`}
        src={asset(VIDEO_VOO)}
        muted
        playsInline
        preload="auto"
        onCanPlay={() => setEstado((e) => (e.voo === "carregando" ? { ...e, voo: "ok" } : e))}
        onError={() => setEstado((e) => ({ ...e, voo: "ausente" }))}
      />
    </div>
  );
}
