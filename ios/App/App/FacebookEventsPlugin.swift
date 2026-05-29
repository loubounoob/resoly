import Foundation
import Capacitor
import FacebookCore
import AppTrackingTransparency

@objc(FacebookEventsPlugin)
public class FacebookEventsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FacebookEventsPlugin"
    public let jsName = "FacebookEvents"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestTrackingPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "logEvent", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "logPurchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setUserData", returnType: CAPPluginReturnPromise),
    ]

    // MARK: - ATT

    @objc func requestTrackingPermission(_ call: CAPPluginCall) {
        if #available(iOS 14, *) {
            ATTrackingManager.requestTrackingAuthorization { status in
                let statusStr: String
                switch status {
                case .authorized:    statusStr = "authorized"
                case .denied:        statusStr = "denied"
                case .restricted:    statusStr = "restricted"
                case .notDetermined: statusStr = "notDetermined"
                @unknown default:    statusStr = "notDetermined"
                }
                call.resolve(["status": statusStr])
            }
        } else {
            call.resolve(["status": "authorized"])
        }
    }

    // MARK: - Log custom event

    @objc func logEvent(_ call: CAPPluginCall) {
        guard let eventName = call.getString("eventName") else {
            call.reject("eventName is required")
            return
        }
        AppEvents.shared.logEvent(AppEvents.Name(eventName))
        call.resolve()
    }

    // MARK: - Log purchase

    @objc func logPurchase(_ call: CAPPluginCall) {
        guard let amount = call.getDouble("amount"),
              let currency = call.getString("currency") else {
            call.reject("amount and currency are required")
            return
        }
        AppEvents.shared.logPurchase(amount: amount, currency: currency)
        call.resolve()
    }

    // MARK: - Set user data for matching

    @objc func setUserData(_ call: CAPPluginCall) {
        let email = call.getString("email")
        AppEvents.shared.setUser(
            email: email,
            firstName: nil,
            lastName: nil,
            phone: nil,
            dateOfBirth: nil,
            gender: nil,
            city: nil,
            state: nil,
            zip: nil,
            country: nil
        )
        call.resolve()
    }
}
