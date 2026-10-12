import { percentIncrease, type PricingRule } from '../pricing-rule.js';

interface Destination {
  code: string;
  name: string;
  percent: number;
}

/** Keyed by the country name in lower case. */
const NAMED_DESTINATIONS: Record<string, Destination> = {
  usa: { code: 'DESTINATION_USA', name: 'USA', percent: 18 },
  bolivia: { code: 'DESTINATION_BOLIVIA', name: 'Bolivia', percent: 13 },
  india: { code: 'DESTINATION_INDIA', name: 'India', percent: 19 },
};

const OTHER_DESTINATION_PERCENT = 15;

/**
 * USA adds 18%, Bolivia 13%, India 19%, anywhere else 15%.
 *
 * The country is matched by name, ignoring case and surrounding spaces.
 * Only the three names in the brief are recognised: "United States" or "US"
 * is treated as any other destination. A real shop would take ISO country
 * codes; the brief gives names, so this follows the brief.
 */
export const destinationRule: PricingRule = (order, totalSoFar) => {
  const country = order.destinationCountry.trim();
  const destination = NAMED_DESTINATIONS[country.toLowerCase()] ?? {
    code: 'DESTINATION_OTHER',
    name: country,
    percent: OTHER_DESTINATION_PERCENT,
  };

  return [
    percentIncrease(
      destination.code,
      `Destination ${destination.name}: +${destination.percent}%`,
      destination.percent,
      totalSoFar,
    ),
  ];
};
