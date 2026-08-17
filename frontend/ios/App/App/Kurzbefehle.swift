import Foundation
import UIKit
import WebKit
import Capacitor

// Kurzbefehle (langes Tippen auf das App-Symbol).
//
// Bewusst KEIN Capacitor-Plugin: Capacitor 8 registriert ausschliesslich
// Plugins aus dem generierten SPM-Paket (`CapApp-SPM/Package.swift`, „DO NOT
// MODIFY", plus `packageClassList` in capacitor.config.json — beide erzeugt
// `npx cap sync` aus den npm-Abhaengigkeiten). Eine Plugin-Klasse, die nur im
// App-Target liegt, wird deshalb nie geladen: `window.Capacitor.Plugins`
// kannte sie nicht, und Build 17 zeigte beide Kurzbefehle wirkungslos.
//
// Stattdessen der direkte Weg: Der Typ wird als Ereignis in die WebView
// geschrieben. Das braucht keine Registrierung und keine generierte Datei.
//
// Der heikle Fall bleibt der Kaltstart — iOS meldet den Kurzbefehl, bevor die
// WebView Inhalt hat. Deshalb wird der Wert gepuffert und erst gesendet, wenn
// die Seite geladen ist; bis dahin liegt er auch als `window.__kurzbefehl`
// bereit, falls die JS-Seite zuerst nachsieht.
enum Kurzbefehle {
    private static var offenerTyp: String?
    private static weak var webView: WKWebView?

    // Aus dem SceneDelegate: Kaltstart (connectionOptions) und Betrieb
    // (performActionFor).
    static func melde(_ typ: String) {
        offenerTyp = typ
        sendeFallsMoeglich()
    }

    // Die WebView steht erst nach `willConnectTo` fest; ab da kann gesendet
    // werden.
    static func verbinde(_ view: WKWebView?) {
        webView = view
        sendeFallsMoeglich()
    }

    private static func sendeFallsMoeglich() {
        guard let typ = offenerTyp, let view = webView else { return }

        // `isLoading` allein genuegt nicht: Auch nach dem Laden braucht die
        // React-Seite einen Moment, bis ihr Listener steht. Der Wert bleibt
        // deshalb zusaetzlich als `window.__kurzbefehl` liegen, bis die
        // JS-Seite ihn abholt.
        let sicher = typ.replacingOccurrences(of: "'", with: "")
        let js = """
        window.__kurzbefehl = '\(sicher)';
        window.dispatchEvent(new CustomEvent('kurzbefehl', { detail: '\(sicher)' }));
        """

        view.evaluateJavaScript(js) { _, fehler in
            if fehler == nil {
                offenerTyp = nil
            }
            // Bei Fehler bleibt der Wert stehen — der naechste Versuch
            // (spaetestens beim Wechsel in den Vordergrund) sendet erneut.
        }
    }

    // Nach dem Laden der Seite erneut versuchen: Beim Kaltstart ist die
    // WebView beim Eintreffen des Kurzbefehls noch leer.
    static func erneutVersuchen() {
        sendeFallsMoeglich()
    }
}
