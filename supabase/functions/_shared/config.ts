export const plans = {
  month: { months: 1, amount: '299.00', title: 'NutriPate PRO — 1 месяц' },
  half_year: { months: 6, amount: '1599.00', title: 'NutriPate PRO — 6 месяцев' },
  year: { months: 12, amount: '2999.00', title: 'NutriPate PRO — 12 месяцев' },
} as const;

export type PlanCode = keyof typeof plans;

export function yookassaAuth() {
  const shopId = Deno.env.get('YOOKASSA_SHOP_ID');
  const secret = Deno.env.get('YOOKASSA_SECRET_KEY');
  if (!shopId || !secret) throw new Error('YooKassa secrets are not configured');
  return 'Basic ' + btoa(`${shopId}:${secret}`);
}
