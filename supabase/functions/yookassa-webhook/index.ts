import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';
import { plans, yookassaAuth, type PlanCode } from '../_shared/config.ts';

const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const event = await req.json();
    const paymentId = event?.object?.id;
    if (!paymentId) return json({ ok: true });
    const checkedResponse = await fetch(`https://api.yookassa.ru/v3/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: yookassaAuth() } });
    const payment = await checkedResponse.json();
    const metadata = payment.metadata || {};
    const planCode = metadata.plan_code as PlanCode;
    const plan = plans[planCode];
    const userId = metadata.user_id;
    if (!checkedResponse.ok || !userId || !plan) return json({ ok: true });

    const expected = Number(plan.amount).toFixed(2);
    const actual = Number(payment.amount?.value || 0).toFixed(2);
    const paid = payment.status === 'succeeded' && payment.paid === true && payment.amount?.currency === 'RUB' && actual === expected;
    await service.from('payments').update({ status: paid ? 'succeeded' : String(payment.status || 'failed'), raw_event: payment, paid_at: paid ? new Date().toISOString() : null }).eq('provider_payment_id', paymentId);
    if (!paid) return json({ ok: true });

    const { data: current } = await service.from('subscriptions').select('id, ends_at').eq('user_id', userId).order('ends_at', { ascending: false }).limit(1).maybeSingle();
    const now = new Date();
    const base = current?.ends_at && new Date(current.ends_at) > now ? new Date(current.ends_at) : now;
    const ends = new Date(base);
    ends.setUTCMonth(ends.getUTCMonth() + plan.months);
    const row = { user_id: userId, provider: 'yookassa', provider_payment_id: paymentId, plan_code: planCode, months: plan.months, status: 'active', starts_at: base.toISOString(), ends_at: ends.toISOString() };
    if (current?.id) await service.from('subscriptions').update(row).eq('id', current.id);
    else await service.from('subscriptions').insert(row);
    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({ ok: true });
  }
});
