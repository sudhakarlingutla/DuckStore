export const COLORS = ['Red', 'Green', 'Yellow', 'Black'] as const;

export type Color = (typeof COLORS)[number];
