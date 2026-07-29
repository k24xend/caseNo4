import SwiftUI

struct ProfileView: View {
    @Environment(AppModel.self) private var model; @AppStorage("appearance") private var appearance = "system"
    var body: some View { Form {
        Section("profile.appearance") { Picker("profile.theme", selection: $appearance) { Text("profile.system").tag("system"); Text("profile.light").tag("light"); Text("profile.dark").tag("dark") } }
        Section("profile.sync") { Button("sync.manual") { Task { await model.syncNow(); await model.reload() } }; if case .offline(let date) = model.state { LabeledContent("profile.last_update", value: date.formatted()) } }
        Section("profile.about") { Text("explanation.disclaimer").font(.footnote); Link("profile.methodology", destination: URL(string: "https://github.com/k24xend/caseNo4/blob/main/docs/financial-engine.md")!) }
        Section { Button("auth.logout", role: .destructive) { Task { await model.logout() } } }
    }.navigationTitle("tab.profile").preferredColorScheme(appearance == "dark" ? .dark : appearance == "light" ? .light : nil) }
}
