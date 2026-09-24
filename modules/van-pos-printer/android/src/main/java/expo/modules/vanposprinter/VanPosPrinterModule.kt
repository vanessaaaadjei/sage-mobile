package expo.modules.vanposprinter

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.IOException
import java.util.UUID

class VanPosPrinterModule : Module() {
  companion object {
    private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
  }

  override fun definition() = ModuleDefinition {
    Name("VanPosPrinter")

    AsyncFunction("print") { address: String, payload: String ->
      val context = appContext.reactContext
        ?: throw CodedException("ERR_NO_CONTEXT", "React context is unavailable", null)

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT)
          != PackageManager.PERMISSION_GRANTED
        ) {
          throw CodedException(
            "ERR_BT_PERMISSION",
            "BLUETOOTH_CONNECT permission is not granted",
            null,
          )
        }
      }

      val adapter = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        context.getSystemService(BluetoothManager::class.java)?.adapter
      } else {
        @Suppress("DEPRECATION")
        BluetoothAdapter.getDefaultAdapter()
      } ?: throw CodedException("ERR_BT_UNAVAILABLE", "Bluetooth is not available on this device", null)

      if (!adapter.isEnabled) {
        throw CodedException("ERR_BT_DISABLED", "Bluetooth is turned off", null)
      }

      val mac = address.trim().uppercase()
      if (!BluetoothAdapter.checkBluetoothAddress(mac)) {
        throw CodedException("ERR_BT_ADDRESS", "Invalid printer Bluetooth address", null)
      }

      var socket: BluetoothSocket? = null
      try {
        val device: BluetoothDevice = adapter.getRemoteDevice(mac)
        socket = device.createRfcommSocketToServiceRecord(SPP_UUID)
        adapter.cancelDiscovery()
        socket.connect()
        val stream = socket.outputStream
        stream.write(byteArrayOf(0x1B, 0x40))
        stream.write(payload.toByteArray(Charsets.UTF_8))
        stream.write("\n\n\n".toByteArray(Charsets.UTF_8))
        stream.write(byteArrayOf(0x1D, 0x56, 0x01))
        stream.flush()
      } catch (error: CodedException) {
        throw error
      } catch (error: IOException) {
        throw CodedException("ERR_BT_PRINT", error.message ?: "Failed to print over Bluetooth", error)
      } finally {
        try {
          socket?.close()
        } catch (_: IOException) {
        }
      }
    }

    Function("isAvailable") {
      val context = appContext.reactContext ?: return@Function false
      val adapter = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        context.getSystemService(BluetoothManager::class.java)?.adapter
      } else {
        @Suppress("DEPRECATION")
        BluetoothAdapter.getDefaultAdapter()
      }
      return@Function adapter != null
    }
  }
}
