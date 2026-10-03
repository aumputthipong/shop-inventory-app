export function parseOffset(raw: unknown): number | undefined {
  const offset = Number(raw)
  return offset > 0 ? offset : undefined
}
