// Server side of the pricing catalogue: visitor country and what can be bought (env Stripe price ids,
// SIGNATURE_PROVIDER_LIVE). Server-only: price ids never reach the browser — pages get booleans.

import { cookies, headers } from 'next/headers';
import { availabilityFrom, COUNTRY_COOKIE, resolveCountryFrom, type Availability, type CountryCode } from './pricing';

export function checkoutAvailability(): Availability {
  return availabilityFrom(process.env);
}

/** Country for this request (see resolveCountryFrom for the order). */
export function requestCountry(param?: string | string[] | null): CountryCode {
  const h = headers();
  const names = ['x-vercel-ip-country', 'cf-ipcountry', 'x-country-code', 'x-appengine-country', 'accept-language'];
  return resolveCountryFrom({
    param: Array.isArray(param) ? param[0] : param,
    cookie: cookies().get(COUNTRY_COOKIE)?.value,
    headers: Object.fromEntries(names.map(n => [n, h.get(n)])),
  });
}
