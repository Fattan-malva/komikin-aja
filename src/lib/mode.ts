/** Mode tampilan global: "k" = komik biasa, "h" = komik-h saja. */
export const MODE_COOKIE = 'komikin-mode'

export type ComicMode = 'k' | 'h'

export function isHMode(value: string | undefined): boolean {
  return value === 'h'
}
