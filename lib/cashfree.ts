const SDK_URL = 'https://sdk.cashfree.com/js/v3/cashfree.js';

interface CashfreeSdk {
  checkout(opts: { paymentSessionId: string; redirectTarget?: '_self' | '_blank' | '_top' | '_modal' }): Promise<unknown>;
}
declare global {
  interface Window {
    Cashfree?: (cfg: { mode: 'sandbox' | 'production' }) => CashfreeSdk;
  }
}

let loading: Promise<void> | null = null;
function loadSdk(): Promise<void> {
  if (window.Cashfree) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SDK_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error('Could not load the payment gateway. Check your connection and try again.'));
    };
    document.head.appendChild(s);
  });
  return loading;
}

/** Opens Cashfree checkout for a payment session created by the backend (navigates away on success). */
export async function openCashfreeCheckout(paymentSessionId: string, mode: string | undefined): Promise<void> {
  await loadSdk();
  if (!window.Cashfree) throw new Error('The payment gateway is unavailable.');
  const cashfree = window.Cashfree({ mode: mode === 'production' ? 'production' : 'sandbox' });
  await cashfree.checkout({ paymentSessionId, redirectTarget: '_self' });
}
