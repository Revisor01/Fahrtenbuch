import React, { useEffect, useState } from 'react';
import { Building2, RefreshCw } from 'lucide-react';
import { AuthLogo } from './LoginPage';
import { ladeInstanzen } from '../api/instanzen';
import { setApiBaseUrl } from '../api/client';

// Erster Start der App: Auswahl des Kirchenkreises, gegen dessen Server die
// Anmeldung laeuft. Erscheint ausschliesslich in der nativen Huelle — im Web
// kennt die App ihren Server bereits (relative Pfade).
//
// Layout bewusst im bestehenden Auth-Look (Petrol-Vollflaeche + Karte), damit
// der Uebergang zur direkt folgenden Anmeldung nicht springt.
function InstanzAuswahl({ onGewaehlt, aktuelleUrl }) {
  const [instanzen, setInstanzen] = useState([]);
  const [quelle, setQuelle] = useState(null);
  const [laedt, setLaedt] = useState(true);
  const [ausgewaehlt, setAusgewaehlt] = useState(null);

  const holen = React.useCallback((signal) => {
    setLaedt(true);
    return ladeInstanzen({ signal })
      .then(({ instanzen: liste, quelle: woher }) => {
        setInstanzen(liste);
        setQuelle(woher);
        // Bei genau einer Instanz ist die Wahl offensichtlich — vorauswaehlen,
        // damit nur noch bestaetigt werden muss.
        setAusgewaehlt((vorher) => vorher ?? (liste.length === 1 ? liste[0].id : null));
      })
      .catch((error) => {
        // Nur der Abbruch beim Unmount landet hier (ladeInstanzen faengt sonst alles).
        if (error?.name !== 'AbortError') console.error('Instanzen konnten nicht geladen werden:', error);
      })
      .finally(() => {
        if (!signal?.aborted) setLaedt(false);
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    holen(controller.signal);
    return () => controller.abort();
  }, [holen]);

  const uebernehmen = () => {
    const instanz = instanzen.find((i) => i.id === ausgewaehlt);
    if (!instanz) return;
    setApiBaseUrl(instanz.apiUrl);
    onGewaehlt?.(instanz);
  };

  return (
    <div className="auth-page">
      <div className="auth-box">
        <AuthLogo />
        <h1 className="auth-titel">Kirchenkreis wählen</h1>
        <div className="auth-sub">
          Wähle dein Fahrtenbuch. Die Anmeldung läuft danach gegen diesen Server.
        </div>

        <div className="auth-card">
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
                        <span className="set-option-titel">{instanz.name}</span>
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
                onClick={uebernehmen}
                disabled={!ausgewaehlt}
              >
                Weiter zur Anmeldung
              </button>

              {quelle === 'fallback' && (
                <div className="auth-links" style={{ justifyContent: 'center' }}>
                  <button type="button" className="auth-link" onClick={() => holen()}>
                    <RefreshCw size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
                    Erneut laden
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {aktuelleUrl && (
          <div className="auth-foot">Aktuell: {aktuelleUrl.replace(/^https?:\/\//, '')}</div>
        )}
      </div>
    </div>
  );
}

export default InstanzAuswahl;
