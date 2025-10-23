function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue
  }

  const normalized = value.trim().toLowerCase()
  if (['true', '1', 'yes', 'y'].includes(normalized)) {
    return true
  }
  if (['false', '0', 'no', 'n'].includes(normalized)) {
    return false
  }

  return defaultValue
}

export const appConfig = {
  requireDatabaseFood: parseBoolean(
    process.env.EXPO_PUBLIC_REQUIRE_DATABASE_FOOD,
    false
  ),
}

export type AppConfig = typeof appConfig
