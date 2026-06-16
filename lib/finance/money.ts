import { Prisma } from '@prisma/client';

/**
 * Money helper (Finance v2 — Phase 0). The single arithmetic path for money.
 *
 * Money is stored as Prisma `Decimal(18,4)` (decimal.js-light under the hood). NEVER use JS
 * `+` / `Number()` on money — Float is a rounding-bug class, which is exactly the defect this
 * upgrade fixes. All amounts flow through these helpers; the column type carries 4 dp, display
 * rounds half-up to 2 dp. Decimal serialises as a STRING over JSON, so API routes format
 * explicitly with `formatMoney` / `.toFixed`.
 */
export type Money = Prisma.Decimal;
export const ZERO = new Prisma.Decimal(0);
export const STORE_SCALE = 4; // Decimal(18,4)
export const DISPLAY_DP = 2;

/** Coerce number | string | Decimal | null → Decimal (null/invalid → 0). */
export function money(v: number | string | Prisma.Decimal | null | undefined): Money {
  if (v == null) return new Prisma.Decimal(0);
  if (v instanceof Prisma.Decimal) return v;
  try {
    return new Prisma.Decimal(v);
  } catch {
    return new Prisma.Decimal(0);
  }
}

export const add = (a: unknown, b: unknown): Money => money(a as never).plus(money(b as never));
export const sub = (a: unknown, b: unknown): Money => money(a as never).minus(money(b as never));
export const mul = (a: unknown, b: unknown): Money => money(a as never).times(money(b as never));
export const div = (a: unknown, b: unknown): Money => money(a as never).div(money(b as never));

/** Sum a list of money-ish values exactly. */
export function sumMoney(xs: Array<number | string | Prisma.Decimal | null | undefined>): Money {
  return xs.reduce<Money>((s, x) => s.plus(money(x)), new Prisma.Decimal(0));
}

export const isZero = (a: unknown): boolean => money(a as never).isZero();
export const isNeg = (a: unknown): boolean => money(a as never).isNegative();
/** -1 | 0 | 1 */
export const cmp = (a: unknown, b: unknown): number => money(a as never).comparedTo(money(b as never));
export const eqMoney = (a: unknown, b: unknown): boolean => cmp(a, b) === 0;

/** Round to display precision (2 dp), half-up (decimal.js default rounding). */
export function round2(a: unknown): Money {
  return new Prisma.Decimal(money(a as never).toFixed(DISPLAY_DP));
}

/** Round to stored precision (4 dp). */
export function roundStore(a: unknown): Money {
  return new Prisma.Decimal(money(a as never).toFixed(STORE_SCALE));
}

/** Human display string, e.g. "1500.00 EGP". */
export function formatMoney(a: unknown, currency = 'EGP'): string {
  return `${money(a as never).toFixed(DISPLAY_DP)} ${currency}`;
}

/**
 * Split `total` into parts whose sum EXACTLY equals total (no lost piastres). `parts` is either
 * a count (equal split) or integer weights. The rounding remainder lands on the LAST part — the
 * canonical way to schedule installments or apportion tax without a 0.01 drift.
 */
export function allocate(total: unknown, parts: number | number[]): Money[] {
  const t = round2(total);
  const weights = Array.isArray(parts) ? parts : Array(Math.max(0, parts)).fill(1);
  const wsum = weights.reduce((s, w) => s + w, 0);
  if (wsum <= 0) return [];
  const out: Money[] = [];
  let acc = new Prisma.Decimal(0);
  for (let i = 0; i < weights.length; i++) {
    if (i === weights.length - 1) {
      out.push(sub(t, acc));
    } else {
      const part = round2(t.times(weights[i]).div(wsum));
      out.push(part);
      acc = acc.plus(part);
    }
  }
  return out;
}

/** Percentage of an amount, rounded to 2 dp (e.g. VAT, late fee). */
export function percentOf(amount: unknown, percent: number): Money {
  return round2(money(amount as never).times(percent).div(100));
}

/** Legacy interop during the Float→Decimal migration. Avoid in new code. */
export const toNumber = (a: unknown): number => money(a as never).toNumber();
