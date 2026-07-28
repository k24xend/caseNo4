# Native iOS client

`apps/ios/Vyhod.xcodeproj` is the native SwiftUI client for iOS 17+. Open that project directly in Xcode 16.4 or newer, select the shared **Vyhod** scheme and an iPhone simulator, then Run. Swift 6 strict concurrency, SwiftUI, URLSession, SwiftData and Keychain are used without runtime third-party dependencies.

## Backend and configuration

The Debug build setting `API_BASE_URL` defaults to `http://127.0.0.1:8000`, suitable for a simulator with the API running on the same Mac. Set it under **Target → Build Settings → User-Defined**, or run:

```bash
xcodebuild -project Vyhod.xcodeproj -scheme Vyhod \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro' \
  API_BASE_URL=http://127.0.0.1:8000 build
```

For a physical iPhone use an HTTPS URL reachable from the phone. Release intentionally points at the invalid placeholder `https://api.example.invalid`; set an HTTPS endpoint in your private build configuration. No API token or AI key belongs in the project. The backend defaults to its deterministic fake AI provider, so no AI secret is needed.

Tests use an in-process mock transport and in-memory SwiftData. Run from Xcode with **Product → Test**, or:

```bash
xcodebuild -project Vyhod.xcodeproj -scheme Vyhod \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro,OS=latest' test
```

## Offline behavior

After a successful refresh, the plan, accounts, debts, transactions and explanation are cached in SwiftData with their update time. Onboarding draft and mutation queue are persistent. Creates receive a UUID idempotency key before transmission. The queue is processed sequentially with bounded exponential backoff (maximum five automatic attempts); HTTP 409 is shown as a failed conflict rather than silently overwritten. Manual Sync is available on Today and Profile. Tokens remain only in Keychain and logout clears tokens, cache and queue.

Server wins for successful refreshes. Pending local mutations remain authoritative until acknowledged; create idempotency keys prevent duplicates. There is no OS background task: synchronization occurs at refresh, mutation, launch/reload, or manual Sync.

## Demo and owner check

There is intentionally no hard-coded production mock mode. SwiftUI previews and XCTest use test data/mock transport. For a demo, start Compose and sign in with `demo@vyhod.app` / `demo-vyhod`.

On a TestFlight or locally signed build: (1) sign in, (2) inspect Today, (3) open Plan and its explanation, (4) manage a debt, (5) add an operation. Then enable Airplane Mode, reopen the app, confirm cached cards and the offline timestamp remain, add an operation, disable Airplane Mode, tap Sync, and confirm it appears once. In iOS Settings, switch Appearance and set Accessibility → Display & Text Size → Larger Text; verify both themes, scrolling, labels and buttons with VoiceOver.

Known limits: Xcode/macOS is required to compile; no background sync; transaction update is omitted because the backend exposes create/list/delete but no safe update endpoint; the backend models recurring income as onboarding scheduled items, while transaction recurrence is displayed categorically and never promoted into monthly income.
