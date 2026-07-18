"use client";
/* eslint-disable @next/next/no-img-element */

import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Clock3,
  Heart,
  Headphones,
  AtSign,
  Leaf,
  LocateFixed,
  LogIn,
  MapPin,
  Mail,
  Minus,
  Moon,
  PackageCheck,
  Plus,
  RotateCcw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  Store,
  Sun,
  Truck,
  UserRound,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useState, useSyncExternalStore } from "react";

type Product = {
  id: number;
  name: string;
  farmer: string;
  location: string;
  distance: number;
  price: number;
  unit: string;
  stock: number;
  sold: number;
  category: string;
  available: string;
  rating: number;
  image: string;
  badge?: string;
};

const products: Product[] = [
  { id: 1, name: "Vine-ripe tomatoes", farmer: "Adebayo Family Farm", location: "Kuje, Abuja", distance: 2.4, price: 1250, unit: "basket", stock: 18, sold: 72, category: "Vegetables", available: "Today", rating: 4.9, badge: "Selling fast", image: "/produce/vine-ripe-tomatoes.webp" },
  { id: 2, name: "Fresh sweet corn", farmer: "Mama Ifeanyi Farms", location: "Gwagwalada, Abuja", distance: 4.7, price: 1800, unit: "dozen", stock: 32, sold: 48, category: "Vegetables", available: "Today", rating: 4.8, image: "/produce/fresh-sweet-corn.webp" },
  { id: 3, name: "Oyo white yam", farmer: "Tunde Harvest Co.", location: "Kwali, Abuja", distance: 7.1, price: 3200, unit: "tuber", stock: 24, sold: 36, category: "Tubers", available: "Tomorrow", rating: 4.7, badge: "New harvest", image: "/produce/oyo-white-yam.webp" },
  { id: 4, name: "Red scotch bonnet", farmer: "Haske Greenfields", location: "Lugbe, Abuja", distance: 8.3, price: 950, unit: "paint bowl", stock: 11, sold: 84, category: "Vegetables", available: "Today", rating: 4.9, badge: "Almost gone", image: "/produce/red-scotch-bonnet.webp" },
  { id: 5, name: "Sweet ripe plantain", farmer: "Olaoluwa Farms", location: "Giri, Abuja", distance: 11.6, price: 2600, unit: "bunch", stock: 27, sold: 51, category: "Fruits", available: "Sat, 20 Jul", rating: 4.6, image: "/produce/sweet-ripe-plantain.webp" },
  { id: 6, name: "Brown honey beans", farmer: "Nana Grains", location: "Zuba, Abuja", distance: 14.2, price: 2400, unit: "mudu", stock: 46, sold: 29, category: "Grains", available: "Today", rating: 4.8, image: "/produce/brown-honey-beans.webp" },
  { id: 7, name: "Garden-fresh spinach", farmer: "Green Basket Farms", location: "Jabi, Abuja", distance: 3.1, price: 700, unit: "bundle", stock: 21, sold: 63, category: "Vegetables", available: "Today", rating: 4.7, badge: "Picked today", image: "/produce/garden-fresh-spinach.webp" },
  { id: 8, name: "Free-range brown eggs", farmer: "Dutse Poultry Hub", location: "Dutse, Abuja", distance: 6.5, price: 5800, unit: "crate", stock: 16, sold: 54, category: "Eggs", available: "Today", rating: 4.9, image: "/produce/free-range-brown-eggs.webp" },
  { id: 9, name: "Purple red onions", farmer: "Suleiman Produce", location: "Dei-Dei, Abuja", distance: 9.4, price: 1650, unit: "basket", stock: 38, sold: 42, category: "Vegetables", available: "Tomorrow", rating: 4.6, image: "/produce/purple-red-onions.webp" },
  { id: 10, name: "Golden pineapple", farmer: "Sunrise Orchard", location: "Bwari, Abuja", distance: 12.8, price: 1400, unit: "piece", stock: 29, sold: 61, category: "Fruits", available: "Sat, 20 Jul", rating: 4.8, badge: "Sweet pick", image: "/produce/golden-pineapple.webp" },
  { id: 11, name: "Fresh cassava roots", farmer: "Unity Root Crops", location: "Karu, Abuja", distance: 15.7, price: 1900, unit: "bundle", stock: 44, sold: 26, category: "Tubers", available: "Tomorrow", rating: 4.5, image: "/produce/fresh-cassava-roots.webp" },
  { id: 12, name: "Local ofada rice", farmer: "Abuja Grain Collective", location: "Abaji, Abuja", distance: 18.6, price: 4200, unit: "5 kg bag", stock: 52, sold: 33, category: "Grains", available: "Today", rating: 4.7, image: "/produce/local-ofada-rice.webp" },
  { id: 13, name: "Crunchy carrots", farmer: "Jos Valley Produce", location: "Maitama, Abuja", distance: 5.2, price: 1100, unit: "bundle", stock: 35, sold: 45, category: "Vegetables", available: "Today", rating: 4.8, image: "/produce/crunchy-carrots.webp" },
  { id: 14, name: "Creamy avocados", farmer: "Highland Orchard", location: "Asokoro, Abuja", distance: 6.9, price: 1500, unit: "set of 4", stock: 23, sold: 57, category: "Fruits", available: "Today", rating: 4.9, badge: "In season", image: "/produce/creamy-avocados.webp" },
  { id: 15, name: "Fresh cucumbers", farmer: "Riverbend Gardens", location: "Wuse, Abuja", distance: 4.3, price: 850, unit: "set of 5", stock: 41, sold: 39, category: "Vegetables", available: "Tomorrow", rating: 4.6, image: "/produce/fresh-cucumbers.webp" },
  { id: 16, name: "Tender green okra", farmer: "Zainab Fresh Fields", location: "Nyanya, Abuja", distance: 10.7, price: 900, unit: "basket", stock: 19, sold: 66, category: "Vegetables", available: "Today", rating: 4.7, badge: "Popular", image: "/produce/tender-green-okra.webp" },
  { id: 17, name: "Sweet watermelon", farmer: "Gurara Melon Farm", location: "Kubusa, Abuja", distance: 13.4, price: 2300, unit: "piece", stock: 28, sold: 52, category: "Fruits", available: "Sat, 20 Jul", rating: 4.8, image: "/produce/sweet-watermelon.webp" },
  { id: 18, name: "Aromatic ginger", farmer: "Roots & Spice Co.", location: "Kubwa, Abuja", distance: 11.2, price: 1300, unit: "1 kg", stock: 34, sold: 31, category: "Tubers", available: "Today", rating: 4.6, image: "/produce/aromatic-ginger.webp" },
  { id: 19, name: "Juicy sweet oranges", farmer: "Nasarawa Citrus Farm", location: "Mararaba, Abuja", distance: 16.1, price: 1750, unit: "dozen", stock: 47, sold: 53, category: "Fruits", available: "Tomorrow", rating: 4.8, image: "/produce/juicy-sweet-oranges.webp" },
  { id: 20, name: "Pearl millet grain", farmer: "Sahel Grain House", location: "Gwagwa, Abuja", distance: 17.3, price: 2800, unit: "5 kg bag", stock: 58, sold: 22, category: "Grains", available: "Today", rating: 4.5, image: "/produce/pearl-millet-grain.webp" },
];

const categories = ["All produce", "Vegetables", "Fruits", "Tubers", "Grains", "Eggs"];
type Theme = "light" | "dark";
type NotificationItem = {
  id: number;
  type: "order" | "delivery" | "harvest" | "account";
  title: string;
  message: string;
  time: string;
  target: "orders" | "market" | "profile";
};

const initialNotifications: NotificationItem[] = [
  { id: 1, type: "delivery", title: "Your delivery is on the way", message: "Order #HN-2048 left the Gudu collection hub and will arrive between 9am and 1pm.", time: "12 min ago", target: "orders" },
  { id: 2, type: "harvest", title: "Fresh spinach is available", message: "Green Basket Farms just listed spinach 3.1 km from your delivery address.", time: "38 min ago", target: "market" },
  { id: 3, type: "order", title: "Farmer confirmed your order", message: "Adebayo Family Farm has reserved your vine-ripe tomatoes for tomorrow's delivery.", time: "2 hours ago", target: "orders" },
  { id: 4, type: "account", title: "Profile verification complete", message: "Your phone number and primary delivery address have been verified.", time: "Yesterday", target: "profile" },
  { id: 5, type: "harvest", title: "Saved harvest is selling fast", message: "Only 11 bowls of red scotch bonnet remain at Haske Greenfields.", time: "Yesterday", target: "market" },
];

function getThemeSnapshot(): Theme {
  return localStorage.getItem("harvest-near-theme") === "dark" ? "dark" : "light";
}

function subscribeToTheme(onStoreChange: () => void) {
  const handleChange = () => onStoreChange();
  window.addEventListener("storage", handleChange);
  window.addEventListener("harvest-near-theme-change", handleChange);
  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener("harvest-near-theme-change", handleChange);
  };
}

function money(value: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);
}

export default function Home() {
  const [view, setView] = useState<"landing" | "market" | "orders" | "farmer" | "profile">("landing");
  const [category, setCategory] = useState("All produce");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [paid, setPaid] = useState(false);
  const [delivery, setDelivery] = useState<"door" | "pickup">("door");
  const [liked, setLiked] = useState<number[]>([]);
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => "light");
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupRole, setSignupRole] = useState<"consumer" | "farmer">("consumer");
  const [signupComplete, setSignupComplete] = useState(false);
  const [signinOpen, setSigninOpen] = useState(false);
  const [signinComplete, setSigninComplete] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<"all" | "unread">("all");
  const [readNotifications, setReadNotifications] = useState<number[]>([4]);
  const [showPassword, setShowPassword] = useState(false);
  const [sortBy, setSortBy] = useState<"nearest" | "price-low" | "price-high" | "rating" | "stock">("nearest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [maxDistance, setMaxDistance] = useState(20);
  const [maxPrice, setMaxPrice] = useState(6000);
  const [todayOnly, setTodayOnly] = useState(false);
  const [hideLowStock, setHideLowStock] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    localStorage.setItem("harvest-near-theme", next);
    window.dispatchEvent(new Event("harvest-near-theme-change"));
  }

  function submitSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignupComplete(true);
  }

  const visible = useMemo(() => {
    const filtered = products.filter((product) =>
      (category === "All produce" || product.category === category) &&
      (product.name.toLowerCase().includes(query.toLowerCase()) || product.farmer.toLowerCase().includes(query.toLowerCase())) &&
      product.distance <= maxDistance && product.price <= maxPrice &&
      (!todayOnly || product.available === "Today") && (!hideLowStock || product.stock > 15)
    );
    return filtered.sort((a, b) => {
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "stock") return b.stock - a.stock;
      return a.distance - b.distance;
    });
  }, [category, query, maxDistance, maxPrice, todayOnly, hideLowStock, sortBy]);

  const activeFilterCount = Number(maxDistance < 20) + Number(maxPrice < 6000) + Number(todayOnly) + Number(hideLowStock);
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = visible.slice((safePage - 1) * pageSize, safePage * pageSize);

  const items = products.filter((p) => cart[p.id]);
  const itemCount = Object.values(cart).reduce((sum, n) => sum + n, 0);
  const subtotal = items.reduce((sum, p) => sum + p.price * cart[p.id], 0);
  const deliveryFee = delivery === "door" ? 1800 : 0;
  const unreadNotificationCount = initialNotifications.filter((item) => !readNotifications.includes(item.id)).length;
  const visibleNotifications = notificationFilter === "unread" ? initialNotifications.filter((item) => !readNotifications.includes(item.id)) : initialNotifications;

  function openNotification(item: NotificationItem) {
    setReadNotifications((current) => current.includes(item.id) ? current : [...current, item.id]);
    setNotificationOpen(false);
    setView(item.target);
  }

  function add(product: Product) {
    setCart((current) => ({ ...current, [product.id]: Math.min((current[product.id] || 0) + 1, product.stock) }));
  }

  function update(id: number, delta: number) {
    setCart((current) => {
      const next = Math.max(0, (current[id] || 0) + delta);
      const copy = { ...current };
      if (!next) delete copy[id]; else copy[id] = next;
      return copy;
    });
  }

  return (
    <div className="app-shell" data-theme={theme}>
      <header className="topbar">
        <button className="brand brand-image" onClick={() => setView("landing")} aria-label="HarvestNear home"><img src="/brand/harvestnear-wordmark-header.png" alt="HarvestNear" /></button>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={view === "landing" ? "active" : ""} onClick={() => setView("landing")}>Home</button>
          <button className={view === "market" ? "active" : ""} onClick={() => setView("market")}>Shop produce</button>
          <button className={view === "orders" ? "active" : ""} onClick={() => setView("orders")}>My orders</button>
          <button className={view === "farmer" ? "active" : ""} onClick={() => setView("farmer")}>Sell on HarvestNear</button>
        </nav>
        <div className="header-actions">
          <button className="cart-button" onClick={() => setCartOpen(true)}><ShoppingBag size={18} /><span>Basket</span>{itemCount > 0 && <b>{itemCount}</b>}</button>
          <div className="account-menu-wrap">
            <button className={`account-menu-trigger ${accountMenuOpen ? "active" : ""}`} onClick={() => setAccountMenuOpen((open) => !open)} aria-expanded={accountMenuOpen} aria-haspopup="menu">
              <span className="account-avatar"><UserRound size={17} /></span><span>Account</span><ChevronDown size={15} />
            </button>
            {accountMenuOpen && <>
              <button className="account-menu-backdrop" aria-label="Close account menu" onClick={() => setAccountMenuOpen(false)} />
              <div className="account-menu" role="menu">
                <div className="account-menu-heading"><span className="account-avatar"><UserRound size={17} /></span><div><strong>Welcome to HarvestNear</strong><small>Manage your account and preferences</small></div></div>
                <button role="menuitem" onClick={() => { setView("profile"); setAccountMenuOpen(false); }}><UserRound size={17} /><span><strong>My profile</strong><small>Customer and farm information</small></span><ChevronRight size={15} /></button>
                <button role="menuitem" onClick={() => { setAccountMenuOpen(false); setNotificationOpen(true); }}><Bell size={17} /><span><strong>Notifications</strong><small>Orders, harvests and delivery updates</small></span>{unreadNotificationCount > 0 && <i>{unreadNotificationCount}</i>}</button>
                <button role="menuitem" onClick={toggleTheme}>{theme === "light" ? <Moon size={17} /> : <Sun size={17} />}<span><strong>{theme === "light" ? "Dark theme" : "Light theme"}</strong><small>Change the appearance</small></span><span className={`theme-switch ${theme === "dark" ? "on" : ""}`}><b /></span></button>
                <div className="account-menu-auth">
                  <button onClick={() => { setAccountMenuOpen(false); setSigninComplete(false); setSigninOpen(true); }}><LogIn size={16} /> Sign in</button>
                  <button onClick={() => { setAccountMenuOpen(false); setSignupComplete(false); setSignupOpen(true); }}><UserRound size={16} /> Create account</button>
                </div>
              </div>
            </>}
          </div>
        </div>
      </header>

      {view === "landing" ? <LandingPage onShop={() => setView("market")} onFarmer={() => setView("farmer")} /> : view === "market" ? (
        <main>
          <section className="market-intro">
            <div className="intro-copy">
              <p className="eyebrow"><span /> FRESH LOCAL PRODUCE, FOUND HERE</p>
              <h1>HarvestNear.<br /><em>Fresh starts here.</em></h1>
              <p>Buy today&apos;s harvest directly from trusted farmers near you. Fresher produce, fairer prices, stronger local communities.</p>
            </div>
            <div className="market-stats">
              <div><strong>42</strong><span>farms nearby</span></div>
              <div><strong>136</strong><span>fresh listings</span></div>
              <div><strong>4.8</strong><span>average rating</span></div>
            </div>
          </section>

          <section className="discovery-bar">
            <label className="search-box"><Search size={20} /><input value={query} onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }} placeholder="Search tomatoes, yam, farmer..." /></label>
            <button className="location-button"><span className="loc-icon"><LocateFixed size={18} /></span><span><small>DELIVERING TO</small><strong>Gudu, Abuja</strong></span><ChevronDown size={17} /></button>
            <button className={`filter-button ${activeFilterCount ? "active" : ""}`} onClick={() => setFiltersOpen((open) => !open)}><SlidersHorizontal size={18} /> Filters {activeFilterCount > 0 && <b>{activeFilterCount}</b>}</button>
            {filtersOpen && <div className="filter-popover">
              <div className="filter-head"><div><strong>Filter harvests</strong><span>Refine what is shown near you</span></div><button onClick={() => setFiltersOpen(false)}><X size={17}/></button></div>
              <label className="range-filter"><span><strong>Maximum distance</strong><b>{maxDistance} km</b></span><input type="range" min="3" max="20" step="1" value={maxDistance} onChange={(event) => { setMaxDistance(Number(event.target.value)); setCurrentPage(1); }}/><small><i>3 km</i><i>20 km</i></small></label>
              <label className="range-filter"><span><strong>Maximum unit price</strong><b>{money(maxPrice)}</b></span><input type="range" min="1000" max="6000" step="500" value={maxPrice} onChange={(event) => { setMaxPrice(Number(event.target.value)); setCurrentPage(1); }}/><small><i>₦1,000</i><i>₦6,000</i></small></label>
              <div className="quick-filters"><label><span><strong>Available today</strong><small>Only produce ready now</small></span><input type="checkbox" checked={todayOnly} onChange={(event) => { setTodayOnly(event.target.checked); setCurrentPage(1); }}/></label><label><span><strong>Hide low stock</strong><small>More than 15 units left</small></span><input type="checkbox" checked={hideLowStock} onChange={(event) => { setHideLowStock(event.target.checked); setCurrentPage(1); }}/></label></div>
              <div className="filter-actions"><button onClick={() => { setMaxDistance(20); setMaxPrice(6000); setTodayOnly(false); setHideLowStock(false); setCurrentPage(1); }}>Reset all</button><button onClick={() => setFiltersOpen(false)}>Show {visible.length} harvests</button></div>
            </div>}
          </section>

          <section className="catalog">
            <div className="catalog-head">
              <div><h2>Harvests near you</h2><p>{visible.length} available listings matched near Gudu</p></div>
              <label className="sort"><span>Sort by</span><select value={sortBy} onChange={(event) => { setSortBy(event.target.value as typeof sortBy); setCurrentPage(1); }}><option value="nearest">Nearest first</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="rating">Highest rated</option><option value="stock">Most available</option></select><ChevronDown size={15}/></label>
            </div>
            <div className="category-row">
              {categories.map((item) => <button key={item} onClick={() => { setCategory(item); setCurrentPage(1); }} className={category === item ? "selected" : ""}>{item}</button>)}
            </div>

            {visible.length ? <div className="product-grid">
              {paginatedProducts.map((product) => (
                <article className="product-card" key={product.id}>
                  <div className="product-image">
                    <img src={product.image} alt={product.name} />
                    <span className="distance"><MapPin size={13} /> {product.distance} km</span>
                    <button className={`heart ${liked.includes(product.id) ? "liked" : ""}`} onClick={() => setLiked((x) => x.includes(product.id) ? x.filter((id) => id !== product.id) : [...x, product.id])} aria-label="Save product"><Heart size={18} fill={liked.includes(product.id) ? "currentColor" : "none"} /></button>
                    {product.badge && <span className="product-badge">{product.badge}</span>}
                  </div>
                  <div className="product-body">
                    <div className="availability"><span /> {product.available}</div>
                    <h3>{product.name}</h3>
                    <p className="farmer"><Store size={14} /> {product.farmer} <Check size={12} /></p>
                    <div className="rating"><Star size={14} fill="currentColor" /> {product.rating} <span>({Math.round(product.sold / 2 + 12)})</span></div>
                    <div className="stock-track"><span style={{ width: `${Math.max(12, product.stock / (product.stock + product.sold) * 100)}%` }} /></div>
                    <p className="stock-copy">{product.stock} {product.unit}s left</p>
                    <div className="price-row">
                      <div><strong>{money(product.price)}</strong><span> / {product.unit}</span></div>
                      {cart[product.id] ? (
                        <div className="stepper"><button onClick={() => update(product.id, -1)}><Minus size={15} /></button><span>{cart[product.id]}</span><button onClick={() => update(product.id, 1)}><Plus size={15} /></button></div>
                      ) : <button className="add-button" onClick={() => add(product)}><Plus size={18} /> Add</button>}
                    </div>
                  </div>
                </article>
              ))}
            </div> : <div className="empty-state"><Search size={28} /><h3>No harvests found</h3><p>Try another search or category.</p></div>}
            {visible.length > 0 && <nav className="pagination" aria-label="Produce pagination">
              <p>Showing <strong>{(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, visible.length)}</strong> of {visible.length} harvests</p>
              <div><button className="page-arrow" onClick={() => setCurrentPage(Math.max(1, safePage - 1))} disabled={safePage === 1} aria-label="Previous page"><ChevronLeft size={17}/></button>{Array.from({length:totalPages},(_,index)=>index+1).map(page=><button key={page} className={safePage === page ? "selected" : ""} onClick={() => { setCurrentPage(page); document.querySelector(".catalog")?.scrollIntoView({behavior:"smooth",block:"start"}); }} aria-label={`Page ${page}`} aria-current={safePage === page ? "page" : undefined}>{page}</button>)}<button className="page-arrow" onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))} disabled={safePage === totalPages} aria-label="Next page"><ChevronRight size={17}/></button></div>
            </nav>}
          </section>

          <section className="trust-band">
            <div><PackageCheck size={23} /><span><strong>Harvest checked</strong>Farmers confirm availability daily</span></div>
            <div><Clock3 size={23} /><span><strong>Reserved for 10 minutes</strong>Your basket stays yours at checkout</span></div>
            <div><Truck size={23} /><span><strong>Flexible fulfilment</strong>Doorstep delivery or farm pickup</span></div>
          </section>
        </main>
      ) : view === "orders" ? <OrdersPage onShop={() => setView("market")} /> : view === "profile" ? <ProfilePage /> : <FarmerDashboard onShop={() => setView("market")} />}

      <SiteFooter view={view} onNavigate={setView} />

      {view === "market" && <button className="mobile-basket" onClick={() => setCartOpen(true)}><ShoppingBag size={19} /><span>Basket</span><b>{itemCount}</b><strong>{money(subtotal)}</strong></button>}

      {cartOpen && <div className="overlay" onMouseDown={() => setCartOpen(false)}>
        <aside className="cart-drawer" onMouseDown={(e) => e.stopPropagation()}>
          <div className="drawer-head"><div><p>Your basket</p><span>{itemCount} {itemCount === 1 ? "item" : "items"} from local farms</span></div><button className="icon-btn" onClick={() => setCartOpen(false)}><X size={20} /></button></div>
          {items.length ? <>
            <div className="cart-items">{items.map((product) => <div className="cart-item" key={product.id}>
              <img src={product.image} alt="" />
              <div><h4>{product.name}</h4><p>{product.farmer}</p><strong>{money(product.price * cart[product.id])}</strong></div>
              <div className="stepper"><button onClick={() => update(product.id, -1)}><Minus size={14} /></button><span>{cart[product.id]}</span><button onClick={() => update(product.id, 1)}><Plus size={14} /></button></div>
            </div>)}</div>
            <div className="delivery-choice"><p>How would you like it?</p><button className={delivery === "door" ? "selected" : ""} onClick={() => setDelivery("door")}><Truck size={20} /><span><strong>Doorstep delivery</strong><small>Tomorrow, 9am–1pm</small></span><b>{money(1800)}</b></button><button className={delivery === "pickup" ? "selected" : ""} onClick={() => setDelivery("pickup")}><Store size={20} /><span><strong>Pickup from collection hub</strong><small>Gudu Market · 2.1 km</small></span><b>Free</b></button></div>
            <div className="cart-total"><p><span>Subtotal</span><strong>{money(subtotal)}</strong></p><p><span>Delivery</span><strong>{deliveryFee ? money(deliveryFee) : "Free"}</strong></p><p className="total"><span>Total</span><strong>{money(subtotal + deliveryFee)}</strong></p><button className="checkout-button" onClick={() => { setCartOpen(false); setCheckout(true); }}>Continue to payment <ArrowRight size={18} /></button><small>Secure payment powered by Paystack</small></div>
          </> : <div className="empty-cart"><ShoppingBag size={34} /><h3>Your basket is empty</h3><p>Add fresh produce from a farm near you.</p><button onClick={() => setCartOpen(false)}>Explore harvests</button></div>}
        </aside>
      </div>}

      {notificationOpen && <div className="overlay notification-overlay" onMouseDown={() => setNotificationOpen(false)}>
        <aside className="notification-drawer" onMouseDown={(event) => event.stopPropagation()} aria-label="Notifications">
          <div className="drawer-head notification-head"><div><p>Notifications</p><span>{unreadNotificationCount ? `${unreadNotificationCount} unread updates` : "You are all caught up"}</span></div><button className="icon-btn" onClick={() => setNotificationOpen(false)} aria-label="Close notifications"><X size={20} /></button></div>
          <div className="notification-tools">
            <div role="tablist" aria-label="Notification filters"><button className={notificationFilter === "all" ? "selected" : ""} onClick={() => setNotificationFilter("all")}>All <span>{initialNotifications.length}</span></button><button className={notificationFilter === "unread" ? "selected" : ""} onClick={() => setNotificationFilter("unread")}>Unread <span>{unreadNotificationCount}</span></button></div>
            <button disabled={!unreadNotificationCount} onClick={() => setReadNotifications(initialNotifications.map((item) => item.id))}><Check size={14} /> Mark all as read</button>
          </div>
          {visibleNotifications.length ? <div className="notification-list">{visibleNotifications.map((item) => {
            const unread = !readNotifications.includes(item.id);
            return <article key={item.id} className={unread ? "unread" : ""}>
              <button className="notification-main" onClick={() => openNotification(item)}>
                <span className={`notification-icon ${item.type}`}>{item.type === "delivery" ? <Truck size={18} /> : item.type === "harvest" ? <Leaf size={18} /> : item.type === "order" ? <PackageCheck size={18} /> : <UserRound size={18} />}</span>
                <span><strong>{item.title}</strong><p>{item.message}</p><small>{item.time}</small></span>
                {unread && <i aria-label="Unread" />}
              </button>
              {unread && <button className="mark-read" onClick={() => setReadNotifications((current) => [...current, item.id])} aria-label={`Mark ${item.title} as read`} title="Mark as read"><Check size={14} /></button>}
            </article>;
          })}</div> : <div className="notification-empty"><Check size={27} /><h3>No unread notifications</h3><p>New order and harvest updates will appear here.</p><button onClick={() => setNotificationFilter("all")}>View all notifications</button></div>}
          <div className="notification-settings"><Bell size={14} /><span>Control which updates you receive from your profile preferences.</span><button onClick={() => { setNotificationOpen(false); setView("profile"); }}>Preferences</button></div>
        </aside>
      </div>}

      {checkout && <div className="modal-overlay"><div className="payment-modal">
        {!paid ? <><button className="close-modal" onClick={() => setCheckout(false)}><X size={20} /></button><div className="pay-icon"><Leaf size={24} /></div><p className="eyebrow center">PAYMENT</p><h2>Complete your order</h2><p>Your produce is reserved for <strong>09:42</strong></p><div className="pay-summary"><span>Total to pay</span><strong>{money(subtotal + deliveryFee)}</strong></div><label>Email address<input defaultValue="tola.adebayo@example.com" /></label><button className="pay-button" onClick={() => setPaid(true)}>Pay securely with Paystack <ArrowRight size={18} /></button><small>Cards · Bank transfer · USSD</small></> : <div className="success-state"><span><Check size={30} /></span><p className="eyebrow center">ORDER CONFIRMED</p><h2>Your harvest is on its way.</h2><p>Order <strong>#FM-2048</strong> has been sent to {items.length} local {items.length === 1 ? "farmer" : "farmers"}.</p><button onClick={() => { setCheckout(false); setPaid(false); setCart({}); setView("orders"); }}>View order details</button></div>}
      </div></div>}

      {signupOpen && <div className="modal-overlay" onMouseDown={() => setSignupOpen(false)}><div className="signup-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="close-modal" onClick={() => setSignupOpen(false)}><X size={20} /></button>
        {!signupComplete ? <>
          <div className="signup-heading"><span><Leaf size={22} /></span><div><p>JOIN FARMERS MARKET</p><h2>Create your account</h2></div></div>
          <p className="signup-intro">Choose how you want to use the marketplace. You can update your profile later.</p>
          <div className="role-tabs" role="tablist" aria-label="Account type">
            <button className={signupRole === "consumer" ? "selected" : ""} onClick={() => setSignupRole("consumer")}><ShoppingBag size={19} /><span><strong>Consumer</strong><small>Shop fresh produce</small></span></button>
            <button className={signupRole === "farmer" ? "selected" : ""} onClick={() => setSignupRole("farmer")}><Store size={19} /><span><strong>Farmer</strong><small>List and sell harvests</small></span></button>
          </div>
          <form className="signup-form" onSubmit={submitSignup}>
            <div className="form-row"><label>First name<input required placeholder="Tola" /></label><label>Last name<input required placeholder="Adebayo" /></label></div>
            <label>Phone number<div className="phone-field"><span>+234</span><input required type="tel" placeholder="801 234 5678" /></div></label>
            <label>Email address<input required type="email" placeholder="you@example.com" /></label>
            {signupRole === "farmer" && <div className="farmer-fields"><label>Farm or business name<input required placeholder="Adebayo Family Farm" /></label><label>Farm location<input required placeholder="Kuje, Abuja" /></label></div>}
            <label>Password<input required type="password" minLength={8} placeholder="At least 8 characters" /></label>
            <label className="terms"><input required type="checkbox" /> <span>I agree to the Terms of Service and Privacy Policy.</span></label>
            <button className="create-account" type="submit">Create {signupRole} account <ArrowRight size={17} /></button>
          </form>
          <p className="signin-copy">Already have an account? <button onClick={() => { setSignupOpen(false); setSigninComplete(false); setSigninOpen(true); }}>Sign in</button></p>
        </> : <div className="signup-success"><span><Check size={30} /></span><p>ACCOUNT CREATED</p><h2>Welcome to HarvestNear.</h2><p>{signupRole === "farmer" ? "Your farmer profile is ready for verification. Add your first harvest to get started." : "Your consumer account is ready. Fresh harvests near you are waiting."}</p><button onClick={() => { setSignupOpen(false); if (signupRole === "farmer") setView("farmer"); }}>{signupRole === "farmer" ? "Open farmer workspace" : "Start shopping"} <ArrowRight size={17} /></button></div>}
      </div></div>}

      {signinOpen && <div className="modal-overlay" onMouseDown={() => setSigninOpen(false)}><div className="signin-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="close-modal" onClick={() => setSigninOpen(false)}><X size={20} /></button>
        {!signinComplete ? <>
          <div className="auth-mark"><Leaf size={24} /></div>
          <p className="auth-kicker">WELCOME BACK</p>
          <h2>Sign in to HarvestNear</h2>
          <p className="auth-intro">Continue shopping fresh harvests or manage your farm.</p>
          <form className="signin-form" onSubmit={(event) => { event.preventDefault(); setSigninComplete(true); }}>
            <label>Email or phone number<input required autoComplete="username" placeholder="you@example.com or +234..." /></label>
            <label>Password<div className="password-field"><input required autoComplete="current-password" type={showPassword ? "text" : "password"} placeholder="Enter your password" /><button type="button" onClick={() => setShowPassword((value) => !value)} title={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
            <div className="signin-options"><label><input type="checkbox" /> Keep me signed in</label><button type="button">Forgot password?</button></div>
            <button className="signin-submit" type="submit">Sign in securely <ArrowRight size={17} /></button>
          </form>
          <div className="auth-divider"><span>or</span></div>
          <p className="signin-copy">New to HarvestNear? <button onClick={() => { setSigninOpen(false); setSignupComplete(false); setSignupOpen(true); }}>Create an account</button></p>
        </> : <div className="signup-success"><span><Check size={30} /></span><p>SIGNED IN</p><h2>Good to have you back.</h2><p>Your account is ready and your saved basket is right where you left it.</p><button onClick={() => { setSigninOpen(false); setView("profile"); }}>Open my profile <ArrowRight size={17} /></button></div>}
      </div></div>}
    </div>
  );
}

function LandingPage({ onShop, onFarmer }: { onShop: () => void; onFarmer: () => void }) {
  return <main className="landing-page">
    <section className="landing-hero">
      <img src="/produce/vine-ripe-tomatoes.webp" alt="Fresh tomatoes harvested by a local farmer" />
      <div className="landing-hero-shade" />
      <div className="landing-hero-content">
        <p className="landing-kicker"><span /> FRESH LOCAL PRODUCE, FOUND HERE</p>
        <h1>HarvestNear.</h1>
        <h2>Good food should not<br/>travel so far.</h2>
        <p>We connect households with trusted farmers nearby, making today&apos;s harvest visible, orderable, and easier to deliver.</p>
        <div className="landing-actions"><button onClick={onShop}>Explore nearby harvests <ArrowRight size={17}/></button><button onClick={onFarmer}><Store size={16}/> I&apos;m a farmer</button></div>
        <div className="landing-proof"><span><Check size={13}/> Verified farmers</span><span><MapPin size={13}/> Proximity-first discovery</span><span><Truck size={13}/> Flexible fulfilment</span></div>
      </div>
      <aside className="hero-harvest-note"><span>AVAILABLE TODAY</span><strong>20 fresh listings</strong><p>from 42 farms near Abuja</p><div><img src="/produce/fresh-sweet-corn.webp" alt=""/><img src="/produce/garden-fresh-spinach.webp" alt=""/><img src="/produce/sweet-ripe-plantain.webp" alt=""/></div></aside>
    </section>

    <section className="landing-intro">
      <p>THE MARKET, MADE LOCAL</p>
      <h2>Farmers know what is ready.<br/>Consumers should know <em>where to find it.</em></h2>
      <div><p>HarvestNear closes the information gap between a farmer&apos;s available harvest and a nearby household&apos;s next meal.</p><p>Farmers list produce by date and quantity. Consumers order only what they need until the harvest is sold out.</p></div>
    </section>

    <section className="how-it-works">
      <div className="landing-section-head"><div><p>HOW HARVESTNEAR WORKS</p><h2>From farm gate to your plate.</h2></div><span>A shorter, clearer journey for local food.</span></div>
      <div className="steps-line">
        <article><span>01</span><div><LocateFixed size={21}/></div><h3>Discover nearby</h3><p>Share your area and see available produce ranked by distance.</p></article>
        <article><span>02</span><div><ShoppingBag size={21}/></div><h3>Order what you need</h3><p>Buy practical quantities while live farmer inventory lasts.</p></article>
        <article><span>03</span><div><Truck size={21}/></div><h3>Choose fulfilment</h3><p>Select doorstep delivery, farmer delivery, or local pickup.</p></article>
        <article><span>04</span><div><Check size={21}/></div><h3>Pay securely</h3><p>Complete payment in naira and follow the order to delivery.</p></article>
      </div>
    </section>

    <section className="audience-band consumer-band">
      <div className="audience-image"><img src="/produce/creamy-avocados.webp" alt="Fresh avocados from a local farm"/><span><strong>2.4 km</strong> from your location</span></div>
      <div className="audience-copy"><p>FOR CONSUMERS</p><h2>Freshness you can<br/>actually locate.</h2><p>See what farmers have ready on a particular date, compare distance and prices, and order in smaller quantities without the uncertainty of a long supply chain.</p><ul><li><Check size={14}/> Availability you can see before ordering</li><li><Check size={14}/> Produce ranked by proximity</li><li><Check size={14}/> Pickup and delivery choices</li></ul><button onClick={onShop}>Start shopping <ArrowRight size={16}/></button></div>
    </section>

    <section className="audience-band farmer-band">
      <div className="audience-copy"><p>FOR FARMERS</p><h2>Your next customer<br/>may be nearby.</h2><p>Turn available harvest into visible inventory. Reach local buyers, sell down stock in practical portions, and manage orders from one clear workspace.</p><ul><li><Check size={14}/> Date-based produce listings</li><li><Check size={14}/> Live remaining-quantity controls</li><li><Check size={14}/> Order and payout visibility</li></ul><button onClick={onFarmer}>Sell on HarvestNear <ArrowRight size={16}/></button></div>
      <div className="audience-image"><img src="/produce/oyo-white-yam.webp" alt="Fresh yam ready for market"/><span><strong>72%</strong> of this harvest sold</span></div>
    </section>

    <section className="landing-cta"><img src="/brand/harvestnear-mark.png" alt="HarvestNear mark"/><div><p>YOUR LOCAL HARVEST IS WAITING</p><h2>Find something fresh nearby.</h2><span>Start with today&apos;s produce and choose the journey that works for you.</span></div><button onClick={onShop}>Browse the market <ArrowRight size={17}/></button></section>
  </main>;
}

function SiteFooter({ view, onNavigate }: { view: "landing" | "market" | "orders" | "farmer" | "profile"; onNavigate: (view: "landing" | "market" | "orders" | "farmer" | "profile") => void }) {
  return <footer className="site-footer">
    <div className="footer-main">
      <div className="footer-brand">
        <button className="footer-logo" onClick={() => onNavigate("landing")} aria-label="HarvestNear home"><img src="/brand/harvestnear-lockup.png" alt="HarvestNear — Fresh Local Produce, Found Here" /></button>
        <p>Fresh Nigerian produce, fair prices, and stronger local farming communities.</p>
        <div className="footer-contact"><a href="mailto:hello@harvestnear.ng"><Mail size={15}/> hello@harvestnear.ng</a><a href="#" aria-label="HarvestNear social profile"><AtSign size={16}/></a></div>
      </div>
      <nav className="footer-links" aria-label="Marketplace links"><strong>Marketplace</strong><button className={view === "landing" ? "active" : ""} onClick={() => onNavigate("landing")}>About HarvestNear</button><button className={view === "market" ? "active" : ""} onClick={() => onNavigate("market")}>Shop produce</button><button className={view === "orders" ? "active" : ""} onClick={() => onNavigate("orders")}>My orders</button><button className={view === "farmer" ? "active" : ""} onClick={() => onNavigate("farmer")}>Farmer workspace</button></nav>
      <nav className="footer-links" aria-label="Support links"><strong>Account & support</strong><button className={view === "profile" ? "active" : ""} onClick={() => onNavigate("profile")}>My profile</button><button>Help centre</button><button>Delivery areas</button><button>Returns & refunds</button></nav>
      <div className="footer-newsletter"><strong>Harvest notes</strong><p>Weekly produce updates and seasonal picks from farms near you.</p><form onSubmit={(event) => event.preventDefault()}><label><span className="sr-only">Email address</span><input type="email" required placeholder="Email address"/></label><button aria-label="Subscribe"><ArrowRight size={16}/></button></form></div>
    </div>
    <div className="footer-bottom"><span>© 2026 HarvestNear Nigeria</span><div><button>Privacy</button><button>Terms</button><button>Cookies</button></div><span className="footer-local"><MapPin size={12}/> Fresh Local Produce, Found Here</span></div>
  </footer>;
}

function ProfilePage() {
  const [role, setRole] = useState<"consumer" | "farmer">("consumer");
  const [editing, setEditing] = useState(false);
  return <main className="profile-page">
    <header className="profile-heading"><div><p className="eyebrow"><span /> ACCOUNT</p><h1>My profile</h1><p>Manage your identity, preferences, and HarvestNear activity.</p></div><div className="profile-role-switch"><button className={role === "consumer" ? "selected" : ""} onClick={() => setRole("consumer")}><UserRound size={15}/> Consumer</button><button className={role === "farmer" ? "selected" : ""} onClick={() => setRole("farmer")}><Store size={15}/> Farmer</button></div></header>

    {role === "consumer" ? <div className="consumer-profile">
      <section className="profile-identity">
        <div className="identity-cover consumer-cover"><img src="/produce/garden-fresh-spinach.webp" alt="Fresh produce"/><div/></div>
        <div className="identity-row"><span className="profile-avatar">TA</span><div><span className="verified-label"><Check size={11}/> Verified customer</span><h2>Tola Adebayo</h2><p><MapPin size={13}/> Gudu, Abuja · Member since June 2026</p></div><button onClick={() => setEditing((value) => !value)}>{editing ? "Save changes" : "Edit profile"}</button></div>
      </section>

      <div className="consumer-profile-grid">
        <aside className="profile-contact"><div className="profile-panel-head"><h3>Personal information</h3><span>PRIVATE</span></div><label>Full name<input disabled={!editing} defaultValue="Tola Adebayo"/></label><label>Email address<input disabled={!editing} defaultValue="tola.adebayo@example.com"/></label><label>Phone number<input disabled={!editing} defaultValue="+234 801 234 5678"/></label><label>Primary location<input disabled={!editing} defaultValue="Gudu, Abuja"/></label></aside>
        <div className="profile-main-column">
          <section className="profile-stats"><div><ShoppingBag size={18}/><strong>10</strong><span>Total orders</span></div><div><Leaf size={18}/><strong>4</strong><span>Farms supported</span></div><div><Star size={18}/><strong>8</strong><span>Reviews shared</span></div><div><PackageCheck size={18}/><strong>98%</strong><span>Delivery success</span></div></section>
          <section className="address-section"><div className="profile-panel-head"><div><h3>Delivery addresses</h3><p>Used to rank nearby produce and calculate delivery.</p></div><button><Plus size={14}/> Add address</button></div><div className="address-list"><article><span><MapPin size={18}/></span><div><strong>Home</strong><p>14 Bakori Street, Gudu, Abuja</p><small>Primary · Delivery instructions added</small></div><button>Manage</button></article><article><span><Store size={18}/></span><div><strong>Office</strong><p>Plot 18, Adetokunbo Crescent, Wuse 2</p><small>Available weekdays</small></div><button>Manage</button></article></div></section>
          <section className="preference-section"><div className="profile-panel-head"><div><h3>Shopping preferences</h3><p>These improve recommendations without hiding other produce.</p></div><button>Edit</button></div><div className="preference-tags"><span>Vegetables</span><span>Fruits</span><span>Under 10 km</span><span>Available today</span><span>Farmer delivery</span></div></section>
          <section className="saved-preview"><div className="profile-panel-head"><div><h3>Saved harvests</h3><p>Produce you want to find again.</p></div><button>View all <ArrowRight size={14}/></button></div><div>{products.slice(0,3).map(product=><article key={product.id}><img src={product.image} alt={product.name}/><span>{product.distance} km</span><strong>{product.name}</strong><small>{money(product.price)} / {product.unit}</small></article>)}</div></section>
        </div>
      </div>
    </div> : <div className="farmer-profile">
      <section className="farm-identity">
        <div className="farm-cover"><img src="/produce/fresh-sweet-corn.webp" alt="Adebayo Family Farm produce"/><div/></div>
        <div className="farm-identity-row"><span className="farm-avatar"><img src="/brand/harvestnear-mark.png" alt="Farm profile"/></span><div><span className="verified-label"><Check size={11}/> Verified farmer</span><h2>Adebayo Family Farm</h2><p><MapPin size={13}/> Kuje, Abuja · 2.4 km from Gudu</p></div><button onClick={() => setEditing((value) => !value)}>{editing ? "Save farm profile" : "Edit farm profile"}</button></div>
      </section>

      <section className="farm-summary"><div><span>FARM TYPE</span><strong>Family-owned mixed farm</strong></div><div><span>FARM SIZE</span><strong>6.5 hectares</strong></div><div><span>FARMING SINCE</span><strong>2014</strong></div><div><span>DELIVERY RADIUS</span><strong>15 km</strong></div><div><span>FARM RATING</span><strong><Star size={14} fill="currentColor"/> 4.9</strong></div></section>

      <div className="farm-profile-grid">
        <div className="farm-main">
          <section className="farm-about"><div className="profile-panel-head"><div><h3>About the farm</h3><p>The story customers see before placing an order.</p></div><button>Edit story</button></div><p>We are a second-generation family farm growing tomatoes, sweet corn, peppers, and seasonal vegetables in Kuje. We harvest in small batches, confirm availability every morning, and prioritise careful handling from our field to each pickup or delivery.</p><div className="farm-values"><span><Leaf size={15}/> Responsible growing</span><span><PackageCheck size={15}/> Harvest checked daily</span><span><Truck size={15}/> Farmer delivery available</span></div></section>
          <section className="farm-produce"><div className="profile-panel-head"><div><h3>Current harvests</h3><p>Active produce customers can order now.</p></div><button><Plus size={14}/> Add listing</button></div><div>{products.slice(0,4).map(product=><article key={product.id}><img src={product.image} alt={product.name}/><div><span>{product.available}</span><strong>{product.name}</strong><p>{product.stock} {product.unit}s remaining</p><small>{money(product.price)} / {product.unit}</small></div></article>)}</div></section>
        </div>
        <aside className="farm-details"><section><div className="profile-panel-head"><h3>Farm information</h3></div><dl><div><dt>Contact person</dt><dd>Adebayo Tunde</dd></div><div><dt>Public location</dt><dd>Kuje, Abuja</dd></div><div><dt>Pickup window</dt><dd>Mon–Sat, 8am–5pm</dd></div><div><dt>Order preparation</dt><dd>Usually within 4 hours</dd></div><div><dt>Payment settlement</dt><dd>Verified bank account</dd></div></dl></section><section><div className="profile-panel-head"><h3>Produce specialities</h3></div><div className="preference-tags"><span>Tomatoes</span><span>Sweet corn</span><span>Peppers</span><span>Leafy greens</span></div></section><section className="farm-performance"><div className="profile-panel-head"><h3>Marketplace record</h3></div><div><span>Orders fulfilled<strong>184</strong></span><span>On-time fulfilment<strong>96%</strong></span><span>Repeat customers<strong>61</strong></span><span>Member since<strong>2025</strong></span></div></section></aside>
      </div>
    </div>}
  </main>;
}

function OrdersPage({ onShop }: { onShop: () => void }) {
  const [tab, setTab] = useState<"active" | "past">("active");
  return <main className="my-orders-page">
    <header className="orders-heading">
      <div><p className="eyebrow"><span /> YOUR PURCHASES</p><h1>My orders</h1><p>Follow your fresh produce from farm gate to your doorstep.</p></div>
      <button onClick={onShop}><Plus size={17} /> Shop more produce</button>
    </header>

    <section className="order-overview">
      <div><span className="overview-icon moving"><Truck size={20} /></span><p><strong>1</strong><small>On the way</small></p></div>
      <div><span className="overview-icon"><Clock3 size={20} /></span><p><strong>1</strong><small>Being prepared</small></p></div>
      <div><span className="overview-icon"><PackageCheck size={20} /></span><p><strong>8</strong><small>Delivered this year</small></p></div>
      <div className="impact"><Leaf size={20} /><p><strong>4 farms</strong><small>supported locally</small></p></div>
    </section>

    <div className="orders-toolbar">
      <div className="order-tabs"><button className={tab === "active" ? "selected" : ""} onClick={() => setTab("active")}>Active orders <b>2</b></button><button className={tab === "past" ? "selected" : ""} onClick={() => setTab("past")}>Order history</button></div>
      <button className="order-help"><Headphones size={16} /> Need help?</button>
    </div>

    {tab === "active" ? <div className="active-orders">
      <article className="featured-order">
        <div className="featured-order-head"><div><span className="status-pill"><i /> OUT FOR DELIVERY</span><h2>Order #FM-2048</h2><p>Placed 18 July 2026 · 3 items from 2 farms</p></div><div className="arrival"><small>ESTIMATED ARRIVAL</small><strong>Today, 11:30 am–12:30 pm</strong><span>Driver is 3.2 km away</span></div></div>
        <div className="order-progress">
          {[{label:"Order confirmed",time:"8:12 am"},{label:"Packed by farmers",time:"9:05 am"},{label:"Out for delivery",time:"10:18 am"},{label:"Delivered",time:"Expected 12:30 pm"}].map((step,index)=><div className={index < 3 ? "done" : ""} key={step.label}><span>{index < 2 ? <Check size={13}/> : index === 2 ? <Truck size={14}/> : <PackageCheck size={14}/>}</span><strong>{step.label}</strong><small>{step.time}</small></div>)}
        </div>
        <div className="order-detail-grid">
          <div className="order-produce"><h3>In this order</h3><div className="produce-stack">{products.slice(0,3).map((product,index)=><div key={product.id}><img src={product.image} alt={product.name}/><span>{index === 0 ? "2" : "1"}</span></div>)}</div><div className="order-item-names"><strong>Vine-ripe tomatoes, sweet corn</strong><span>and Oyo white yam</span></div></div>
          <div className="delivery-address"><MapPin size={18}/><div><small>DELIVERING TO</small><strong>14 Bakori Street, Gudu</strong><span>Abuja, FCT</span></div></div>
          <div className="order-total"><small>ORDER TOTAL</small><strong>{money(11200)}</strong><span>Paid with card</span></div>
        </div>
        <div className="featured-actions"><button className="track-order"><LocateFixed size={17}/> Track live delivery</button><button><Headphones size={16}/> Contact support</button><button>View receipt</button></div>
      </article>

      <article className="compact-order"><div className="compact-status"><span><Clock3 size={18}/></span><div><small>BEING PREPARED</small><h3>Order #FM-2051</h3><p>Placed today at 9:44 am</p></div></div><div className="compact-products"><img src={products[4].image} alt="Plantain"/><div><strong>Sweet ripe plantain</strong><span>2 bunches · Olaoluwa Farms</span></div></div><div className="compact-arrival"><small>Pickup tomorrow</small><strong>Gudu collection hub</strong></div><strong className="compact-price">{money(5200)}</strong><button><ArrowRight size={17}/></button></article>
    </div> : <div className="past-orders">
      {[{id:"#FM-1976",date:"04 July 2026",items:"Tomatoes, honey beans + 1 more",price:8650,images:[0,5],status:"Delivered"},{id:"#FM-1842",date:"21 June 2026",items:"Sweet corn and white yam",price:10400,images:[1,2],status:"Delivered"},{id:"#FM-1699",date:"08 June 2026",items:"Plantain and scotch bonnet",price:7100,images:[4,3],status:"Delivered"}].map(order=><article className="history-order" key={order.id}><div className="history-images">{order.images.map(index=><img key={index} src={products[index].image} alt=""/>)}</div><div><span><Check size={11}/> {order.status}</span><h3>Order {order.id}</h3><p>{order.date} · {order.items}</p></div><strong>{money(order.price)}</strong><button><RotateCcw size={15}/> Buy again</button><button className="history-open"><ArrowRight size={17}/></button></article>)}
    </div>}
  </main>;
}

function FarmerDashboard({ onShop }: { onShop: () => void }) {
  const orders = [
    { id: "#FM-2041", customer: "Chioma Okafor", item: "3 baskets · Tomatoes", time: "12 min ago", status: "Prepare" },
    { id: "#FM-2037", customer: "Musa Bello", item: "2 dozens · Sweet corn", time: "34 min ago", status: "Ready" },
    { id: "#FM-2029", customer: "Tola Adebayo", item: "1 basket · Tomatoes", time: "1 hr ago", status: "Collected" },
  ];
  return <main className="farmer-page">
    <div className="farmer-heading"><div><button onClick={onShop}><ArrowLeft size={16} /> Marketplace</button><p className="eyebrow"><span /> FARMER WORKSPACE</p><h1>Good morning, Adebayo.</h1><p>Here&apos;s what&apos;s happening with your harvest today.</p></div><button className="new-listing"><Plus size={18} /> Add new listing</button></div>
    <div className="metric-grid"><div><span>Today&apos;s sales</span><strong>₦84,500</strong><small>↑ 18% from yesterday</small></div><div><span>Open orders</span><strong>12</strong><small>5 need your attention</small></div><div><span>Produce listed</span><strong>148 <i>kg</i></strong><small>Across 4 active listings</small></div><div><span>Next payout</span><strong>₦62,300</strong><small>Monday, 22 July</small></div></div>
    <div className="farmer-columns">
      <section className="orders-panel"><div className="panel-head"><div><h2>Orders to fulfil</h2><p>Today&apos;s customer orders</p></div><button>View all <ArrowRight size={15} /></button></div>{orders.map((order) => <div className="order-row" key={order.id}><span className="order-icon"><ShoppingBag size={18} /></span><div><strong>{order.customer}</strong><p>{order.id} · {order.item}</p></div><small>{order.time}</small><button className={order.status.toLowerCase()}>{order.status}</button></div>)}</section>
      <section className="inventory-panel"><div className="panel-head"><div><h2>Inventory pulse</h2><p>Your active harvests</p></div><button><SlidersHorizontal size={16} /></button></div>{products.slice(0, 3).map((p) => <div className="inventory-row" key={p.id}><img src={p.image} alt="" /><div><strong>{p.name}</strong><p>{p.stock} {p.unit}s remaining</p><span><i style={{ width: `${p.stock / (p.stock + p.sold) * 100}%` }} /></span></div><b>{Math.round(p.stock / (p.stock + p.sold) * 100)}%</b></div>)}</section>
    </div>
  </main>;
}
