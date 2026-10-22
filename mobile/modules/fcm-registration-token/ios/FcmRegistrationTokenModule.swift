import ExpoModulesCore
import FirebaseCore
import FirebaseMessaging

public class FcmRegistrationTokenModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FcmRegistrationToken")

    AsyncFunction("getRegistrationToken") { (promise: Promise) in
      self.readRegistrationToken(promise)
    }
  }

  private func readRegistrationToken(_ promise: Promise) {
    guard ensureFirebaseConfigured() else {
      promise.resolve(nil)
      return
    }

    Messaging.messaging().token { token, error in
      if error != nil {
        promise.resolve(nil)
        return
      }
      promise.resolve(token)
    }
  }

  /// Configures Firebase only when GoogleService-Info.plist is in the app bundle.
  private func ensureFirebaseConfigured() -> Bool {
    if FirebaseApp.app() != nil {
      return true
    }

    guard
      let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
      let options = FirebaseOptions(contentsOfFile: path)
    else {
      return false
    }

    FirebaseApp.configure(options: options)
    return FirebaseApp.app() != nil
  }
}
