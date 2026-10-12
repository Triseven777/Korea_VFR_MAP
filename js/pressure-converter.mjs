export const HPA_PER_INHG = 33.8639;
export const MIN_HPA = 800;
export const MAX_HPA = 1100;
export function hPaToInHg(hpa) {
  if (!Number.isFinite(hpa)) throw new TypeError('Finite hPa required');
  return hpa / HPA_PER_INHG;
}
export function inHgToHpa(inHg) {
  if (!Number.isFinite(inHg)) throw new TypeError('Finite inHg required');
  return inHg * HPA_PER_INHG;
}
export function isValidHpa(hpa) { return Number.isFinite(hpa) && hpa >= MIN_HPA && hpa <= MAX_HPA; }
export function parsePressureInput(text, unit) {
  const raw = text.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) return null;
  if (unit === 'hPa') return /^\d+$/.test(raw) ? (Number(raw) === 1013 ? 1013.25 : Number(raw)) : null;
  return !raw.includes('.') && raw.length === 4 ? Number(raw) / 100 : Number(raw);
}
export function angleDelta(current, previous) { return ((current - previous + 540) % 360) - 180; }
