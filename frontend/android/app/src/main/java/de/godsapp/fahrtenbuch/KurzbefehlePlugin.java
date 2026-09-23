package de.godsapp.fahrtenbuch;

import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Kurzbefehle beim langen Tippen auf das App-Symbol (Android).
 *
 * Gegenstueck zu ios/App/App/Kurzbefehle.swift. Auf iOS gab es die Eintraege
 * schon, auf Android fehlten sie komplett — dieselbe App fuehlte sich auf
 * beiden Plattformen unterschiedlich an.
 *
 * Die Eintraege stehen in res/xml/kurzbefehle.xml und tragen dieselben
 * Typ-Kennungen wie die Info.plist auf iOS. Damit sieht das JavaScript in
 * utils/kurzbefehle.js auf beiden Plattformen denselben Wert und braucht
 * keine Fallunterscheidung.
 *
 * Warum ein Capacitor-Plugin und nicht der evaluateJavaScript-Weg wie auf
 * iOS: Dort scheitert die Plugin-Registrierung an Capacitor 8 (nur Plugins
 * aus dem generierten SPM-Paket werden geladen, siehe Kommentar in
 * Kurzbefehle.swift). Auf Android gibt es diese Einschraenkung nicht —
 * registerPlugin in der MainActivity genuegt, wie bereits bei MaterialNav.
 *
 * Kalt- und Warmstart laufen ueber denselben Hook: BridgeActivity.load()
 * ruft onNewIntent(getIntent()) auch beim ersten Start. Das Ereignis wird mit
 * retainUntilConsumed gemeldet, damit ein Kurzbefehl beim Kaltstart nicht
 * verlorengeht, bevor die WebView zuhoert — auf iOS loest ein eigener Puffer
 * (window.__kurzbefehl) dasselbe Problem von Hand.
 */
@CapacitorPlugin(name = "Kurzbefehle")
public class KurzbefehlePlugin extends Plugin {

    private static final String PRAEFIX = "de.godsapp.fahrtenbuch.";
    private static final String EREIGNIS = "kurzbefehl";

    /**
     * Zuletzt gemeldeter, noch nicht abgeholter Kurzbefehl. Noetig fuer den
     * Kaltstart: Das Ereignis feuert, bevor JavaScript einen Listener hat.
     */
    private String offener = null;

    /** Beim Start: Der Intent liegt schon vor, bevor JavaScript zuhoert. */
    @Override
    public void load() {
        melde(getActivity() != null ? getActivity().getIntent() : null);
    }

    /** Laufende App: Android liefert den Kurzbefehl als neuen Intent nach. */
    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        melde(intent);
    }

    /**
     * Abholen aus JavaScript, falls das Ereignis vor dem Anmelden des
     * Listeners kam. Spiegelt offenenKurzbefehlAbholen() auf der JS-Seite.
     */
    @PluginMethod
    public void offenen(PluginCall call) {
        JSObject antwort = new JSObject();
        antwort.put("typ", offener);
        offener = null;
        call.resolve(antwort);
    }

    private void melde(Intent intent) {
        if (intent == null) return;
        String aktion = intent.getAction();
        // Nur eigene Aktionen: MAIN/LAUNCHER und alles andere geht uns nichts
        // an. Der Praefix-Vergleich verhindert zugleich, dass eine fremde App
        // ueber einen erfundenen Intent ein Ereignis ausloest.
        if (aktion == null || !aktion.startsWith(PRAEFIX)) return;

        // Aktion entfernen, sonst meldet ein Wechsel in den Vordergrund
        // denselben Kurzbefehl noch einmal.
        intent.setAction(null);

        offener = aktion;
        JSObject daten = new JSObject();
        daten.put("typ", aktion);
        notifyListeners(EREIGNIS, daten, true);
    }
}
