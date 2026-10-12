import type { Size } from '../../common/size.js';
import type { ShippingMode } from '../shipping-mode.js';

export type PackageType = 'Wood' | 'Cardboard' | 'Plastic';

export type ProtectionType =
  'Polystyrene balls' | 'Bubble-wrap bags' | 'Moisture-absorbing beads';

export interface Packaging {
  packageType: PackageType;
  protectionTypes: ProtectionType[];
}

/**
 * The package depends only on the duck's size. Typing this as a Record over
 * Size means a new size will not compile until it is given a package.
 */
const PACKAGE_FOR_SIZE: Record<Size, PackageType> = {
  XLarge: 'Wood',
  Large: 'Wood',
  Medium: 'Cardboard',
  Small: 'Plastic',
  XSmall: 'Plastic',
};

/**
 * One protection strategy per shipping mode (the Strategy pattern, as a
 * lookup of functions). Adding a shipping mode means adding one entry here;
 * nothing else in this file changes.
 */
type ProtectionStrategy = (packageType: PackageType) => ProtectionType[];

const PROTECTION_FOR_MODE: Record<ShippingMode, ProtectionStrategy> = {
  Land: () => ['Polystyrene balls'],
  Air: (packageType) =>
    packageType === 'Plastic' ? ['Bubble-wrap bags'] : ['Polystyrene balls'],
  Sea: () => ['Moisture-absorbing beads', 'Bubble-wrap bags'],
};

export function choosePackaging(
  size: Size,
  shippingMode: ShippingMode,
): Packaging {
  const packageType = PACKAGE_FOR_SIZE[size];
  return {
    packageType,
    protectionTypes: PROTECTION_FOR_MODE[shippingMode](packageType),
  };
}
