import SwiftData
import SwiftUI

@main struct VyhodApp: App {
    @State private var model: AppModel
    init() {
        let tokens = KeychainTokenStore(); let store = try! LocalStore()
        let configured = Bundle.main.object(forInfoDictionaryKey: "APIBaseURL") as? String ?? "http://127.0.0.1:8000"
        let session = URLSession(configuration: { let value = URLSessionConfiguration.ephemeral; value.timeoutIntervalForRequest = 20; value.waitsForConnectivity = true; return value }())
        let api = APIClient(baseURL: URL(string: configured)!, transport: URLSessionTransport(session: session), tokens: tokens)
        _model = State(initialValue: AppModel(api: api, tokens: tokens, store: store))
    }
    var body: some Scene { WindowGroup { RootView().environment(model).task { await model.restore() } }.modelContainer(model.store.container) }
}

struct RootView: View {
    @Environment(AppModel.self) private var model
    var body: some View {
        Group {
            switch model.session {
            case .restoring: ProgressView("loading")
            case .anonymous: AuthView()
            case .onboarding: OnboardingView()
            case .authenticated: MainTabs()
            }
        }.tint(.accentColor)
    }
}

struct MainTabs: View {
    @State private var selection = 0
    var body: some View {
        TabView(selection: $selection) {
            NavigationStack { TodayView() }.tabItem { Label("tab.today", systemImage: "sun.max") }.tag(0)
            NavigationStack { PlanView() }.tabItem { Label("tab.plan", systemImage: "map") }.tag(1)
            NavigationStack { TransactionsView() }.tabItem { Label("tab.transactions", systemImage: "list.bullet.rectangle") }.tag(2)
            NavigationStack { ProfileView() }.tabItem { Label("tab.profile", systemImage: "person.crop.circle") }.tag(3)
        }.accessibilityIdentifier("main-tabs")
    }
}
