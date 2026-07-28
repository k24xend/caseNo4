import SwiftUI

struct AuthView: View {
    @Environment(AppModel.self) private var model
    @State private var email = "", password = "", registering = false, submitting = false, error: String?
    var body: some View {
        NavigationStack { ScrollView { VStack(alignment: .leading, spacing: 22) {
            Spacer(minLength: 50); Image(systemName: "arrow.up.right.circle.fill").font(.system(size: 62)).foregroundStyle(.tint).accessibilityHidden(true)
            Text("app.name").font(.largeTitle.bold()); Text("auth.promise").font(.title3).foregroundStyle(.secondary)
            TextField("auth.email", text: $email).textContentType(.emailAddress).keyboardType(.emailAddress).textInputAutocapitalization(.never).padding().background(Color(uiColor: .secondarySystemBackground), in: RoundedRectangle(cornerRadius: 14))
            SecureField("auth.password", text: $password).textContentType(registering ? .newPassword : .password).padding().background(Color(uiColor: .secondarySystemBackground), in: RoundedRectangle(cornerRadius: 14))
            if let error { Text(error).foregroundStyle(.red).accessibilityLiveRegion(.assertive) }
            Button { submit() } label: { if submitting { ProgressView().frame(maxWidth: .infinity) } else { Text(registering ? "auth.register" : "auth.login").frame(maxWidth: .infinity) } }.buttonStyle(.borderedProminent).controlSize(.large).disabled(submitting || !email.contains("@") || password.count < 8).accessibilityIdentifier("auth-submit")
            Button(registering ? "auth.have_account" : "auth.create_account") { registering.toggle(); error = nil }.frame(maxWidth: .infinity)
        }.padding(24) }.navigationTitle("") }
    }
    private func submit() { submitting = true; error = nil; Task { do { try await model.authenticate(email: email, password: password, register: registering) } catch { self.error = error.localizedDescription }; submitting = false } }
}
