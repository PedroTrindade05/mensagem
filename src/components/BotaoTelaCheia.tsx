import { useTelaCheia } from "../hooks/useTelaCheia";

/* =========================================================================
   BOTAO DE TELA CHEIA - canto superior direito, em todas as telas
   -------------------------------------------------------------------------
   Liga e desliga a tela cheia (a tecla F faz o mesmo). Onde o navegador nao
   oferece tela cheia para paginas (iPhone), o botao nem aparece.
   ========================================================================= */

export default function BotaoTelaCheia() {
  const { disponivel, ativa, alternar } = useTelaCheia();
  if (!disponivel) return null;

  return (
    <button
      type="button"
      className="btn-tela-cheia"
      onClick={alternar}
      aria-pressed={ativa}
      aria-label={ativa ? "Sair da tela cheia" : "Entrar em tela cheia"}
      title={ativa ? "Sair da tela cheia (F)" : "Tela cheia (F)"}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {ativa ? (
          <path d="M9 4v4a1 1 0 0 1-1 1H4M15 4v4a1 1 0 0 0 1 1h4M9 20v-4a1 1 0 0 0-1-1H4M15 20v-4a1 1 0 0 1 1-1h4" />
        ) : (
          <path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" />
        )}
      </svg>
    </button>
  );
}
