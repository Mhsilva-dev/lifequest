import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import "./install-prompt.css";

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

// Aviso fixo no topo "instalar app": aparece assim que o navegador sinaliza
// que o PWA pode ser instalado (Android/desktop via evento
// beforeinstallprompt) ou, no iOS, com o passo a passo manual (Safari não
// dispara esse evento). Sem botão de fechar de propósito — fica sempre
// visível pra quem acessa pelo navegador, até a pessoa realmente instalar
// (aí some sozinho, pois passa a rodar em modo standalone).
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosTip, setShowIosTip] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    if (isIOS()) {
      setShowIosTip(true);
      return;
    }

    function onBeforeInstallPrompt(e) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  if (!deferredPrompt && !showIosTip) return null;

  return (
    <div className="lq-install-banner" role="banner" aria-label="Instalar aplicativo">
      <div className="lq-install-icon">
        <img src="/icon-192.png" alt="" width={40} height={40} />
      </div>
      <div className="lq-install-text">
        <strong>Pode baixar esse app!</strong>
        <span>
          {showIosTip
            ? "Toque em Compartilhar e depois em \"Adicionar à Tela de Início\"."
            : "Instale o LifeQuest e acesse com um toque, em tela cheia."}
        </span>
      </div>
      {!showIosTip && (
        <button className="lq-install-btn" onClick={install}>
          <Download size={15} /> Instalar
        </button>
      )}
    </div>
  );
}
