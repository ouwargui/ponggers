import ExpoModulesCore

public final class SystemGesturesReactDelegateHandler: ExpoReactDelegateHandler {
  public override func createRootViewController() -> UIViewController? {
    let controller = SystemGesturesViewController()
    SystemGesturesControllerRegistry.shared.controller = controller
    return controller
  }
}
