// Public config — safe to ship in the bundle.
// Set VITE_LEMON_CHECKOUT_URL to your Lemon Squeezy "Buy" link, e.g.
// https://your-store.lemonsqueezy.com/buy/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
export const CHECKOUT_URL = import.meta.env.VITE_LEMON_CHECKOUT_URL || '';

export const PRO_PRICE = '$4.90';
