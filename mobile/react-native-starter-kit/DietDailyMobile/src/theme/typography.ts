const baseFontFamily = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
}

const baseFontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
}

const baseFontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
}

const makeLineHeight = (size: number, multiplier = 1.4) =>
  Math.round(size * multiplier)

export const typography = {
  fontFamily: baseFontFamily,
  fontSize: baseFontSize,
  fontWeight: baseFontWeight,
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
  // Convenience aliases to match existing component usage
  sizes: baseFontSize,
  weights: baseFontWeight,
  h2: {
    fontFamily: baseFontFamily.bold,
    fontSize: baseFontSize['2xl'],
    fontWeight: baseFontWeight.bold,
    lineHeight: makeLineHeight(baseFontSize['2xl']),
  },
  h3: {
    fontFamily: baseFontFamily.bold,
    fontSize: baseFontSize.xl,
    fontWeight: baseFontWeight.bold,
    lineHeight: makeLineHeight(baseFontSize.xl),
  },
  subtitle: {
    fontFamily: baseFontFamily.medium,
    fontSize: baseFontSize.lg,
    fontWeight: baseFontWeight.medium,
    lineHeight: makeLineHeight(baseFontSize.lg),
  },
  bodyLarge: {
    fontFamily: baseFontFamily.regular,
    fontSize: baseFontSize.lg,
    fontWeight: baseFontWeight.regular,
    lineHeight: makeLineHeight(baseFontSize.lg, 1.5),
  },
  body: {
    fontFamily: baseFontFamily.regular,
    fontSize: baseFontSize.base,
    fontWeight: baseFontWeight.regular,
    lineHeight: makeLineHeight(baseFontSize.base, 1.5),
  },
  bodySmall: {
    fontFamily: baseFontFamily.regular,
    fontSize: baseFontSize.sm,
    fontWeight: baseFontWeight.regular,
    lineHeight: makeLineHeight(baseFontSize.sm, 1.4),
  },
  caption: {
    fontFamily: baseFontFamily.regular,
    fontSize: baseFontSize.xs,
    fontWeight: baseFontWeight.regular,
    lineHeight: makeLineHeight(baseFontSize.xs, 1.3),
  },
}
