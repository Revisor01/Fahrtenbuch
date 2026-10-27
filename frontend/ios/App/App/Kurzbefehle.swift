import Foundation
import UIKit
import WebKit
import Capacitor

// Kurzbefehle am App-Symbol als Ereignis in die WebView, ohne Plugin, weil Capacitor 8 nur Plugins aus CapApp-SPM lädt; beim Kaltstart gepuffert.
enum Kurzbefehle {
    private static var offenerTyp: String?
    private static weak var webView: WKWebView?

    // Aus dem SceneDelegate: Kaltstart und Betrieb.
    static func melde(_ typ: String) {
        offenerTyp = typ
        sendeFallsMoeglich()
    }

    // Die WebView steht erst nach `willConnectTo` fest.
    static func verbinde(_ view: WKWebView?) {
        webView = view
        sendeFallsMoeglich()
    }

    private static func sendeFallsMoeglich() {
        guard let typ = offenerTyp, let view = webView else { return }

        // Zusätzlich als `window.__kurzbefehl`, weil der React-Listener nach dem Laden noch fehlen kann.
        let sicher = typ.replacingOccurrences(of: "'", with: "")
        let js = """
        window.__kurzbefehl = '\(sicher)';
        window.dispatchEvent(new CustomEvent('kurzbefehl', { detail: '\(sicher)' }));
        """

        view.evaluateJavaScript(js) { _, fehler in
            if fehler == nil {
                offenerTyp = nil
            }
            // Bei Fehler bleibt der Wert für den nächsten Versuch stehen.
        }
    }

    // Beim Kaltstart ist die WebView noch leer.
    static func erneutVersuchen() {
        sendeFallsMoeglich()
    }
}
