import ExpoModulesCore
import MessageUI
import UIKit

public class VanPosSmsModule: Module {
  private var composeDelegate: MessageComposeDelegate?

  public func definition() -> ModuleDefinition {
    Name("VanPosSms")

    AsyncFunction("send") { (to: String, body: String, promise: Promise) in
      DispatchQueue.main.async {
        guard MFMessageComposeViewController.canSendText() else {
          promise.reject("ERR_SMS_UNAVAILABLE", "This iPhone cannot send SMS (no Messages / SIM).")
          return
        }

        let destination = to.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !destination.isEmpty else {
          promise.reject("ERR_SMS_DESTINATION", "Phone number is required")
          return
        }
        guard !body.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
          promise.reject("ERR_SMS_BODY", "Message body is required")
          return
        }

        guard let viewController = self.appContext?.utilities?.currentViewController() else {
          promise.reject("ERR_NO_CONTEXT", "No view controller available to present Messages")
          return
        }

        let composer = MFMessageComposeViewController()
        composer.recipients = [destination]
        composer.body = body

        let delegate = MessageComposeDelegate(promise: promise) { [weak self] in
          self?.composeDelegate = nil
        }
        composer.messageComposeDelegate = delegate
        self.composeDelegate = delegate

        viewController.present(composer, animated: true)
      }
    }
  }
}

private final class MessageComposeDelegate: NSObject, MFMessageComposeViewControllerDelegate {
  private let promise: Promise
  private let onFinish: () -> Void

  init(promise: Promise, onFinish: @escaping () -> Void) {
    self.promise = promise
    self.onFinish = onFinish
  }

  func messageComposeViewController(
    _ controller: MFMessageComposeViewController,
    didFinishWith result: MessageComposeResult
  ) {
    controller.dismiss(animated: true) {
      switch result {
      case .sent:
        self.promise.resolve(nil)
      case .cancelled:
        self.promise.reject("ERR_SMS_CANCELLED", "SMS was cancelled")
      case .failed:
        self.promise.reject("ERR_SMS_SEND", "SMS failed to send")
      @unknown default:
        self.promise.reject("ERR_SMS_SEND", "Unknown SMS result")
      }
      self.onFinish()
    }
  }
}
