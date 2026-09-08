(function () {
  const CONSENT_KEY = "promptnova_ads_consent";
  const ADSENSE_CLIENT = "ca-pub-7965643620841539";

  window.adsbygoogle = window.adsbygoogle || [];

  function loadAdsense() {
    if (document.querySelector('script[data-promptnova-adsense]')) return;
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    script.crossOrigin = "anonymous";
    script.dataset.promptnovaAdsense = "true";
    document.head.appendChild(script);
  }

  function saveConsent(value) {
    localStorage.setItem(CONSENT_KEY, value);
    document.getElementById("promptnova-consent")?.remove();
    if (value === "accepted") loadAdsense();
    showSettingsButton();
  }

  function showSettingsButton() {
    if (!localStorage.getItem(CONSENT_KEY) || document.getElementById("promptnova-consent-settings")) return;
    const button = document.createElement("button");
    button.id = "promptnova-consent-settings";
    button.type = "button";
    button.textContent = "Privacidad";
    button.setAttribute("aria-label", "Abrir preferencias de privacidad");
    button.addEventListener("click", () => {
      localStorage.removeItem(CONSENT_KEY);
      button.remove();
      showBanner();
    });
    document.body.appendChild(button);
  }

  function showBanner() {
    if (localStorage.getItem(CONSENT_KEY)) {
      if (localStorage.getItem(CONSENT_KEY) === "accepted") loadAdsense();
      return;
    }

    const banner = document.createElement("aside");
    banner.id = "promptnova-consent";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Preferencias de privacidad");
    banner.innerHTML = `
      <div>
        <strong>Privacidad y anuncios</strong>
        <p>Usamos cookies para mostrar anuncios y medir el uso del sitio. Puedes aceptar o rechazar estas cookies. Más información en nuestra <a href="./privacidad.html">política de privacidad</a>.</p>
      </div>
      <div class="promptnova-consent-actions">
        <button type="button" data-consent="rejected">Rechazar</button>
        <button type="button" data-consent="accepted">Aceptar</button>
      </div>`;
    banner.addEventListener("click", (event) => {
      const button = event.target.closest("[data-consent]");
      if (button) saveConsent(button.dataset.consent);
    });
    document.body.appendChild(banner);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      showBanner();
      showSettingsButton();
    });
  } else {
    showBanner();
    showSettingsButton();
  }
})();
