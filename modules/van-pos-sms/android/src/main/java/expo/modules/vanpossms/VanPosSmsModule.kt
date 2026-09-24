package expo.modules.vanpossms

import android.Manifest
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.SmsManager
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class VanPosSmsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("VanPosSms")

    AsyncFunction("send") { to: String, body: String ->
      val context = appContext.reactContext
        ?: throw CodedException("ERR_NO_CONTEXT", "React context is unavailable", null)

      if (ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS)
        != PackageManager.PERMISSION_GRANTED
      ) {
        throw CodedException("ERR_SMS_PERMISSION", "SEND_SMS permission is not granted", null)
      }

      val destination = to.trim()
      if (destination.isEmpty()) {
        throw CodedException("ERR_SMS_DESTINATION", "Phone number is required", null)
      }
      if (body.isBlank()) {
        throw CodedException("ERR_SMS_BODY", "Message body is required", null)
      }

      try {
        val smsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          context.getSystemService(SmsManager::class.java)
            ?: throw CodedException("ERR_SMS_SERVICE", "SmsManager is unavailable", null)
        } else {
          @Suppress("DEPRECATION")
          SmsManager.getDefault()
        }

        val sentIntent = PendingIntent.getBroadcast(
          context,
          0,
          Intent("expo.modules.vanpossms.SMS_SENT"),
          PendingIntent.FLAG_IMMUTABLE,
        )

        val parts = smsManager.divideMessage(body)
        if (parts.size == 1) {
          smsManager.sendTextMessage(destination, null, body, sentIntent, null)
        } else {
          val sentIntents = ArrayList<PendingIntent>(parts.size)
          repeat(parts.size) { sentIntents.add(sentIntent) }
          smsManager.sendMultipartTextMessage(destination, null, parts, sentIntents, null)
        }
      } catch (error: CodedException) {
        throw error
      } catch (error: Exception) {
        throw CodedException("ERR_SMS_SEND", error.message ?: "Failed to send SMS", error)
      }
    }
  }
}
