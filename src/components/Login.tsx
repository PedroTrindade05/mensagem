import { useEffect, useRef, useState, type FormEvent } from "react";
import { DESPEDIDA } from "../data/despedida";

/* =========================================================================
   LOGIN - o Correio Coruja so abre para a dona das cartas
   -------------------------------------------------------------------------
   Confere usuario e senha de DESPEDIDA.acesso. O usuario ignora acentos e
   maiusculas; a senha ignora so maiusculas e espacos nas pontas.
   ========================================================================= */

const normalizar = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

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

  useEffect(() => {
    const t = setTimeout(() => campo.current?.focus(), 500);
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
    <div className="login">
      <form
        className={`login-carta${tremendo ? " tremer" : ""}${abrindo ? " abrindo" : ""}`}
        onSubmit={enviar}
        onAnimationEnd={() => setTremendo(false)}
        noValidate
      >
        <div className="login-selo" aria-hidden="true">
          <span>{DESPEDIDA.nome.charAt(0).toUpperCase()}</span>
        </div>
        <p className="eyebrow">Correio Coruja</p>
        <h1 className="login-titulo">Suas cartas esperam</h1>
        <p className="login-sub">Diga quem você é e o feitiço que abre o corujal.</p>

        <label className="campo">
          <span>Nome de bruxa</span>
          <input
            ref={campo}
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="Seu nome"
          />
        </label>

        <label className="campo">
          <span>Palavra mágica</span>
          <div className="campo-senha">
            <input
              type={verSenha ? "text" : "password"}
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
            />
            <button
              type="button"
              className="olho"
              aria-label={verSenha ? "Esconder senha" : "Mostrar senha"}
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
          </div>
        </label>

        <p className="login-erro" role="alert">
          {erro > 0 && (
            <>
              Esse feitiço não funcionou… tente outra vez.
              {DESPEDIDA.acesso.dica && erro > 1 && <em> Dica: {DESPEDIDA.acesso.dica}</em>}
            </>
          )}
        </p>

        <button type="submit" className="btn btn-primary btn-largo" disabled={abrindo}>
          {abrindo ? "Abrindo o corujal…" : "Abrir o corujal"}
        </button>
        <button type="button" className="link-discreto" onClick={onVoltar}>
          ‹ Voltar ao Salão
        </button>
      </form>
    </div>
  );
}
