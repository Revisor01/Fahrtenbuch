import Foundation
import UIKit
import Capacitor

// Kurzbefehle (langes Tippen auf das App-Symbol) als kleines Capacitor-Plugin.
//
// Bewusst selbst gebaut statt als Fremdabhaengigkeit: Es geht um genau zwei
// statische Eintraege aus der Info.plist, und die JS-Seite braucht davon nur
// eine einzige Nachricht — den Typ des getippten Eintrags.
//
// Der heikle Fall ist der Kaltstart: Tippt jemand den Kurzbefehl, waehrend die
// App nicht laeuft, meldet iOS ihn, bevor die WebView existiert und JavaScript
// einen Listener registrieren konnte. Ein direkt gesendetes Ereignis ginge
// ersatzlos verloren. Deshalb liegt der Typ hier gepuffert, bis die JS-Seite
// ihn mit `letztenAbholen()` abholt — das ist die einzige Stelle, an der er
// verschwindet.
@objc(KurzbefehlePlugin)
public class KurzbefehlePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "KurzbefehlePlugin"
    public let jsName = "Kurzbefehle"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "letztenAbholen", returnType: CAPPluginReturnPromise)
    ]

    // Statisch, weil der Kurzbefehl im SceneDelegate ankommt — also ausserhalb
    // jeder Plugin-Instanz und moeglicherweise, bevor es eine gibt.
    private static var offenerTyp: String?
    private static weak var aktivesPlugin: KurzbefehlePlugin?

    override public func load() {
        KurzbefehlePlugin.aktivesPlugin = self
    }

    // Aufgerufen aus dem SceneDelegate — bei Kaltstart (connectionOptions) und
    // im Betrieb (performActionFor).
    static func melde(_ typ: String) {
        offenerTyp = typ
        // Laeuft die App bereits, ist ein Listener wahrscheinlich vorhanden und
        // die Aktion soll sofort passieren. Der gepufferte Wert bleibt trotzdem
        // stehen: Holt die JS-Seite ihn gleich darauf ab, ist er weg; hoerte
        // gerade niemand zu, geht nichts verloren.
        aktivesPlugin?.notifyListeners("kurzbefehl", data: ["typ": typ])
    }

    @objc func letztenAbholen(_ call: CAPPluginCall) {
        let typ = KurzbefehlePlugin.offenerTyp
        KurzbefehlePlugin.offenerTyp = nil
        call.resolve(["typ": typ as Any])
    }
}
