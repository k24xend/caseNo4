import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/auth/auth_controller.dart';
import '../features/debts/debts_module.dart';
import '../features/onboarding/onboarding_screen.dart';
import '../features/plan/plan_module.dart';
import '../features/profile/profile_screen.dart';
import '../features/today/today_screen.dart';
import '../features/transactions/transactions_module.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final session = ref.watch(authControllerProvider);
  return GoRouter(
    initialLocation: '/welcome',
    redirect: (_, state) {
      final location = state.matchedLocation;
      final public = location == '/welcome' || location == '/login' || location == '/register';
      if (session == SessionState.loading) return null;
      if (session == SessionState.anonymous) return public ? null : '/welcome';
      if (session == SessionState.onboarding) return location == '/onboarding' ? null : '/onboarding';
      if (session == SessionState.authenticated && (public || location == '/onboarding')) return '/today';
      return null;
    },
    routes: [
      GoRoute(path: '/welcome', builder: (_, __) => const WelcomeScreen()),
      GoRoute(path: '/login', builder: (_, __) => const AuthScreen(registering: false)),
      GoRoute(path: '/register', builder: (_, __) => const AuthScreen(registering: true)),
      GoRoute(path: '/onboarding', builder: (_, __) => const OnboardingScreen()),
      ShellRoute(
        builder: (_, state, child) => AppShell(location: state.matchedLocation, child: child),
        routes: [
          GoRoute(path: '/today', builder: (_, __) => const TodayScreen()),
          GoRoute(path: '/plan', builder: (_, __) => const PlanScreen()),
          GoRoute(path: '/debts', builder: (_, __) => const DebtsScreen()),
          GoRoute(path: '/transactions', builder: (_, __) => const TransactionsScreen()),
          GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
        ],
      ),
    ],
  );
});

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.location, required this.child});
  final String location; final Widget child;
  static const paths=['/today','/plan','/debts','/transactions','/profile'];
  @override Widget build(BuildContext context) { final index=paths.indexOf(location).clamp(0,paths.length-1); return Scaffold(body: child,bottomNavigationBar: NavigationBar(selectedIndex:index,onDestinationSelected:(value)=>context.go(paths[value]),destinations:const [NavigationDestination(icon:Icon(Icons.today),label:'Сегодня'),NavigationDestination(icon:Icon(Icons.route),label:'План'),NavigationDestination(icon:Icon(Icons.credit_card),label:'Долги'),NavigationDestination(icon:Icon(Icons.receipt_long),label:'Операции'),NavigationDestination(icon:Icon(Icons.person),label:'Профиль')])); }
}

class WelcomeScreen extends ConsumerWidget {
  const WelcomeScreen({super.key});
  @override Widget build(BuildContext context, WidgetRef ref) => Scaffold(body: SafeArea(child: Padding(padding: const EdgeInsets.all(28),child: Column(crossAxisAlignment: CrossAxisAlignment.start,children:[const Spacer(),Text('ВЫХОД',style:Theme.of(context).textTheme.displayLarge),const Text('Не просто считай расходы. Найди путь наружу.'),const Spacer(),FilledButton(onPressed:()=>context.go('/register'),child:const Text('Создать аккаунт')),TextButton(onPressed:()=>context.go('/login'),child:const Text('У меня есть аккаунт')),TextButton(onPressed:() async { await ref.read(authControllerProvider.notifier).demoLogin(); },child:const Text('Посмотреть демо'))]))));
}

class AuthScreen extends ConsumerStatefulWidget { const AuthScreen({super.key,required this.registering}); final bool registering; @override ConsumerState<AuthScreen> createState()=>_AuthScreenState(); }
class _AuthScreenState extends ConsumerState<AuthScreen> {
  final formKey=GlobalKey<FormState>(); final email=TextEditingController(),password=TextEditingController(); bool submitting=false;
  @override void dispose(){email.dispose();password.dispose();super.dispose();}
  @override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:Text(widget.registering?'Регистрация':'Вход')),body:SafeArea(child:Form(key:formKey,child:ListView(padding:const EdgeInsets.all(24),children:[TextFormField(controller:email,keyboardType:TextInputType.emailAddress,autofillHints:const[AutofillHints.email],decoration:const InputDecoration(labelText:'Email'),validator:(v)=>v!=null&&v.contains('@')?null:'Введите корректный email'),TextFormField(controller:password,obscureText:true,autofillHints:const[AutofillHints.password],decoration:const InputDecoration(labelText:'Пароль'),validator:(v)=>(v?.length??0)>=8?null:'Минимум 8 символов'),const SizedBox(height:24),FilledButton(onPressed:submitting?null:submit,child:submitting?const CircularProgressIndicator():Text(widget.registering?'Зарегистрироваться':'Войти'))]))));
  Future<void> submit() async {if(!formKey.currentState!.validate())return;setState(()=>submitting=true);try{final controller=ref.read(authControllerProvider.notifier);if(widget.registering){await controller.register(email.text.trim(),password.text);}else{await controller.login(email.text.trim(),password.text);}}catch(_){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(widget.registering?'Не удалось зарегистрироваться. Возможно, email уже используется.':'Неверный email, пароль или нет соединения.')));}finally{if(mounted)setState(()=>submitting=false);}}
}
