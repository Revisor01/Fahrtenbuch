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

        // Kaltstart über einen Kurzbefehl: puffern, bis die WebView steht.
        if let kurzbefehl = connectionOptions.shortcutItem {
            Kurzbefehle.melde(kurzbefehl.type)
        }

        // `loadView` anstoßen, sonst ist `webView` noch nil.
        bridgeController.loadViewIfNeeded()
        Kurzbefehle.verbinde(bridgeController.webView)

        // Zweiter Versuch, bis der React-Listener steht; zugestellt wird nur einmal.
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
            Kurzbefehle.erneutVersuchen()
        }

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    // Die App lief schon, das Ereignis geht sofort raus.
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
