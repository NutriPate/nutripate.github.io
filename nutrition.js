/* Same RER/MER as Приложение/nutrition.py. Banker's rounding matches Python round(). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.NutriPateNutrition = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function pyRound(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    const sign = n < 0 ? -1 : 1;
    const x = Math.abs(n);
    const floor = Math.floor(x);
    const fraction = x - floor;
    if (Math.abs(fraction - 0.5) < 1e-9) return sign * (floor % 2 === 0 ? floor : floor + 1);
    return sign * Math.round(x);
  }

  function ageMonths(pet) {
    if (pet && pet.ageMonths !== null && pet.ageMonths !== undefined && pet.ageMonths !== '') {
      return Math.trunc(Number(pet.ageMonths));
    }
    const raw = String((pet && pet.birthDate) || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return 24;
    const y = Number(raw.slice(0, 4));
    const m = Number(raw.slice(5, 7));
    const now = new Date();
    return (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  }

  function weightKg(pet) {
    const n = Number(pet && (pet.weightKg != null ? pet.weightKg : pet.weight));
    return Number.isFinite(n) && n > 0 ? n : 4;
  }

  function rer(weight) {
    return 70 * Math.pow(Math.max(Number(weight) || 0, 0.3), 0.75);
  }

  function goalWeight(pet) {
    const weight = weightKg(pet);
    const target = pet ? pet.targetWeightKg != null ? pet.targetWeightKg : pet.targetWeight : null;
    const t = Number(target);
    if (Number.isFinite(t) && t > 0 && t < weight * 0.95) return Math.round(t * 100) / 100;
    return null;
  }

  function isLosing(pet) {
    return goalWeight(pet) !== null && ageMonths(pet) >= 12;
  }

  function isSenior(pet) {
    const months = ageMonths(pet);
    const weight = weightKg(pet);
    if (pet && pet.species === 'cat') return months >= 84;
    if (weight > 40) return months >= 72;
    if (weight > 25) return months >= 84;
    if (weight > 10) return months >= 96;
    return months >= 108;
  }

  function derFactor(pet) {
    const months = ageMonths(pet);
    const weight = weightKg(pet);
    const diags = (pet && pet.diagnoses) || [];
    const activity = (pet && pet.activity) || 'medium';
    const cat = pet && pet.species === 'cat';
    const losing = isLosing(pet);
    let der;
    if (cat) {
      if (months < 4) der = 2.5;
      else if (months < 8) der = 2;
      else if (months < 12) der = 1.8;
      else if (losing) der = 0.8;
      else if (diags.includes('overweight')) der = 1;
      else if (pet && pet.sterilized) der = 1.2;
      else der = 1.4;
      if (!losing) {
        if (activity === 'high') der += 0.1;
        else if (activity === 'very_high') der += 0.2;
      }
    } else {
      if (months < 4) der = 3;
      else if (months < 12) der = 2;
      else if (losing) der = 1;
      else if (diags.includes('overweight')) der = 1.2;
      else if (pet && pet.sterilized) der = 1.4;
      else der = 1.6;
      if (!losing) {
        if (activity === 'high') der += 0.15;
        else if (activity === 'very_high') der += 0.3;
      }
      if (months >= 12 && weight > 40) der *= 0.95;
    }
    if (months >= 12 && !losing && isSenior(pet)) {
      der *= cat ? (months >= 144 ? 1.05 : 0.95) : 0.9;
    }
    return der;
  }

  function kcalAdjust(pet) {
    const n = pyRound(Number(pet && pet.kcalAdjust) || 0);
    return Math.max(-30, Math.min(30, n));
  }

  function kcalBase(pet) {
    const weight = weightKg(pet);
    const factor = derFactor(pet);
    let kcal;
    if (isLosing(pet)) {
      const goal = goalWeight(pet) || weight;
      kcal = Math.max(rer(goal) * factor, 0.6 * rer(weight));
    } else {
      kcal = rer(weight) * factor;
    }
    return pyRound(kcal);
  }

  function kcalNeed(pet) {
    if (!pet) return 0;
    return pyRound(kcalBase(pet) * (1 + kcalAdjust(pet) / 100));
  }

  function portionGrams(pet, food) {
    const kcal100 = Number(food && food.kcalPer100g) || 370;
    const grams = kcalNeed(pet) / kcal100 * 100;
    return Math.max(0, pyRound(grams / 5) * 5);
  }

  return { pyRound, ageMonths, rer, derFactor, kcalBase, kcalNeed, portionGrams, goalWeight, isLosing };
});
