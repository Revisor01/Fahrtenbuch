import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = CAPBridgeViewController()
        window?.makeKeyAndVisible()

        // Kaltstart ueber einen Kurzbefehl: Der Typ wird nur gepuffert, nicht
        // gesendet — die WebView existiert hier erst seit einem Augenblick und
        // hoert noch nicht zu. Die JS-Seite holt ihn ab, sobald sie bereit ist.
        if let kurzbefehl = connectionOptions.shortcutItem {
            KurzbefehlePlugin.melde(kurzbefehl.type)
        }

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    // Die App lief bereits (Vorder- oder Hintergrund) — hier greift der
    // Listener direkt.
    func windowScene(_ windowScene: UIWindowScene,
                     performActionFor shortcutItem: UIApplicationShortcutItem,
                     completionHandler: @escaping (Bool) -> Void) {
        KurzbefehlePlugin.melde(shortcutItem.type)
        completionHandler(true)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
