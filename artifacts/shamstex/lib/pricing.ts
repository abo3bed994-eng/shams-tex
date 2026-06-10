import type { Product } from "@/context/AppContext";

type OfferFields = Pick<Product, "offerPrice" | "retailPrice">;

// A product is "on offer" when it has a positive offer price strictly below its
// regular retail price. Offers only ever apply to the retail (customer) price —
// never to wholesale.
export function isOnOffer(p: OfferFields): boolean {
  return p.offerPrice != null && p.offerPrice > 0 && p.offerPrice < p.retailPrice;
}

// The retail price a customer actually pays: the offer price when on offer,
// otherwise the regular retail price.
export function effectiveRetailPrice(p: OfferFields): number {
  return isOnOffer(p) ? (p.offerPrice as number) : p.retailPrice;
}

// The price to display / charge for the given pricing mode. Wholesale ignores
// offers; retail honours them.
export function displayPriceFor(p: Product, mode: "wholesale" | "retail"): number {
  return mode === "wholesale" ? p.wholesalePrice : effectiveRetailPrice(p);
}
