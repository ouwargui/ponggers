import ExpoModulesCore
import GameKit
import UIKit

struct GameCenterAuthenticationResult: Record {
  @Field var authenticated = false
}

struct GameCenterAchievementProgress: Record {
  @Field var identifier = ""
  @Field var percentComplete = 0.0
}

struct GameCenterLeaderboardScore: Record {
  @Field var identifier = ""
  @Field var value = 0
}

private final class GameCenterAuthentication {
  static let shared = GameCenterAuthentication()

  private var handlerInstalled = false
  private var pendingPromises: [Promise] = []
  private var presenter: (() -> UIViewController?)?

  private init() {}

  func authenticate(
    presenter: @escaping () -> UIViewController?,
    promise: Promise
  ) {
    dispatchPrecondition(condition: .onQueue(.main))

    if GKLocalPlayer.local.isAuthenticated {
      promise.resolve(GameCenterAuthenticationResult(authenticated: true))
      return
    }

    guard !handlerInstalled else {
      promise.resolve(GameCenterAuthenticationResult(authenticated: false))
      return
    }

    self.presenter = presenter
    pendingPromises.append(promise)
    handlerInstalled = true

    GKLocalPlayer.local.authenticateHandler = { [weak self] viewController, error in
      DispatchQueue.main.async {
        self?.handleAuthentication(
          viewController: viewController,
          error: error
        )
      }
    }
  }

  private func handleAuthentication(
    viewController: UIViewController?,
    error: Error?
  ) {
    if let viewController {
      guard let presenter = presenter?() else {
        resolvePending(authenticated: false)
        return
      }

      presenter.present(viewController, animated: true)
      return
    }

    if GKLocalPlayer.local.isAuthenticated || error != nil {
      resolvePending(authenticated: GKLocalPlayer.local.isAuthenticated)
      return
    }

    resolvePending(authenticated: false)
  }

  private func resolvePending(authenticated: Bool) {
    let result = GameCenterAuthenticationResult(authenticated: authenticated)
    let promises = pendingPromises
    pendingPromises.removeAll()

    for promise in promises {
      promise.resolve(result)
    }
  }
}

private final class GameCenterDashboardDelegate: NSObject, GKGameCenterControllerDelegate {
  static let shared = GameCenterDashboardDelegate()

  func gameCenterViewControllerDidFinish(
    _ gameCenterViewController: GKGameCenterViewController
  ) {
    gameCenterViewController.dismiss(animated: true)
  }
}

public class GameCenterModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PonggersGameCenter")

    AsyncFunction("authenticate") { (promise: Promise) in
      GameCenterAuthentication.shared.authenticate(
        presenter: { [weak appContext] in
          appContext?.utilities?.currentViewController()
        },
        promise: promise
      )
    }
    .runOnQueue(.main)

    AsyncFunction("loadAchievements") { (promise: Promise) in
      guard GKLocalPlayer.local.isAuthenticated else {
        promise.reject(
          "ERR_GAME_CENTER_NOT_AUTHENTICATED",
          "The local Game Center player is not authenticated"
        )
        return
      }

      GKAchievement.loadAchievements { achievements, error in
        if let error {
          promise.reject("ERR_GAME_CENTER_LOAD", error.localizedDescription)
          return
        }

        let progress = (achievements ?? []).map { achievement in
          GameCenterAchievementProgress(
            identifier: achievement.identifier,
            percentComplete: achievement.percentComplete
          )
        }
        promise.resolve(progress)
      }
    }

    AsyncFunction("reportAchievements") {
      (progress: [GameCenterAchievementProgress], promise: Promise) in
      guard GKLocalPlayer.local.isAuthenticated else {
        promise.reject(
          "ERR_GAME_CENTER_NOT_AUTHENTICATED",
          "The local Game Center player is not authenticated"
        )
        return
      }

      let achievements = progress.map { item in
        let achievement = GKAchievement(identifier: item.identifier)
        achievement.percentComplete = min(100, max(0, item.percentComplete))
        achievement.showsCompletionBanner = achievement.percentComplete >= 100
        return achievement
      }

      GKAchievement.report(achievements) { error in
        if let error {
          promise.reject("ERR_GAME_CENTER_REPORT", error.localizedDescription)
          return
        }

        promise.resolve(nil)
      }
    }

    AsyncFunction("reportLeaderboardScores") {
      (scores: [GameCenterLeaderboardScore], promise: Promise) in
      guard GKLocalPlayer.local.isAuthenticated else {
        promise.reject(
          "ERR_GAME_CENTER_NOT_AUTHENTICATED",
          "The local Game Center player is not authenticated"
        )
        return
      }

      guard scores.allSatisfy({ !$0.identifier.isEmpty && $0.value >= 0 }) else {
        promise.reject(
          "ERR_GAME_CENTER_INVALID_LEADERBOARD_SCORE",
          "Leaderboard identifiers must be non-empty and scores must be non-negative"
        )
        return
      }

      reportLeaderboardScores(scores, at: 0, promise: promise)
    }

    AsyncFunction("showAchievements") { (promise: Promise) in
      guard GKLocalPlayer.local.isAuthenticated else {
        promise.reject(
          "ERR_GAME_CENTER_NOT_AUTHENTICATED",
          "The local Game Center player is not authenticated"
        )
        return
      }

      guard let presenter = appContext?.utilities?.currentViewController() else {
        promise.reject(
          "ERR_GAME_CENTER_PRESENTATION",
          "No view controller is available to present Game Center"
        )
        return
      }

      let dashboard = GKGameCenterViewController(state: .achievements)
      dashboard.gameCenterDelegate = GameCenterDashboardDelegate.shared
      presenter.present(dashboard, animated: true) {
        promise.resolve(nil)
      }
    }
    .runOnQueue(.main)

    AsyncFunction("showLeaderboards") { (promise: Promise) in
      guard GKLocalPlayer.local.isAuthenticated else {
        promise.reject(
          "ERR_GAME_CENTER_NOT_AUTHENTICATED",
          "The local Game Center player is not authenticated"
        )
        return
      }

      guard let presenter = appContext?.utilities?.currentViewController() else {
        promise.reject(
          "ERR_GAME_CENTER_PRESENTATION",
          "No view controller is available to present Game Center"
        )
        return
      }

      let dashboard = GKGameCenterViewController(state: .leaderboards)
      dashboard.gameCenterDelegate = GameCenterDashboardDelegate.shared
      presenter.present(dashboard, animated: true) {
        promise.resolve(nil)
      }
    }
    .runOnQueue(.main)
  }

  private func reportLeaderboardScores(
    _ scores: [GameCenterLeaderboardScore],
    at index: Int,
    promise: Promise
  ) {
    guard index < scores.count else {
      promise.resolve(nil)
      return
    }

    let score = scores[index]

    GKLeaderboard.submitScore(
      score.value,
      context: 0,
      player: GKLocalPlayer.local,
      leaderboardIDs: [score.identifier]
    ) { [weak self] error in
      if let error {
        promise.reject(
          "ERR_GAME_CENTER_LEADERBOARD_REPORT",
          error.localizedDescription
        )
        return
      }

      guard let self else {
        promise.reject(
          "ERR_GAME_CENTER_LEADERBOARD_REPORT",
          "The Game Center module was released before reporting completed"
        )
        return
      }

      self.reportLeaderboardScores(scores, at: index + 1, promise: promise)
    }
  }
}
