// Public config — safe to ship in the bundle.
// Set VITE_LEMON_CHECKOUT_URL to your Lemon Squeezy "Buy" link, e.g.
// https://your-store.lemonsqueezy.com/buy/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
export const CHECKOUT_URL = import.meta.env.VITE_LEMON_CHECKOUT_URL || '';

// Optional second checkout: a Stripe Payment Link whose after-payment redirect
// is set to  https://YOUR-SITE/?stripe_session={CHECKOUT_SESSION_ID}
export const STRIPE_PAYMENT_LINK = import.meta.env.VITE_STRIPE_PAYMENT_LINK || '';

export const PRO_PRICE = '$4.90';
