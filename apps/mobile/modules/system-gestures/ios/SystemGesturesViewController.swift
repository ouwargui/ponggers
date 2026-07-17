import UIKit

final class SystemGesturesViewController: UIViewController {
  private var shouldDeferGameplayEdges = false

  override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge {
    shouldDeferGameplayEdges ? [.top, .bottom] : []
  }

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    reassertGameplayDeferral()
  }

  func setGameplayDeferralEnabled(_ enabled: Bool) {
    guard enabled != shouldDeferGameplayEdges else {
      return
    }

    shouldDeferGameplayEdges = enabled
    reassertGameplayDeferral()
  }

  func reassertGameplayDeferral() {
    setNeedsUpdateOfScreenEdgesDeferringSystemGestures()
  }
}

final class SystemGesturesControllerRegistry {
  static let shared = SystemGesturesControllerRegistry()

  weak var controller: SystemGesturesViewController? {
    didSet {
      updateController()
    }
  }

  private var gameplayDeferralOwners = Set<String>()

  private init() {}

  func acquire(owner: String) {
    gameplayDeferralOwners.insert(owner)
    updateController()
  }

  func release(owner: String) {
    gameplayDeferralOwners.remove(owner)
    updateController()
  }

  func reassert() {
    controller?.reassertGameplayDeferral()
  }

  private func updateController() {
    controller?.setGameplayDeferralEnabled(!gameplayDeferralOwners.isEmpty)
  }
}
