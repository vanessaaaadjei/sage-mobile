import CoreBluetooth
import ExpoModulesCore
import Foundation

public class VanPosPrinterModule: Module {
  private var printerSession: BlePrintSession?

  public func definition() -> ModuleDefinition {
    Name("VanPosPrinter")

    AsyncFunction("print") { (address: String, payload: String, promise: Promise) in
      DispatchQueue.main.async {
        if self.printerSession != nil {
          promise.reject("ERR_BT_BUSY", "A print job is already in progress")
          return
        }

        let session = BlePrintSession(address: address, payload: payload) { [weak self] result in
          self?.printerSession = nil
          switch result {
          case .success:
            promise.resolve(nil)
          case .failure(let error):
            promise.reject(error.code, error.message)
          }
        }
        self.printerSession = session
        session.start()
      }
    }

    Function("isAvailable") { () -> Bool in
      return CBCentralManager.authorization != .denied
    }
  }
}

private struct PrinterError: Error {
  let code: String
  let message: String
}

private final class BlePrintSession: NSObject, CBCentralManagerDelegate, CBPeripheralDelegate {
  private let address: String
  private let payload: Data
  private let completion: (Result<Void, PrinterError>) -> Void

  private var central: CBCentralManager!
  private var peripheral: CBPeripheral?
  private var writeCharacteristic: CBCharacteristic?
  private var timeoutWork: DispatchWorkItem?
  private var finished = false

  init(address: String, payload: String, completion: @escaping (Result<Void, PrinterError>) -> Void) {
    self.address = address.trimmingCharacters(in: .whitespacesAndNewlines)
    var bytes = Data([0x1B, 0x40]) // ESC @ init
    bytes.append(Data(payload.utf8))
    bytes.append(Data("\n\n\n".utf8))
    bytes.append(Data([0x1D, 0x56, 0x01])) // partial cut
    self.payload = bytes
    self.completion = completion
    super.init()
  }

  func start() {
    central = CBCentralManager(delegate: self, queue: .main)
    let timeout = DispatchWorkItem { [weak self] in
      self?.fail("ERR_BT_TIMEOUT", "Timed out looking for the Bluetooth printer")
    }
    timeoutWork = timeout
    DispatchQueue.main.asyncAfter(deadline: .now() + 15, execute: timeout)
  }

  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    switch central.state {
    case .poweredOn:
      if let uuid = UUID(uuidString: address),
         let known = central.retrievePeripherals(withIdentifiers: [uuid]).first {
        connect(known)
        return
      }
      central.scanForPeripherals(withServices: nil, options: [CBCentralManagerScanOptionAllowDuplicatesKey: false])
    case .unauthorized:
      fail("ERR_BT_PERMISSION", "Bluetooth permission was denied")
    case .poweredOff:
      fail("ERR_BT_DISABLED", "Bluetooth is turned off")
    case .unsupported:
      fail("ERR_BT_UNAVAILABLE", "Bluetooth LE is not available on this device")
    default:
      break
    }
  }

  func centralManager(
    _ central: CBCentralManager,
    didDiscover peripheral: CBPeripheral,
    advertisementData: [String: Any],
    rssi RSSI: NSNumber
  ) {
    let name = (peripheral.name
      ?? advertisementData[CBAdvertisementDataLocalNameKey] as? String
      ?? "").lowercased()
    let needle = address.lowercased()
    let uuidMatch = peripheral.identifier.uuidString.lowercased() == needle
    let nameMatch = !needle.isEmpty && (name.contains(needle) || needle.contains(name) && !name.isEmpty)
    // Also accept common thermal printer names when address looks like an Android MAC.
    let looksLikeMac = needle.contains(":")
    let thermalName = name.contains("print") || name.contains("rpp") || name.contains("pos") || name.contains("bluetooth")

    if uuidMatch || nameMatch || (looksLikeMac && thermalName) {
      central.stopScan()
      connect(peripheral)
    }
  }

  func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
    peripheral.delegate = self
    peripheral.discoverServices(nil)
  }

  func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
    fail("ERR_BT_PRINT", error?.localizedDescription ?? "Failed to connect to printer")
  }

  func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
    if let error {
      fail("ERR_BT_PRINT", error.localizedDescription)
      return
    }
    guard let services = peripheral.services, !services.isEmpty else {
      fail("ERR_BT_PRINT", "Printer exposed no BLE services")
      return
    }
    for service in services {
      peripheral.discoverCharacteristics(nil, for: service)
    }
  }

  func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
    if let error {
      fail("ERR_BT_PRINT", error.localizedDescription)
      return
    }
    guard let characteristics = service.characteristics else { return }

    let writable = characteristics.first {
      $0.properties.contains(.write) || $0.properties.contains(.writeWithoutResponse)
    }
    guard let characteristic = writable else { return }

    writeCharacteristic = characteristic
    let type: CBCharacteristicWriteType =
      characteristic.properties.contains(.writeWithoutResponse) ? .withoutResponse : .withResponse

    // Chunk writes — many BLE printers have a ~182 byte ATT limit.
    let chunkSize = 160
    var offset = 0
    while offset < payload.count {
      let end = min(offset + chunkSize, payload.count)
      peripheral.writeValue(payload.subdata(in: offset..<end), for: characteristic, type: type)
      offset = end
    }

    // Give the radio a moment, then succeed (withResponse completions are per-chunk).
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { [weak self] in
      self?.succeed()
    }
  }

  private func connect(_ peripheral: CBPeripheral) {
    self.peripheral = peripheral
    central.connect(peripheral, options: nil)
  }

  private func succeed() {
    finish(.success(()))
  }

  private func fail(_ code: String, _ message: String) {
    finish(.failure(PrinterError(code: code, message: message)))
  }

  private func finish(_ result: Result<Void, PrinterError>) {
    guard !finished else { return }
    finished = true
    timeoutWork?.cancel()
    central?.stopScan()
    if let peripheral {
      central?.cancelPeripheralConnection(peripheral)
    }
    completion(result)
  }
}
