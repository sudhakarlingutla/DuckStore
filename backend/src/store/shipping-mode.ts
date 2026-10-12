export const SHIPPING_MODES = ['Land', 'Air', 'Sea'] as const;

export type ShippingMode = (typeof SHIPPING_MODES)[number];
