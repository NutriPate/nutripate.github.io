import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';
import { planById, yookassaAuth } from '../_shared/config.ts';

const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

async function yookassaGet(path: string) {
  const response = await fetch(`https://api.yookassa.ru/v3/${path}`, {
    headers: { Authorization: yookassaAuth() },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error('yookassa status check failed');
  return body;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  try {
    const event = await req.json().catch(() => ({}));
    const name = String(event?.event || '');
    if (name === 'refund.succeeded') {
      const refund = await yookassaGet(`refunds/${encodeURIComponent(event?.object?.id || '')}`);
      if (refund.status !== 'succeeded' || !refund.payment_id) return json({ ok: true });
      const { error } = await service.rpc('apply_yookassa_payment', {
        p_yookassa_id: refund.payment_id,
        p_status: 'refunded',
        p_email: null,
        p_user_id: null,
        p_months: null,
        p_plan_id: null,
        p_amount: null,
        p_raw: refund,
      });
      if (error) throw error;
      return json({ ok: true });
    }

    const notifiedId = event?.object?.id;
    if (!notifiedId || (name !== 'payment.succeeded' && name !== 'payment.canceled')) {
      return json({ ok: true });
    }
    const payment = await yookassaGet(`payments/${encodeURIComponent(notifiedId)}`);
    const plan = planById(String(payment?.metadata?.planId || payment?.metadata?.plan_code || ''));
    const email = String(payment?.metadata?.email || payment?.receipt?.customer?.email || '').trim().toLowerCase();
    let userId: string | null = null;
    if (email) {
      const { data, error } = await service.rpc('user_id_by_email', { p_email: email });
      if (error) throw error;
      userId = data || null;
    }
    const amount = Number(payment?.amount?.value || 0).toFixed(2);
    const expected = plan ? Number(plan.amount).toFixed(2) : '';
    const paid = payment.status === 'succeeded'
      && payment.paid === true
      && payment.amount?.currency === 'RUB'
      && !!plan
      && amount === expected;
    const status = name === 'payment.canceled' || payment.status === 'canceled'
      ? 'canceled'
      : paid
        ? 'succeeded'
        : String(payment.status || 'failed');
    if (name === 'payment.succeeded' && !paid) {
      return json({ error: 'payment not confirmed' }, 500);
    }
    const { error } = await service.rpc('apply_yookassa_payment', {
      p_yookassa_id: payment.id,
      p_status: status,
      p_email: email || null,
      p_user_id: userId,
      p_months: plan?.months || null,
      p_plan_id: plan?.code || null,
      p_amount: plan ? plan.amount : null,
      p_raw: payment,
    });
    if (error) throw error;
    return json({ ok: true });
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'webhook failed');
    return json({ error: 'retry' }, 500);
  }
});
