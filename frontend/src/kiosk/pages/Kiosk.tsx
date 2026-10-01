import { useCallback, useState } from "react";
import { useCustomer, type Customer } from "../../auth/customerContext";
import HeroImage from "../../Home/Hero/HeroImage";
import { LOGO_MARK } from "../../Home/Hero/hero.config";
import type { Product } from "../../POS/types";
import { initials } from "../../POS/utils/format";
import CartBar from "../components/CartBar";
import CartSheet from "../components/CartSheet";
import CategoryBanner from "../components/CategoryBanner";
import CategoryTabs from "../components/CategoryTabs";
import ProductCard from "../components/ProductCard";
import ProductSheet from "../components/ProductSheet";
import { MENU_CATEGORIES, MENU_PRODUCTS } from "../data/menu";
import { placeKioskOrder } from "../data/orders";
import { useCart, type CartChoice } from "../data/useCart";
import Confirmation, { type Receipt } from "./Confirmation";

const FIRST_CATEGORY = MENU_CATEGORIES[0]?.category_id ?? 0;

/**
 * Self-order: browse one category at a time, tap a product to choose its size
 * and quantity, then review the order from the bar that floats up at the
 * bottom. Signing in is optional; guests order the same way.
 */
export default function Kiosk() {
  const cart = useCart();
  const { state } = useCustomer();
  const customer = state.status === "registered" ? state.customer : null;

  const [categoryId, setCategoryId] = useState(FIRST_CATEGORY);
  const [picked, setPicked] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  // Read out by screen readers, since the cart bar changes out of view of the focus.
  const [announcement, setAnnouncement] = useState("");

  const category = MENU_CATEGORIES.find((c) => c.category_id === categoryId);
  const products = MENU_PRODUCTS.filter((p) => p.category_id === categoryId);

  const changeCategory = (id: number) => {
    setCategoryId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addToCart = (product: Product, choice: CartChoice) => {
    cart.add(product, choice);
    setPicked(null);
    setAnnouncement(`Added ${choice.quantity} ${product.product_name} to your order.`);
  };

  const placeOrder = async () => {
    setPlacing(true);
    setPlaceError(null);
    try {
      const order = await placeKioskOrder({
        customer_id: customer?.customer_id ?? null,
        items: cart.lines.map((l) => ({
          product_id: l.product.product_id,
          quantity: l.quantity,
          size: l.size,
          selling_price: l.price,
          special_instructions: l.note || null,
        })),
      });
      setReceipt({ ...order, lines: cart.lines, firstName: customer?.first_name ?? null });
      cart.clear();
      setCartOpen(false);
    } catch {
      setPlaceError("We couldn't send your order. Please try again, or order at the counter.");
    } finally {
      setPlacing(false);
    }
  };

  const startOver = useCallback(() => {
    setReceipt(null);
    setCategoryId(FIRST_CATEGORY);
    setAnnouncement("");
    window.scrollTo({ top: 0 });
  }, []);

  if (receipt) return <Confirmation receipt={receipt} onDone={startOver} />;

  return (
    <>
      <header className="sticky top-0 z-20 bg-(--k-canvas)/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <HeroImage file={LOGO_MARK} alt="" placeholderShape="circle" className="size-11 shrink-0 object-contain" />
          <div className="leading-none">
            <p className="hero-display text-2xl tracking-wide uppercase">Bull's Coffee</p>
            <p className="mt-1 text-[11px] font-bold tracking-[0.25em] text-(--k-muted) uppercase">Self-order</p>
          </div>
          <div className="ml-auto">{customer ? <Greeting customer={customer} /> : <PayAtCounter />}</div>
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <CategoryTabs categories={MENU_CATEGORIES} active={categoryId} onChange={changeCategory} />
        </div>
      </header>

      <main className={`mx-auto max-w-7xl px-4 pt-3 sm:px-6 ${cart.count > 0 ? "pb-36" : "pb-12"}`}>
        {category && <CategoryBanner category={category} products={products} />}
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
        error={placeError}
        onPlaceOrder={() => void placeOrder()}
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

function PayAtCounter() {
  return (
    <span className="hidden items-center gap-2 text-xs font-bold tracking-[0.2em] text-(--k-muted) uppercase sm:flex">
      <span aria-hidden className="size-2 rounded-full bg-(--k-gold)" />
      Pay at the counter
    </span>
  );
}
