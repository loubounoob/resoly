import UIKit
import Capacitor
import Firebase
import FirebaseMessaging
import CoreLocation
import UserNotifications
import FacebookCore
import AppTrackingTransparency

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, MessagingDelegate, CLLocationManagerDelegate {

    var window: UIWindow?
    var locationManager: CLLocationManager?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions
        launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        FirebaseApp.configure()
        Messaging.messaging().delegate = self
        setupGeofencing()

        // Facebook SDK
        Settings.shared.isAdvertiserIDCollectionEnabled = true
        ApplicationDelegate.shared.application(
            application,
            didFinishLaunchingWithOptions: launchOptions
        )

        return true
    }

    // MARK: - Geofencing natif

    func syncGeofenceFromWebView() {
        guard let rootVC = window?.rootViewController as? CAPBridgeViewController,
              let webView = rootVC.webView else { return }

        let js = """
        JSON.stringify({
            lat: localStorage.getItem('gym_latitude'),
            lon: localStorage.getItem('gym_longitude'),
            country: localStorage.getItem('resoly_country'),
            challenge: localStorage.getItem('gym_has_challenge')
        })
        """

        webView.evaluateJavaScript(js) { [weak self] result, _ in
            guard let jsonStr = result as? String,
                  let data = jsonStr.data(using: .utf8),
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let latStr = json["lat"] as? String,
                  let lonStr = json["lon"] as? String,
                  let lat = Double(latStr),
                  let lon = Double(lonStr) else { return }

            let country = json["country"] as? String ?? "FR"
            let challenge = json["challenge"] as? String ?? "0"
            let defaults = UserDefaults.standard
            defaults.set(latStr, forKey: "resoly_gym_lat")
            defaults.set(lonStr, forKey: "resoly_gym_lon")
            defaults.set(country, forKey: "resoly_country_native")
            defaults.set(challenge, forKey: "resoly_gym_has_challenge")
            print("[Geofence] Sync: \(lat), \(lon) — défi actif: \(challenge)")
            self?.setupGeofencing()
        }
    }

    func setupGeofencing() {
        let defaults = UserDefaults.standard
        guard let latStr = defaults.string(forKey: "resoly_gym_lat"),
              let lonStr = defaults.string(forKey: "resoly_gym_lon"),
              let lat = Double(latStr),
              let lon = Double(lonStr) else {
            print("[Geofence] Pas encore de coordonnées en UserDefaults")
            return
        }

        if locationManager == nil {
            locationManager = CLLocationManager()
            locationManager?.delegate = self
        }
        locationManager?.requestAlwaysAuthorization()

        locationManager?.monitoredRegions
            .filter { $0.identifier == "resoly_gym_region" }
            .forEach { locationManager?.stopMonitoring(for: $0) }

        let center = CLLocationCoordinate2D(latitude: lat, longitude: lon)
        let region = CLCircularRegion(center: center, radius: 100, identifier: "resoly_gym_region")
        region.notifyOnEntry = true
        region.notifyOnExit = false
        locationManager?.startMonitoring(for: region)
        print("[Geofence] ✅ Zone active: \(lat), \(lon)")
    }

    func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
        guard region.identifier == "resoly_gym_region" else { return }

        let defaults = UserDefaults.standard

        // Vérifie qu'il y a un défi actif
        guard defaults.string(forKey: "resoly_gym_has_challenge") == "1" else {
            print("[Geofence] Pas de défi actif, notif ignorée")
            return
        }

        // Vérifie si déjà notifié aujourd'hui
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let today = formatter.string(from: Date())
        if defaults.string(forKey: "resoly_gym_last_notified") == today { return }
        defaults.set(today, forKey: "resoly_gym_last_notified")

        // Détermine la langue
        let country = defaults.string(forKey: "resoly_country_native") ?? "FR"
        var notifTitle = ""
        var notifBody = ""
        if country == "DE" || country == "CH" {
            notifTitle = "🏋️ Du bist im Gym!"
            notifBody = "Vergiss nicht, dein Foto zu machen — so sicherst du deine Serie und verlierst keinen Einsatz!"
        } else if country == "FR" {
            notifTitle = "🏋️ T'es à la salle !"
            notifBody = "Pense à prendre ta photo pour valider ta séance — ta série et ta mise sont en jeu !"
        } else {
            notifTitle = "🏋️ You're at the gym!"
            notifBody = "Take your photo to validate your session — your streak and your stake are on the line!"
        }

        let content = UNMutableNotificationContent()
        content.title = notifTitle
        content.body = notifBody
        content.sound = .default

        let request = UNNotificationRequest(identifier: "gym_checkin", content: content, trigger: nil)
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("[Geofence] ❌ Erreur notif: \(error)")
            } else {
                print("[Geofence] ✅ Notification envoyée")
            }
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("[Geofence] ❌ Erreur: \(error)")
    }

    // MARK: - Firebase

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
    }

    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }
        print("[Firebase] ✅ FCM Token: \(token)")
        DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
            guard let rootVC = self.window?.rootViewController as? CAPBridgeViewController else { return }
            rootVC.bridge?.eval(js: "window.dispatchEvent(new CustomEvent('fcmTokenReceived', { detail: '\(token)' }));")
        }
    }

    // MARK: - Lifecycle

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}

    func applicationDidBecomeActive(_ application: UIApplication) {
        UIApplication.shared.applicationIconBadgeNumber = 0
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            self.syncGeofenceFromWebView()
        }
        // Log activate_app event to Facebook
        AppEvents.shared.activateApp()
    }

    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        ApplicationDelegate.shared.application(app, open: url, options: options)
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
