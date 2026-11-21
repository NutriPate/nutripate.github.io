import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';
import { plans, yookassaAuth, type PlanCode } from '../_shared/config.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const service = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const authClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Войдите в аккаунт перед оплатой' }, 401);
    const { data: { user }, error: userError } = await authClient.auth.getUser(token);
    if (userError || !user?.email) return json({ error: 'Для оплаты нужна подтверждённая почта' }, 401);

    const body = await req.json().catch(() => ({}));
    const planCode = body.plan_code as PlanCode;
    const plan = plans[planCode];
    if (!plan) return json({ error: 'Неизвестный тариф' }, 400);

    const orderId = crypto.randomUUID();
    const { error: insertError } = await service.from('payments').insert({
      id: orderId,
      user_id: user.id,
      provider: 'yookassa',
      plan_code: planCode,
      months: plan.months,
      amount: plan.amount,
      currency: 'RUB',
      status: 'pending',
      customer_email: user.email,
    });
    if (insertError) throw insertError;

    const response = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        Authorization: yookassaAuth(),
        'Idempotence-Key': orderId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: { value: plan.amount, currency: 'RUB' },
        capture: true,
        description: plan.title,
        metadata: { order_id: orderId, user_id: user.id, plan_code: planCode, months: String(plan.months) },
        confirmation: { type: 'redirect', return_url: 'https://nutripate.github.io/webversion/?payment=return' },
        receipt: {
          customer: { email: user.email },
          items: [{ description: plan.title, quantity: '1.00', amount: { value: plan.amount, currency: 'RUB' }, vat_code: 1, payment_subject: 'service', payment_mode: 'full_payment' }],
        },
      }),
    });
    const payment = await response.json();
    if (!response.ok || !payment.id) {
      await service.from('payments').update({ status: 'failed', raw_event: payment }).eq('id', orderId);
      return json({ error: 'Не удалось создать платёж' }, 502);
    }
    await service.from('payments').update({ provider_payment_id: payment.id, raw_event: payment }).eq('id', orderId);
    return json({ payment_id: payment.id, confirmation_url: payment.confirmation?.confirmation_url });
  } catch (error) {
    console.error(error);
    return json({ error: 'Ошибка создания платежа' }, 500);
  }
});
