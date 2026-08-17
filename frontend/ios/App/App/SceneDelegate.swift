import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        let bridgeController = CAPBridgeViewController()
        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = bridgeController
        window?.makeKeyAndVisible()

        // Kaltstart ueber einen Kurzbefehl: Der Typ wird gepuffert, die WebView
        // hat hier noch keinen Inhalt. Gesendet wird, sobald sie steht.
        if let kurzbefehl = connectionOptions.shortcutItem {
            Kurzbefehle.melde(kurzbefehl.type)
        }

        // Die WebView entsteht erst mit der View des Controllers — `loadView`
        // anstossen, sonst ist `webView` hier noch nil.
        bridgeController.loadViewIfNeeded()
        Kurzbefehle.verbinde(bridgeController.webView)

        // Beim Kaltstart braucht die React-Seite nach dem Laden einen Moment,
        // bis ihr Listener steht. Ein zweiter Versuch nach kurzer Zeit kostet
        // nichts und deckt genau dieses Fenster ab; der Wert wird nur einmal
        // zugestellt.
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
            Kurzbefehle.erneutVersuchen()
        }

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    // Die App lief bereits (Vorder- oder Hintergrund) — die WebView steht, das
    // Ereignis geht sofort raus.
    func windowScene(_ windowScene: UIWindowScene,
                     performActionFor shortcutItem: UIApplicationShortcutItem,
                     completionHandler: @escaping (Bool) -> Void) {
        Kurzbefehle.melde(shortcutItem.type)
        completionHandler(true)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
