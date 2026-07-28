import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';

const storage = FlutterSecureStorage();

class Api {
  Api(this.dio);
  final Dio dio;

  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await dio.post<Map<String, dynamic>>('/auth/login', data: {'email': email, 'password': password});
    await storage.write(key: 'access', value: response.data!['access_token'] as String);
    return response.data!;
  }

  Future<void> register(String email, String password) async {
    final response = await dio.post<Map<String, dynamic>>(
      '/auth/register', data: {'email': email, 'password': password},
    );
    await storage.write(key: 'access', value: response.data!['access_token'] as String);
  }

  Future<void> completeOnboarding(Map<String, dynamic> data) async {
    await dio.post('/onboarding', data: data,
      options: Options(headers: {'Idempotency-Key': 'mobile-onboarding-v1'}));
  }

  Future<Map<String, dynamic>> plan() async {
    try {
      await syncQueue();
      final value = (await dio.get<Map<String, dynamic>>('/plan')).data!;
      await storage.write(key: 'cached_plan', value: jsonEncode(value));
      return value;
    } catch (_) {
      final cached = await storage.read(key: 'cached_plan');
      if (cached != null) return jsonDecode(cached) as Map<String, dynamic>;
      rethrow;
    }
  }
  Future<List<dynamic>> debts() async => (await dio.get<List<dynamic>>('/debts')).data!;
  Future<List<dynamic>> accounts() async => (await dio.get<List<dynamic>>('/accounts')).data!;

  Future<void> transaction(Map<String, dynamic> body) async {
    final item = {...body, '_key': 'mobile-${DateTime.now().microsecondsSinceEpoch}'};
    try {
      await dio.post('/transactions', data: body, options: Options(headers: {'Idempotency-Key': item['_key']}));
    } catch (_) {
      final queue = jsonDecode(await storage.read(key: 'offline_queue') ?? '[]') as List<dynamic>;
      queue.add(item);
      await storage.write(key: 'offline_queue', value: jsonEncode(queue));
    }
  }

  Future<void> syncQueue() async {
    final queue = jsonDecode(await storage.read(key: 'offline_queue') ?? '[]') as List<dynamic>;
    final remaining = <dynamic>[];
    for (final raw in queue) {
      final item = Map<String, dynamic>.from(raw as Map);
      final key = item.remove('_key');
      try {
        await dio.post('/transactions', data: item, options: Options(headers: {'Idempotency-Key': key}));
      } catch (_) {
        remaining.add(raw);
      }
    }
    await storage.write(key: 'offline_queue', value: jsonEncode(remaining));
  }
}

final apiProvider = Provider((ref) {
  final dio = Dio(BaseOptions(baseUrl: const String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:8000')));
  dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) async {
    final token = await storage.read(key: 'access');
    if (token != null) options.headers['Authorization'] = 'Bearer $token';
    handler.next(options);
  }));
  return Api(dio);
});

final localeProvider = StateProvider((ref) => const Locale('ru'));
final planProvider = FutureProvider((ref) => ref.watch(apiProvider).plan());
final debtsProvider = FutureProvider((ref) => ref.watch(apiProvider).debts());

void main() => runApp(const ProviderScope(child: VyhodApp()));

class VyhodApp extends ConsumerWidget {
  const VyhodApp({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = GoRouter(initialLocation: '/welcome', routes: [
      GoRoute(path: '/welcome', builder: (_, __) => const WelcomeScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/onboarding', builder: (_, __) => const OnboardingScreen()),
      ShellRoute(builder: (_, __, child) => AppShell(child: child), routes: [
        GoRoute(path: '/today', builder: (_, __) => const TodayScreen()),
        GoRoute(path: '/plan', builder: (_, __) => const PlanScreen()),
        GoRoute(path: '/debts', builder: (_, __) => const DebtsScreen()),
        GoRoute(path: '/transactions', builder: (_, __) => const TransactionsScreen()),
        GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
      ]),
    ]);
    return MaterialApp.router(
      title: 'ВЫХОД', locale: ref.watch(localeProvider), routerConfig: router,
      darkTheme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF8B5CF6), brightness: Brightness.dark), scaffoldBackgroundColor: const Color(0xFF111217), useMaterial3: true),
      theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF6842D9)), useMaterial3: true), themeMode: ThemeMode.dark,
    );
  }
}

class WelcomeScreen extends ConsumerWidget {
  const WelcomeScreen({super.key});
  @override Widget build(BuildContext context, WidgetRef ref) => Scaffold(body: SafeArea(child: Padding(padding: const EdgeInsets.all(28), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const Spacer(), Text('ВЫХОД', style: Theme.of(context).textTheme.displayLarge?.copyWith(fontWeight: FontWeight.w800)), const SizedBox(height: 18), Text(ref.watch(localeProvider).languageCode == 'ru' ? 'Не просто считай расходы. Найди путь наружу.' : 'Don’t just track spending. Find your way out.', style: Theme.of(context).textTheme.headlineSmall), const Spacer(),
    SegmentedButton<String>(segments: const [ButtonSegment(value: 'ru', label: Text('RU')), ButtonSegment(value: 'en', label: Text('EN'))], selected: {ref.watch(localeProvider).languageCode}, onSelectionChanged: (v) => ref.read(localeProvider.notifier).state = Locale(v.first)),
    const SizedBox(height: 16), FilledButton(onPressed: () => context.go('/onboarding'), style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(56)), child: const Text('Создать мой план')),
    const SizedBox(height: 8), TextButton(onPressed: () => context.go('/login'), style: TextButton.styleFrom(minimumSize: const Size.fromHeight(48)), child: const Text('Посмотреть демо')),
  ]))));
}

class LoginScreen extends ConsumerStatefulWidget { const LoginScreen({super.key}); @override ConsumerState<LoginScreen> createState() => _LoginState(); }
class _LoginState extends ConsumerState<LoginScreen> {
  final email = TextEditingController(text: 'demo@vyhod.app'); final password = TextEditingController(text: 'demo-vyhod'); bool loading = false; String? error;
  @override Widget build(BuildContext context) => Scaffold(appBar: AppBar(), body: Padding(padding: const EdgeInsets.all(24), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const Text('Войти в демо', style: TextStyle(fontSize: 30, fontWeight: FontWeight.bold)), const SizedBox(height: 24), TextField(controller: email, decoration: const InputDecoration(labelText: 'Email')), TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Пароль')), if (error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(error!, style: const TextStyle(color: Colors.amber))), const Spacer(), FilledButton(onPressed: loading ? null : () async { setState(() {loading=true; error=null;}); try { await ref.read(apiProvider).login(email.text, password.text); if (mounted) context.go('/today'); } catch (_) {setState(() => error='Не удалось войти. Проверьте, запущен ли API.');} finally {if(mounted)setState(()=>loading=false);} }, style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(54)), child: Text(loading ? 'Подключаем…' : 'Войти'))])));
}

class OnboardingScreen extends ConsumerStatefulWidget { const OnboardingScreen({super.key}); @override ConsumerState<OnboardingScreen> createState()=>_OnboardingState(); }
class _OnboardingState extends ConsumerState<OnboardingScreen> {
  int step=0; bool loading=false; String? error; String currency='RUB';
  final values=List.generate(6,(_)=>TextEditingController());
  final titles=['Какая у вас базовая валюта?','Сколько денег доступно сейчас?','Когда и сколько придёт?','Обязательные расходы до дохода','Какие долги нужно учитывать?','Какой резерв защитить?'];
  final hints=['','Например, 38 000','Сумма ожидаемого дохода','Аренда, связь, продукты','Общий остаток долгов','Например, 10 000'];
  int rub(int index)=>int.tryParse(values[index].text.replaceAll(RegExp(r'[^0-9]'),''))! * 100;
  @override Widget build(BuildContext context)=>Scaffold(
    appBar:AppBar(leading:step==0?IconButton(onPressed:()=>context.go('/welcome'),icon:const Icon(Icons.close)):IconButton(onPressed:()=>setState(()=>step--),icon:const Icon(Icons.arrow_back)),title:Text('${step+1} из 6')),
    body:SafeArea(child:Padding(padding:const EdgeInsets.fromLTRB(24,8,24,20),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
      ClipRRect(borderRadius:BorderRadius.circular(8),child:LinearProgressIndicator(value:(step+1)/6,minHeight:6)),const SizedBox(height:36),Text(titles[step],style:Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight:FontWeight.w700)),const SizedBox(height:12),Text(step==4?'Можно указать общую сумму — детали добавите позже.':'Это нужно только для расчёта безопасного плана.',style:Theme.of(context).textTheme.bodyLarge?.copyWith(color:Colors.white60)),const SizedBox(height:36),
      if(step==0) ...[for(final code in ['RUB','USD','EUR']) Card(child:RadioListTile(value:code,groupValue:currency,onChanged:(v)=>setState(()=>currency=v!),title:Text(code),subtitle:Text({'RUB':'Российский рубль','USD':'US Dollar','EUR':'Euro'}[code]!))) ] else TextField(controller:values[step],autofocus:true,keyboardType:TextInputType.number,style:const TextStyle(fontSize:34,fontWeight:FontWeight.bold),decoration:InputDecoration(hintText:hints[step],suffixText:currency=='RUB'?'₽':currency)),
      if(error!=null) Padding(padding:const EdgeInsets.only(top:16),child:Text(error!,style:const TextStyle(color:Color(0xFFFFC46B)))),const Spacer(),FilledButton(onPressed:loading?null:_next,style:FilledButton.styleFrom(minimumSize:const Size.fromHeight(56)),child:Text(loading?'Создаём план…':step==5?'Получить план':'Продолжить'))
    ]))));
  Future<void> _next() async {if(step<5){if(step>0&&values[step].text.trim().isEmpty){setState(()=>error='Введите сумму или 0, если её нет');return;}setState((){error=null;step++;});return;} setState(()=>loading=true);try{final stamp=DateTime.now().millisecondsSinceEpoch;await ref.read(apiProvider).register('user-$stamp@vyhod.local','local-$stamp');final now=DateTime.now();await ref.read(apiProvider).completeOnboarding({'language':'ru','currency':currency,'available_now':rub(1),'minimum_buffer':rub(5),'next_income_amount':rub(2),'next_income_date':DateTime(now.year,now.month,now.day+14).toIso8601String().substring(0,10),'expenses':[{'name':'Обязательные расходы','amount':rub(3),'due_date':DateTime(now.year,now.month,now.day+7).toIso8601String().substring(0,10)}],'debts':rub(4)==0?[]:[{'name':'Мои долги','balance':rub(4),'annual_rate_bps':0,'minimum_payment':0,'due_day':15}]});ref.invalidate(planProvider);if(mounted)context.go('/today');}catch(_){setState(()=>error='Не удалось сохранить. Проверьте подключение к API.');}finally{if(mounted)setState(()=>loading=false);}}
}

class AppShell extends StatelessWidget { const AppShell({required this.child, super.key}); final Widget child; @override Widget build(BuildContext context) { final path=GoRouterState.of(context).uri.path; final routes=['/today','/plan','/debts','/transactions','/profile']; return Scaffold(body: child, bottomNavigationBar: NavigationBar(selectedIndex: routes.indexOf(path).clamp(0,4), onDestinationSelected:(i)=>context.go(routes[i]), destinations: const [NavigationDestination(icon: Icon(Icons.today_outlined), label:'Сегодня'), NavigationDestination(icon:Icon(Icons.route_outlined),label:'План'), NavigationDestination(icon:Icon(Icons.credit_card),label:'Долги'), NavigationDestination(icon:Icon(Icons.receipt_long),label:'Операции'), NavigationDestination(icon:Icon(Icons.person_outline),label:'Профиль')])); } }

String money(Object? minor, [String currency='RUB']) { final value=(minor as num? ?? 0).toInt(); return '${(value/100).toStringAsFixed(0).replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'),(_)=>' ')} ${currency=='RUB'?'₽':currency}'; }

class TodayScreen extends ConsumerWidget { const TodayScreen({super.key}); @override Widget build(BuildContext context, WidgetRef ref) => Scaffold(appBar: AppBar(title: const Text('Сегодня')), body: ref.watch(planProvider).when(loading:()=>const Center(child:CircularProgressIndicator()), error:(e,_)=>ErrorView(onRetry:()=>ref.invalidate(planProvider)), data:(p){final s=p['snapshot'] as Map<String,dynamic>; final a=p['action'] as Map<String,dynamic>; return RefreshIndicator(onRefresh:()=>ref.refresh(planProvider.future), child:ListView(padding:const EdgeInsets.all(20),children:[Text(a['title'] as String,style:Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight:FontWeight.bold)),const SizedBox(height:10),Text(money(a['amount']),style:Theme.of(context).textTheme.displaySmall),const SizedBox(height:28),Card(child:Padding(padding:const EdgeInsets.all(20),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[const Text('Безопасно потратить'),Text(money(s['safe_to_spend']),style:const TextStyle(fontSize:34,fontWeight:FontWeight.w700)),Text('до ${p['next_income_date']??'подтверждения дохода'} · ${money(s['safe_daily_amount'])} в день')]))),ListTile(title:const Text('Этап пути'),subtitle:Text(p['state'].toString().toUpperCase()),trailing:const Icon(Icons.arrow_forward)),ListTile(title:const Text('Прогнозируемый остаток'),trailing:Text(money(s['projected_balance_before_next_income'])))])); })); }
}
class ErrorView extends StatelessWidget { const ErrorView({required this.onRetry,super.key}); final VoidCallback onRetry; @override Widget build(BuildContext context)=>Center(child:Padding(padding:const EdgeInsets.all(24),child:Column(mainAxisSize:MainAxisSize.min,children:[const Icon(Icons.cloud_off,size:48),const SizedBox(height:12),const Text('Нет связи. Последний сохранённый план будет доступен после первой синхронизации.',textAlign:TextAlign.center),TextButton(onPressed:onRetry,child:const Text('Повторить'))]))); }

class PlanScreen extends ConsumerWidget { const PlanScreen({super.key}); @override Widget build(BuildContext context,WidgetRef ref)=>Scaffold(appBar:AppBar(title:const Text('План')),body:ref.watch(planProvider).when(loading:()=>const Center(child:CircularProgressIndicator()),error:(e,_)=>ErrorView(onRetry:()=>ref.invalidate(planProvider)),data:(p){final f=p['debt_forecasts'] as Map<String,dynamic>;return ListView(padding:const EdgeInsets.all(20),children:[const Text('Ваш путь',style:TextStyle(fontSize:30,fontWeight:FontWeight.bold)),const SizedBox(height:20),for(final stage in ['Стабилизация','Выход','Подушка']) ListTile(leading:Icon(stage=='Выход'?Icons.radio_button_checked:Icons.circle_outlined),title:Text(stage)),const Divider(),const Text('Сравнение стратегий',style:TextStyle(fontSize:20,fontWeight:FontWeight.bold)),for(final e in f.entries) Card(child:ListTile(title:Text(e.key=='avalanche'?'Avalanche · высокая ставка':'Snowball · малый долг'),subtitle:Text(e.value['debt_free_date']?.toString()??'Нужен больший платёж'),trailing:Text(money(e.value['total_paid']))))]);})); }
class DebtsScreen extends ConsumerWidget { const DebtsScreen({super.key}); @override Widget build(BuildContext context,WidgetRef ref)=>Scaffold(appBar:AppBar(title:const Text('Долги')),body:ref.watch(debtsProvider).when(loading:()=>const Center(child:CircularProgressIndicator()),error:(e,_)=>ErrorView(onRetry:()=>ref.invalidate(debtsProvider)),data:(items)=>ListView(padding:const EdgeInsets.all(16),children:[for(final d in items) Card(child:Padding(padding:const EdgeInsets.all(18),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(d['name'],style:const TextStyle(fontSize:20,fontWeight:FontWeight.bold)),Text(money(d['balance'],d['currency'])),Text('${(d['annual_rate_bps']/100).toStringAsFixed(1)}% · минимум ${money(d['minimum_payment'])}')])))]))); }
class TransactionsScreen extends ConsumerWidget { const TransactionsScreen({super.key}); @override Widget build(BuildContext context,WidgetRef ref)=>Scaffold(appBar:AppBar(title:const Text('Операции')),body:const Center(child:Text('Операции появятся после добавления')),floatingActionButton:FloatingActionButton.extended(onPressed:() async {final accounts=await ref.read(apiProvider).accounts();if(context.mounted)showModalBottomSheet(context:context,isScrollControlled:true,builder:(_)=>AddTransaction(accountId:accounts.first['id'] as String));},icon:const Icon(Icons.add),label:const Text('Добавить'))); }
class AddTransaction extends ConsumerStatefulWidget { const AddTransaction({required this.accountId,super.key}); final String accountId; @override ConsumerState<AddTransaction> createState()=>_AddTransactionState(); }
class _AddTransactionState extends ConsumerState<AddTransaction>{final amount=TextEditingController();final description=TextEditingController();@override Widget build(BuildContext context)=>Padding(padding:EdgeInsets.fromLTRB(24,24,24,MediaQuery.viewInsetsOf(context).bottom+24),child:Column(mainAxisSize:MainAxisSize.min,children:[const Text('Новый расход',style:TextStyle(fontSize:24,fontWeight:FontWeight.bold)),TextField(controller:amount,keyboardType:TextInputType.number,decoration:const InputDecoration(labelText:'Сумма, ₽')),TextField(controller:description,decoration:const InputDecoration(labelText:'Описание')),const SizedBox(height:20),FilledButton(onPressed:()async{await ref.read(apiProvider).transaction({'account_id':widget.accountId,'kind':'expense','amount':int.parse(amount.text)*100,'currency':'RUB','category':'other','description':description.text});ref.invalidate(planProvider);if(context.mounted)Navigator.pop(context);},child:const Text('Добавить'))]));}
class ProfileScreen extends StatelessWidget { const ProfileScreen({super.key}); @override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:const Text('Профиль')),body:ListView(children:[const ListTile(leading:Icon(Icons.language),title:Text('Язык'),trailing:Text('Русский')),const ListTile(leading:Icon(Icons.currency_ruble),title:Text('Базовая валюта'),trailing:Text('RUB')),ListTile(leading:const Icon(Icons.download),title:const Text('Экспорт данных'),onTap:(){}),ListTile(leading:const Icon(Icons.fact_check_outlined),title:const Text('Еженедельная сверка'),onTap:(){}),ListTile(leading:const Icon(Icons.science_outlined),title:const Text('Что если'),onTap:(){}),const Divider(),ListTile(leading:const Icon(Icons.delete_outline),title:const Text('Удалить аккаунт'),textColor:Colors.amber,onTap:(){})])); }
