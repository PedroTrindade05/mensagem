import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { DESPEDIDA } from "../data/despedida";
import { assetUrl } from "../config";

/** A foto do pergaminho, cortada em tercos pelo CSS (.lc-frente / .lc-verso). */
const FOTO_CARTA = { "--foto": `url("${assetUrl("img/carta-pergaminho.webp")}")` } as CSSProperties;

gsap.registerPlugin(useGSAP);

/* =========================================================================
   LOGIN - a carta do Correio Coruja
   -------------------------------------------------------------------------
   A carta e uma foto de pergaminho (public/img/carta-pergaminho.webp),
   cortada nas proprias dobras: cada terco e um painel que dobra de verdade.
   Ela chega dobrada, desdobra na frente da pessoa (primeiro a aba de cima,
   depois a de baixo), e o texto e os campos ficam nos espacos vazios de
   cada terco, com a tinta "entrando" no papel. O lacre e o da foto.

   Confere usuario e senha de DESPEDIDA.acesso. O usuario ignora acentos e
   maiusculas; a senha ignora so maiusculas e espacos nas pontas.
   ========================================================================= */

const normalizar = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

function semMovimento(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface LoginProps {
  onEntrar: () => void;
  onVoltar: () => void;
}

export default function Login({ onEntrar, onVoltar }: LoginProps) {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState(0);
  const [abrindo, setAbrindo] = useState(false);
  const [tremendo, setTremendo] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const raiz = useRef<HTMLDivElement>(null);

  /* ---------- a carta chega dobrada e se abre ---------- */
  useGSAP(
    () => {
      if (semMovimento()) {
        gsap.from(".lc", { autoAlpha: 0, duration: 0.6 });
        return;
      }
      const tl = gsap.timeline({ defaults: { ease: "power3.inOut" } });
      tl.from(".lc", { y: -120, rotate: -7, scale: 0.86, autoAlpha: 0, duration: 1.1, ease: "power3.out" })
        // a aba de cima foi a ultima a ser dobrada: abre primeiro
        .from(".lc-topo", { rotateX: -179, duration: 1.05 }, "-=0.25")
        .from(".lc-base", { rotateX: 179, duration: 1.05 }, "-=0.45")
        .from(".lc-topo .lc-frente > *, .lc-meio .lc-frente > *, .lc-base .lc-frente > *", {
          autoAlpha: 0,
          y: 6,
          duration: 0.7,
          stagger: 0.05,
          ease: "power2.out",
        }, "-=0.5")
        .set([".lc-topo", ".lc-base"], { clearProps: "transform" });
    },
    { scope: raiz }
  );

  // o cursor vai para o primeiro campo quando a carta termina de abrir
  useEffect(() => {
    const t = setTimeout(() => campo.current?.focus({ preventScroll: true }), semMovimento() ? 400 : 2600);
    return () => clearTimeout(t);
  }, []);

  const enviar = (e: FormEvent): void => {
    e.preventDefault();
    if (abrindo) return;
    const { acesso } = DESPEDIDA;
    const ok =
      normalizar(usuario) === normalizar(acesso.usuario) && senha.trim().toLowerCase() === acesso.senha.trim().toLowerCase();
    if (!ok) {
      setErro((n) => n + 1);
      // reinicia o tremor mesmo em erros seguidos, sem perder o foco do campo
      setTremendo(false);
      requestAnimationFrame(() => setTremendo(true));
      return;
    }
    setAbrindo(true);
    setTimeout(onEntrar, 1500);
  };

  return (
    <div className="login" ref={raiz}>
      <form
        className={`lc${tremendo ? " tremer" : ""}${abrindo ? " abrindo" : ""}`}
        style={FOTO_CARTA}
        onSubmit={enviar}
        onAnimationEnd={() => setTremendo(false)}
        noValidate
      >
        <div className="lc-folha">
          {/* terco de cima: o cabecalho e a saudacao */}
          <section className="lc-painel lc-topo">
            <div className="lc-frente">
              <p className="lc-cabecalho">
                <span aria-hidden="true">✦</span>
                Correio Coruja
                <span aria-hidden="true">✦</span>
              </p>
              <p className="lc-endereco">Para a Srta. {DESPEDIDA.nomeCompleto}</p>
              <h1 className="lc-saudacao">Prezada {DESPEDIDA.nome},</h1>
              <p className="lc-texto">
                As corujas da equipe trouxeram um maço de cartas lacradas para você. Para abri-las, escreva abaixo o seu
                nome e a palavra mágica combinada.
              </p>
            </div>
            <div className="lc-verso" aria-hidden="true" />
          </section>

          {/* terco do meio: os campos, escritos no papel */}
          <section className="lc-painel lc-meio">
            <div className="lc-frente">
              <label className="lc-campo">
                <span>Seu nome</span>
                <input
                  ref={campo}
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                />
              </label>

              <label className="lc-campo">
                <span>Palavra mágica</span>
                <span className="lc-senha">
                  <input
                    type={verSenha ? "text" : "password"}
                    autoComplete="current-password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                  <button
                    type="button"
                    className="lc-olho"
                    aria-label={verSenha ? "Esconder a palavra mágica" : "Mostrar a palavra mágica"}
                    onClick={() => setVerSenha((v) => !v)}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                      <path
                        d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                      <circle cx="12" cy="12" r="3" fill="currentColor" />
                      {verSenha ? null : <path d="M4 20L20 4" stroke="currentColor" strokeWidth="1.6" />}
                    </svg>
                  </button>
                </span>
              </label>

              <p className="lc-erro" role="alert">
                {erro > 0 && (
                  <>
                    Esse feitiço não funcionou, tente outra vez.
                    {DESPEDIDA.acesso.dica && erro > 1 && <span className="lc-dica">Dica: {DESPEDIDA.acesso.dica}</span>}
                  </>
                )}
              </p>
            </div>
          </section>

          {/* terco de baixo: o botao, a assinatura e o lacre */}
          <section className="lc-painel lc-base">
            <div className="lc-frente">
              <button type="submit" className="lc-enviar" disabled={abrindo}>
                {abrindo ? "Quebrando o lacre…" : "Quebrar o lacre"}
              </button>
              <div className="lc-assinatura">
                <span>Com carinho,</span>
                <strong>A Equipe</strong>
              </div>
              {/* o lacre e o da foto: este brilho acende em cima dele ao abrir */}
              <span className="lc-lacre-brilho" aria-hidden="true" />
            </div>
            <div className="lc-verso" aria-hidden="true" />
          </section>
        </div>

        <button type="button" className="lc-voltar" onClick={onVoltar}>
          ‹ Voltar ao salão
        </button>
      </form>
    </div>
  );
}
