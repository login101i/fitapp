export function bmiKgM2(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function formatBmi(value: number): string {
  return value.toFixed(1);
}
