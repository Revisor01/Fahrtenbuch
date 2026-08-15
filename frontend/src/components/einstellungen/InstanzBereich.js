import React, { useContext, useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import BereichKopf from './BereichKopf';
import { AppContext } from '../../contexts/AppContext';
import { useToast } from '../ui/Toast';
import { ladeInstanzen } from '../../api/instanzen';
import { getApiBaseUrl, setApiBaseUrl } from '../../api/client';

// Wechsel des Kirchenkreises in der App. Nur nativ eingebunden (siehe
// EinstellungenView) — im Web gibt es nichts zu wechseln.
//
// SICHERHEIT: Der Wechsel meldet zwingend ab. Das Token gilt nur bei der
// Instanz, die es ausgestellt hat; es nach dem Wechsel liegen zu lassen hiesse,
// die Anmeldedaten des einen Kirchenkreises an den anderen zu schicken.
function InstanzBereich() {
  const { logout } = useContext(AppContext);
  const toast = useToast();

  const [instanzen, setInstanzen] = useState([]);
  const [quelle, setQuelle] = useState(null);
  const [laedt, setLaedt] = useState(true);
  const aktuelleUrl = getApiBaseUrl();
  const [ausgewaehlt, setAusgewaehlt] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    ladeInstanzen({ signal: controller.signal })
      .then(({ instanzen: liste, quelle: woher }) => {
        setInstanzen(liste);
        setQuelle(woher);
        const treffer = liste.find((i) => i.apiUrl === aktuelleUrl);
        setAusgewaehlt(treffer ? treffer.id : null);
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') console.error('Instanzen konnten nicht geladen werden:', error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLaedt(false);
      });
    return () => controller.abort();
  }, [aktuelleUrl]);

  const wechseln = () => {
    const instanz = instanzen.find((i) => i.id === ausgewaehlt);
    if (!instanz || instanz.apiUrl === aktuelleUrl) return;
    setApiBaseUrl(instanz.apiUrl);
    // Erst die Basis umstellen, dann abmelden: logout() raeumt Token und
    // Nutzerdaten weg, danach landet die App wieder auf der Anmeldung — jetzt
    // gegen den neu gewaehlten Kirchenkreis.
    logout();
    toast.success(`Gewechselt zu ${instanz.name}. Bitte neu anmelden.`);
  };

  const wechselMoeglich = Boolean(
    ausgewaehlt && instanzen.find((i) => i.id === ausgewaehlt)?.apiUrl !== aktuelleUrl
  );

  return (
    <div>
      <BereichKopf
        titel="Kirchenkreis"
        satz="Bestimmt, gegen welches Fahrtenbuch die App arbeitet. Ein Wechsel meldet dich ab."
      />

      {laedt && <p className="auth-hinweis" style={{ margin: 0 }}>Liste wird geladen …</p>}

      {!laedt && (
        <>
          {quelle === 'fallback' && (
            <div className="status-error" style={{ marginBottom: 16 }}>
              Die Liste konnte nicht geladen werden — bitte Internetverbindung prüfen.
              Angezeigt werden die in der App hinterlegten Kirchenkreise.
            </div>
          )}

          <div className="set-optionen" role="radiogroup" aria-label="Kirchenkreis">
            {instanzen.map((instanz) => {
              const aktiv = ausgewaehlt === instanz.id;
              const istAktuell = instanz.apiUrl === aktuelleUrl;
              return (
                <button
                  key={instanz.id}
                  type="button"
                  role="radio"
                  aria-checked={aktiv}
                  className={`set-option${aktiv ? ' is-active' : ''}`}
                  onClick={() => setAusgewaehlt(instanz.id)}
                >
                  <span className="set-option-icon" aria-hidden="true">
                    <Building2 size={19} />
                  </span>
                  <span className="set-option-main">
                    <span className="set-option-titel">
                      {instanz.name}{istAktuell ? ' · aktiv' : ''}
                    </span>
                    <span className="set-option-text" style={{ display: 'block' }}>
                      {instanz.apiUrl.replace(/^https?:\/\//, '')}
                    </span>
                  </span>
                  <span className="set-option-radio" aria-hidden="true">
                    {aktiv && <span className="set-option-radio-dot" />}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="auth-btn"
            style={{ marginTop: 20 }}
            onClick={wechseln}
            disabled={!wechselMoeglich}
          >
            Wechseln und abmelden
          </button>
        </>
      )}
    </div>
  );
}

export default InstanzBereich;
