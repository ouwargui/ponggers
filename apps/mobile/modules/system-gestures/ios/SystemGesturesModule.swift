import ExpoModulesCore

public class SystemGesturesModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SystemGestures")

    AsyncFunction("acquireGameplayDeferral") { (owner: String) in
      SystemGesturesControllerRegistry.shared.acquire(owner: owner)
    }
    .runOnQueue(.main)

    AsyncFunction("releaseGameplayDeferral") { (owner: String) in
      SystemGesturesControllerRegistry.shared.release(owner: owner)
    }
    .runOnQueue(.main)

    OnAppBecomesActive {
      SystemGesturesControllerRegistry.shared.reassert()
    }
  }
}
