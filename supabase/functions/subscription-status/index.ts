import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ pro: false, pro_until: null }, 401);
  const { data: { user } } = await client.auth.getUser(token);
  if (!user) return json({ pro: false, pro_until: null }, 401);
  const { data } = await client.from('subscriptions').select('status, ends_at, plan_code').eq('user_id', user.id).order('ends_at', { ascending: false }).limit(1).maybeSingle();
  const until = data?.ends_at || null;
  return json({ pro: data?.status === 'active' && !!until && new Date(until) > new Date(), pro_until: until, plan_code: data?.plan_code || null });
});
