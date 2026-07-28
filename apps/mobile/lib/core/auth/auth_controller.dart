import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';

enum SessionState { loading, anonymous, onboarding, authenticated }
final authControllerProvider = StateNotifierProvider<AuthController, SessionState>((ref) => AuthController(ref.watch(apiClientProvider))..restore());
class AuthController extends StateNotifier<SessionState> {
  AuthController(this.api):super(SessionState.loading);
  final ApiClient api;
  Future<void> restore() async { try { state = await api.hasSession() ? (await api.onboardingComplete() ? SessionState.authenticated : SessionState.onboarding) : SessionState.anonymous; } catch (_) { state=SessionState.anonymous; } }
  Future<void> demoLogin() async { state=SessionState.loading; await api.login('demo@vyhod.app','demo-vyhod'); await api.storage.write('onboarding_complete','true'); state=SessionState.authenticated; }
  Future<void> registered() async => state=SessionState.onboarding;
  void completed() => state=SessionState.authenticated;
  Future<void> logout() async { await api.logout(); state=SessionState.anonymous; }
}
