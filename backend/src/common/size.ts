export const SIZES = ['XLarge', 'Large', 'Medium', 'Small', 'XSmall'] as const;

export type Size = (typeof SIZES)[number];
