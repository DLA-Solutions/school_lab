package expo.modules.fcmregistrationtoken

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class FcmRegistrationTokenModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("FcmRegistrationToken")

    // Android JS must not call this. The FCM token on Android comes from expo-notifications.
    AsyncFunction("getRegistrationToken") {
      registrationToken()
    }
  }

  private fun registrationToken(): String? = null
}
