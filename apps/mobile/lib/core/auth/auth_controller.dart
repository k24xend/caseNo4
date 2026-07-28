import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';

enum SessionState { loading, anonymous, onboarding, authenticated }
final authControllerProvider = StateNotifierProvider<AuthController, SessionState>((ref) => AuthController(ref.watch(apiClientProvider))..restore());
class AuthController extends StateNotifier<SessionState> {
  AuthController(this.api):super(SessionState.loading);
  final ApiClient api;
  Future<void> restore() async { try { state = await api.restoreSession() ? (await api.onboardingComplete() ? SessionState.authenticated : SessionState.onboarding) : SessionState.anonymous; } catch (_) { await api.clearSession(); state=SessionState.anonymous; } }
  Future<void> demoLogin() async { state=SessionState.loading; await api.login('demo@vyhod.app','demo-vyhod'); state=await api.onboardingComplete() ? SessionState.authenticated : SessionState.onboarding; }
  Future<void> login(String email,String password) async { state=SessionState.loading; try { await api.login(email,password); state=await api.onboardingComplete()?SessionState.authenticated:SessionState.onboarding; } catch (_) { state=SessionState.anonymous; rethrow; } }
  Future<void> register(String email,String password) async { state=SessionState.loading; try { await api.register(email,password); state=SessionState.onboarding; } catch (_) { state=SessionState.anonymous; rethrow; } }
  void completed() => state=SessionState.authenticated;
  Future<void> logout() async { await api.logout(); state=SessionState.anonymous; }
}
