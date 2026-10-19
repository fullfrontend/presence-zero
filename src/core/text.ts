/** Optional presentation callback. Domain code stays independent of React and locale storage. */
export type TranslateText = (message: string, values?: Record<string, string | number | null | undefined>) => string
export const englishText: TranslateText = (message, values) => values
  ? message.replace(/\{(\w+)\}/g, (match, key: string) => values[key] == null ? match : String(values[key]))
  : message
