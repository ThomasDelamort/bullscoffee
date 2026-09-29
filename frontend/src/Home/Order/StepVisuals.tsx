import HeroImage from "../Hero/HeroImage";
import { formatPrice, MENU_ITEMS } from "../Menu/menu.config";
import { CREAM, ESPRESSO, GOLD } from "../theme";

/*
 * Illustrations for the order steps. They're pictures of the flow, not
 * working controls, so the step cards hide them from assistive tech.
 */

const [STRAWBERRY, MOCHA, MATCHA, , MANGO] = MENU_ITEMS;

const FAN = [
  { item: STRAWBERRY, className: "-mr-[14%] origin-bottom-right -rotate-12 group-hover:-rotate-[20deg]" },
  { item: MATCHA, className: "z-10 group-hover:-translate-y-3" },
  { item: MANGO, className: "-ml-[14%] origin-bottom-left rotate-12 group-hover:rotate-[20deg]" },
];

export function PickVisual() {
  return (
    <div className="relative flex h-full items-end justify-center">
      <div
        className="absolute inset-[8%] rounded-full opacity-40 blur-2xl"
        style={{ backgroundColor: GOLD }}
      />
      {FAN.map(({ item, className }) => (
        <HeroImage
          key={item.id}
          file={item.cup}
          alt=""
          className={`relative aspect-1/2 h-[92%] max-h-[26rem] object-cover transition-transform duration-500 ease-out ${className}`}
        />
      ))}
    </div>
  );
}

function Segmented({ label, options, selected }: { label: string; options: string[]; selected: string }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-bold tracking-[0.2em] text-stone-500 uppercase">{label}</p>
      <div className="flex rounded-full bg-stone-100 p-1 text-xs font-bold">
        {options.map((option) => (
          <span
            key={option}
            className={`flex-1 rounded-full py-1.5 text-center ${option === selected ? "bg-white shadow-sm" : "text-stone-500"}`}
          >
            {option}
          </span>
        ))}
      </div>
    </div>
  );
}

export function CustomizeVisual() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-full max-w-sm rotate-2 rounded-3xl bg-white p-5 text-stone-900 shadow-2xl transition-transform duration-500 group-hover:rotate-0 sm:p-6">
        <div className="flex items-center gap-3">
          <HeroImage file={MOCHA.cup} alt="" className="aspect-1/2 h-16 object-cover" />
          <div className="flex-1">
            <p className="font-bold">{MOCHA.name}</p>
            <p className="text-xs text-stone-500">Grande · Oat milk · Extra shot</p>
          </div>
          <p className="font-extrabold tabular-nums">{formatPrice(MOCHA.price + 20)}</p>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <Segmented label="Size" options={["Tall", "Grande", "Venti"]} selected="Grande" />
          <Segmented label="Milk" options={["Whole", "Oat", "Almond"]} selected="Oat" />
          <div className="hidden sm:block">
            <p className="mb-1.5 text-[10px] font-bold tracking-[0.2em] text-stone-500 uppercase">
              Sweetness · 50%
            </p>
            <div className="h-2 rounded-full bg-stone-100">
              <div className="h-full w-1/2 rounded-full" style={{ backgroundColor: GOLD }} />
            </div>
          </div>
          <div className="flex items-center justify-between text-sm font-bold">
            Extra shot
            <span className="flex h-6 w-11 items-center justify-end rounded-full p-0.5" style={{ backgroundColor: ESPRESSO }}>
              <span className="size-5 rounded-full bg-white" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PickupVisual() {
  return (
    <div className="flex h-full items-center justify-center">
      <div
        className="relative w-full max-w-72 -rotate-3 rounded-3xl p-6 shadow-2xl transition-transform duration-500 group-hover:rotate-0"
        style={{ backgroundColor: ESPRESSO, color: CREAM }}
      >
        <div className="flex items-center justify-between text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">
          <span>Order</span>
          <span>#O-18901</span>
        </div>
        <p className="hero-display mt-3 text-5xl uppercase" style={{ color: GOLD }}>
          Ready!
        </p>
        <p className="mt-1 text-sm opacity-80">Mocha frappé · Grande · Oat</p>

        <div className="relative -mx-6 my-5">
          <span className="absolute top-1/2 -left-3 size-6 -translate-y-1/2 rounded-full bg-white" />
          <span className="absolute top-1/2 -right-3 size-6 -translate-y-1/2 rounded-full bg-white" />
          <div className="mx-6 border-t-2 border-dashed border-current/25" />
        </div>

        <dl className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="opacity-60">Pick up at</dt>
            <dd className="font-bold">NU Cebu</dd>
          </div>
          <div>
            <dt className="opacity-60">Ready by</dt>
            <dd className="font-bold">9:40 AM</dd>
          </div>
        </dl>
        <div className="mt-5 h-10 rounded-sm bg-[repeating-linear-gradient(90deg,currentColor_0_2px,transparent_2px_5px,currentColor_5px_6px,transparent_6px_9px)] opacity-80" />
      </div>
    </div>
  );
}
