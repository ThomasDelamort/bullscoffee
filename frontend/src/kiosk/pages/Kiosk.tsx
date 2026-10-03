import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { useCustomer, type Customer } from "../../auth/customerContext";
import { goToCheckout, usePaymentOptions } from "../../checkout/api";
import HeroImage from "../../Home/Hero/HeroImage";
import { LOGO_MARK } from "../../Home/Hero/hero.config";
import type { Product } from "../../POS/types";
import { initials } from "../../POS/utils/format";
import { usePublicSettings } from "../../lib/publicSettings";
import CartBar from "../components/CartBar";
import CartSheet from "../components/CartSheet";
import CategoryBanner from "../components/CategoryBanner";
import CategoryTabs from "../components/CategoryTabs";
import { saveCheckoutReceipt } from "../data/checkoutReceipt";
import ProductCard from "../components/ProductCard";
import ProductSheet from "../components/ProductSheet";
import { useMenu } from "../data/menu";
import { placeOrderError, usePlaceKioskOrder } from "../data/orders";
import { useCart, type CartChoice } from "../data/useCart";
import { FOCUS_RING, PRIMARY_BUTTON } from "../styles";
import Confirmation, { type Receipt } from "./Confirmation";

/**
 * Self-order: browse one category at a time, tap a product to choose its size
 * and quantity, then review the order from the bar that floats up at the
 * bottom. Signing in is optional; guests order the same way.
 */
export default function Kiosk() {
  const menu = useMenu();
  // Polled like the menu: an admin can close the kiosk from Settings at any time.
  const settings = usePublicSettings({ refetchInterval: 60_000 }).data;
  const cart = useCart();
  const placeOrder = usePlaceKioskOrder();
  const paymentOptions = usePaymentOptions();
  const onlineMethods = paymentOptions.data?.online ? paymentOptions.data.methods : [];
  const { state } = useCustomer();
  const customer = state.status === "registered" ? state.customer : null;

  // null until a tab is tapped: the first category.
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [picked, setPicked] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Set once PayMongo's checkout is loading, so the buttons stay busy until the page goes.
  const [leaving, setLeaving] = useState(false);
  // Read out by screen readers, since the cart bar changes out of view of the focus.
  const [announcement, setAnnouncement] = useState("");

  const startOver = useCallback(() => {
    setReceipt(null);
    setNotice(null);
    setCategoryId(null);
    setAnnouncement("");
    window.scrollTo({ top: 0 });
  }, []);

  if (receipt) return <Confirmation receipt={receipt} notice={notice} onDone={startOver} />;

  if (settings?.maintenance_mode) {
    return <MenuStatus title="We'll be right back" detail={settings.maintenance_message} />;
  }
  if (settings && !settings.online_ordering) {
    return <MenuStatus title="Kiosk ordering is paused" detail="Please order at the counter." />;
  }

  if (menu.status === "loading") return <MenuStatus title="Loading the menu" />;
  if (menu.status === "error") {
    return (
      <MenuStatus
        title="Menu unavailable"
        detail="We couldn't load the menu. Please try again, or order at the counter."
        onRetry={menu.retry}
      />
    );
  }
  if (menu.categories.length === 0) {
    return <MenuStatus title="Nothing on the menu yet" detail="Please order at the counter." />;
  }

  // The tapped category, or the first one (also once the tapped one has emptied out).
  const category = menu.categories.find((c) => c.category_id === categoryId) ?? menu.categories[0]!;
  const products = menu.productsByCategory.get(category.category_id) ?? [];

  const changeCategory = (id: number) => {
    setCategoryId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addToCart = (product: Product, choice: CartChoice) => {
    cart.add(product, choice);
    setPicked(null);
    setAnnouncement(`Added ${choice.quantity} ${product.product_name} to your order.`);
  };

  const submitOrder = (payOnline: boolean) => {
    const items = cart.lines.map((l) => ({
      product_id: l.product.product_id,
      quantity: l.quantity,
      size: l.size,
      special_instructions: l.note || null,
    }));
    placeOrder.mutate(
      { items, pay_online: payOnline },
      {
        onSuccess: (order) => {
          const placed = { ...order, firstName: customer?.first_name ?? null };
          if (order.checkout_url) {
            // PayMongo sends the customer back to /checkout, which shows this receipt.
            saveCheckoutReceipt(placed);
            setLeaving(true);
            goToCheckout(order.checkout_url);
            return;
          }
          setReceipt(placed);
          setNotice(payOnline ? "Paying here isn't available right now, so please pay at the counter." : null);
          cart.clear();
          setCartOpen(false);
        },
      },
    );
  };

  const placing =
    placeOrder.isPending || leaving ? (placeOrder.variables?.pay_online ? "online" : "counter") : null;

  return (
    <>
      <header className="sticky top-0 z-20 bg-(--k-canvas)/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link
            to="/"
            aria-label="Bull's Coffee, back to home"
            className={`-m-1 flex items-center gap-3 rounded-2xl p-1 transition active:scale-[0.98] ${FOCUS_RING}`}
          >
            <HeroImage file={LOGO_MARK} alt="" placeholderShape="circle" className="size-11 shrink-0 object-contain" />
            <div className="leading-none">
              <p className="hero-display text-2xl tracking-wide uppercase">Bull's Coffee</p>
              <p className="mt-1 text-[11px] font-bold tracking-[0.25em] text-(--k-muted) uppercase">Self-order</p>
            </div>
          </Link>
          <div className="ml-auto">
            {customer ? <Greeting customer={customer} /> : <PayAtCounter online={onlineMethods.length > 0} />}
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <CategoryTabs categories={menu.categories} active={category.category_id} onChange={changeCategory} />
        </div>
      </header>

      <main className={`mx-auto max-w-7xl px-4 pt-3 sm:px-6 ${cart.count > 0 ? "pb-36" : "pb-12"}`}>
        <CategoryBanner category={category} products={products} />
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <li key={p.product_id}>
              <ProductCard product={p} inCart={cart.countOf(p.product_id)} onPick={setPicked} />
            </li>
          ))}
        </ul>
      </main>

      <CartBar count={cart.count} total={cart.total} onOpen={() => setCartOpen(true)} />

      <ProductSheet product={picked} onClose={() => setPicked(null)} onAdd={addToCart} />
      <CartSheet
        // Emptying the order from inside the sheet closes it.
        open={cartOpen && cart.count > 0}
        onClose={() => setCartOpen(false)}
        cart={cart}
        customerName={customer ? `${customer.first_name} ${customer.last_name}` : null}
        placing={placing}
        onlineMethods={onlineMethods}
        error={placeOrder.isError ? placeOrderError(placeOrder.error) : null}
        onPlaceOrder={submitOrder}
      />

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </>
  );
}

function Greeting({ customer }: { customer: Customer }) {
  return (
    <span className="flex items-center gap-2.5 rounded-full bg-(--k-surface) py-1.5 pr-4 pl-1.5 text-sm font-bold ring-1 ring-(--k-line)">
      {customer.profile_picture ? (
        <img src={customer.profile_picture} alt="" className="size-8 rounded-full object-cover" />
      ) : (
        <span aria-hidden className="grid size-8 place-items-center rounded-full bg-(--k-gold) text-xs font-extrabold text-(--k-ink)">
          {initials(`${customer.first_name} ${customer.last_name}`)}
        </span>
      )}
      Hi, {customer.first_name}
    </span>
  );
}

interface MenuStatusProps {
  title: string;
  detail?: string;
  onRetry?: () => void;
}

/** Stands in for the whole menu while it loads, when it can't, or when there's nothing on it. */
function MenuStatus({ title, detail, onRetry }: MenuStatusProps) {
  return (
    <main aria-live="polite" className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <HeroImage
        file={LOGO_MARK}
        alt=""
        placeholderShape="circle"
        className={`size-16 object-contain ${detail ? "" : "motion-safe:animate-pulse"}`}
      />
      <h1 className="hero-display mt-6 text-4xl uppercase sm:text-5xl">{title}</h1>
      {detail && <p className="mt-3 max-w-sm text-base text-(--k-muted)">{detail}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className={`${PRIMARY_BUTTON} mt-8 px-10`}>
          Try again
        </button>
      )}
    </main>
  );
}

function PayAtCounter({ online }: { online: boolean }) {
  return (
    <span className="hidden items-center gap-2 text-xs font-bold tracking-[0.2em] text-(--k-muted) uppercase sm:flex">
      <span aria-hidden className="size-2 rounded-full bg-(--k-gold)" />
      {online ? "Pay here or at the counter" : "Pay at the counter"}
    </span>
  );
}
