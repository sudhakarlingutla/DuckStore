import { SIZES, type Size } from '../../common/size.js';
import { SHIPPING_MODES, type ShippingMode } from '../shipping-mode.js';
import {
  choosePackaging,
  type PackageType,
  type ProtectionType,
} from './packaging.js';

const POLYSTYRENE: ProtectionType[] = ['Polystyrene balls'];
const BUBBLE_WRAP: ProtectionType[] = ['Bubble-wrap bags'];
const BEADS_AND_BUBBLE_WRAP: ProtectionType[] = [
  'Moisture-absorbing beads',
  'Bubble-wrap bags',
];

// The whole rule table from the brief: every size with every shipping mode.
const CASES: [Size, ShippingMode, PackageType, ProtectionType[]][] = [
  ['XLarge', 'Land', 'Wood', POLYSTYRENE],
  ['XLarge', 'Air', 'Wood', POLYSTYRENE],
  ['XLarge', 'Sea', 'Wood', BEADS_AND_BUBBLE_WRAP],
  ['Large', 'Land', 'Wood', POLYSTYRENE],
  ['Large', 'Air', 'Wood', POLYSTYRENE],
  ['Large', 'Sea', 'Wood', BEADS_AND_BUBBLE_WRAP],
  ['Medium', 'Land', 'Cardboard', POLYSTYRENE],
  ['Medium', 'Air', 'Cardboard', POLYSTYRENE],
  ['Medium', 'Sea', 'Cardboard', BEADS_AND_BUBBLE_WRAP],
  ['Small', 'Land', 'Plastic', POLYSTYRENE],
  ['Small', 'Air', 'Plastic', BUBBLE_WRAP],
  ['Small', 'Sea', 'Plastic', BEADS_AND_BUBBLE_WRAP],
  ['XSmall', 'Land', 'Plastic', POLYSTYRENE],
  ['XSmall', 'Air', 'Plastic', BUBBLE_WRAP],
  ['XSmall', 'Sea', 'Plastic', BEADS_AND_BUBBLE_WRAP],
];

describe('choosePackaging', () => {
  it.each(CASES)(
    '%s duck by %s: %s package',
    (size, shippingMode, packageType, protectionTypes) => {
      expect(choosePackaging(size, shippingMode)).toEqual({
        packageType,
        protectionTypes,
      });
    },
  );

  it('is tested for every size and shipping mode there is', () => {
    expect(CASES).toHaveLength(SIZES.length * SHIPPING_MODES.length);
  });
});
