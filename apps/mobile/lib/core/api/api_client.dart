import 'dart:async';
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../storage/app_storage.dart';
import 'api_error.dart';
import 'models.dart';

final storageProvider = Provider<AppStorage>((_) => const SecureAppStorage());
final apiClientProvider = Provider<ApiClient>((ref) => ApiClient.create(ref.watch(storageProvider)));

enum ApiEnvironment { dev, demo, prod }
class ApiConfig {
  static const environment = String.fromEnvironment('APP_ENV', defaultValue: 'dev');
  static const baseUrl = String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:8000');
  static void validate() {
    if (environment == 'prod' && !baseUrl.startsWith('https://')) {
      throw StateError('Production API_URL must use HTTPS');
    }
  }
}

class ApiClient {
  ApiClient(this.dio, this.storage);
  factory ApiClient.create(AppStorage storage) {
    ApiConfig.validate();
    final client = ApiClient(Dio(BaseOptions(baseUrl: ApiConfig.baseUrl)), storage);
    client._installInterceptors();
    return client;
  }
  final Dio dio;
  final AppStorage storage;
  Future<void>? _refreshing;
  void _installInterceptors() {
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await storage.read('access_token');
        if (token != null) options.headers['Authorization'] = 'Bearer $token';
        handler.next(options);
      },
      onError: (error, handler) async {
        final retried = error.requestOptions.extra['retried'] == true;
        if (error.response?.statusCode == 401 && !retried &&
            error.requestOptions.path != '/auth/refresh') {
          try {
            _refreshing ??= _refresh().whenComplete(() => _refreshing = null);
            await _refreshing;
            final request = error.requestOptions..extra['retried'] = true;
            request.headers['Authorization'] = 'Bearer ${await storage.read('access_token')}';
            return handler.resolve(await dio.fetch(request));
          } on ApiError {
            await clearSession();
          }
        }
        handler.reject(error);
      },
    ));
  }
  Future<TokenPair> login(String email, String password) async {
    try {
      final response = await dio.post<Map<String, dynamic>>('/auth/login', data: {'email': email, 'password': password});
      final pair = TokenPair.fromJson(response.data!);
      await _save(pair);
      return pair;
    } on DioException catch (error) { throw ApiError.fromDio(error); }
  }
  Future<TokenPair> register(String email, String password) async {
    try {
      final response = await dio.post<Map<String, dynamic>>('/auth/register', data: {'email': email, 'password': password});
      final pair = TokenPair.fromJson(response.data!); await _save(pair); return pair;
    } on DioException catch (error) { throw ApiError.fromDio(error); }
  }
  Future<void> _refresh() async {
    final refresh = await storage.read('refresh_token');
    if (refresh == null) throw const ApiError('session_expired', 'Session expired', 401);
    try {
      final response = await dio.post<Map<String, dynamic>>('/auth/refresh', data: {'refresh_token': refresh});
      await _save(TokenPair.fromJson(response.data!));
    } on DioException catch (error) { throw ApiError.fromDio(error); }
  }
  Future<void> logout() async {
    final refresh = await storage.read('refresh_token');
    if (refresh != null) { try { await dio.post<void>('/auth/logout', data: {'refresh_token': refresh}); } on DioException { /* local logout remains authoritative */ } }
    await clearSession();
  }
  Future<void> clearSession() async { await storage.delete('access_token'); await storage.delete('refresh_token'); }
  Future<void> _save(TokenPair pair) async { await storage.write('access_token', pair.accessToken); await storage.write('refresh_token', pair.refreshToken); }
  Future<bool> hasSession() async => await storage.read('refresh_token') != null;
  Future<bool> onboardingComplete() async => await storage.read('onboarding_complete') == 'true';
  Future<void> completeOnboarding(Map<String, dynamic> payload, String key) async {
    try { await dio.post<void>('/onboarding', data: payload, options: Options(headers: {'Idempotency-Key': key}));
      await storage.write('onboarding_complete', 'true'); await storage.delete('onboarding_draft');
    } on DioException catch (error) { throw ApiError.fromDio(error); }
  }
  Future<FinancialPlan> plan() async {
    try { final response = await dio.get<Map<String, dynamic>>('/plan'); await storage.write('cached_plan', jsonEncode(response.data)); return FinancialPlan.fromJson(response.data!); }
    on DioException catch (error) { final cached = await storage.read('cached_plan'); if (cached != null) return FinancialPlan.fromJson(jsonDecode(cached) as Map<String, dynamic>); throw ApiError.fromDio(error); }
  }
  Future<List<DebtDto>> debts() async { try { final r=await dio.get<List<dynamic>>('/debts'); return r.data!.map((e)=>DebtDto.fromJson(e as Map<String,dynamic>)).toList(); } on DioException catch(e){throw ApiError.fromDio(e);} }
}
