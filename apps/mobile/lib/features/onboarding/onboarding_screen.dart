import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/auth/auth_controller.dart';
import 'onboarding_models.dart';

class OnboardingScreen extends ConsumerStatefulWidget { const OnboardingScreen({super.key}); @override ConsumerState<OnboardingScreen> createState()=>_State(); }
class _State extends ConsumerState<OnboardingScreen> {
  final draft=OnboardingDraft(); final value=TextEditingController(); String? error; bool busy=false;
  static const titles=['Какая у вас базовая валюта?','Сколько денег доступно сейчас?','Источники ближайших доходов','Обязательные расходы','Отдельные долги','Какой резерв защитить?','Проверьте данные'];
  @override void initState(){super.initState(); _restore();}
  Future<void> _restore() async { final raw=await ref.read(storageProvider).read('onboarding_draft'); if(raw==null)return; final json=jsonDecode(raw) as Map<String,dynamic>; if(!mounted)return; setState(() => draft.restore(json)); }
  Future<void> _save() => ref.read(storageProvider).write('onboarding_draft',jsonEncode(draft.toJson()));
  @override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:Text('${draft.step+1} из 7'),leading:IconButton(icon:Icon(draft.step==0?Icons.close:Icons.arrow_back),onPressed:(){if(draft.step==0){context.go('/welcome');}else{setState(()=>draft.step--);_save();}})),body:SafeArea(child:Padding(padding:const EdgeInsets.all(24),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[LinearProgressIndicator(value:(draft.step+1)/7),const SizedBox(height:28),Text(titles[draft.step],style:Theme.of(context).textTheme.headlineMedium),const SizedBox(height:24),Expanded(child:_content()),if(error!=null)Text(error!,style:const TextStyle(color:Colors.amber)),FilledButton(onPressed:busy?null:_next,style:FilledButton.styleFrom(minimumSize:const Size.fromHeight(54)),child:Text(draft.step==6?'Получить план':'Продолжить'))])));
  Widget _content(){ if(draft.step==0)return Column(children:['RUB','USD','EUR'].map((c)=>RadioListTile<String>(value:c,groupValue:draft.currency,onChanged:(v)=>setState(()=>draft.currency=v!),title:Text(c))).toList()); if(draft.step==1||draft.step==5)return TextField(controller:value,keyboardType:const TextInputType.numberWithOptions(decimal:true),decoration:InputDecoration(labelText:draft.step==1?'Доступно':'Минимальный резерв'));
    if(draft.step==2)return _list('Добавить доход',draft.incomes.map((e)=>'${e.name}: ${e.amount}').toList(),()=>setState(()=>draft.incomes.add(IncomeDraft(amount:100000,date:DateTime.now().add(const Duration(days:14))))));
    if(draft.step==3)return _list('Добавить расход',draft.expenses.map((e)=>'${e.name}: ${e.amount}').toList(),()=>setState(()=>draft.expenses.add(ExpenseDraft(amount:100000,date:DateTime.now().add(const Duration(days:7))))));
    if(draft.step==4)return _list('Добавить долг',draft.debts.map((e)=>'${e.name}: ${e.balance}').toList(),()=>setState(()=>draft.debts.add(DebtDraft(balance:100000,minimum:10000))));
    return Text('Валюта: ${draft.currency}\nДоходов: ${draft.incomes.length}\nРасходов: ${draft.expenses.length}\nДолгов: ${draft.debts.length}'); }
  Widget _list(String label,List<String> rows,VoidCallback add)=>ListView(children:[...rows.map((e)=>ListTile(title:Text(e))),OutlinedButton.icon(onPressed:add,icon:const Icon(Icons.add),label:Text(label))]);
  Future<void> _next() async { error=null; if(draft.step==1||draft.step==5){final amount=parseMoney(value.text);if(amount==null){setState(()=>error='Введите корректную неотрицательную сумму');return;}if(draft.step==1)draft.available=amount;else draft.reserve=amount;value.clear();} if(draft.step<6){setState(()=>draft.step++);await _save();return;} setState(()=>busy=true);try{final api=ref.read(apiClientProvider);if(!await api.hasSession()){await api.register('user-${DateTime.now().microsecondsSinceEpoch}@vyhod.local','local-${DateTime.now().microsecondsSinceEpoch}');await ref.read(authControllerProvider.notifier).registered();}await api.completeOnboarding(draft.payload(),'onboarding-${draft.hashCode}');ref.read(authControllerProvider.notifier).completed();if(mounted)context.go('/today');}catch(e){setState(()=>error=e.toString());}finally{if(mounted)setState(()=>busy=false);}}
}
