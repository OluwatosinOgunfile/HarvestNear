"use client";
/* eslint-disable @next/next/no-img-element */

import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Clock3,
  Heart,
  Headphones,
  House,
  AtSign,
  Leaf,
  LocateFixed,
  LogIn,
  LoaderCircle,
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
  Trash2,
  Truck,
  UserRound,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState, useSyncExternalStore } from "react";

type Product = {
  id: string;
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

function ModalBrand() {
  return <div className="modal-brand" aria-hidden="true"><img src="/brand/harvestnearu-header-lockup.png" alt=""/></div>;
}

type ManualPaymentSettings = { bank_name: string; account_name: string; account_number: string; instructions: string | null; is_enabled: boolean };

type MarketplaceStats = {
  farms: number;
  listings: number;
  averageRating: number;
  consumers: number;
  farmers: number;
};

const categories = ["All produce", "Vegetables", "Fruits", "Tubers", "Grains", "Eggs"];
const deliveryLocations = [
  { name: "Gudu, Abuja", latitude: 9.0019, longitude: 7.4534 },
  { name: "Wuse 2, Abuja", latitude: 9.0765, longitude: 7.4651 },
  { name: "Maitama, Abuja", latitude: 9.0962, longitude: 7.4923 },
  { name: "Gwarinpa, Abuja", latitude: 9.1099, longitude: 7.4042 },
  { name: "Lugbe, Abuja", latitude: 8.9672, longitude: 7.3679 },
  { name: "Kuje, Abuja", latitude: 8.8795, longitude: 7.2276 },
];
type Theme = "light" | "dark";
type View = "landing" | "market" | "orders" | "farmer" | "admin" | "profile" | "help" | "delivery" | "returns";
type CurrentUser = { id: string; email: string; firstName: string; lastName: string; role: "consumer" | "farmer" | "admin" | "support"; avatarUrl?: string | null; impersonating?: boolean; administrator?: { id: string; firstName: string; lastName: string } };
type NotificationItem = {
  id: string;
  type: "order" | "delivery" | "harvest" | "account";
  title: string;
  message: string;
  time: string;
  target: View;
  read: boolean;
};

function notificationView(actionUrl: string | null): View {
  if (actionUrl === "/profile") return "profile";
  if (actionUrl === "/farmer") return "farmer";
  if (actionUrl === "/produce" || actionUrl === "/market") return "market";
  if (actionUrl === "/admin") return "admin";
  if (actionUrl === "/help") return "help";
  return "orders";
}

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  if (seconds < 172800) return "Yesterday";
  return `${Math.floor(seconds / 86400)} days ago`;
}

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

async function readJsonResponse<T extends object>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json() as Promise<T>;
  return {} as T;
}

function walkingTime(distanceKm: number) {
  const minutes = Math.max(5, Math.round((Number(distanceKm) * 12) / 5) * 5);
  if (minutes <= 5) return "Under 5 min walk";
  if (minutes < 60) return `About ${minutes} min walk`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `About ${hours} hr${hours === 1 ? "" : "s"}${remainder ? ` ${remainder} min` : ""} walk`;
}

function transitionUpdate(update: () => void) {
  const transitionDocument = document as Document & { startViewTransition?: (callback: () => void) => void };
  if (transitionDocument.startViewTransition) transitionDocument.startViewTransition(update);
  else update();
}

function roleLabel(role: CurrentUser["role"]) {
  return `${role.charAt(0).toUpperCase()}${role.slice(1)} account`;
}

const viewPaths: Record<View, string> = { landing: "/", market: "/produce", orders: "/orders", farmer: "/farmer", admin: "/admin", profile: "/profile", help: "/help", delivery: "/delivery-areas", returns: "/returns-refunds" };

function viewFromPath(pathname: string): View {
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  if (normalized === "/produce" || normalized === "/market") return "market";
  return (Object.entries(viewPaths).find(([, path]) => path === normalized)?.[0] as View | undefined) || "landing";
}

async function uploadListingImage(file: File) {
  if (!file.type.match(/^image\/(jpeg|png|webp)$/)) throw new Error("Upload a JPG, PNG, or WebP image");
  if (file.size > 4 * 1024 * 1024) throw new Error("Listing images must be 4 MB or smaller");
  const form = new FormData(); form.set("file", file);
  const response = await fetch("/api/uploads/listing-image", { method: "POST", body: form });
  const result = await response.json() as { url?: string; error?: string };
  if (!response.ok || !result.url) throw new Error(result.error || "Could not upload the listing image");
  return result.url;
}

function FarmCoordinateFields({ defaultLatitude = "", defaultLongitude = "" }: { defaultLatitude?: string | number; defaultLongitude?: string | number }) {
  const [latitude, setLatitude] = useState(String(defaultLatitude));
  const [longitude, setLongitude] = useState(String(defaultLongitude));
  const [locating, setLocating] = useState(false);
  function captureLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition((position) => {
      setLatitude(position.coords.latitude.toFixed(6));
      setLongitude(position.coords.longitude.toFixed(6));
      setLocating(false);
    }, () => setLocating(false), { enableHighAccuracy: true, timeout: 12000 });
  }
  return <div className="farm-coordinate-fields"><button type="button" onClick={captureLocation}><LocateFixed size={15}/>{locating ? "Capturing location..." : "Use farm's current location"}</button><div className="form-row"><label>Latitude<input name="latitude" type="number" min="-90" max="90" step="any" value={latitude} onChange={(event) => setLatitude(event.target.value)} placeholder="9.076500" required/></label><label>Longitude<input name="longitude" type="number" min="-180" max="180" step="any" value={longitude} onChange={(event) => setLongitude(event.target.value)} placeholder="7.465100" required/></label></div><small>Capture this while physically at the farm, or enter its map coordinates.</small></div>;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [marketplaceStats, setMarketplaceStats] = useState<MarketplaceStats | null>(null);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(false);
  const [view, setView] = useState<View>("landing");
  const [category, setCategory] = useState("All produce");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [paid, setPaid] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [paymentReceipt, setPaymentReceipt] = useState<File | null>(null);
  const [manualPaymentSettings, setManualPaymentSettings] = useState<ManualPaymentSettings | null>(null);
  const [storeCreditKobo, setStoreCreditKobo] = useState(0);
  const [confirmedOrderNumber, setConfirmedOrderNumber] = useState("");
  const [orderAwaitingReview, setOrderAwaitingReview] = useState(true);
  const [delivery, setDelivery] = useState<"door" | "pickup">("door");
  const [liked, setLiked] = useState<string[]>([]);
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => "light");
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupRole, setSignupRole] = useState<"consumer" | "farmer">("consumer");
  const [signupComplete, setSignupComplete] = useState(false);
  const [signupError, setSignupError] = useState("");
  const [signupBusy, setSignupBusy] = useState(false);
  const [signinOpen, setSigninOpen] = useState(false);
  const [signinComplete, setSigninComplete] = useState(false);
  const [signinIdentifier, setSigninIdentifier] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [signinError, setSigninError] = useState("");
  const [signinBusy, setSigninBusy] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const notificationUserId = currentUser?.id;
  const [sessionLoading, setSessionLoading] = useState(true);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [accountCreditKobo, setAccountCreditKobo] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showSigninPassword, setShowSigninPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [sortBy, setSortBy] = useState<"nearest" | "price-low" | "price-high" | "rating" | "stock">("nearest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState(deliveryLocations[0]);
  const [maxDistance, setMaxDistance] = useState(20);
  const [maxPrice, setMaxPrice] = useState(50000);
  const [distanceFilterActive, setDistanceFilterActive] = useState(false);
  const [priceFilterActive, setPriceFilterActive] = useState(false);
  const [todayOnly, setTodayOnly] = useState(false);
  const [hideLowStock, setHideLowStock] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [view]);

  useEffect(() => {
    const syncView = () => setView(viewFromPath(window.location.pathname));
    syncView();
    window.addEventListener("popstate", syncView);
    return () => window.removeEventListener("popstate", syncView);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadProduce() {
      try {
        const response = await fetch(`/api/produce?lat=${deliveryLocation.latitude}&lng=${deliveryLocation.longitude}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Could not load produce");
        const data = await response.json() as { produce: Product[]; stats: MarketplaceStats };
        setProducts(data.produce);
        setMarketplaceStats(data.stats);
        setProductsError(false);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setProductsError(true);
      } finally {
        if (!controller.signal.aborted) setProductsLoading(false);
      }
    }
    loadProduce();
    return () => controller.abort();
  }, [view, deliveryLocation.latitude, deliveryLocation.longitude]);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then(async (data: { user: CurrentUser | null }) => {
        setCurrentUser(data.user);
        const localCart = JSON.parse(localStorage.getItem("harvestnearu-cart") || "{}") as Record<string, number>;
        const localFavourites = JSON.parse(localStorage.getItem("harvestnearu-favourites") || "[]") as string[];
        if (!data.user || !["consumer", "farmer"].includes(data.user.role)) {
          setCart(localCart); setLiked(localFavourites); return;
        }
        const [cartResponse, favouriteResponse, notificationResponse] = await Promise.all([
          fetch("/api/cart", { cache: "no-store" }), fetch("/api/favourites", { cache: "no-store" }), fetch("/api/notifications", { cache: "no-store" }),
        ]);
        const cartData = await cartResponse.json() as { cart?: Record<string, number> };
        const favouriteData = await favouriteResponse.json() as { favourites?: string[] };
        const mergedCart = { ...(cartData.cart || {}), ...localCart };
        const mergedFavourites = [...new Set([...(favouriteData.favourites || []), ...localFavourites])];
        setCart(mergedCart); setLiked(mergedFavourites);
        localStorage.removeItem("harvestnearu-cart"); localStorage.removeItem("harvestnearu-favourites");
        if (Object.keys(localCart).length) fetch("/api/cart", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: Object.entries(mergedCart).map(([listingId, quantity]) => ({ listingId, quantity })) }) });
        for (const listingId of localFavourites) fetch("/api/favourites", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId, saved: true }) });
        if (notificationResponse.ok) {
          const data = await notificationResponse.json() as { notifications: Array<{ id: string; type: NotificationItem["type"]; title: string; message: string; action_url: string | null; read_at: string | null; created_at: string }> };
          setNotifications(data.notifications.map((item) => ({ id: item.id, type: item.type, title: item.title, message: item.message, time: relativeTime(item.created_at), read: Boolean(item.read_at), target: notificationView(item.action_url) })));
        }
      })
      .finally(() => setSessionLoading(false));
  }, []);

  useEffect(() => {
    const refreshAccount = () => fetch("/api/auth/session", { cache: "no-store" }).then((response) => response.json()).then((data: { user: CurrentUser | null }) => setCurrentUser(data.user));
    window.addEventListener("harvestnearu-profile-updated", refreshAccount);
    return () => window.removeEventListener("harvestnearu-profile-updated", refreshAccount);
  }, []);

  useEffect(() => {
    if (sessionLoading || currentUser) return;
    localStorage.setItem("harvestnearu-cart", JSON.stringify(cart));
    localStorage.setItem("harvestnearu-favourites", JSON.stringify(liked));
  }, [cart, liked, currentUser, sessionLoading]);

  useEffect(() => {
    if (!notificationUserId) return;
    let active = true;
    async function refreshNotifications() {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok || !active) return;
      const data = await response.json() as { notifications: Array<{ id: string; type: NotificationItem["type"]; title: string; message: string; action_url: string | null; read_at: string | null; created_at: string }> };
      if (active) setNotifications(data.notifications.map((item) => ({ id: item.id, type: item.type, title: item.title, message: item.message, time: relativeTime(item.created_at), read: Boolean(item.read_at), target: notificationView(item.action_url) })));
    }
    const interval = window.setInterval(refreshNotifications, 30_000);
    window.addEventListener("focus", refreshNotifications);
    return () => { active = false; window.clearInterval(interval); window.removeEventListener("focus", refreshNotifications); };
  }, [notificationUserId]);

  const role = currentUser?.role;
  const isConsumer = role === "consumer";
  const isFarmer = role === "farmer";
  const isAdmin = role === "admin" || role === "support";
  const canPurchase = isConsumer || isFarmer;

  useEffect(() => {
    if (!accountMenuOpen || !canPurchase) return;
    let active = true;
    fetch("/api/store-credit", { cache: "no-store" }).then(async (response) => {
      const result = await response.json() as { balanceKobo?: number };
      if (active && response.ok) setAccountCreditKobo(Number(result.balanceKobo || 0));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [accountMenuOpen, canPurchase, currentUser?.id]);

  useEffect(() => {
    if (sessionLoading) return;
    if (view === "landing" && isAdmin) {
      window.history.replaceState({}, "", viewPaths.admin);
      queueMicrotask(() => setView("admin"));
      return;
    }
    const protectedView = view === "orders" || view === "farmer" || view === "admin" || view === "profile";
    const denied = (!currentUser && protectedView) || (view === "market" && isAdmin) || (view === "orders" && !canPurchase) || (view === "farmer" && !isFarmer) || (view === "admin" && !isAdmin) || (view === "profile" && !isConsumer && !isFarmer);
    if (!denied) return;
    window.history.replaceState({}, "", "/");
    queueMicrotask(() => {
      setView("landing");
      if (!currentUser && protectedView) openSignIn(false);
    });
  }, [view, sessionLoading, currentUser, isAdmin, canPurchase, isFarmer, isConsumer]);

  function openSignIn(resumeCheckout = false) {
    setSigninIdentifier("");
    setSigninPassword("");
    setSigninError("");
    setSigninComplete(false);
    setShowSigninPassword(false);
    setPendingCheckout(resumeCheckout);
    setSigninOpen(true);
  }

  function openSignup() {
    setSignupComplete(false);
    setSignupError("");
    setShowSignupPassword(false);
    setSignupOpen(true);
  }

  function closeSignIn() {
    setSigninOpen(false);
    setPendingCheckout(false);
  }

  function navigate(next: View) {
    const protectedView = next === "orders" || next === "farmer" || next === "admin" || next === "profile";
    if (!currentUser && protectedView) {
      openSignIn(false);
      return;
    }
    if ((next === "market" && isAdmin) || (next === "orders" && !canPurchase) || (next === "farmer" && !isFarmer) || (next === "admin" && !isAdmin) || (next === "profile" && !isConsumer && !isFarmer)) return;
    if (window.location.pathname !== viewPaths[next]) window.history.pushState({}, "", viewPaths[next]);
    setView(next);
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSigninBusy(true);
    setSigninError("");
    try {
      const response = await fetch("/api/auth/signin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier: signinIdentifier, password: signinPassword }) });
      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await response.json() as { user?: CurrentUser; error?: string }
        : { error: response.status === 404 ? "Sign-in service is unavailable. Refresh the page and try again." : "The sign-in service returned an unexpected response. Try again shortly." };
      if (!response.ok || !data.user) throw new Error(data.error || "Sign in failed");
      setCurrentUser(data.user);
      await hydrateShoppingState(data.user);
      if (pendingCheckout && ["consumer", "farmer"].includes(data.user.role)) {
        setPendingCheckout(false);
        setSigninOpen(false);
        setCartOpen(false);
        setCheckout(true);
        return;
      }
      setPendingCheckout(false);
      setSigninComplete(true);
    } catch (error) {
      setSigninError((error as Error).message);
    } finally {
      setSigninBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    setCurrentUser(null);
    setCart({}); setLiked([]); setNotifications([]);
    setAccountMenuOpen(false);
    window.history.replaceState({}, "", "/");
    setView("landing");
  }

  async function stopViewingAsUser() {
    const response = await fetch("/api/admin/impersonate", { method: "DELETE" });
    if (response.ok) window.location.reload();
  }

  function enterImpersonatedView(user: CurrentUser) {
    setCurrentUser(user);
    setCart({}); setLiked([]); setNotifications([]);
    setAccountMenuOpen(false);
    setNotificationOpen(false);
    setCartOpen(false);
    const targetView: View = user.role === "farmer" ? "farmer" : user.role === "admin" || user.role === "support" ? "admin" : "landing";
    window.history.replaceState({}, "", viewPaths[targetView]);
    setView(targetView);
    if (["consumer", "farmer"].includes(user.role)) void Promise.all([fetch("/api/cart", { cache: "no-store" }), fetch("/api/favourites", { cache: "no-store" }), fetch("/api/notifications", { cache: "no-store" })]).then(async ([cartResponse, favouriteResponse, notificationResponse]) => {
      const cartData = await cartResponse.json() as { cart?: Record<string, number> };
      const favouriteData = await favouriteResponse.json() as { favourites?: string[] };
      setCart(cartData.cart || {}); setLiked(favouriteData.favourites || []);
      if (notificationResponse.ok) {
        const data = await notificationResponse.json() as { notifications: Array<{ id: string; type: NotificationItem["type"]; title: string; message: string; action_url: string | null; read_at: string | null; created_at: string }> };
        setNotifications(data.notifications.map((item) => ({ id: item.id, type: item.type, title: item.title, message: item.message, time: relativeTime(item.created_at), read: Boolean(item.read_at), target: notificationView(item.action_url) })));
      }
    });
  }

  async function beginCheckout() {
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const data = await response.json() as { user: CurrentUser | null };
      if (!response.ok || !data.user || !["consumer", "farmer"].includes(data.user.role)) {
        setCurrentUser(data.user || null);
        setCartOpen(false);
        openSignIn(true);
        return;
      }
      setCurrentUser(data.user);
      await hydrateShoppingState(data.user);
      const settingsResponse = await fetch("/api/payments/manual/settings", { cache: "no-store" });
      const settingsResult = await settingsResponse.json() as { settings?: ManualPaymentSettings; storeCreditKobo?: number; error?: string };
      setManualPaymentSettings(settingsResponse.ok && settingsResult.settings ? settingsResult.settings : null);
      setStoreCreditKobo(settingsResponse.ok ? Number(settingsResult.storeCreditKobo || 0) : 0);
      const creditCoversOrder = Number(settingsResult.storeCreditKobo || 0) >= Math.round((subtotal + deliveryFee) * 100);
      setCheckoutError(settingsResponse.ok && (settingsResult.settings || creditCoversOrder) ? "" : settingsResult.error || "Manual bank payment is not currently available");
      setCartOpen(false);
      setCheckout(true);
    } catch {
      setCartOpen(false);
      openSignIn(true);
    }
  }

  async function completeOrder() {
    setCheckoutBusy(true); setCheckoutError("");
    try {
      const requiresReceipt = storeCreditKobo < Math.round((subtotal + deliveryFee) * 100);
      if (requiresReceipt && !paymentReceipt) throw new Error("Select your payment receipt");
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: items.map((item) => ({ listingId: item.id, quantity: cart[item.id] })), fulfilmentMethod: delivery }) });
      const result = await readJsonResponse<{ orderId?: string; orderNumber?: string; requiresReceipt?: boolean; error?: string }>(response);
      if (!response.ok || !result.orderId || !result.orderNumber) throw new Error(result.error || "Could not create order");
      if (result.requiresReceipt !== false) {
        const receipt = new FormData(); receipt.set("receipt", paymentReceipt!);
        const receiptResponse = await fetch(`/api/payments/manual/${result.orderId}`, { method: "POST", body: receipt });
        const receiptResult = await readJsonResponse<{ error?: string }>(receiptResponse);
        if (!receiptResponse.ok) throw new Error(receiptResult.error || `Order ${result.orderNumber} was created, but the receipt could not be submitted. Upload it from My orders.`);
      }
      setOrderAwaitingReview(result.requiresReceipt !== false);
      setConfirmedOrderNumber(result.orderNumber); setPaid(true);
      setProducts((current) => current.map((product) => cart[product.id] ? { ...product, stock: Math.max(0, product.stock - cart[product.id]), sold: product.sold + cart[product.id] } : product));
    } catch (error) {
      const message = (error as Error).message;
      setCheckoutError(message.includes("expected pattern")
        ? "The order could not submit the receipt. Please try again, or upload it from My orders."
        : message);
    } finally { setCheckoutBusy(false); }
  }

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    localStorage.setItem("harvest-near-theme", next);
    window.dispatchEvent(new Event("harvest-near-theme-change"));
  }

  async function submitSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignupBusy(true);
    setSignupError("");
    const form = new FormData(event.currentTarget);
    try {
      const password = String(form.get("password") || "");
      const confirmPassword = String(form.get("confirmPassword") || "");
      if (password !== confirmPassword) throw new Error("Passwords do not match");
      const response = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName: form.get("firstName"), lastName: form.get("lastName"), phone: form.get("phone"), email: form.get("email"), password, confirmPassword, role: signupRole, farmName: form.get("farmName"), farmLocation: form.get("farmLocation"), latitude: form.get("latitude"), longitude: form.get("longitude") }) });
      const data = await response.json() as { user?: CurrentUser; error?: string };
      if (!response.ok || !data.user) throw new Error(data.error || "Account creation failed");
      setCurrentUser(data.user);
      if (pendingCheckout && ["consumer", "farmer"].includes(data.user.role)) {
        setPendingCheckout(false);
        setSignupOpen(false);
        setCartOpen(false);
        setCheckout(true);
        return;
      }
      setSignupComplete(true);
    } catch (error) {
      setSignupError((error as Error).message);
    } finally {
      setSignupBusy(false);
    }
  }

  const visible = useMemo(() => {
    const filtered = products.filter((product) =>
      (category === "All produce" || product.category === category) &&
      (product.name.toLowerCase().includes(query.toLowerCase()) || product.farmer.toLowerCase().includes(query.toLowerCase())) &&
      (!distanceFilterActive || product.distance <= maxDistance) &&
      (!priceFilterActive || product.price <= maxPrice) &&
      (!todayOnly || product.available === "Today") && (!hideLowStock || product.stock > 15)
    );
    return filtered.sort((a, b) => {
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "stock") return b.stock - a.stock;
      return a.distance - b.distance;
    });
  }, [products, category, query, distanceFilterActive, maxDistance, priceFilterActive, maxPrice, todayOnly, hideLowStock, sortBy]);

  const activeFilterCount = Number(distanceFilterActive) + Number(priceFilterActive) + Number(todayOnly) + Number(hideLowStock);
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = visible.slice((safePage - 1) * pageSize, safePage * pageSize);

  const items = products.filter((p) => cart[p.id]);
  const itemCount = Object.values(cart).reduce((sum, n) => sum + n, 0);
  const subtotal = items.reduce((sum, p) => sum + p.price * cart[p.id], 0);
  const deliveryFee = delivery === "door" ? 1800 : 0;
  const checkoutCredit = Math.min(subtotal + deliveryFee, storeCreditKobo / 100);
  const checkoutAmount = Math.max(0, subtotal + deliveryFee - checkoutCredit);
  const unreadNotificationCount = notifications.filter((item) => !item.read).length;
  const visibleNotifications = notificationFilter === "unread" ? notifications.filter((item) => !item.read) : notifications;

  async function hydrateShoppingState(user: CurrentUser) {
    if (!["consumer", "farmer"].includes(user.role)) return;
    const [cartResponse, favouriteResponse, notificationResponse] = await Promise.all([fetch("/api/cart", { cache: "no-store" }), fetch("/api/favourites", { cache: "no-store" }), fetch("/api/notifications", { cache: "no-store" })]);
    const cartData = await cartResponse.json() as { cart?: Record<string, number> };
    const favouriteData = await favouriteResponse.json() as { favourites?: string[] };
    const mergedCart = { ...(cartData.cart || {}), ...cart };
    const mergedFavourites = [...new Set([...(favouriteData.favourites || []), ...liked])];
    setCart(mergedCart); setLiked(mergedFavourites);
    if (Object.keys(cart).length) persistCartForUser(mergedCart);
    for (const listingId of liked) fetch("/api/favourites", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId, saved: true }) });
    if (notificationResponse.ok) {
      const data = await notificationResponse.json() as { notifications: Array<{ id: string; type: NotificationItem["type"]; title: string; message: string; action_url: string | null; read_at: string | null; created_at: string }> };
      setNotifications(data.notifications.map((item) => ({ id: item.id, type: item.type, title: item.title, message: item.message, time: relativeTime(item.created_at), read: Boolean(item.read_at), target: notificationView(item.action_url) })));
    }
  }

  function persistCartForUser(next: Record<string, number>) {
    fetch("/api/cart", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: Object.entries(next).map(([listingId, quantity]) => ({ listingId, quantity })) }) });
  }

  function persistCart(next: Record<string, number>) {
    if (!currentUser || !canPurchase) return;
    persistCartForUser(next);
  }

  function toggleFavourite(listingId: string) {
    setLiked((current) => {
      const saved = !current.includes(listingId);
      const next = saved ? [...current, listingId] : current.filter((id) => id !== listingId);
      if (currentUser && canPurchase) fetch("/api/favourites", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId, saved }) });
      return next;
    });
  }

  function markNotificationRead(id: string) {
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
    fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
  }

  function markAllNotificationsRead() {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
  }

  function openNotification(item: NotificationItem) {
    markNotificationRead(item.id);
    setNotificationOpen(false);
    navigate(item.target);
  }

  function add(product: Product) {
    setCart((current) => { const next = { ...current, [product.id]: Math.min((current[product.id] || 0) + 1, product.stock) }; persistCart(next); return next; });
  }

  function update(id: string, delta: number) {
    setCart((current) => {
      const next = Math.max(0, (current[id] || 0) + delta);
      const copy = { ...current };
      if (!next) delete copy[id]; else copy[id] = next;
      persistCart(copy);
      return copy;
    });
  }

  function useDeviceLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      setDeliveryLocation({ name: "Current location", latitude: position.coords.latitude, longitude: position.coords.longitude });
      setLocationOpen(false);
      setCurrentPage(1);
    });
  }

  return (
    <div className="app-shell" data-theme={theme}>
      {currentUser?.impersonating && <div className="impersonation-banner" role="status"><span><Eye size={16}/><strong>Viewing as {currentUser.firstName} {currentUser.lastName}</strong><small>{roleLabel(currentUser.role)} · Read-only administrator preview.</small></span><button onClick={stopViewingAsUser}><ArrowLeft size={15}/> Return to administration</button></div>}
      <header className="topbar">
        <button className="brand brand-image" onClick={() => navigate(isAdmin ? "admin" : "landing")} aria-label={isAdmin ? "HarvestNearU administration" : "HarvestNearU home"}><img className="brand-lockup" src="/brand/harvestnearu-header-lockup.png" alt="HarvestNearU" /></button>
        {sessionLoading ? <div className="main-nav nav-session-loading" aria-label="Loading navigation"><span/><span/><span/></div> : <nav className="main-nav" aria-label="Main navigation">
          {!isAdmin && <button className={view === "landing" ? "active" : ""} onClick={() => navigate("landing")}>Home</button>}
          {!isAdmin && <button className={view === "market" ? "active" : ""} onClick={() => navigate("market")}>Shop produce</button>}
          {canPurchase && <button className={view === "orders" ? "active" : ""} onClick={() => navigate("orders")}>My orders</button>}
          {isFarmer && <button className={view === "farmer" ? "active" : ""} onClick={() => navigate("farmer")}>Farmer workspace</button>}
          {isAdmin && <button className={view === "admin" ? "active" : ""} onClick={() => navigate("admin")}>Administration</button>}
        </nav>}
        <div className="header-actions">
          {!sessionLoading && currentUser && <button className={`notification-button ${notificationOpen ? "active" : ""}`} onClick={() => { setAccountMenuOpen(false); setNotificationOpen(true); }} aria-label={`Open notifications${unreadNotificationCount ? `, ${unreadNotificationCount} unread` : ", no unread notifications"}`} title="Notifications"><Bell size={18}/>{unreadNotificationCount > 0 && <b>{unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}</b>}</button>}
          {!sessionLoading && !isAdmin && <button className="cart-button" onClick={() => setCartOpen(true)} aria-label={`Open basket${itemCount ? `, ${itemCount} ${itemCount === 1 ? "item" : "items"}` : ", empty"}`} title="Basket"><ShoppingBag size={18} />{itemCount > 0 && <b>{itemCount}</b>}</button>}
          <div className="account-menu-wrap">
            <button className={`account-menu-trigger ${accountMenuOpen ? "active" : ""}`} onClick={() => setAccountMenuOpen((open) => !open)} aria-expanded={accountMenuOpen} aria-haspopup="menu" disabled={sessionLoading}>
              <span className={`account-avatar ${currentUser?.avatarUrl ? "has-photo" : ""}`}>{currentUser?.avatarUrl ? <img src={currentUser.avatarUrl} alt=""/> : <UserRound size={17} />}</span><ChevronDown size={15} /><span className="sr-only">Account menu</span>
            </button>
            {accountMenuOpen && <>
              <button className="account-menu-backdrop" aria-label="Close account menu" onClick={() => setAccountMenuOpen(false)} />
              <div className="account-menu" role="menu">
                <div className="account-menu-heading"><span className={`account-avatar ${currentUser?.avatarUrl ? "has-photo" : ""}`}>{currentUser?.avatarUrl ? <img src={currentUser.avatarUrl} alt=""/> : <UserRound size={17} />}</span><div><strong>{currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : sessionLoading ? "Checking your account" : "Welcome to HarvestNearU"}</strong><small>{currentUser ? roleLabel(currentUser.role) : "Manage your account and preferences"}</small></div></div>
                {currentUser && !isAdmin && <button role="menuitem" onClick={() => { navigate("profile"); setAccountMenuOpen(false); }}><UserRound size={17} /><span><strong>My profile</strong><small>{isFarmer ? "Farm and owner information" : "Customer information"}</small></span><ChevronRight size={15} /></button>}
                {currentUser && canPurchase && <button className="account-credit-menu" role="menuitem" onClick={() => { navigate("profile"); setAccountMenuOpen(false); }}><AtSign size={17}/><span><strong>Account credit</strong><small>Available for future purchases</small></span><b>{money(accountCreditKobo / 100)}</b></button>}
                {isAdmin && <button role="menuitem" onClick={() => { navigate("admin"); setAccountMenuOpen(false); }}><SlidersHorizontal size={17} /><span><strong>Administration</strong><small>Marketplace operations</small></span><ChevronRight size={15} /></button>}
                {currentUser && <button role="menuitem" onClick={() => { setAccountMenuOpen(false); setNotificationOpen(true); }}><Bell size={17} /><span><strong>Notifications</strong><small>Orders, harvests and delivery updates</small></span>{unreadNotificationCount > 0 && <i>{unreadNotificationCount}</i>}</button>}
                <button role="menuitem" onClick={toggleTheme}>{theme === "light" ? <Moon size={17} /> : <Sun size={17} />}<span><strong>{theme === "light" ? "Dark theme" : "Light theme"}</strong><small>Change the appearance</small></span><span className={`theme-switch ${theme === "dark" ? "on" : ""}`}><b /></span></button>
                <div className="account-menu-support" aria-label="Help and support">
                  <button role="menuitem" onClick={() => { navigate("help"); setAccountMenuOpen(false); }}><Headphones size={16} /><span>Help centre</span></button>
                  <button role="menuitem" onClick={() => { navigate("delivery"); setAccountMenuOpen(false); }}><MapPin size={16} /><span>Delivery areas</span></button>
                  <button role="menuitem" onClick={() => { navigate("returns"); setAccountMenuOpen(false); }}><RotateCcw size={16} /><span>Returns & refunds</span></button>
                </div>
                {!currentUser ? <div className="account-menu-auth">
                  <button onClick={() => { setAccountMenuOpen(false); openSignIn(false); }}><LogIn size={16} /> Sign in</button>
                  <button onClick={() => { setAccountMenuOpen(false); openSignup(); }}><UserRound size={16} /> Create account</button>
                </div> : <div className="account-menu-auth signed-in"><button onClick={signOut}><LogIn size={16} /> Sign out</button></div>}
              </div>
            </>}
          </div>
        </div>
      </header>

      {!sessionLoading && <nav className="mobile-nav" aria-label="Mobile navigation">
        {!isAdmin && <button className={view === "landing" ? "active" : ""} onClick={() => navigate("landing")}><House size={17} /><span>Home</span></button>}
        {!isAdmin && <button className={view === "market" ? "active" : ""} onClick={() => navigate("market")}><ShoppingBag size={17} /><span>Shop</span></button>}
        {canPurchase && <button className={view === "orders" ? "active" : ""} onClick={() => navigate("orders")}><PackageCheck size={17} /><span>Orders</span></button>}
        {isFarmer && <button className={view === "farmer" ? "active" : ""} onClick={() => navigate("farmer")}><Store size={17} /><span>Farm</span></button>}
        {isAdmin && <button className={view === "admin" ? "active" : ""} onClick={() => navigate("admin")}><SlidersHorizontal size={17} /><span>Admin</span></button>}
        {!currentUser && <button onClick={() => openSignIn(false)}><LogIn size={17}/><span>Sign in</span></button>}
      </nav>}

      {sessionLoading ? <DataLoading/> : view === "landing" ? <LandingPage stats={marketplaceStats} signedOut={!currentUser} onShop={() => navigate("market")} onFarmer={() => navigate("farmer")} onSignup={openSignup} /> : view === "market" ? (
        <main>
          <section className="market-intro">
            <div className="intro-copy">
              <p className="eyebrow"><span /> FRESH LOCAL PRODUCE, FOUND HERE</p>
              <h1>HarvestNearU.<br /><em>Fresh starts here.</em></h1>
              <p>Buy today&apos;s harvest directly from trusted farmers near you. Fresher produce, fairer prices, stronger local communities.</p>
            </div>
            <div className="market-stats">
              <div><strong>{marketplaceStats?.farms ?? "—"}</strong><span>verified farms</span></div>
              <div><strong>{marketplaceStats?.listings ?? "—"}</strong><span>fresh listings</span></div>
              <div><strong>{marketplaceStats?.averageRating ?? "—"}</strong><span>average rating</span></div>
            </div>
          </section>

          <section className="discovery-bar">
            <label className="search-box"><Search size={20} /><input value={query} onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }} placeholder="Search tomatoes, yam, farmer..." /></label>
            <div className="location-picker"><button className={`location-button ${locationOpen ? "active" : ""}`} onClick={() => { setLocationOpen((open) => !open); setFiltersOpen(false); }} aria-expanded={locationOpen} aria-haspopup="listbox"><span className="loc-icon"><LocateFixed size={18}/></span><span><small>DELIVERING TO</small><strong>{deliveryLocation.name}</strong></span><ChevronDown className={locationOpen ? "open" : ""} size={17}/></button>{locationOpen && <><button className="location-backdrop" aria-label="Close delivery locations" onClick={() => setLocationOpen(false)}/><div className="location-menu" role="listbox" aria-label="Delivery location"><header><strong>Choose your area</strong><small>Travel times update automatically</small></header><button className="device-location" onClick={useDeviceLocation}><LocateFixed size={16}/><span><strong>Use current location</strong><small>Allow location access in your browser</small></span></button>{deliveryLocations.map((location) => <button role="option" aria-selected={deliveryLocation.name === location.name} className={deliveryLocation.name === location.name ? "selected" : ""} key={location.name} onClick={() => { setDeliveryLocation(location); setLocationOpen(false); setCurrentPage(1); }}><MapPin size={15}/><span>{location.name}</span>{deliveryLocation.name === location.name && <Check size={14}/>}</button>)}</div></>}</div>
            <button className={`filter-button ${activeFilterCount ? "active" : ""}`} onClick={() => setFiltersOpen((open) => !open)}><SlidersHorizontal size={18} /> Filters {activeFilterCount > 0 && <b>{activeFilterCount}</b>}</button>
            {filtersOpen && <div className="filter-popover">
              <div className="filter-head"><div><strong>Filter harvests</strong><span>Refine what is shown near you</span></div><button onClick={() => setFiltersOpen(false)}><X size={17}/></button></div>
              <label className="range-filter"><span><strong>Maximum distance</strong><b>{distanceFilterActive ? `${maxDistance} km · ${walkingTime(maxDistance)}` : "Any distance"}</b></span><input type="number" min="1" step="1" value={distanceFilterActive ? maxDistance : ""} placeholder="Enter distance in km" onChange={(event) => { const value = event.target.value; setDistanceFilterActive(value !== ""); if (value) setMaxDistance(Number(value)); setCurrentPage(1); }}/></label>
              <label className="range-filter"><span><strong>Maximum unit price</strong><b>{priceFilterActive ? money(maxPrice) : "Any price"}</b></span><input type="number" min="1" step="100" value={priceFilterActive ? maxPrice : ""} placeholder="Enter maximum price" onChange={(event) => { const value = event.target.value; setPriceFilterActive(value !== ""); if (value) setMaxPrice(Number(value)); setCurrentPage(1); }}/></label>
              <div className="quick-filters"><label><span><strong>Available today</strong><small>Only produce ready now</small></span><input type="checkbox" checked={todayOnly} onChange={(event) => { setTodayOnly(event.target.checked); setCurrentPage(1); }}/></label><label><span><strong>Hide low stock</strong><small>More than 15 units left</small></span><input type="checkbox" checked={hideLowStock} onChange={(event) => { setHideLowStock(event.target.checked); setCurrentPage(1); }}/></label></div>
              <div className="filter-actions"><button onClick={() => { setMaxDistance(20); setMaxPrice(50000); setDistanceFilterActive(false); setPriceFilterActive(false); setTodayOnly(false); setHideLowStock(false); setCurrentPage(1); }}>Reset all</button><button onClick={() => setFiltersOpen(false)}>Show {visible.length} harvests</button></div>
            </div>}
          </section>

          <section className="catalog">
            <div className="catalog-head">
              <div><h2>Harvests near you</h2><p>{visible.length} available listings matched near Gudu</p></div>
              <label className="sort"><span>Sort by</span><select value={sortBy} onChange={(event) => { setSortBy(event.target.value as typeof sortBy); setCurrentPage(1); }}><option value="nearest">Shortest walk first</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="rating">Highest rated</option><option value="stock">Most available</option></select><ChevronDown size={15}/></label>
            </div>
            <div className="category-row">
              {categories.map((item) => <button key={item} onClick={() => { setCategory(item); setCurrentPage(1); }} className={category === item ? "selected" : ""}>{item}</button>)}
            </div>

            {productsLoading ? <HarvestSpinner compact label="Loading nearby harvests"/> : productsError ? <div className="empty-state"><RotateCcw size={28} /><h3>Could not load harvests</h3><p>Please refresh the page to try again.</p></div> : visible.length ? <div className="product-grid">
              {paginatedProducts.map((product) => (
                <article className="product-card" key={product.id}>
                  <div className="product-image">
                    <img src={product.image} alt={product.name} />
                    <span className="distance" title={`${product.distance} km straight-line distance`}><MapPin size={13} /> {walkingTime(product.distance)}</span>
                    <button className={`heart ${liked.includes(product.id) ? "liked" : ""}`} onClick={() => toggleFavourite(product.id)} aria-label={liked.includes(product.id) ? "Remove saved product" : "Save product"}><Heart size={18} fill={liked.includes(product.id) ? "currentColor" : "none"} /></button>
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
      ) : view === "orders" && canPurchase ? <DatabaseOrdersPage onShop={() => navigate("market")} onHelp={() => navigate("help")} /> : view === "profile" && (isConsumer || isFarmer) ? <DatabaseProfilePage role={isFarmer ? "farmer" : "consumer"} onShop={() => navigate("market")} onFarmer={() => navigate("farmer")} onUpgraded={(user) => { setCurrentUser(user); window.history.pushState({}, "", viewPaths.farmer); setView("farmer"); }} /> : view === "admin" && isAdmin ? <AdminPage readOnly={role === "support" || Boolean(currentUser?.impersonating)} onImpersonated={enterImpersonatedView} /> : view === "help" || view === "delivery" || view === "returns" ? <SupportPage page={view} onNavigate={navigate} user={currentUser} onSignIn={() => openSignIn(false)} /> : view === "farmer" && isFarmer ? <FarmerWorkspace onShop={() => navigate("market")} /> : <LandingPage stats={marketplaceStats} signedOut={!currentUser} onShop={() => navigate("market")} onFarmer={() => navigate("farmer")} onSignup={openSignup} />}

      {!sessionLoading && <SiteFooter view={view} user={currentUser} onNavigate={navigate} />}

      {cartOpen && <div className="overlay" onMouseDown={() => setCartOpen(false)}>
        <aside className="cart-drawer" onMouseDown={(e) => e.stopPropagation()}>
          <div className="drawer-head"><div><p>Your basket</p><span>{itemCount} {itemCount === 1 ? "item" : "items"} from local farms</span></div><button className="icon-btn" onClick={() => setCartOpen(false)}><X size={20} /></button></div>
          {items.length ? <>
            <div className="cart-items">{items.map((product) => <div className="cart-item" key={product.id}>
              <img src={product.image} alt="" />
              <div><h4>{product.name}</h4><p>{product.farmer}</p><strong>{money(product.price * cart[product.id])}</strong></div>
              <div className="stepper"><button onClick={() => update(product.id, -1)}><Minus size={14} /></button><span>{cart[product.id]}</span><button onClick={() => update(product.id, 1)}><Plus size={14} /></button></div>
            </div>)}</div>
            <div className="delivery-choice"><p>How would you like it?</p><button className={delivery === "door" ? "selected" : ""} onClick={() => setDelivery("door")}><Truck size={20} /><span><strong>Doorstep delivery</strong><small>Tomorrow, 9am–1pm</small></span><b>{money(1800)}</b></button><button className={delivery === "pickup" ? "selected" : ""} onClick={() => setDelivery("pickup")}><Store size={20} /><span><strong>Pickup from collection hub</strong><small title="2.1 km straight-line distance">Gudu Market · {walkingTime(2.1)}</small></span><b>Free</b></button></div>
            <div className="cart-total"><p><span>Subtotal</span><strong>{money(subtotal)}</strong></p><p><span>Delivery</span><strong>{deliveryFee ? money(deliveryFee) : "Free"}</strong></p><p className="total"><span>Total</span><strong>{money(subtotal + deliveryFee)}</strong></p><button className="checkout-button" onClick={beginCheckout}>Continue to payment <ArrowRight size={18} /></button><small>Secure payment powered by Paystack</small></div>
          </> : <div className="empty-cart"><div className="empty-cart-visual" aria-hidden="true"><span><ShoppingBag size={34}/></span><i><Leaf size={16}/></i><b><MapPin size={15}/></b></div><span className="empty-cart-kicker">READY WHEN YOU ARE</span><h3>Your next harvest starts here.</h3><p>Your basket is empty. Browse fresh produce available from trusted farms near you.</p><button onClick={() => setCartOpen(false)}><Leaf size={15}/> Explore harvests <ArrowRight size={16}/></button><div className="empty-cart-points"><span><Check size={12}/> Local farms</span><span><Clock3 size={12}/> Daily availability</span></div></div>}
        </aside>
      </div>}

      {notificationOpen && <div className="overlay notification-overlay" onMouseDown={() => setNotificationOpen(false)}>
        <aside className="notification-drawer" onMouseDown={(event) => event.stopPropagation()} aria-label="Notifications">
          <div className="drawer-head notification-head"><div><p>Notifications</p><span>{unreadNotificationCount ? `${unreadNotificationCount} unread updates` : "You are all caught up"}</span></div><button className="icon-btn" onClick={() => setNotificationOpen(false)} aria-label="Close notifications"><X size={20} /></button></div>
          <div className="notification-tools">
            <div role="tablist" aria-label="Notification filters"><button className={notificationFilter === "all" ? "selected" : ""} onClick={() => setNotificationFilter("all")}>All <span>{notifications.length}</span></button><button className={notificationFilter === "unread" ? "selected" : ""} onClick={() => setNotificationFilter("unread")}>Unread <span>{unreadNotificationCount}</span></button></div>
            <button disabled={!unreadNotificationCount} onClick={markAllNotificationsRead}><Check size={14} /> Mark all as read</button>
          </div>
          {visibleNotifications.length ? <div className="notification-list">{visibleNotifications.map((item) => {
            const unread = !item.read;
            return <article key={item.id} className={unread ? "unread" : ""}>
              <button className="notification-main" onClick={() => openNotification(item)}>
                <span className={`notification-icon ${item.type}`}>{item.type === "delivery" ? <Truck size={18} /> : item.type === "harvest" ? <Leaf size={18} /> : item.type === "order" ? <PackageCheck size={18} /> : <UserRound size={18} />}</span>
                <span><strong>{item.title}</strong><p>{item.message}</p><small>{item.time}</small></span>
                {unread && <i aria-label="Unread" />}
              </button>
              {unread && <button className="mark-read" onClick={() => markNotificationRead(item.id)} aria-label={`Mark ${item.title} as read`} title="Mark as read"><Check size={14} /></button>}
            </article>;
          })}</div> : <div className="notification-empty"><div className="notification-empty-visual" aria-hidden="true"><span><Bell size={30}/></span><i><Check size={15}/></i><b><PackageCheck size={15}/></b></div><span className="notification-empty-kicker">ALL CAUGHT UP</span><h3>{notificationFilter === "unread" ? "No unread updates." : "Nothing new right now."}</h3><p>{notificationFilter === "unread" ? "You have reviewed every update. New order and harvest activity will appear here." : "Order, payment, delivery, and harvest updates will appear here as they happen."}</p>{notificationFilter === "unread" ? <button onClick={() => setNotificationFilter("all")}>View all notifications <ArrowRight size={14}/></button> : !isAdmin && <button onClick={() => { setNotificationOpen(false); navigate("market"); }}><Leaf size={14}/> Browse harvests <ArrowRight size={14}/></button>}<div className="notification-empty-points"><span><Check size={12}/> Orders</span><span><Truck size={12}/> Deliveries</span><span><Leaf size={12}/> Harvests</span></div></div>}
          <div className="notification-settings"><Bell size={14} /><span>Control which updates you receive from your profile preferences.</span>{!isAdmin && <button onClick={() => { setNotificationOpen(false); navigate("profile"); }}>Preferences</button>}</div>
        </aside>
      </div>}

      {checkout && <div className="modal-overlay"><div className="payment-modal">
        {!paid ? <><button className="close-modal" onClick={() => setCheckout(false)}><X size={20} /></button><ModalBrand/><p className="eyebrow center">MANUAL PAYMENT</p><h2>{checkoutAmount ? "Submit your transfer receipt" : "Use your account credit"}</h2><p>{checkoutAmount ? "Transfer the exact remaining amount to the company account, then upload your receipt." : "Your available account credit covers this order in full."}</p><div className="pay-summary"><span>{checkoutCredit ? `Account credit: -${money(checkoutCredit)}` : "Total to pay"}</span><strong>{money(checkoutAmount)}</strong></div>{checkoutAmount > 0 && manualPaymentSettings && <section className="checkout-bank-details"><div><small>BANK</small><strong>{manualPaymentSettings.bank_name}</strong></div><div><small>ACCOUNT NAME</small><strong>{manualPaymentSettings.account_name}</strong></div><div><small>ACCOUNT NUMBER</small><strong>{manualPaymentSettings.account_number}</strong></div>{manualPaymentSettings.instructions && <p>{manualPaymentSettings.instructions}</p>}</section>}<label>Email address<input value={currentUser?.email || ""} readOnly /></label>{checkoutAmount > 0 && <label className="payment-receipt-field">Payment receipt<input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(event) => setPaymentReceipt(event.target.files?.[0] || null)} disabled={checkoutBusy || !manualPaymentSettings}/><small>JPG, PNG, WebP, or PDF · Maximum 5 MB</small></label>}{checkoutError && <p className="auth-error" role="alert">{checkoutError}</p>}<button className="pay-button" disabled={checkoutBusy || (checkoutAmount > 0 && (!paymentReceipt || !manualPaymentSettings))} onClick={completeOrder}>{checkoutBusy ? "Processing order..." : checkoutAmount ? "Place order and submit receipt" : "Place order with account credit"} {!checkoutBusy && <ArrowRight size={18} />}</button><small>{checkoutAmount ? "Your order remains pending until an administrator verifies the transfer." : "No transfer or receipt is needed."}</small></> : <div className="success-state"><span><Check size={30} /></span><p className="eyebrow center">{orderAwaitingReview ? "RECEIPT SUBMITTED" : "ORDER CONFIRMED"}</p><h2>{orderAwaitingReview ? "Payment review is pending." : "Account credit applied."}</h2><p>Order <strong>#{confirmedOrderNumber}</strong> {orderAwaitingReview ? "is reserved. We will notify you after an administrator confirms your payment." : "has been paid and sent for fulfilment."}</p><button onClick={() => { setCheckout(false); setPaid(false); setPaymentReceipt(null); setCart({}); fetch("/api/cart", { method: "DELETE" }); navigate("orders"); }}>View order status</button></div>}
      </div></div>}

      {signupOpen && <div className="modal-overlay" onMouseDown={() => setSignupOpen(false)}><div className="signup-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="close-modal" onClick={() => setSignupOpen(false)}><X size={20} /></button>
        {!signupComplete ? <>
          <div className="signup-heading"><span className="auth-logo-lockup"><img className="auth-approved-lockup" src="/brand/harvestnearu-header-lockup.png" alt="HarvestNearU" /></span><div><p>JOIN HARVESTNEARU</p><h2>Create your account</h2></div></div>
          <p className="signup-intro">Choose how you want to use the marketplace. You can update your profile later.</p>
          <div className="role-tabs" role="tablist" aria-label="Account type">
            <button className={signupRole === "consumer" ? "selected" : ""} onClick={() => setSignupRole("consumer")}><ShoppingBag size={19} /><span><strong>Consumer</strong><small>Shop fresh produce</small></span></button>
            <button className={signupRole === "farmer" ? "selected" : ""} onClick={() => setSignupRole("farmer")}><Store size={19} /><span><strong>Farmer</strong><small>List and sell harvests</small></span></button>
          </div>
          <form className="signup-form" onSubmit={submitSignup}>
            <div className="form-row"><label>First name<input name="firstName" required placeholder="Tola" /></label><label>Last name<input name="lastName" required placeholder="Adebayo" /></label></div>
            <label>Phone number<div className="phone-field"><span>+234</span><input name="phone" required type="tel" placeholder="801 234 5678" /></div></label>
            <label>Email address<input name="email" required type="email" placeholder="you@example.com" /></label>
            {signupRole === "farmer" && <div className="farmer-fields"><label>Farm or business name<input name="farmName" required placeholder="Adebayo Family Farm" /></label><label>Farm address or area<input name="farmLocation" required placeholder="Kuje, Abuja" /></label><FarmCoordinateFields/></div>}
            <label>Password<div className="password-field"><input name="password" required type={showSignupPassword ? "text" : "password"} autoComplete="new-password" minLength={8} placeholder="At least 8 characters"/><button type="button" onClick={() => setShowSignupPassword((value) => !value)} aria-label={showSignupPassword ? "Hide password" : "Show password"} aria-pressed={showSignupPassword} title={showSignupPassword ? "Hide password" : "Show password"}>{showSignupPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
            <label>Confirm password<div className="password-field"><input name="confirmPassword" required type={showSignupPassword ? "text" : "password"} autoComplete="new-password" minLength={8} placeholder="Enter the password again"/><button type="button" onClick={() => setShowSignupPassword((value) => !value)} aria-label={showSignupPassword ? "Hide passwords" : "Show passwords"} aria-pressed={showSignupPassword} title={showSignupPassword ? "Hide passwords" : "Show passwords"}>{showSignupPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
            <label className="terms"><input required type="checkbox" /> <span>I agree to the Terms of Service and Privacy Policy.</span></label>
            {signupError && <p className="auth-error" role="alert">{signupError}</p>}
            <button className="create-account" type="submit" disabled={signupBusy}>{signupBusy ? "Creating account..." : `Create ${signupRole} account`} {!signupBusy && <ArrowRight size={17} />}</button>
          </form>
          <p className="signin-copy">Already have an account? <button onClick={() => { setSignupOpen(false); openSignIn(pendingCheckout); }}>Sign in</button></p>
        </> : <div className="signup-success"><span><Check size={30} /></span><p>ACCOUNT CREATED</p><h2>Welcome to HarvestNearU.</h2><p>{signupRole === "farmer" ? "Your farmer profile is ready for verification. Add your first harvest to get started." : "Your consumer account is ready. Fresh harvests near you are waiting."}</p><button onClick={() => { setSignupOpen(false); navigate(signupRole === "farmer" ? "farmer" : "market"); }}>{signupRole === "farmer" ? "Open farmer workspace" : "Start shopping"} <ArrowRight size={17} /></button></div>}
      </div></div>}

      {signinOpen && <div className="modal-overlay" onMouseDown={closeSignIn}><div className="signin-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="close-modal" onClick={closeSignIn}><X size={20} /></button>
        {!signinComplete ? <>
          <div className="auth-logo-lockup signin-brand"><img className="auth-approved-lockup" src="/brand/harvestnearu-header-lockup.png" alt="HarvestNearU" /></div>
          <p className="auth-kicker">WELCOME BACK</p>
          <h2>Sign in to HarvestNearU</h2>
          <p className="auth-intro">Continue shopping fresh harvests or manage your farm.</p>
          <form className="signin-form" onSubmit={signIn}>
            <label>Email or phone number<input required autoComplete="username" value={signinIdentifier} onChange={(event) => setSigninIdentifier(event.target.value)} placeholder="you@example.com or +234..." /></label>
            <label>Password<div className="password-field"><input required autoComplete="current-password" value={signinPassword} onChange={(event) => setSigninPassword(event.target.value)} type={showSigninPassword ? "text" : "password"} placeholder="Enter your password"/><button type="button" onClick={() => setShowSigninPassword((value) => !value)} aria-label={showSigninPassword ? "Hide password" : "Show password"} aria-pressed={showSigninPassword} title={showSigninPassword ? "Hide password" : "Show password"}>{showSigninPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
            {signinError && <p className="auth-error" role="alert">{signinError}</p>}
            <div className="signin-options"><label><input type="checkbox" /> Keep me signed in</label><button type="button">Forgot password?</button></div>
            <button className="signin-submit" type="submit" disabled={signinBusy}>{signinBusy ? "Signing in..." : "Sign in securely"} {!signinBusy && <ArrowRight size={17} />}</button>
          </form>
          <div className="auth-divider"><span>or</span></div>
          <p className="signin-copy">New to HarvestNearU? <button onClick={() => { setSigninOpen(false); openSignup(); }}>Create an account</button></p>
        </> : <div className="signup-success"><span><Check size={30} /></span><p>SIGNED IN</p><h2>Good to have you back.</h2><p>Your {currentUser ? roleLabel(currentUser.role) : "account"} is ready.</p><button onClick={() => { closeSignIn(); navigate(isAdmin ? "admin" : isFarmer ? "farmer" : "market"); }}>Continue to my workspace <ArrowRight size={17} /></button></div>}
      </div></div>}
    </div>
  );
}

function LandingPage({ stats, signedOut, onShop, onFarmer, onSignup }: { stats: MarketplaceStats | null; signedOut: boolean; onShop: () => void; onFarmer: () => void; onSignup: () => void }) {
  return <main className="landing-page">
    <section className="landing-hero">
      <img src="/produce/vine-ripe-tomatoes.webp" alt="Fresh tomatoes harvested by a local farmer" />
      <div className="landing-hero-shade" />
      <div className="landing-hero-content">
        <p className="landing-kicker"><span /> FRESH LOCAL PRODUCE, FOUND HERE</p>
        <h1>HarvestNearU.</h1>
        <h2>Good food should not<br/>travel so far.</h2>
        <p>We connect households with trusted farmers nearby, making today&apos;s harvest visible, orderable, and easier to deliver.</p>
        <div className="landing-actions"><button onClick={onShop}>Explore nearby harvests <ArrowRight size={17}/></button>{signedOut ? <button className="landing-signup-action" onClick={onSignup}><UserRound size={16}/> Create free account</button> : <button onClick={onFarmer}><Store size={16}/> Farmer workspace</button>}</div>
        <div className="landing-proof"><span><Check size={13}/> Verified farmers</span><span><MapPin size={13}/> Proximity-first discovery</span><span><Truck size={13}/> Flexible fulfilment</span></div>
      </div>
      <aside className="hero-harvest-note"><span>ACTIVE HARVESTS</span><strong>{stats ? `${stats.listings} fresh listings` : "Loading harvests"}</strong><p>{stats ? `from ${stats.farms} verified farms near Abuja` : "Checking nearby farms"}</p><div><img src="/produce/fresh-sweet-corn.webp" alt=""/><img src="/produce/garden-fresh-spinach.webp" alt=""/><img src="/produce/sweet-ripe-plantain.webp" alt=""/></div></aside>
    </section>

    <section className="landing-intro">
      <p>THE MARKET, MADE LOCAL</p>
      <h2>Farmers know what is ready.<br/>Consumers should know <em>where to find it.</em></h2>
      <div><p>HarvestNearU closes the information gap between a farmer&apos;s available harvest and a nearby household&apos;s next meal.</p><p>Farmers list produce by date and quantity. Consumers order only what they need until the harvest is sold out.</p></div>
    </section>

    <section className="how-it-works">
      <div className="landing-section-head"><div><p>HOW HARVESTNEARU WORKS</p><h2>From farm gate to your plate.</h2></div><span>A shorter, clearer journey for local food.</span></div>
      <div className="steps-line">
        <article><span>1</span><div><LocateFixed size={21}/></div><h3>Discover nearby</h3><p>Share your area and see available produce ranked by estimated walking time.</p></article>
        <article><span>2</span><div><ShoppingBag size={21}/></div><h3>Order what you need</h3><p>Buy practical quantities while live farmer inventory lasts.</p></article>
        <article><span>3</span><div><Truck size={21}/></div><h3>Choose fulfilment</h3><p>Select doorstep delivery, farmer delivery, or local pickup.</p></article>
        <article><span>4</span><div><Check size={21}/></div><h3>Pay securely</h3><p>Complete payment in naira and follow the order to delivery.</p></article>
      </div>
    </section>

    <section className="audience-band consumer-band">
      <div className="audience-image"><img src="/produce/creamy-avocados.webp" alt="Fresh avocados from a local farm"/><span title="2.4 km straight-line distance"><strong>{walkingTime(2.4)}</strong> from your location</span></div>
      <div className="audience-copy"><p>FOR CONSUMERS</p><h2>Freshness you can<br/>actually locate.</h2><p>See what farmers have ready on a particular date, compare estimated travel times and prices, and order in smaller quantities without the uncertainty of a long supply chain.</p><ul><li><Check size={14}/> Availability you can see before ordering</li><li><Check size={14}/> Produce ranked by proximity</li><li><Check size={14}/> Pickup and delivery choices</li></ul><button onClick={onShop}>Start shopping <ArrowRight size={16}/></button></div>
    </section>

    <section className="audience-band farmer-band">
      <div className="audience-copy"><p>FOR FARMERS</p><h2>Your next customer<br/>may be nearby.</h2><p>Turn available harvest into visible inventory. Reach local buyers, sell down stock in practical portions, and manage orders from one clear workspace.</p><ul><li><Check size={14}/> Date-based produce listings</li><li><Check size={14}/> Live remaining-quantity controls</li><li><Check size={14}/> Order and payout visibility</li></ul><button onClick={onFarmer}>Sell on HarvestNearU <ArrowRight size={16}/></button></div>
      <div className="audience-image"><img src="/produce/oyo-white-yam.webp" alt="Fresh yam ready for market"/><span><strong>72%</strong> of this harvest sold</span></div>
    </section>

    <section className="landing-cta"><img className="outlined-brand-mark" src="/brand/harvestnearu-mark-outline.png" alt="HarvestNearU mark"/><div><p>YOUR LOCAL HARVEST IS WAITING</p><h2>Find something fresh nearby.</h2><span>Start with today&apos;s produce and choose the journey that works for you.</span></div><button onClick={onShop}>Browse the market <ArrowRight size={17}/></button></section>
  </main>;
}

type SupportTicket = { id: string; ticket_number: string; subject: string; category: string; priority: string; status: string; requester_name: string; requester_email: string; assignee_name: string | null; assigned_to: string | null; order_number: string | null; created_at: string; updated_at: string; messages: Array<{ id: string; body: string; is_internal: boolean; created_at: string; author_name: string; author_role: string }> };

function SupportTicketCentre({ user, onSignIn }: { user: CurrentUser | null; onSignIn: () => void }) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [staff, setStaff] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const selected = tickets.find((ticket) => ticket.id === selectedId) || tickets[0] || null;
  async function loadTickets() {
    if (!user) return;
    const response = await fetch("/api/support/tickets", { cache: "no-store" });
    const data = await response.json() as { tickets?: SupportTicket[]; agents?: Array<{ id: string; name: string }>; staff?: boolean; error?: string };
    if (!response.ok) throw new Error(data.error || "Could not load support tickets");
    setTickets(data.tickets || []); setAgents(data.agents || []); setStaff(Boolean(data.staff));
  }
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch("/api/support/tickets", { cache: "no-store" }).then(async (response) => {
      const data = await response.json() as { tickets?: SupportTicket[]; agents?: Array<{ id: string; name: string }>; staff?: boolean; error?: string };
      if (!response.ok) throw new Error(data.error || "Could not load support tickets");
      if (!cancelled) { setTickets(data.tickets || []); setAgents(data.agents || []); setStaff(Boolean(data.staff)); }
    }).catch((reason: Error) => { if (!cancelled) setError(reason.message); });
    return () => { cancelled = true; };
  }, [user]);
  async function createTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch("/api/support/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const data = await response.json() as { ticket?: { id: string }; error?: string };
      if (!response.ok) throw new Error(data.error || "Could not create ticket");
      event.currentTarget.reset(); await loadTickets(); setSelectedId(data.ticket?.id || null);
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }
  async function reply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return; setBusy(true); setError("");
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch("/api/support/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, ticketId: selected.id }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not send reply");
      event.currentTarget.reset(); await loadTickets();
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }
  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setFeedbackSent(false);
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      const rating = Number(values.rating);
      const area = String(values.area || "overall");
      const comment = String(values.comment || "").trim();
      if (rating < 1 || rating > 5) throw new Error("Select an experience rating");
      const response = await fetch("/api/support/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: "feedback", subject: `Website experience feedback: ${area}`, message: `Experience rating: ${rating}/5\nArea: ${area}\n\n${comment}` }) });
      const data = await response.json() as { ticket?: { id: string }; error?: string };
      if (!response.ok) throw new Error(data.error || "Could not submit feedback");
      event.currentTarget.reset(); setFeedbackRating(0); setFeedbackSent(true); await loadTickets(); setSelectedId(data.ticket?.id || null);
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }
  async function updateTicket(field: "status" | "priority" | "assigneeId", value: string) {
    if (!selected) return; setBusy(true); setError("");
    const payload = { ticketId: selected.id, status: selected.status, priority: selected.priority, assigneeId: selected.assigned_to, [field]: value || null };
    try {
      const response = await fetch("/api/support/tickets", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not update ticket");
      await loadTickets();
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }
  if (!user) return <section className="ticket-signin"><span><Headphones size={23}/></span><div><h2>Need personal support?</h2><p>Sign in to create a ticket, follow replies, and keep your issue history in one place.</p></div><button onClick={onSignIn}>Sign in to contact support</button></section>;
  return <section className="ticket-centre">
    <header><div><p className="eyebrow"><span/> {staff ? "SUPPORT OPERATIONS" : "PERSONAL SUPPORT"}</p><h2>{staff ? "Ticket queue" : "Your support tickets"}</h2><p>{staff ? "Prioritise, assign, respond to, and resolve marketplace cases." : "Report an issue and follow the conversation with our team."}</p></div><span>{tickets.filter((ticket) => !["resolved","closed"].includes(ticket.status)).length} open</span></header>
    {!staff && <form className="ticket-create" onSubmit={createTicket}><h3>Create a support ticket</h3><div className="form-row"><label>Issue category<select name="category" required defaultValue=""><option value="" disabled>Select category</option>{["order","payment","delivery","refund","account","farm","technical","other"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>Subject<input name="subject" maxLength={180} required placeholder="Briefly describe the issue"/></label></div><label>What happened?<textarea name="message" maxLength={4000} required placeholder="Include the order number, what you expected, and what happened."/></label><button disabled={busy}>{busy ? "Submitting..." : "Create ticket"} <ArrowRight size={15}/></button></form>}
    {!staff && <form className="experience-feedback" onSubmit={submitFeedback}><div><p className="eyebrow"><span/> PRODUCT FEEDBACK</p><h3>How is HarvestNearU working for you?</h3><p>Share what feels easy, confusing, slow, or missing. Your feedback is reviewed by the product support team.</p></div><fieldset><legend>Rate your experience</legend>{[1,2,3,4,5].map((rating) => <label key={rating} className={rating <= feedbackRating ? "selected" : ""}><input type="radio" name="rating" value={rating} checked={feedbackRating === rating} onChange={() => setFeedbackRating(rating)} required/><Star size={20} fill="currentColor"/><span>{rating} {rating === 1 ? "star" : "stars"}</span></label>)}</fieldset><label>Area of the experience<select name="area" required defaultValue="overall"><option value="overall">Overall experience</option><option value="shopping">Finding and buying produce</option><option value="orders">Orders and tracking</option><option value="farmer_workspace">Farmer workspace</option><option value="account">Account and profile</option><option value="accessibility">Accessibility</option><option value="performance">Speed and reliability</option></select></label><label>Your feedback<textarea name="comment" required maxLength={4000} placeholder="Tell us what worked well and what we should improve."/></label><button disabled={busy}>{busy ? "Sending..." : "Send feedback"} <ArrowRight size={15}/></button>{feedbackSent && <p className="feedback-success" role="status"><Check size={14}/> Thank you. Your feedback has been added to the review queue.</p>}</form>}
    {error && <p className="admin-error" role="alert">{error}</p>}
    <div className="ticket-workspace"><aside className="ticket-list">{tickets.length ? tickets.map((ticket) => <button key={ticket.id} className={selected?.id === ticket.id ? "active" : ""} onClick={() => setSelectedId(ticket.id)}><span><strong>{ticket.ticket_number}</strong><i className={ticket.priority}>{ticket.priority}</i></span><b>{ticket.subject}</b><small>{staff ? `${ticket.requester_name} · ` : ""}{ticket.status.replaceAll("_", " ")} · {new Date(ticket.updated_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</small></button>) : <div className="ticket-empty"><div className="ticket-empty-visual" aria-hidden="true"><span><Headphones size={27}/></span><i><Check size={14}/></i><b><Bell size={14}/></b></div><span className="ticket-empty-kicker">{staff ? "QUEUE CLEAR" : "SUPPORT READY"}</span><strong>{staff ? "Everything is handled." : "No support tickets yet."}</strong><p>{staff ? "New customer requests will appear here as soon as they arrive." : "When you contact support, your conversations and their status will be kept here."}</p></div>}</aside>
      {selected && <article className="ticket-thread"><header><div><small>{selected.ticket_number} · {selected.category}</small><h3>{selected.subject}</h3>{staff && <p>{selected.requester_name} · {selected.requester_email}</p>}</div><b className={selected.status}>{selected.status.replaceAll("_", " ")}</b></header>{staff && <div className="ticket-controls"><label>Status<select value={selected.status} disabled={busy} onChange={(event) => void updateTicket("status", event.target.value)}>{["open","in_progress","waiting_customer","resolved","closed"].map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label><label>Priority<select value={selected.priority} disabled={busy} onChange={(event) => void updateTicket("priority", event.target.value)}>{["low","normal","high","urgent"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>Assigned to<select value={selected.assigned_to || ""} disabled={busy} onChange={(event) => void updateTicket("assigneeId", event.target.value)}><option value="">Unassigned</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></label></div>}<div className="ticket-messages">{selected.messages.map((message) => <div className={`${message.author_role} ${message.is_internal ? "internal" : ""}`} key={message.id}><span><strong>{message.author_name}</strong><small>{message.is_internal ? "Internal note · " : ""}{new Date(message.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</small></span><p>{message.body}</p></div>)}</div><form className="ticket-reply" onSubmit={reply}><label>{staff ? "Reply or internal note" : "Reply"}<textarea name="message" required maxLength={4000} placeholder="Write a clear update..."/></label>{staff && <label className="admin-check"><input type="checkbox" name="internal" value="true"/> Internal note, hidden from requester</label>}<button disabled={busy}>{busy ? "Sending..." : "Send reply"} <ArrowRight size={14}/></button></form></article>}
    </div>
  </section>;
}

function SupportPage({ page, onNavigate, user, onSignIn }: { page: "help" | "delivery" | "returns"; onNavigate: (view: View) => void; user: CurrentUser | null; onSignIn: () => void }) {
  const [query, setQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const faqs = [
    ["Do I need an account to place an order?", "You can browse produce without signing in, but you must create an account or sign in before checkout. Both consumer and farmer accounts can purchase produce and access My orders."],
    ["How do I place an order?", "Open Shop produce, add the quantities you need to your basket, choose doorstep delivery or an available pickup option, and continue to payment. Your order will appear in My orders after it is submitted."],
    ["How are nearby harvests ranked?", "Active produce is shown without a default category or distance filter and is ranked by proximity when you choose Shortest walk first. Walking times are estimates based on the farm's location; the underlying distance is retained for filtering."],
    ["How is produce availability confirmed?", "Farmers publish available quantities and harvest dates from their workspace. Quantities are reduced as orders are placed, and farmers update each order as it moves through preparation and fulfilment."],
    ["Can I order produce from more than one farm?", "Yes. A basket can contain produce from multiple farms. Each order keeps the farm and item breakdown, while delivery or pickup availability is shown before payment."],
    ["How do manual bank-transfer payments work?", "At checkout, transfer the displayed amount to the company bank account and upload a JPG, PNG, WebP, or PDF receipt. Your order remains pending while an administrator verifies the transfer. You will receive a notification when payment is confirmed."],
    ["Can I pay with my account credit?", "Yes. Available account credit is applied during checkout. If it covers the full order, no bank transfer or receipt is required. You can see your current balance in the account menu and on your profile."],
    ["Can I cancel an order after submitting payment?", "You can cancel a pending-payment order before an administrator confirms it. Choose full account credit for a future purchase or request a bank refund. Bank refunds include the displayed cancellation fee and require administrator review."],
    ["How do I track and confirm receipt of an order?", "Open My orders to follow every product separately. Confirm each product only after it is delivered or ready for collection. The order is completed, and farm feedback becomes available, after every product has been acknowledged."],
    ["How do farm ratings work?", "After confirming receipt, you will be asked to rate each farm involved in the order. You can give one to five stars, add a comment, and update your rating later from the completed order."],
    ["Can a consumer account become a farmer account?", "Yes. Open your profile and choose Become a farmer. Your existing orders, saved produce, and customer history remain on the account while you add farm information for verification."],
    ["Can a farmer manage more than one farm?", "Yes. Farmers can add multiple farms, switch the active farm in the workspace and profile, and manage separate verification, listings, orders, delivery settings, and earnings for each farm."],
    ["How do I report a problem and follow the response?", "Sign in and open the Help Centre, then create a support ticket with the issue category and relevant details. You can read staff replies and continue the conversation from your ticket history."],
    ["How can I suggest an improvement to HarvestNearU?", "Use Product feedback in the Help Centre to rate your experience, select the affected area, and describe what worked or should improve. The feedback enters the support team's review queue and remains visible in your history."],
  ];
  const visibleFaqs = faqs.filter(([question, answer]) => `${question} ${answer}`.toLowerCase().includes(query.toLowerCase()));

  return <main className="support-page">
    <section className="support-hero">
      <p className="eyebrow"><span /> HARVESTNEARU SUPPORT</p>
      <h1>{page === "help" ? "How can we help?" : page === "delivery" ? "Fresh produce, delivered locally." : "Fair resolutions for fresh produce."}</h1>
      <p>{page === "help" ? "Find quick answers about orders, payments, accounts, and buying directly from nearby farmers." : page === "delivery" ? "See where HarvestNearU delivers, the fulfilment options available, and what to expect on delivery day." : "Understand what is eligible, how to report an issue, and when your refund will arrive."}</p>
    </section>
    <nav className="support-tabs" aria-label="Support pages">
      <button className={page === "help" ? "active" : ""} onClick={() => onNavigate("help")}><Headphones size={15}/> Help centre</button>
      <button className={page === "delivery" ? "active" : ""} onClick={() => onNavigate("delivery")}><MapPin size={15}/> Delivery areas</button>
      <button className={page === "returns" ? "active" : ""} onClick={() => onNavigate("returns")}><RotateCcw size={15}/> Returns & refunds</button>
    </nav>

    {page === "help" && <section className="support-content">
      <div className="support-intro"><div><h2>Frequently asked questions</h2><p>Start here for the most common questions from customers and farmers.</p></div><label className="support-search"><Search size={16}/><span className="sr-only">Search help articles</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search help articles"/></label></div>
      <div className="faq-list">{visibleFaqs.map(([question, answer], index) => <article className={`faq-item ${openFaq === index ? "open" : ""}`} key={question}><button aria-expanded={openFaq === index} onClick={() => setOpenFaq(openFaq === index ? null : index)}>{question}<ChevronRight size={16}/></button><div className={`faq-answer-collapse ${openFaq === index ? "open" : ""}`} aria-hidden={openFaq !== index}><div><p>{answer}</p></div></div></article>)}</div>
      {!visibleFaqs.length && <div className="empty-state"><Search size={26}/><h3>No answers found</h3><p>Try a shorter search term or contact our support team.</p></div>}
      <div className="support-note"><Headphones size={24}/><div><strong>Still need help?</strong><span>Our support team is available Monday to Saturday, 8am to 6pm.</span></div><button onClick={() => window.location.href = "mailto:hello@harvestnearu.com"}>Email support</button></div>
      <SupportTicketCentre user={user} onSignIn={onSignIn}/>
    </section>}

    {page === "delivery" && <section className="support-content">
      <div className="support-intro"><div><h2>Current delivery coverage</h2><p>Availability depends on your address and the farm supplying each item. Your exact options appear in the basket.</p></div></div>
      <div className="coverage-grid">
        <article className="coverage-card"><span><Truck size={20}/></span><h3>Central Abuja</h3><p>Doorstep delivery across our primary service area.</p><ul><li><span>Gudu, Wuse, Jabi</span><strong>Same or next day</strong></li><li><span>Maitama, Asokoro</span><strong>Next day</strong></li><li><span>Lugbe, Gwarinpa</span><strong>Next day</strong></li></ul></article>
        <article className="coverage-card"><span><MapPin size={20}/></span><h3>Greater Abuja</h3><p>Scheduled routes connect farms and collection points.</p><ul><li><span>Kuje, Bwari</span><strong>Tue, Thu, Sat</strong></li><li><span>Gwagwalada, Kwali</span><strong>Wed & Sat</strong></li><li><span>Karu, Mararaba</span><strong>Tue–Sat</strong></li></ul></article>
        <article className="coverage-card"><span><Store size={20}/></span><h3>Collection hubs</h3><p>Free pickup from convenient community locations.</p><ul><li><span>Gudu Market</span><strong>Daily</strong></li><li><span>Jabi Lake hub</span><strong>Mon–Sat</strong></li><li><span>Kubwa village market</span><strong>Tue–Sun</strong></li></ul></article>
      </div>
      <div className="support-note"><LocateFixed size={24}/><div><strong>Is your area not listed?</strong><span>Coverage is expanding based on demand. Tell us your neighbourhood so we can plan the next route.</span></div><button onClick={() => window.location.href = "mailto:hello@harvestnearu.com?subject=Delivery area request"}>Request my area</button></div>
    </section>}

    {page === "returns" && <section className="support-content">
      <div className="support-intro"><div><h2>Our fresh produce promise</h2><p>Because produce is perishable, issues should be reported promptly. We assess every request fairly with the supplying farmer.</p></div></div>
      <div className="policy-grid">
        <article className="policy-card"><span><Check size={20}/></span><h3>Eligible issues</h3><p>Items that arrive spoiled, damaged, materially different from the listing, or missing from a paid order.</p></article>
        <article className="policy-card"><span><Clock3 size={20}/></span><h3>Report within 6 hours</h3><p>Contact us within six hours of delivery or pickup. Include clear photos and your HarvestNearU order number.</p></article>
        <article className="policy-card"><span><RotateCcw size={20}/></span><h3>Refund timing</h3><p>Approved refunds are initiated within 24 hours and usually reach the original payment method in 3–7 business days.</p></article>
      </div>
      <div className="refund-steps"><div><strong>Open your order</strong><p>Find the affected purchase under My orders.</p></div><div><strong>Report the issue</strong><p>Describe the problem and select the affected item.</p></div><div><strong>Add clear photos</strong><p>Show the condition of the produce and packaging.</p></div><div><strong>Receive a resolution</strong><p>We review the request and confirm replacement or refund.</p></div></div>
      <div className="support-note"><PackageCheck size={24}/><div><strong>Need to report an order?</strong><span>Have your order number and photos ready so we can resolve it quickly.</span></div><button onClick={() => onNavigate("orders")}>Go to my orders</button></div>
    </section>}
  </main>;
}

function SiteFooter({ view, user, onNavigate }: { view: View; user: CurrentUser | null; onNavigate: (view: View) => void }) {
  const role = user?.role;
  return <footer className="site-footer">
    <div className="footer-main">
      <div className="footer-brand">
        <button className="footer-logo" onClick={() => onNavigate("landing")} aria-label="HarvestNearU home"><img src="/brand/harvestnearu-footer-lockup.png" alt="HarvestNearU" /></button>
        <p>Fresh Nigerian produce, fair prices, and stronger local farming communities.</p>
        <div className="footer-contact"><a href="mailto:hello@harvestnearu.com"><Mail size={15}/> hello@harvestnearu.com</a><a href="#" aria-label="HarvestNearU social profile"><AtSign size={16}/></a></div>
      </div>
      <nav className="footer-links" aria-label="Marketplace links"><strong>Marketplace</strong><button className={view === "landing" ? "active" : ""} onClick={() => onNavigate("landing")}>About HarvestNearU</button>{role !== "admin" && role !== "support" && <button className={view === "market" ? "active" : ""} onClick={() => onNavigate("market")}>Shop produce</button>}{(role === "consumer" || role === "farmer") && <button className={view === "orders" ? "active" : ""} onClick={() => onNavigate("orders")}>My orders</button>}{role === "farmer" && <button className={view === "farmer" ? "active" : ""} onClick={() => onNavigate("farmer")}>Farmer workspace</button>}{(role === "admin" || role === "support") && <button className={view === "admin" ? "active" : ""} onClick={() => onNavigate("admin")}>Administration</button>}</nav>
      <nav className="footer-links" aria-label="Support links"><strong>Account & support</strong>{(role === "consumer" || role === "farmer") && <button className={view === "profile" ? "active" : ""} onClick={() => onNavigate("profile")}>My profile</button>}<button className={view === "help" ? "active" : ""} onClick={() => onNavigate("help")}>Help centre</button><button className={view === "delivery" ? "active" : ""} onClick={() => onNavigate("delivery")}>Delivery areas</button><button className={view === "returns" ? "active" : ""} onClick={() => onNavigate("returns")}>Returns & refunds</button></nav>
      <div className="footer-newsletter"><strong>Harvest notes</strong><p>Weekly produce updates and seasonal picks from farms near you.</p><form onSubmit={(event) => event.preventDefault()}><label><span className="sr-only">Email address</span><input type="email" required placeholder="Email address"/></label><button aria-label="Subscribe"><ArrowRight size={16}/></button></form></div>
    </div>
    <div className="footer-bottom"><span>© 2026 HarvestNearU Nigeria</span><div><button>Privacy</button><button>Terms</button><button>Cookies</button></div><span className="footer-local"><MapPin size={12}/> Fresh Local Produce, Found Here</span></div>
  </footer>;
}

type AdminOverview = {
  metrics: { users: number; verified_farms: number; pending_farms: number; listings: number; orders: number; open_orders: number; open_refunds: number; failed_deliveries: number; hidden_reviews: number; active_carts: number; unread_notifications: number; outstanding_credit_kobo: number; gross_sales_kobo: number; cumulative_gross_kobo: number; cumulative_fee_kobo: number; cumulative_net_kobo: number };
  users: Array<{ id: string; first_name: string; last_name: string; email: string; role: string; is_active: boolean; created_at: string }>;
};

type AdminEntityType = "users" | "farms" | "produce" | "orders" | "refunds" | "reviews" | "activity";
type AdminEntity = Record<string, unknown> & { id: string };
type AdminOptions = { owners: Array<{ id: string; name: string }>; farms: Array<{ id: string; name: string }>; categories: Array<{ id: string; name: string }> };

function adminEntityFilterValue(section: AdminEntityType, entity: AdminEntity) {
  if (section === "users") return String(entity.role || "unknown");
  if (["farms", "produce", "orders", "refunds"].includes(section)) return String(entity.status || entity.verification_status || "unknown");
  if (section === "reviews") return entity.is_visible ? "visible" : "hidden";
  return String(entity.entity_type || "system");
}

function AdminPage({ readOnly, onImpersonated }: { readOnly: boolean; onImpersonated: (user: CurrentUser) => void }) {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [section, setSection] = useState<"overview" | AdminEntityType>("overview");
  const [entities, setEntities] = useState<AdminEntity[]>([]);
  const [selected, setSelected] = useState<AdminEntity | null>(null);
  const [options, setOptions] = useState<AdminOptions>({ owners: [], farms: [], categories: [] });
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [paymentSettingsOpen, setPaymentSettingsOpen] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<ManualPaymentSettings>({ bank_name: "", account_name: "", account_number: "", instructions: null, is_enabled: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [failed, setFailed] = useState(false);
  const [entitySearch, setEntitySearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [balanceOnly, setBalanceOnly] = useState(false);
  const [joinedDateFilter, setJoinedDateFilter] = useState("all");
  const [joinedDateSort, setJoinedDateSort] = useState("newest");
  const [filterReferenceTime] = useState(() => Date.now());

  async function loadOverview() {
    const response = await fetch("/api/admin/overview");
    if (!response.ok) throw new Error("Forbidden");
    setOverview(await response.json());
  }

  async function loadEntities(type: AdminEntityType) {
    setBusy(true);
    const response = await fetch(`/api/admin/entities?type=${type}`);
    const data = await response.json() as { entities?: AdminEntity[]; error?: string };
    if (!response.ok) throw new Error(data.error || "Could not load records");
    setEntities(data.entities || []);
    setBusy(false);
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/overview").then((response) => { if (!response.ok) throw new Error("Forbidden"); return response.json(); }),
      fetch("/api/admin/entities?type=options").then((response) => { if (!response.ok) throw new Error("Forbidden"); return response.json(); }),
      fetch("/api/admin/payment-settings").then((response) => { if (!response.ok) throw new Error("Forbidden"); return response.json(); }),
    ]).then(([overviewData, optionsData, settingsData]: [AdminOverview, AdminOptions, { settings: ManualPaymentSettings }]) => { setOverview(overviewData); setOptions(optionsData); setPaymentSettings(settingsData.settings); }).catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    if (section === "overview") return;
    let cancelled = false;
    fetch(`/api/admin/entities?type=${section}`).then(async (response) => {
      const data = await response.json() as { entities?: AdminEntity[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Could not load records");
      if (!cancelled) { setEntities(data.entities || []); setBusy(false); }
    }).catch((reason: Error) => { if (!cancelled) { setError(reason.message); setBusy(false); } });
    return () => { cancelled = true; };
  }, [section]);

  const filterOptions = useMemo(() => {
    if (section === "overview") return [];
    const values = new Set(entities.map((entity) => adminEntityFilterValue(section, entity)).filter(Boolean));
    return [...values].sort((left, right) => left.localeCompare(right));
  }, [entities, section]);
  const effectiveEntityFilter = filterOptions.includes(entityFilter) ? entityFilter : "all";
  const visibleEntities = useMemo(() => {
    if (section === "overview") return entities;
    const query = entitySearch.trim().toLowerCase();
    const filtered = entities.filter((entity) => {
      if (effectiveEntityFilter !== "all" && adminEntityFilterValue(section, entity) !== effectiveEntityFilter) return false;
      if (section === "users" && balanceOnly && Number(entity.account_credit_kobo || 0) <= 0) return false;
      if (section === "users" && joinedDateFilter !== "all") {
        const joinedAt = new Date(String(entity.created_at)).getTime();
        const days = Number(joinedDateFilter);
        if (!Number.isFinite(joinedAt) || joinedAt < filterReferenceTime - days * 24 * 60 * 60 * 1000) return false;
      }
      if (!query) return true;
      return Object.entries(entity).some(([key, value]) => !["password_hash", "items"].includes(key) && value !== null && String(value).toLowerCase().includes(query));
    });
    if (section !== "users") return filtered;
    return [...filtered].sort((left, right) => {
      const difference = new Date(String(right.created_at)).getTime() - new Date(String(left.created_at)).getTime();
      return joinedDateSort === "oldest" ? -difference : difference;
    });
  }, [balanceOnly, effectiveEntityFilter, entities, entitySearch, filterReferenceTime, joinedDateFilter, joinedDateSort, section]);

  async function openDetails(type: AdminEntityType, id: string) {
    setError("");
    const response = await fetch(`/api/admin/entities?type=${type}&id=${id}`);
    const data = await response.json() as { entity?: AdminEntity; error?: string };
    if (!response.ok || !data.entity) return setError(data.error || "Could not load details");
    setSelected(data.entity);
  }

  async function addEntity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (section === "overview") return;
    setBusy(true); setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (section === "farms" && (!values.latitude || !values.longitude)) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000 }));
        values.latitude = String(position.coords.latitude);
        values.longitude = String(position.coords.longitude);
      } catch {
        setError("Allow location access while at the farm so its coordinates can be recorded."); setBusy(false); return;
      }
    }
    const response = await fetch(`/api/admin/entities?type=${section}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const data = await response.json() as { error?: string };
    if (!response.ok) { setError(data.error || "Could not add record"); setBusy(false); return; }
    setAddOpen(false);
    await Promise.all([loadEntities(section), loadOverview()]);
  }

  async function removeEntity() {
    if (!selected || section === "overview" || !window.confirm(`Remove this ${section === "produce" ? "produce listing" : section.slice(0, -1)}? Historical records will be retained.`)) return;
    setBusy(true); setError("");
    const response = await fetch(`/api/admin/entities?type=${section}&id=${selected.id}`, { method: "DELETE" });
    const data = await response.json() as { error?: string };
    if (!response.ok) { setError(data.error || "Could not remove record"); setBusy(false); return; }
    setSelected(null);
    await Promise.all([loadEntities(section), loadOverview()]);
  }

  async function editEntity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || section === "overview") return;
    setBusy(true); setError("");
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch(`/api/admin/entities?type=${section}&id=${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const responseText = await response.text();
      const data = responseText ? JSON.parse(responseText) as { entity?: AdminEntity; error?: string } : {};
      if (!response.ok || !data.entity) throw new Error(data.error || "Could not update record");
      setEditOpen(false);
      await Promise.all([loadEntities(section), loadOverview()]);
      await openDetails(section, selected.id);
    } catch (reason) {
      setError((reason as Error).message || "Could not update record");
    } finally {
      setBusy(false);
    }
  }

  async function updateFarmVerification(status: "verified" | "rejected" | "pending") {
    if (!selected || section !== "farms") return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/entities?type=farms&id=${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ verificationStatus: status }) });
      const responseText = await response.text();
      let data: { farm?: { verification_status: string; verified_at: string | null }; error?: string } = {};
      if (responseText) {
        try { data = JSON.parse(responseText) as typeof data; } catch { data.error = "The server returned an invalid response"; }
      }
      if (!response.ok || !data.farm) throw new Error(data.error || `Could not update verification (${response.status})`);
      setSelected({ ...selected, verification_status: data.farm.verification_status, verified_at: data.farm.verified_at, updated_at: new Date().toISOString() });
      await Promise.all([loadEntities("farms"), loadOverview()]);
    } catch (reason) {
      setError((reason as Error).message || "Could not update verification");
    } finally {
      setBusy(false);
    }
  }

  async function impersonateUser() {
    if (!selected || section !== "users") return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/impersonate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: selected.id }) });
      const data = await response.json() as { user?: CurrentUser; error?: string };
      if (!response.ok) throw new Error(data.error || "Could not view this account");
      if (!data.user) throw new Error("The user session was not returned");
      onImpersonated(data.user);
    } catch (reason) { setError((reason as Error).message); setBusy(false); }
  }
  async function confirmManualPayment() {
    if (!selected || section !== "orders") return;
    if (!window.confirm(`Confirm payment for order #${String(selected.order_number)}? The receipt will be permanently deleted after confirmation.`)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/payments/manual/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "confirm" }) });
      const result = await readJsonResponse<{ error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "Could not confirm payment");
      setSelected(null);
      await Promise.all([loadEntities("orders"), loadOverview()]);
    } catch (reason) { setError((reason as Error).message); setBusy(false); }
  }
  async function savePaymentSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch("/api/admin/payment-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bankName: values.bankName, accountName: values.accountName, accountNumber: values.accountNumber, instructions: values.instructions, isEnabled: values.isEnabled === "true" }) });
      const result = await response.json() as { settings?: ManualPaymentSettings; error?: string };
      if (!response.ok || !result.settings) throw new Error(result.error || "Could not save payment settings");
      setPaymentSettings(result.settings); setPaymentSettingsOpen(false);
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }

  if (failed) return <main className="admin-page"><div className="empty-state"><X size={28}/><h3>Administration unavailable</h3><p>Your session does not have permission to view this workspace.</p></div></main>;
  if (!overview) return <DataLoading />;
  const metrics = overview.metrics;
  return <main className="admin-page">
    <header className="admin-heading"><div><p className="eyebrow"><span/> MARKETPLACE OPERATIONS</p><h1>Administration</h1><p>Monitor people, farms, listings, orders, and customer resolutions.</p></div><div className="admin-heading-tools">{!readOnly && <button onClick={() => { setError(""); setPaymentSettingsOpen(true); }}><AtSign size={15}/> Bank payment details</button>}<span className="admin-live"><i/> {readOnly ? "Read-only support access" : "Live database"}</span></div></header>
    <nav className="admin-tabs" aria-label="Administration sections">{(["overview", "users", "farms", "produce", "orders", "refunds", "reviews", "activity"] as const).map((item) => <button key={item} className={section === item ? "active" : ""} onClick={() => { setSection(item); setSelected(null); setError(""); setBusy(item !== "overview"); }}>{item === "overview" ? <House size={15}/> : item === "users" ? <UserRound size={15}/> : item === "farms" ? <Store size={15}/> : item === "produce" ? <Leaf size={15}/> : item === "orders" ? <PackageCheck size={15}/> : item === "refunds" ? <RotateCcw size={15}/> : item === "reviews" ? <Star size={15}/> : <Clock3 size={15}/>}<span>{item}</span>{item === "refunds" && metrics.open_refunds > 0 && <b className="admin-tab-count">{metrics.open_refunds}</b>}</button>)}</nav>

    {section === "overview" ? <>
      <section className="admin-metrics"><article><span><UserRound size={19}/></span><small>ACTIVE USERS</small><strong>{metrics.users}</strong><p>{metrics.active_carts} active shopping carts</p></article><article><span><Store size={19}/></span><small>VERIFIED FARMS</small><strong>{metrics.verified_farms}</strong><p>{metrics.pending_farms} awaiting review</p></article><article><span><Leaf size={19}/></span><small>ACTIVE LISTINGS</small><strong>{metrics.listings}</strong><p>Available marketplace harvests</p></article><article><span><PackageCheck size={19}/></span><small>OPEN ORDERS</small><strong>{metrics.open_orders}</strong><p>{metrics.orders} orders recorded</p></article><article><span><RotateCcw size={19}/></span><small>OPEN REFUNDS</small><strong>{metrics.open_refunds}</strong><p>Awaiting a resolution</p></article><article><span><AtSign size={19}/></span><small>CUMULATIVE GROSS SALES</small><strong>{money(Number(metrics.cumulative_gross_kobo) / 100)}</strong><p>Completed produce sales</p></article><article><span><Minus size={19}/></span><small>PROCESSING FEES</small><strong>{money(Number(metrics.cumulative_fee_kobo) / 100)}</strong><p>Cumulative platform revenue</p></article><article><span><Check size={19}/></span><small>FARMER NET SALES</small><strong>{money(Number(metrics.cumulative_net_kobo) / 100)}</strong><p>Earned after processing fees</p></article><article><span><Truck size={19}/></span><small>DELIVERY ISSUES</small><strong>{metrics.failed_deliveries}</strong><p>Failed deliveries</p></article><article><span><Bell size={19}/></span><small>UNREAD UPDATES</small><strong>{metrics.unread_notifications}</strong><p>{metrics.hidden_reviews} hidden reviews</p></article></section>
      <section className="admin-credit-balance"><span><AtSign size={20}/></span><div><small>OUTSTANDING ACCOUNT CREDIT</small><strong>{money(Number(metrics.outstanding_credit_kobo) / 100)}</strong><p>Total customer credit currently available for future marketplace purchases.</p></div><button onClick={() => { setBusy(true); setSection("users"); }}>View customer balances <ArrowRight size={15}/></button></section>
      <div className="admin-grid"><section className="admin-panel"><div className="admin-panel-head"><div><h2>Recent users</h2><p>Latest accounts across the marketplace</p></div><button onClick={() => { setBusy(true); setSection("users"); }}>View all <ArrowRight size={15}/></button></div><div className="admin-user-list">{overview.users.slice(0, 8).map((user) => <button className="admin-user-row" key={user.id} onClick={() => { setBusy(true); setSection("users"); setTimeout(() => openDetails("users", user.id), 0); }}><span>{user.first_name[0]}{user.last_name[0]}</span><div><strong>{user.first_name} {user.last_name}</strong><small>{user.email}</small></div><b className={`role-badge ${user.role}`}>{user.role}</b><i className={user.is_active ? "active" : ""}>{user.is_active ? "Active" : "Disabled"}</i></button>)}</div></section><aside className="admin-side"><section><div className="admin-panel-head"><div><h2>Attention needed</h2><p>Items requiring administrator action</p></div></div><button onClick={() => { setBusy(true); setSection("farms"); }}><span><Store size={17}/></span><div><strong>Farm verification</strong><small>{metrics.pending_farms} pending applications</small></div><ChevronRight size={16}/></button><button onClick={() => { setBusy(true); setSection("refunds"); }}><span><RotateCcw size={17}/></span><div><strong>Refund requests</strong><small>{metrics.open_refunds} open cases</small></div><ChevronRight size={16}/></button><button onClick={() => { setBusy(true); setSection("orders"); }}><span><Truck size={17}/></span><div><strong>Delivery exceptions</strong><small>{metrics.failed_deliveries} failed deliveries</small></div><ChevronRight size={16}/></button></section><section className="admin-health"><div className="admin-panel-head"><div><h2>System status</h2><p>Core marketplace services</p></div></div><div><span><i/> Neon database</span><strong>Operational</strong></div><div><span><i/> Blob image storage</span><strong>Operational</strong></div><div><span><i/> Authentication</span><strong>Operational</strong></div></section></aside></div>
    </> : <section className="entity-manager">
      <div className="entity-toolbar"><div><h2>{section === "produce" ? "Produce listings" : section[0].toUpperCase() + section.slice(1)}</h2><p>{entities.length} database records</p></div>{!readOnly && ["users","farms","produce"].includes(section) && <button onClick={() => { setError(""); setAddOpen(true); }}><Plus size={16}/> Add {section === "produce" ? "produce" : section.slice(0, -1)}</button>}</div>
      <div className="entity-list-controls">
        <div className="entity-search"><Search size={16}/><input type="search" aria-label={`Search ${section}`} value={entitySearch} onChange={(event) => setEntitySearch(event.target.value)} placeholder={`Search ${section === "produce" ? "produce listings" : section}...`}/>{entitySearch && <button type="button" onClick={() => setEntitySearch("")} aria-label="Clear search"><X size={14}/></button>}</div>
        <label className="entity-filter"><SlidersHorizontal size={16}/><span className="sr-only">Filter {section}</span><select value={effectiveEntityFilter} onChange={(event) => setEntityFilter(event.target.value)}><option value="all">All {section === "users" ? "roles" : section === "reviews" ? "visibility" : section === "activity" ? "entity types" : "statuses"}</option>{filterOptions.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></label>
        {section === "users" && <label className="entity-filter entity-date-filter"><Clock3 size={16}/><span className="sr-only">Filter by joined date</span><select value={joinedDateFilter} onChange={(event) => setJoinedDateFilter(event.target.value)}><option value="all">Joined anytime</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last 12 months</option></select></label>}
        {section === "users" && <label className="entity-filter entity-date-sort"><span className="sr-only">Sort by joined date</span><select value={joinedDateSort} onChange={(event) => setJoinedDateSort(event.target.value)}><option value="newest">Newest joined</option><option value="oldest">Oldest joined</option></select></label>}
        {section === "users" && <button className={`entity-balance-filter ${balanceOnly ? "active" : ""}`} type="button" aria-pressed={balanceOnly} onClick={() => setBalanceOnly((current) => !current)}><AtSign size={15}/> Has balance <b>{entities.filter((entity) => Number(entity.account_credit_kobo || 0) > 0).length}</b></button>}
        <span className="entity-result-count">Showing <strong>{visibleEntities.length}</strong> of {entities.length}</span>
        {(entitySearch || effectiveEntityFilter !== "all" || (section === "users" && (balanceOnly || joinedDateFilter !== "all" || joinedDateSort !== "newest"))) && <button className="entity-clear-filters" type="button" onClick={() => { setEntitySearch(""); setEntityFilter("all"); setBalanceOnly(false); setJoinedDateFilter("all"); setJoinedDateSort("newest"); }}><X size={14}/> Clear</button>}
      </div>
      {error && <p className="admin-error" role="alert">{error}</p>}
      {busy && !addOpen ? <div className="entity-loading"><Clock3 size={20}/> Updating records...</div> : visibleEntities.length ? <div className="entity-table">{visibleEntities.map((entity) => <AdminEntityRow key={entity.id} section={section} entity={entity} onOpen={() => openDetails(section, entity.id)} onReviewRefund={(refundId) => { setSection("refunds"); setSelected(null); setBusy(true); void openDetails("refunds", refundId).finally(() => setBusy(false)); }}/>)}</div> : <div className="entity-empty"><Search size={22}/><strong>No matching records</strong><p>Try a different search term or filter.</p><button type="button" onClick={() => { setEntitySearch(""); setEntityFilter("all"); setBalanceOnly(false); setJoinedDateFilter("all"); setJoinedDateSort("newest"); }}>Clear search and filter</button></div>}
    </section>}

    {selected && section !== "overview" && <div className="admin-drawer-overlay" onMouseDown={() => setSelected(null)}>
      <aside className="admin-detail" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><small>{section === "produce" ? "PRODUCE LISTING" : section === "activity" ? "AUDIT EVENT" : section.slice(0, -1).toUpperCase()}</small><h2>{entityTitle(section, selected)}</h2></div><button onClick={() => setSelected(null)} aria-label="Close details"><X size={19}/></button></header>
        {["orders", "refunds"].includes(section) && Boolean(selected.payment_receipt_name) && <section className="admin-payment-review"><span><PackageCheck size={19}/></span><div><strong>Manual payment receipt</strong><small>Submitted {formatEntityValue("submitted_at", selected.payment_receipt_submitted_at)}</small></div><a href={`/api/payments/manual/${section === "orders" ? selected.id : selected.order_id}`} target="_blank" rel="noreferrer">Open receipt</a></section>}
        <div className="entity-details">{Object.entries(selected).filter(([key, value]) => value !== null && value !== "" && !["id", "password_hash", "payment_receipt_name", "payment_receipt_submitted_at"].includes(key)).map(([key, value]) => <div key={key}><span>{key.replaceAll("_", " ")}</span><strong>{formatEntityValue(key, value)}</strong></div>)}</div>
        {!readOnly && section !== "activity" && <footer className="admin-detail-actions">
          {section === "users" && <button className="impersonate-user" onClick={impersonateUser} disabled={busy}><Eye size={16}/> View as this user</button>}
          {section === "orders" && selected.status === "pending_payment" && Boolean(selected.payment_receipt_name) && <button className="confirm-manual-payment" onClick={confirmManualPayment} disabled={busy}><Check size={16}/> {busy ? "Confirming..." : "Confirm payment"}</button>}
          {!(section === "orders" && selected.status === "pending_payment") && <button className="edit-entity" onClick={() => { setError(""); setEditOpen(true); }} disabled={busy}>{["orders","refunds","reviews"].includes(section) ? "Manage record" : "Edit details"}</button>}
          {section === "farms" && selected.verification_status !== "verified" && <button className="verify-farm" onClick={() => updateFarmVerification("verified")} disabled={busy}><Check size={16}/> Verify farm</button>}
          {section === "farms" && selected.verification_status !== "rejected" && <button className="reject-farm" onClick={() => updateFarmVerification("rejected")} disabled={busy}><X size={16}/> Reject</button>}
          {["users","farms","produce"].includes(section) && <button className="remove-entity" onClick={removeEntity} disabled={busy}><Trash2 size={16}/> Remove {section === "produce" ? "listing" : section.slice(0, -1)}</button>}
        </footer>}
      </aside>
    </div>}

    {addOpen && section !== "overview" && <div className="modal-overlay" onMouseDown={() => setAddOpen(false)}><div className="admin-add-modal" onMouseDown={(event) => event.stopPropagation()}><button className="close-modal" onClick={() => setAddOpen(false)}><X size={19}/></button><p className="auth-kicker">NEW {section === "produce" ? "LISTING" : section.slice(0, -1).toUpperCase()}</p><h2>Add {section === "produce" ? "produce" : section.slice(0, -1)}</h2><p>Create a new marketplace record. Required fields are marked.</p><form onSubmit={addEntity}>{section === "users" ? <><div className="form-row"><label>First name<input name="firstName" required/></label><label>Last name<input name="lastName" required/></label></div><label>Email<input name="email" type="email" required/></label><label>Phone<input name="phone" required/></label><label>Role<select name="role" required><option value="consumer">Consumer</option><option value="farmer">Farmer</option><option value="support">Support</option><option value="admin">Administrator</option></select></label><label>Temporary password<input name="password" type="password" minLength={8} required/></label></> : section === "farms" ? <><label>Farmer owner<select name="ownerId" required><option value="">Select owner</option>{options.owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select></label><label>Farm name<input name="name" required/></label><div className="form-row"><label>Phone<input name="phone" required/></label><label>Email<input name="email" type="email"/></label></div><label>Address<input name="address" required/></label><div className="form-row"><label>City<input name="city" required/></label><label>State<input name="state" required/></label></div><label className="admin-check"><input type="checkbox" name="offersDelivery" value="true"/> Offers delivery</label></> : <><label>Farm<select name="farmId" required><option value="">Select farm</option>{options.farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select></label><label>Category<select name="categoryId" required><option value="">Select category</option>{options.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Produce name<input name="name" required/></label><div className="form-row"><label>Unit<input name="unit" placeholder="basket" required/></label><label>Price (NGN)<input name="price" type="number" min="1" required/></label></div><div className="form-row"><label>Stock quantity<input name="stock" type="number" min="1" required/></label><label>Harvest date<input name="harvestDate" type="date" required/></label></div><label>Image path<input name="imageUrl" placeholder="/produce/example.webp"/></label><label>Badge<input name="badge" placeholder="New harvest"/></label></>} {error && <p className="admin-error" role="alert">{error}</p>}<button className="admin-submit" disabled={busy}>{busy ? "Saving..." : "Create record"} {!busy && <ArrowRight size={16}/>}</button></form></div></div>}
    {editOpen && selected && section !== "overview" && <div className="modal-overlay admin-edit-overlay" onMouseDown={() => setEditOpen(false)}><div className="admin-add-modal" onMouseDown={(event) => event.stopPropagation()}><button className="close-modal" onClick={() => setEditOpen(false)}><X size={19}/></button><p className="auth-kicker">EDIT {section === "produce" ? "LISTING" : section.slice(0, -1).toUpperCase()}</p><h2>{entityTitle(section, selected)}</h2><p>Update this record. Changes are saved to the audit log.</p><form onSubmit={editEntity}>{section === "orders" ? <label>Order status<select name="status" defaultValue={String(selected.status)} required>{["paid","confirmed","preparing","ready","dispatched","delivered","collected","cancelled","refunded"].map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label> : section === "refunds" ? <><label>Refund status<select name="status" defaultValue={String(selected.status)} required>{["requested","under_review","approved","rejected","processing","completed","failed"].map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label><label>Resolution note<textarea name="adminNote" defaultValue={String(selected.resolution_note || "")} placeholder="Explain the decision or next action"/></label></> : section === "reviews" ? <><label>Visibility<select name="isVisible" defaultValue={selected.is_visible ? "true" : "false"}><option value="true">Visible</option><option value="false">Hidden</option></select></label><label>Farmer reply<textarea name="farmerReply" defaultValue={String(selected.farmer_reply || "")} placeholder="Optional public response"/></label></> : section === "users" ? <><div className="form-row"><label>First name<input name="firstName" defaultValue={String(selected.first_name)} required/></label><label>Last name<input name="lastName" defaultValue={String(selected.last_name)} required/></label></div><label>Email<input name="email" type="email" defaultValue={String(selected.email)} required/></label><label>Phone<input name="phone" defaultValue={String(selected.phone || "")} required/></label><label>Role<select name="role" defaultValue={String(selected.role)} required><option value="consumer">Consumer</option><option value="farmer">Farmer</option><option value="support">Support</option><option value="admin">Administrator</option></select></label><label>Account status<select name="isActive" defaultValue={selected.is_active ? "true" : "false"}><option value="true">Active</option><option value="false">Disabled</option></select></label></> : section === "farms" ? <><label>Farmer owner<select name="ownerId" defaultValue={String(selected.owner_id)} required>{options.owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select></label><label>Farm name<input name="name" defaultValue={String(selected.name)} required/></label><div className="form-row"><label>Phone<input name="phone" defaultValue={String(selected.phone)} required/></label><label>Email<input name="email" type="email" defaultValue={String(selected.email || "")}/></label></div><label>Address<input name="address" defaultValue={String(selected.address_text)} required/></label><div className="form-row"><label>City<input name="city" defaultValue={String(selected.city)} required/></label><label>State<input name="state" defaultValue={String(selected.state)} required/></label></div><label className="admin-check"><input type="checkbox" name="offersDelivery" value="true" defaultChecked={Boolean(selected.offers_delivery)}/> Offers delivery</label></> : <><label>Farm<select name="farmId" defaultValue={String(selected.farm_id)} required>{options.farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select></label><label>Listing title<input name="title" defaultValue={String(selected.title)} required/></label><div className="form-row"><label>Unit<input name="unit" defaultValue={String(selected.unit)} required/></label><label>Price (NGN)<input name="price" type="number" min="1" defaultValue={Number(selected.unit_price_kobo) / 100} required/></label></div><div className="form-row"><label>Available stock<input name="stock" type="number" min={Number(selected.quantity_reserved || 0)} defaultValue={Number(selected.quantity_available)} required/></label><label>Harvest date<input name="harvestDate" type="date" defaultValue={String(selected.harvest_date).slice(0, 10)} required/></label></div><label>Status<select name="status" defaultValue={String(selected.status)}><option value="draft">Draft</option><option value="active">Active</option><option value="paused">Paused</option><option value="sold_out">Sold out</option><option value="expired">Expired</option></select></label><label>Badge<input name="badge" defaultValue={String(selected.badge || "")}/></label></>} {error && <p className="admin-error" role="alert">{error}</p>}<button className="admin-submit" disabled={busy}>{busy ? "Saving changes..." : "Save changes"} {!busy && <ArrowRight size={16}/>}</button></form></div></div>}
    {paymentSettingsOpen && <div className="modal-overlay admin-edit-overlay" onMouseDown={() => setPaymentSettingsOpen(false)}><div className="admin-add-modal payment-settings-modal" onMouseDown={(event) => event.stopPropagation()}><button className="close-modal" onClick={() => setPaymentSettingsOpen(false)}><X size={19}/></button><p className="auth-kicker">MANUAL PAYMENTS</p><h2>Company bank account</h2><p>These details are displayed to signed-in customers during checkout.</p><form onSubmit={savePaymentSettings}><label>Bank name<input name="bankName" defaultValue={paymentSettings.bank_name} maxLength={120} required/></label><label>Account name<input name="accountName" defaultValue={paymentSettings.account_name} maxLength={160} required/></label><label>Account number<input name="accountNumber" inputMode="numeric" pattern="[0-9 -]+" defaultValue={paymentSettings.account_number} maxLength={30} required/></label><label>Payment instructions<textarea name="instructions" defaultValue={paymentSettings.instructions || ""} maxLength={500} placeholder="Optional transfer reference or processing guidance"/></label><label className="admin-check"><input name="isEnabled" type="checkbox" value="true" defaultChecked={paymentSettings.is_enabled}/> Enable manual bank payments</label>{error && <p className="admin-error" role="alert">{error}</p>}<button className="admin-submit" disabled={busy}>{busy ? "Saving details..." : "Save payment details"}</button></form></div></div>}
  </main>;
}

function AdminEntityDate({ label, value }: { label: string; value: unknown }) {
  if (!value) return null;
  return <span className="entity-date"><Clock3 size={11}/>{label} {new Date(String(value)).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</span>;
}

type AdminOrderItem = { id: string; product: string; farm: string; quantity: number; unit: string; unit_price_kobo: number; line_total_kobo: number };

function AdminOrderRow({ entity, onOpen, onReviewRefund }: { entity: AdminEntity; onOpen: () => void; onReviewRefund: (refundId: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const items = Array.isArray(entity.items) ? entity.items as AdminOrderItem[] : [];
  return <div className={`admin-order-row ${expanded ? "expanded" : ""}`}>
    <div className="admin-order-summary">
      <button className="admin-order-toggle" onClick={() => transitionUpdate(() => setExpanded((value) => !value))} aria-expanded={expanded} aria-label={`${expanded ? "Collapse" : "Expand"} order ${String(entity.order_number)}`}><ChevronDown size={17}/></button>
      <span className="entity-icon"><PackageCheck size={17}/></span>
      <span><strong>Order #{String(entity.order_number)}</strong><small>{String(entity.customer_name)} · {String(entity.item_count)} items</small><span className="entity-farms"><Store size={11}/>{String(entity.farm_names || "Farm not assigned")}</span>{Boolean(entity.refund_id) ? <span className={`entity-refund-alert ${entity.refund_status}`}><RotateCcw size={11}/> Refund {String(entity.refund_status).replaceAll("_", " ")} · {String(entity.refund_method).replaceAll("_", " ")}</span> : Boolean(entity.receipt_submitted) && <span className="entity-payment-receipt"><Check size={11}/> Receipt ready for review</span>}<AdminEntityDate label="Placed" value={entity.placed_at}/></span>
      <b className={`status-badge ${entity.status}`}>{String(entity.status).replaceAll("_", " ")}</b>
      <i>{money(Number(entity.total_kobo) / 100)}</i>
      <button className="admin-order-details" onClick={onOpen}>Full details</button>
      {Boolean(entity.refund_id) && <button className="admin-order-refund" onClick={() => onReviewRefund(String(entity.refund_id))}>Review refund</button>}
    </div>
    <div className={`admin-order-collapse ${expanded ? "open" : ""}`} aria-hidden={!expanded}><div><div className="admin-order-breakdown">
      <div className="admin-order-items"><div className="admin-order-item headings"><span>Item</span><span>Qty</span><span>Unit price</span><span>Total</span></div>{items.map((item) => <div className="admin-order-item" key={item.id}><span><strong>{item.product}</strong><small>{item.farm}</small></span><span>{Number(item.quantity)} {item.unit}</span><span>{money(Number(item.unit_price_kobo) / 100)}</span><b>{money(Number(item.line_total_kobo) / 100)}</b></div>)}</div>
      <div className="admin-order-totals"><span>Subtotal <b>{money(Number(entity.subtotal_kobo) / 100)}</b></span><span>Delivery <b>{money(Number(entity.delivery_fee_kobo) / 100)}</b></span><strong>Order total <b>{money(Number(entity.total_kobo) / 100)}</b></strong></div>
    </div></div></div>
  </div>;
}

function AdminEntityRow({ section, entity, onOpen, onReviewRefund }: { section: AdminEntityType; entity: AdminEntity; onOpen: () => void; onReviewRefund: (refundId: string) => void }) {
  if (section === "users") return <button onClick={onOpen}><span className={`entity-avatar ${entity.avatar_url ? "has-photo" : ""}`}>{entity.avatar_url ? <img src={String(entity.avatar_url)} alt=""/> : <>{String(entity.first_name)[0]}{String(entity.last_name)[0]}</>}</span><span><strong>{String(entity.first_name)} {String(entity.last_name)}</strong><small>{String(entity.email)}</small>{entity.role === "farmer" && <span className="entity-farms"><Store size={11}/>{entity.farm_names ? String(entity.farm_names) : "No farms added"}</span>}<span className="entity-credit-balance"><AtSign size={11}/> Credit {money(Number(entity.account_credit_kobo || 0) / 100)}</span><AdminEntityDate label="Joined" value={entity.created_at}/></span><b className={`role-badge ${entity.role}`}>{String(entity.role)}</b><i>{entity.is_active ? "Active" : "Disabled"}</i></button>;
  if (section === "farms") return <button onClick={onOpen}><span className="entity-icon"><Store size={17}/></span><span><strong>{String(entity.name)}</strong><small>{String(entity.city)}, {String(entity.state)} · {String(entity.owner_name)}</small><AdminEntityDate label="Created" value={entity.created_at}/></span><b className={`status-badge ${entity.verification_status}`}>{String(entity.verification_status)}</b><i>{String(entity.listing_count)} listings</i></button>;
  if (section === "produce") return <button onClick={onOpen}><span className="entity-thumb">{entity.image_url ? <img src={String(entity.image_url)} alt=""/> : <Leaf size={17}/>}</span><span><strong>{String(entity.title)}</strong><small>{String(entity.farm_name)} · {String(entity.category_name)}</small><span className="entity-date-group"><AdminEntityDate label="Listed" value={entity.created_at}/><AdminEntityDate label="Harvest" value={entity.harvest_date}/></span></span><b className={`status-badge ${entity.status}`}>{String(entity.status)}</b><i>{money(Number(entity.unit_price_kobo) / 100)} / {String(entity.unit)}</i></button>;
  if (section === "orders") return <AdminOrderRow entity={entity} onOpen={onOpen} onReviewRefund={onReviewRefund}/>;
  if (section === "refunds") return <button onClick={onOpen}><span className="entity-icon"><RotateCcw size={17}/></span><span><strong>Order #{String(entity.order_number)}</strong><small>{String(entity.customer_name)} · {String(entity.resolution_method || "bank_refund").replaceAll("_", " ")}{Number(entity.cancellation_fee_kobo) ? ` · ${money(Number(entity.cancellation_fee_kobo) / 100)} fee` : " · no fee"}</small><AdminEntityDate label="Requested" value={entity.requested_at}/></span><b className={`status-badge ${entity.status}`}>{String(entity.status).replaceAll("_", " ")}</b><i>{money(Number(entity.amount_kobo) / 100)}</i></button>;
  if (section === "reviews") return <button onClick={onOpen}><span className="entity-icon"><Star size={17}/></span><span><strong>{String(entity.farm_name)}</strong><small>{String(entity.customer_name)} · Order #{String(entity.order_number)}</small><AdminEntityDate label="Reviewed" value={entity.created_at}/></span><b className={`status-badge ${entity.is_visible ? "verified" : "suspended"}`}>{entity.is_visible ? "Visible" : "Hidden"}</b><i>{String(entity.rating)}/5</i></button>;
  return <button onClick={onOpen}><span className="entity-icon"><Clock3 size={17}/></span><span><strong>{String(entity.action).replaceAll("_", " ")}</strong><small>{String(entity.actor_name)} · {String(entity.entity_type)} {String(entity.entity_id).slice(0,8)}</small><AdminEntityDate label="Logged" value={entity.created_at}/></span><b className="status-badge verified">Logged</b><i>{new Date(String(entity.created_at)).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}</i></button>;
}

function entityTitle(type: AdminEntityType, entity: AdminEntity) {
  if (type === "users") return `${entity.first_name} ${entity.last_name}`;
  if (type === "farms") return String(entity.name);
  if (type === "produce") return String(entity.title);
  if (type === "orders" || type === "refunds") return `Order #${entity.order_number}`;
  if (type === "reviews") return `${entity.farm_name} review`;
  return String(entity.action).replaceAll("_", " ");
}

function formatEntityValue(key: string, value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (key.endsWith("_kobo")) return money(Number(value) / 100);
  if (key.endsWith("_at") || key.endsWith("_date")) return new Date(String(value)).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: key.endsWith("_at") ? "short" : undefined });
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function DataLoading() {
  return <main className="profile-page loading-page"><HarvestSpinner label="Loading marketplace data"/></main>;
}

function HarvestSpinner({ compact = false, label }: { compact?: boolean; label: string }) {
  return <div className={`harvest-spinner ${compact ? "compact" : ""}`} role="status" aria-label={label}>
    <span className="spinner-orbit"><i/><b/><span><img src="/brand/harvestnearu-approved-mark.png" alt=""/></span></span>
  </div>;
}

type ProfileData = {
  user: { id: string; first_name: string; last_name: string; email: string; phone: string | null; avatar_url: string | null; created_at: string; email_verified_at: string | null };
  addresses: Array<{ id: string; label: string; line1: string; city: string; state: string; is_default: boolean }>;
  stats: { total_orders: number; farms_supported: number; completed_orders: number };
  storeCredit: { balance_kobo: number; updated_at: string | null; transactions: Array<{ id: string; amount_kobo: number; transaction_type: string; reference_type: string; reference_id: string; description: string; created_at: string }> };
  preferences?: { preferred_radius_km: number; marketing_consent: boolean };
  farm?: { id: string; name: string; description: string | null; phone: string; email: string | null; address_text: string; city: string; state: string; verification_status: string; delivery_radius_km: number; offers_pickup: boolean; offers_delivery: boolean; average_rating: number; review_count: number; created_at: string };
  farms?: Array<{ id: string; name: string; verification_status: string; city: string; state: string }>;
  listings?: Array<{ id: string; title: string; unit: string; unit_price_kobo: number; quantity_available: number; status: string; image_url: string | null }>;
  farmStats?: { fulfilled_orders: number; customers: number };
};

function DatabaseProfilePage({ role, onShop, onFarmer, onUpgraded }: { role: "consumer" | "farmer"; onShop: () => void; onFarmer: () => void; onUpgraded: (user: CurrentUser) => void }) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [switchingFarmId, setSwitchingFarmId] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function requestProfile(farmId?: string) {
    const url = `/api/profile${farmId ? `?farmId=${encodeURIComponent(farmId)}` : ""}`;
    let response = await fetch(url, { cache: "no-store" });
    if (response.status === 403) {
      await fetch("/api/auth/session", { cache: "no-store" });
      await new Promise((resolve) => setTimeout(resolve, 300));
      response = await fetch(url, { cache: "no-store" });
    }
    return response;
  }
  async function loadProfile(farmId?: string) {
    const isFarmSwitch = Boolean(farmId && farmId !== data?.farm?.id);
    if (isFarmSwitch && switchingFarmId) return;
    if (isFarmSwitch) { setSwitchingFarmId(farmId!); setError(""); }
    try {
      const response = await requestProfile(farmId || data?.farm?.id);
      const result = await response.json() as ProfileData & { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not load profile");
      setData(result);
    } catch (reason) {
      if (isFarmSwitch) setError((reason as Error).message);
      else throw reason;
    } finally {
      if (isFarmSwitch) setSwitchingFarmId(null);
    }
  }
  useEffect(() => {
    requestProfile().then(async (response) => {
      const result = await response.json() as ProfileData & { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not load profile");
      setData(result);
    }).catch((reason: Error) => setError(reason.message));
  }, []);
  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, marketingConsent: values.marketingConsent === "true", offersPickup: values.offersPickup === "true", offersDelivery: values.offersDelivery === "true" }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not save profile");
      setEditing(false); await loadProfile();
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }
  async function updateAvatar(event: FormEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]; if (!file) return;
    setAvatarBusy(true); setError("");
    try {
      const form = new FormData(); form.set("file", file);
      const response = await fetch("/api/profile/avatar", { method: "POST", body: form });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not update profile picture");
      await loadProfile();
      window.dispatchEvent(new Event("harvestnearu-profile-updated"));
    } catch (reason) { setError((reason as Error).message); } finally { setAvatarBusy(false); event.currentTarget.value = ""; }
  }
  async function upgradeToFarmer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "farm", ...values }) });
      const result = await response.json() as { user?: CurrentUser; error?: string };
      if (!response.ok || !result.user) throw new Error(result.error || "Could not upgrade account");
      setUpgradeOpen(false); onUpgraded(result.user);
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }
  if (error && !data) return <main className="profile-page"><div className="empty-state"><X size={28}/><h3>Profile unavailable</h3><p>{error}</p></div></main>;
  if (!data) return <DataLoading/>;
  const name = `${data.user.first_name} ${data.user.last_name}`;
  const initials = `${data.user.first_name[0] || ""}${data.user.last_name[0] || ""}`;
  return <main className="profile-page" aria-busy={Boolean(switchingFarmId)}>
    {switchingFarmId && <div className="farm-switch-loading" role="status" aria-live="polite"><span><LoaderCircle size={20}/></span><div><strong>Loading farm information</strong><small>Please wait while we update this profile.</small></div></div>}
    <header className="profile-heading"><div><p className="eyebrow"><span/> {role.toUpperCase()} ACCOUNT</p><h1>My profile</h1><p>Manage your identity, preferences, and marketplace activity.</p></div><div className="profile-heading-actions"><label className="profile-photo-upload"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={updateAvatar} disabled={avatarBusy}/><UserRound size={15}/>{avatarBusy ? "Uploading..." : "Change picture"}</label><button className="profile-edit-primary" onClick={() => { setError(""); setEditing(true); }}>Edit profile</button></div></header>
    <section className="profile-identity"><div className="identity-cover consumer-cover"><img src={role === "farmer" ? "/produce/fresh-sweet-corn.webp" : "/produce/garden-fresh-spinach.webp"} alt="Fresh produce"/><div/></div><div className="identity-row"><span className={`profile-avatar ${data.user.avatar_url ? "has-photo" : ""}`}>{data.user.avatar_url ? <img src={data.user.avatar_url} alt={name}/> : initials}</span><div><span className="verified-label"><Check size={11}/> {role === "farmer" ? data.farm?.verification_status || "pending" : data.user.email_verified_at ? "Verified customer" : "Customer account"}</span><h2>{role === "farmer" ? data.farm?.name || name : name}</h2><p><MapPin size={13}/> {role === "farmer" ? `${data.farm?.city || ""}, ${data.farm?.state || ""}` : data.addresses[0] ? `${data.addresses[0].city}, ${data.addresses[0].state}` : "Add your delivery address"} · Member since {new Date(data.user.created_at).getFullYear()}</p></div></div></section>
    <section className="profile-stats"><div><ShoppingBag size={18}/><strong>{data.stats.total_orders}</strong><span>Total orders</span></div><div><Leaf size={18}/><strong>{role === "farmer" ? data.listings?.length || 0 : data.stats.farms_supported}</strong><span>{role === "farmer" ? "Produce listings" : "Farms supported"}</span></div><div><PackageCheck size={18}/><strong>{role === "farmer" ? data.farmStats?.fulfilled_orders || 0 : data.stats.completed_orders}</strong><span>Completed orders</span></div><div><Star size={18}/><strong>{role === "farmer" ? Number(data.farm?.average_rating || 0).toFixed(1) : data.addresses.length}</strong><span>{role === "farmer" ? "Farm rating" : "Saved addresses"}</span></div></section>
    <section className="profile-credit"><header><span><AtSign size={20}/></span><div><p className="eyebrow">ACCOUNT CREDIT</p><h2>{money(Number(data.storeCredit.balance_kobo) / 100)}</h2><small>Automatically applied to your next eligible purchase.</small></div></header><div className="credit-ledger"><div className="profile-panel-head"><div><h3>Recent credit activity</h3><p>Refund credits and marketplace purchases.</p></div></div>{data.storeCredit.transactions.length ? data.storeCredit.transactions.map((transaction) => <article key={transaction.id}><span className={Number(transaction.amount_kobo) > 0 ? "credit" : "debit"}>{Number(transaction.amount_kobo) > 0 ? <Plus size={14}/> : <Minus size={14}/>}</span><div><strong>{transaction.description}</strong><small>{new Date(transaction.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</small></div><b className={Number(transaction.amount_kobo) > 0 ? "credit" : "debit"}>{Number(transaction.amount_kobo) > 0 ? "+" : "-"}{money(Math.abs(Number(transaction.amount_kobo)) / 100)}</b></article>) : <div className="credit-empty">No account credit activity yet.</div>}</div></section>
    {role === "consumer" ? <><div className="profile-live-grid"><section className="profile-contact"><div className="profile-panel-head"><h3>Personal information</h3><span>PRIVATE</span></div><dl className="profile-data-list"><div><dt>Full name</dt><dd>{name}</dd></div><div><dt>Email</dt><dd>{data.user.email}</dd></div><div><dt>Phone</dt><dd>{data.user.phone || "Not added"}</dd></div><div><dt>Preferred radius</dt><dd>{Number(data.preferences?.preferred_radius_km || 20)} km</dd></div></dl></section><section className="address-section"><div className="profile-panel-head"><div><h3>Delivery addresses</h3><p>Addresses saved to your account.</p></div></div><div className="address-list">{data.addresses.length ? data.addresses.map((address) => <article key={address.id}><span><MapPin size={18}/></span><div><strong>{address.label}</strong><p>{address.line1}, {address.city}, {address.state}</p><small>{address.is_default ? "Primary address" : "Saved address"}</small></div></article>) : <div className="panel-empty">No delivery address saved yet.</div>}</div></section></div><section className="farmer-upgrade-card"><span><Store size={21}/></span><div><p className="eyebrow">SELL ON HARVESTNEARU</p><h2>Do you also grow or sell produce?</h2><p>Upgrade this account to manage farms while keeping your orders, saved produce, and customer history.</p></div><button onClick={() => { setError(""); setUpgradeOpen(true); }}>Become a farmer <ArrowRight size={16}/></button></section></> : <><section className="profile-farm-switcher"><div><p className="eyebrow">YOUR FARMS</p><h2>Farm profiles</h2><p>Select a farm to view and edit its information, listings, and performance.</p></div><div>{data.farms?.map((farm) => <button key={farm.id} className={data.farm?.id === farm.id ? "active" : ""} onClick={() => { setError(""); void loadProfile(farm.id); }}><span><Store size={16}/></span><strong>{farm.name}</strong><small>{farm.city}, {farm.state}</small>{farm.verification_status === "verified" ? <BadgeCheck size={16} aria-label="Verified"/> : <i className={farm.verification_status}>{farm.verification_status}</i>}</button>)}</div></section><div className="profile-live-grid"><section className="farm-about"><div className="profile-panel-head"><div><h3>About the farm</h3><p>Public farm information · {data.farms?.length || 1} farms on this account.</p></div><button onClick={onFarmer}>Open workspace</button></div><p>{data.farm?.description || "Add a description so customers can learn about your farm."}</p><dl className="profile-data-list"><div><dt>Location</dt><dd>{data.farm?.address_text}, {data.farm?.city}, {data.farm?.state}</dd></div><div><dt>Delivery radius</dt><dd>{Number(data.farm?.delivery_radius_km || 0)} km</dd></div><div><dt>Fulfilment</dt><dd>{[data.farm?.offers_pickup && "Pickup", data.farm?.offers_delivery && "Delivery"].filter(Boolean).join(" and ") || "Not configured"}</dd></div></dl></section><section className="farm-produce"><div className="profile-panel-head"><div><h3>Current harvests</h3><p>Your latest database listings.</p></div><button onClick={onFarmer}><Plus size={14}/> Manage listings</button></div><div>{data.listings?.length ? data.listings.map((listing) => <article key={listing.id}>{listing.image_url ? <img src={listing.image_url} alt=""/> : <span className="profile-listing-placeholder"><Leaf size={18}/></span>}<div><span>{listing.status}</span><strong>{listing.title}</strong><p>{Number(listing.quantity_available)} {listing.unit}s remaining</p><small>{money(Number(listing.unit_price_kobo) / 100)} / {listing.unit}</small></div></article>) : <div className="panel-empty">No listings yet.</div>}</div></section></div></>}
    <div className="profile-page-actions"><button onClick={onShop}><ShoppingBag size={16}/> Browse produce</button>{role === "farmer" && <button onClick={onFarmer}><Store size={16}/> Farmer workspace</button>}</div>
    {editing && <div className="modal-overlay" onMouseDown={() => setEditing(false)}><div className="admin-add-modal profile-edit-modal" onMouseDown={(event) => event.stopPropagation()}><button className="close-modal" onClick={() => setEditing(false)}><X size={19}/></button><p className="auth-kicker">ACCOUNT DETAILS</p><h2>Edit profile</h2><form onSubmit={saveProfile}><div className="form-row"><label>First name<input name="firstName" defaultValue={data.user.first_name} required/></label><label>Last name<input name="lastName" defaultValue={data.user.last_name} required/></label></div><label>Email<input name="email" type="email" defaultValue={data.user.email} required/></label><label>Phone<input name="phone" defaultValue={data.user.phone || ""}/></label>{role === "consumer" ? <><label>Preferred distance (km)<input name="preferredRadius" type="number" min="1" defaultValue={Number(data.preferences?.preferred_radius_km || 20)}/></label><label className="admin-check"><input name="marketingConsent" type="checkbox" value="true" defaultChecked={Boolean(data.preferences?.marketing_consent)}/> Receive marketplace updates</label></> : data.farm && <><input type="hidden" name="farmId" value={data.farm.id}/><label>Farm name<input name="farmName" defaultValue={data.farm.name} required/></label><label>Farm description<textarea name="description" defaultValue={data.farm.description || ""}/></label><div className="form-row"><label>Farm phone<input name="farmPhone" defaultValue={data.farm.phone} required/></label><label>Farm email<input name="farmEmail" type="email" defaultValue={data.farm.email || ""}/></label></div><label>Farm address<input name="address" defaultValue={data.farm.address_text} required/></label><div className="form-row"><label>City<input name="city" defaultValue={data.farm.city} required/></label><label>State<input name="state" defaultValue={data.farm.state} required/></label></div><label>Delivery radius (km)<input name="deliveryRadius" type="number" min="0" defaultValue={Number(data.farm.delivery_radius_km)}/></label><div className="profile-checks"><label><input name="offersPickup" type="checkbox" value="true" defaultChecked={data.farm.offers_pickup}/> Farm pickup</label><label><input name="offersDelivery" type="checkbox" value="true" defaultChecked={data.farm.offers_delivery}/> Delivery</label></div></>}{error && <p className="admin-error">{error}</p>}<button className="admin-submit" disabled={busy}>{busy ? "Saving..." : "Save profile"}</button></form></div></div>}
    {upgradeOpen && <div className="modal-overlay" onMouseDown={() => setUpgradeOpen(false)}><div className="admin-add-modal" onMouseDown={(event) => event.stopPropagation()}><button className="close-modal" onClick={() => setUpgradeOpen(false)}><X size={19}/></button><p className="auth-kicker">FARMER UPGRADE</p><h2>Add your first farm</h2><p>Your existing customer activity stays on this account.</p><form onSubmit={upgradeToFarmer}><label>Farm or business name<input name="name" required/></label><label>Farm address or area<input name="location" placeholder="Kuje, Abuja" required/></label><label>Farm phone<input name="phone" defaultValue={data.user.phone || ""} required/></label><FarmCoordinateFields/>{error && <p className="admin-error">{error}</p>}<button className="admin-submit" disabled={busy}>{busy ? "Upgrading account..." : "Upgrade and add farm"}</button></form></div></div>}
  </main>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ProfilePage({ products, role }: { products: Product[]; role: "consumer" | "farmer" }) {
  const [editing, setEditing] = useState(false);
  if (!products.length) return <DataLoading />;
  return <main className="profile-page">
    <header className="profile-heading"><div><p className="eyebrow"><span /> {role.toUpperCase()} ACCOUNT</p><h1>My profile</h1><p>Manage your identity, preferences, and HarvestNearU activity.</p></div></header>

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
          <section className="preference-section"><div className="profile-panel-head"><div><h3>Shopping preferences</h3><p>These improve recommendations without hiding other produce.</p></div><button>Edit</button></div><div className="preference-tags"><span>Vegetables</span><span>Fruits</span><span>Within about 2 hours&apos; walk</span><span>Available today</span><span>Farmer delivery</span></div></section>
          <section className="saved-preview"><div className="profile-panel-head"><div><h3>Saved harvests</h3><p>Produce you want to find again.</p></div><button>View all <ArrowRight size={14}/></button></div><div>{products.slice(0,3).map(product=><article key={product.id}><img src={product.image} alt={product.name}/><span title={`${product.distance} km straight-line distance`}>{walkingTime(product.distance)}</span><strong>{product.name}</strong><small>{money(product.price)} / {product.unit}</small></article>)}</div></section>
        </div>
      </div>
    </div> : <div className="farmer-profile">
      <section className="farm-identity">
        <div className="farm-cover"><img src="/produce/fresh-sweet-corn.webp" alt="Adebayo Family Farm produce"/><div/></div>
        <div className="farm-identity-row"><span className="farm-avatar"><img src="/brand/harvestnearu-approved-mark.png" alt="Farm profile"/></span><div><span className="verified-label"><Check size={11}/> Verified farmer</span><h2>Adebayo Family Farm</h2><p title="2.4 km straight-line distance"><MapPin size={13}/> Kuje, Abuja · {walkingTime(2.4)} from Gudu</p></div><button onClick={() => setEditing((value) => !value)}>{editing ? "Save farm profile" : "Edit farm profile"}</button></div>
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

type CustomerOrder = {
  id: string; order_number: string; status: string; total_kobo: number; subtotal_kobo: number; discount_kobo: number;
  delivery_fee_kobo: number; fulfilment_method: string; delivery_address_snapshot: { city?: string; state?: string } | null;
  placed_at: string; delivered_at: string | null;
  receipt_submitted: boolean; payment_status: string | null;
  refund: null | { status: string; resolution_method: "bank_refund" | "store_credit"; amount_kobo: number; cancellation_fee_kobo: number; requested_at: string };
  tracking: null | { id: string; status: string; tracking_code: string; courier_name: string | null; courier_phone: string | null; scheduled_date: string | null; window_start: string | null; window_end: string | null; events: Array<{ id: string; status: string; message: string; occurred_at: string }> };
  farms: Array<{ id: string; name: string; rating: number | null; comment: string | null }>;
  items: Array<{ id: string; name: string; farm: string; unit: string; quantity: number; unit_price_kobo: number; image: string | null; status: string; preparing_at: string | null; ready_at: string | null; dispatched_at: string | null; received_at: string | null; updated_at: string }>;
};

function CustomerOrderCard({ order, active, expanded, receiptBusy, onToggle, onUpload, onCancel, onConfirm, onRating }: { order: CustomerOrder; active: boolean; expanded: boolean; receiptBusy: boolean; onToggle: () => void; onUpload: (file: File | undefined) => void; onCancel: () => void; onConfirm: (item: CustomerOrder["items"][number]) => void; onRating: (farm: CustomerOrder["farms"][number]) => void }) {
  const statusOrder = ["confirmed", "preparing", "ready", "dispatched", "delivered", "collected"];
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  function toggleOrder() {
    setExpandedItems(expanded ? [] : order.items.map((item) => item.id));
    onToggle();
  }
  function toggleItem(itemId: string) {
    transitionUpdate(() => setExpandedItems((current) => current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]));
  }
  return <article className="database-order combined-order">
    <div className="database-order-summary combined-order-summary"><button className="order-summary-main" onClick={toggleOrder} aria-expanded={expanded}><span className={`status-pill ${order.status}`}><i/> {order.status.replaceAll("_", " ")}</span><span><strong>Order #{order.order_number}</strong><small>{new Date(order.placed_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })} · {order.items.length} {order.items.length === 1 ? "item" : "items"}</small></span><b>{money(Number(order.total_kobo) / 100)}</b></button><button className="order-expand-button" onClick={toggleOrder} aria-expanded={expanded} aria-label={`${expanded ? "Collapse" : "Expand"} order ${order.order_number}`}><ChevronDown className={expanded ? "open" : ""} size={19}/></button></div>
    {order.refund && <section className="order-refund-status"><span><RotateCcw size={18}/></span><div><strong>{order.refund.resolution_method === "store_credit" ? "Account credit" : "Bank refund"} · {order.refund.status.replaceAll("_", " ")}</strong><p>{money(Number(order.refund.amount_kobo) / 100)}{Number(order.refund.cancellation_fee_kobo) ? ` after ${money(Number(order.refund.cancellation_fee_kobo) / 100)} fee` : " · No cancellation fee"}</p></div></section>}
    {active && order.status === "pending_payment" && <section className="manual-payment-status"><span><Clock3 size={20}/></span><div><strong>{order.receipt_submitted ? "Payment receipt under review" : "Payment receipt required"}</strong><p>{order.receipt_submitted ? "An administrator is checking your transfer." : "Upload your bank-transfer receipt to continue this order."}</p></div><div className="manual-payment-actions">{order.receipt_submitted ? <><a href={`/api/payments/manual/${order.id}`} target="_blank" rel="noreferrer">View receipt</a><button onClick={onCancel}>Cancel order</button></> : <label className={receiptBusy ? "busy" : ""}><input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" disabled={receiptBusy} onChange={(event) => onUpload(event.target.files?.[0])}/>{receiptBusy ? "Uploading..." : "Upload receipt"}</label>}</div></section>}
    {active && <div className={`order-detail-collapse active-product-tracking ${expanded ? "open" : ""}`} aria-hidden={!expanded}><div><section className="live-tracking">
      <header><span><Truck size={18}/></span><div><small>PRODUCT TRACKING</small><strong>{order.items.length} individual {order.items.length === 1 ? "journey" : "journeys"}</strong></div><b>{order.tracking?.tracking_code || order.fulfilment_method.replaceAll("_", " ")}</b></header>
      <div className="item-tracking-list">{order.items.map((item) => {
        const itemSteps = ["confirmed","preparing","ready",...(order.fulfilment_method === "doorstep" ? ["dispatched"] : []),"received"];
        const received = ["delivered","collected"].includes(item.status);
        const itemIndex = received ? itemSteps.length - 1 : statusOrder.indexOf(item.status);
        const canConfirmItem = order.fulfilment_method === "doorstep" ? item.status === "dispatched" : ["ready","dispatched"].includes(item.status);
        const itemOpen = expandedItems.includes(item.id);
        return <article className={received ? "received" : ""} key={item.id}>
          <div className="item-tracking-heading"><button className="item-tracking-main" onClick={() => toggleItem(item.id)} aria-expanded={itemOpen}>{item.image ? <img src={item.image} alt=""/> : <span><Leaf size={17}/></span>}<p><strong>{item.name}</strong><small>{item.farm} · {item.quantity} {item.unit}</small></p><div className="item-tracking-meta"><strong>{money(Number(item.unit_price_kobo) * Number(item.quantity) / 100)}</strong><b className={`status-badge ${item.status}`}>{received ? "received" : item.status.replaceAll("_", " ")}</b></div></button><button className="item-expand-button" onClick={() => toggleItem(item.id)} aria-expanded={itemOpen} aria-label={`${itemOpen ? "Hide" : "Show"} tracking progress for ${item.name}`}><ChevronDown className={itemOpen ? "open" : ""} size={18}/></button></div>
          <div className={`item-progress-collapse ${itemOpen ? "open" : ""}`} aria-hidden={!itemOpen}><div><div className="item-tracking-progress">{itemSteps.map((status, index) => { const complete = itemIndex >= index; return <div className={complete ? "complete" : ""} key={status}><span>{complete ? <Check size={11}/> : index + 1}</span><small>{status === "dispatched" ? "On the way" : status}</small>{index < itemSteps.length - 1 && <i/>}</div>; })}</div>
          <div className="item-receipt-row"><p className="item-tracking-time">Last updated {new Date(item.updated_at || order.placed_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</p>{canConfirmItem && <button onClick={() => onConfirm(item)} disabled={receiptBusy}><PackageCheck size={14}/>{receiptBusy ? "Confirming..." : `I received ${item.name}`}</button>}{received && <span><Check size={13}/> Receipt confirmed</span>}</div></div></div>
        </article>;
      })}</div>
      {order.tracking?.events?.length ? <div className="tracking-events">{order.tracking.events.map((event) => <div key={event.id}><span/><p><strong>{event.message}</strong><small>{new Date(event.occurred_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</small></p></div>)}</div> : <p className="tracking-note">Confirm each product only after it reaches you. Feedback becomes available when all products are received.</p>}
    </section></div></div>}
    <div className={`order-detail-collapse ${expanded ? "open" : ""}`} aria-hidden={!expanded}><div><div className="database-order-detail">{!active && <div className="database-order-items">{order.items.map((item) => <div key={item.id}>{item.image ? <img src={item.image} alt=""/> : <span><Leaf size={18}/></span>}<p><strong>{item.name}</strong><small>{item.quantity} {item.unit} · {item.farm}</small></p><b>{money(Number(item.unit_price_kobo) * Number(item.quantity) / 100)}</b></div>)}</div>}{!active && <div className="order-farm-ratings">{order.farms.map((farm) => <div key={farm.id}><span><strong>{farm.name}</strong><small>{farm.rating ? `Your rating: ${farm.rating}/5` : "Share your experience with this farm"}</small></span><button onClick={() => onRating(farm)}><Star size={14} fill={farm.rating ? "currentColor" : "none"}/> {farm.rating ? "Edit rating" : "Rate farm"}</button></div>)}</div>}<div className="database-order-meta"><span><small>FULFILMENT</small><strong>{order.fulfilment_method.replaceAll("_", " ")}</strong></span><span><small>DELIVERY</small><strong>{money(Number(order.delivery_fee_kobo) / 100)}</strong></span><span><small>TOTAL</small><strong>{money(Number(order.total_kobo) / 100)}</strong></span></div></div></div></div>
    <div className="database-order-meta persistent-order-summary"><span><small>FULFILMENT</small><strong>{order.fulfilment_method.replaceAll("_", " ")}</strong></span><span><small>DELIVERY</small><strong>{money(Number(order.delivery_fee_kobo) / 100)}</strong></span><span><small>TOTAL</small><strong>{money(Number(order.total_kobo) / 100)}</strong></span></div>
  </article>;
}

function DatabaseOrdersPage({ onShop, onHelp }: { onShop: () => void; onHelp: () => void }) {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [tab, setTab] = useState<"active" | "past">("active");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ratingTarget, setRatingTarget] = useState<{ orderId: string; farm: CustomerOrder["farms"][number] } | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [receiptBusy, setReceiptBusy] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<CustomerOrder | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [refundBank, setRefundBank] = useState({ bankName: "", accountName: "", accountNumber: "" });
  function openRating(target: { orderId: string; farm: CustomerOrder["farms"][number] }) {
    setError("");
    setRatingValue(Number(target.farm.rating) || 0);
    setHoverRating(0);
    setRatingTarget(target);
  }
  async function refreshOrders() {
    const response = await fetch("/api/orders", { cache: "no-store" });
    const result = await response.json() as { orders?: CustomerOrder[]; error?: string };
    if (!response.ok || !result.orders) throw new Error(result.error || "Could not load orders");
    setOrders(result.orders);
  }
  useEffect(() => {
    fetch("/api/orders", { cache: "no-store" }).then(async (response) => {
      const result = await response.json() as { orders?: CustomerOrder[]; error?: string };
      if (!response.ok || !result.orders) throw new Error(result.error || "Could not load orders");
      setOrders(result.orders);
    }).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false));
  }, []);
  async function submitRating(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!ratingTarget) return;
    setRatingBusy(true); setError("");
    try {
      if (!ratingValue) throw new Error("Select a star rating");
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, orderId: ratingTarget.orderId, farmId: ratingTarget.farm.id, rating: ratingValue }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not save rating");
      setRatingTarget(null); await refreshOrders();
    } catch (reason) { setError((reason as Error).message); } finally { setRatingBusy(false); }
  }
  async function confirmReceipt(order: CustomerOrder, item?: CustomerOrder["items"][number]) {
    if (!item) return;
    setReceiptBusy(order.id); setError("");
    try {
      const response = await fetch("/api/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: order.id, itemId: item.id, action: "confirm_item_receipt" }) });
      const result = await response.json() as { error?: string; completed?: boolean };
      if (!response.ok) throw new Error(result.error || "Could not confirm receipt");
      await refreshOrders();
      if (result.completed) {
        setTab("past");
        setExpanded(order.id);
        const unratedFarm = order.farms.find((farm) => !farm.rating) || order.farms[0];
        if (unratedFarm) openRating({ orderId: order.id, farm: unratedFarm });
      }
    } catch (reason) { setError((reason as Error).message); } finally { setReceiptBusy(null); }
  }
  async function uploadPaymentReceipt(orderId: string, file: File | undefined) {
    if (!file) return;
    setReceiptBusy(orderId); setError("");
    try {
      const form = new FormData(); form.set("receipt", file);
      const response = await fetch(`/api/payments/manual/${orderId}`, { method: "POST", body: form });
      const result = await readJsonResponse<{ error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "Could not submit payment receipt");
      await refreshOrders();
    } catch (reason) { setError((reason as Error).message); } finally { setReceiptBusy(null); }
  }
  async function cancelPendingOrder(resolutionMethod: "bank_refund" | "store_credit") {
    if (!cancelTarget) return;
    setCancelBusy(true); setError("");
    try {
      const response = await fetch("/api/orders/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: cancelTarget.id, resolutionMethod, ...refundBank }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not cancel the order");
      setCancelTarget(null); await refreshOrders();
    } catch (reason) { setError((reason as Error).message); } finally { setCancelBusy(false); }
  }
  if (loading) return <DataLoading />;
  if (error) return <main className="my-orders-page"><div className="empty-state"><X size={28}/><h3>Could not load your orders</h3><p>{error}</p></div></main>;
  const pastStatuses = ["delivered", "collected", "cancelled", "refunded"];
  const active = orders.filter((order) => !pastStatuses.includes(order.status));
  const past = orders.filter((order) => pastStatuses.includes(order.status));
  const shown = tab === "active" ? active : past;
  const farmsSupported = new Set(orders.flatMap((order) => order.items.map((item) => item.farm))).size;
  return <main className="my-orders-page">
    <header className="orders-heading"><div><p className="eyebrow"><span/> YOUR PURCHASES</p><h1>My orders</h1><p>Follow your fresh produce from farm gate to fulfilment.</p></div><button onClick={onShop}><Plus size={17}/> Shop more produce</button></header>
    <section className="order-overview"><div><span className="overview-icon moving"><Truck size={20}/></span><p><strong>{active.filter((order) => ["dispatched"].includes(order.status)).length}</strong><small>On the way</small></p></div><div><span className="overview-icon"><Clock3 size={20}/></span><p><strong>{active.filter((order) => ["confirmed","paid","preparing","ready"].includes(order.status)).length}</strong><small>In progress</small></p></div><div><span className="overview-icon"><PackageCheck size={20}/></span><p><strong>{past.filter((order) => ["delivered","collected"].includes(order.status)).length}</strong><small>Completed</small></p></div><div className="impact"><Leaf size={20}/><p><strong>{farmsSupported} farms</strong><small>supported locally</small></p></div></section>
    <div className="orders-toolbar"><div className="order-tabs"><button className={tab === "active" ? "selected" : ""} onClick={() => setTab("active")}>Active orders <b>{active.length}</b></button><button className={tab === "past" ? "selected" : ""} onClick={() => setTab("past")}>Order history <b>{past.length}</b></button></div><button className="order-help" onClick={onHelp} aria-label="Open Help Centre"><Headphones size={16}/> Need help?</button></div>
    {shown.length > 0 && <div className="combined-orders">{shown.map((order) => <CustomerOrderCard key={order.id} order={order} active={tab === "active"} expanded={expanded === order.id} receiptBusy={receiptBusy === order.id} onToggle={() => transitionUpdate(() => setExpanded((current) => current === order.id ? null : order.id))} onUpload={(file) => void uploadPaymentReceipt(order.id, file)} onCancel={() => { setError(""); setCancelTarget(order); }} onConfirm={(item) => void confirmReceipt(order, item)} onRating={(farm) => openRating({ orderId: order.id, farm })}/>)}</div>}
    {shown.filter((order) => order.refund).map((order) => <section className="order-refund-status" key={`refund-${order.id}`}><span><RotateCcw size={18}/></span><div><strong>{order.refund!.resolution_method === "store_credit" ? "Account credit" : "Bank refund"} · {order.refund!.status.replaceAll("_", " ")}</strong><p>Order #{order.order_number} · {money(Number(order.refund!.amount_kobo) / 100)}{Number(order.refund!.cancellation_fee_kobo) ? ` after ${money(Number(order.refund!.cancellation_fee_kobo) / 100)} fee` : " · No cancellation fee"}</p></div></section>)}
    {tab === "active" && active.filter((order) => order.status === "pending_payment").map((order) => <section className="manual-payment-status" key={`payment-${order.id}`}><span><Clock3 size={20}/></span><div><strong>{order.receipt_submitted ? "Payment receipt under review" : "Payment receipt required"}</strong><p>{order.receipt_submitted ? `An administrator is checking the transfer for order #${order.order_number}.` : `Upload your bank-transfer receipt to continue order #${order.order_number}.`}</p></div><div className="manual-payment-actions">{order.receipt_submitted ? <><a href={`/api/payments/manual/${order.id}`} target="_blank" rel="noreferrer">View receipt</a><button onClick={() => { setError(""); setCancelTarget(order); }}>Cancel order</button></> : <label className={receiptBusy === order.id ? "busy" : ""}><input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" disabled={receiptBusy === order.id} onChange={(event) => void uploadPaymentReceipt(order.id, event.target.files?.[0])}/>{receiptBusy === order.id ? "Uploading..." : "Upload receipt"}</label>}</div></section>)}
    {tab === "active" && active.map((order) => <section className="live-tracking" key={`tracking-${order.id}`}><header><span><Truck size={18}/></span><div><small>ORDER TRACKING</small><strong>#{order.order_number}</strong></div><b>{order.tracking?.tracking_code || order.fulfilment_method.replaceAll("_", " ")}</b></header><div className="tracking-progress">{["confirmed","preparing","ready",...(order.fulfilment_method === "doorstep" ? ["dispatched"] : [])].map((status, index, steps) => { const statuses = ["confirmed","preparing","ready","dispatched","delivered","collected"]; const complete = statuses.indexOf(order.status) >= statuses.indexOf(status); return <div className={complete ? "complete" : ""} key={status}><span>{complete ? <Check size={13}/> : index + 1}</span><strong>{status === "dispatched" ? "On the way" : status}</strong>{index < steps.length - 1 && <i/>}</div>; })}</div>{order.tracking?.events?.length ? <div className="tracking-events">{order.tracking.events.map((event) => <div key={event.id}><span/><p><strong>{event.message}</strong><small>{new Date(event.occurred_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</small></p></div>)}</div> : <p className="tracking-note">Updates will appear here as the farm prepares your order.</p>}{((order.fulfilment_method === "doorstep" && order.status === "dispatched") || (["farm_pickup","collection_hub"].includes(order.fulfilment_method) && ["ready","dispatched"].includes(order.status))) && <div className="receipt-confirm"><div><PackageCheck size={20}/><span><strong>Have you received your produce?</strong><small>Confirm only after checking your complete order.</small></span></div><button onClick={() => confirmReceipt(order)} disabled={receiptBusy === order.id}>{receiptBusy === order.id ? "Confirming..." : "I received my produce"}</button></div>}</section>)}
    {shown.length ? <div className="database-orders">{shown.map((order) => <article className="database-order" key={order.id}><button className="database-order-summary" onClick={() => setExpanded((current) => current === order.id ? null : order.id)}><span className={`status-pill ${order.status}`}><i/> {order.status.replaceAll("_", " ")}</span><span><strong>Order #{order.order_number}</strong><small>{new Date(order.placed_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })} · {order.items.length} {order.items.length === 1 ? "item" : "items"}</small></span><b>{money(Number(order.total_kobo) / 100)}</b><ChevronDown className={expanded === order.id ? "open" : ""} size={18}/></button>{expanded === order.id && <div className="database-order-detail"><div className="database-order-items">{order.items.map((item) => <div key={item.id}>{item.image ? <img src={item.image} alt=""/> : <span><Leaf size={18}/></span>}<p><strong>{item.name}</strong><small>{item.quantity} {item.unit} · {item.farm}</small></p><b>{money(Number(item.unit_price_kobo) * Number(item.quantity) / 100)}</b></div>)}</div>{pastStatuses.includes(order.status) && <div className="order-farm-ratings">{order.farms.map((farm) => <div key={farm.id}><span><strong>{farm.name}</strong><small>{farm.rating ? `Your rating: ${farm.rating}/5` : "Share your experience with this farm"}</small></span><button onClick={() => openRating({ orderId: order.id, farm })}><Star size={14} fill={farm.rating ? "currentColor" : "none"}/> {farm.rating ? "Edit rating" : "Rate farm"}</button></div>)}</div>}<div className="database-order-meta"><span><small>FULFILMENT</small><strong>{order.fulfilment_method.replaceAll("_", " ")}</strong></span><span><small>DELIVERY</small><strong>{money(Number(order.delivery_fee_kobo) / 100)}</strong></span><span><small>TOTAL</small><strong>{money(Number(order.total_kobo) / 100)}</strong></span></div></div>}</article>)}</div> : <section className="orders-empty"><div className="orders-empty-visual" aria-hidden="true"><span><Leaf size={18}/></span><span><ShoppingBag size={31}/></span><span><MapPin size={16}/></span></div><p className="eyebrow">{tab === "active" ? "YOUR BASKET IS READY" : "YOUR HARVEST JOURNEY"}</p><h3>{tab === "active" ? "Nothing on the way just yet." : "Your order history starts here."}</h3><p>{tab === "active" ? "Choose fresh produce from nearby farms and follow every step from confirmation to your doorstep." : "Completed, collected, and resolved orders will be kept here for easy reference."}</p><button onClick={onShop}><Leaf size={16}/> Browse nearby harvests <ArrowRight size={16}/></button><div className="orders-empty-benefits"><span><Check size={12}/> Verified farms</span><span><LocateFixed size={12}/> Proximity ranked</span><span><PackageCheck size={12}/> Track every order</span></div></section>}
    {ratingTarget && <div className="modal-overlay" onMouseDown={() => setRatingTarget(null)}><div className="payment-modal rating-modal" onMouseDown={(event) => event.stopPropagation()}><button className="close-modal" onClick={() => setRatingTarget(null)}><X size={19}/></button><p className="auth-kicker">FARM RATING</p><h2>Rate {ratingTarget.farm.name}</h2><p>Your rating helps nearby customers choose confidently.</p><form onSubmit={submitRating}><fieldset className="star-rating" onMouseLeave={() => setHoverRating(0)}><legend>Your rating</legend>{[1,2,3,4,5].map((value) => <label key={value} className={value <= (hoverRating || ratingValue) ? "selected" : ""} onMouseEnter={() => setHoverRating(value)}><input type="radio" name="rating" value={value} checked={ratingValue === value} onChange={() => setRatingValue(value)} required/><Star size={28} fill="currentColor"/><span>{value} {value === 1 ? "star" : "stars"}</span></label>)}</fieldset><p className="rating-selection" aria-live="polite">{ratingValue ? `${ratingValue} out of 5 stars selected` : "Select your rating"}</p><label className="rating-comment">Comment<textarea name="comment" maxLength={800} defaultValue={ratingTarget.farm.comment || ""} placeholder="What stood out about the produce or service?"/></label>{error && <p className="auth-error">{error}</p>}<button className="pay-button" disabled={ratingBusy || !ratingValue}>{ratingBusy ? "Saving rating..." : "Submit rating"}</button></form></div></div>}
    {cancelTarget && <div className="modal-overlay" onMouseDown={() => !cancelBusy && setCancelTarget(null)}><div className="payment-modal cancel-order-modal" onMouseDown={(event) => event.stopPropagation()}><button className="close-modal" onClick={() => setCancelTarget(null)} disabled={cancelBusy}><X size={19}/></button><p className="auth-kicker">CANCEL ORDER</p><h2>How should we return your payment?</h2><p>Order #{cancelTarget.order_number} will be cancelled immediately and its produce returned to availability. The selected value is issued after administrator review.</p><div className="cancel-bank-fields"><label>Bank name<input value={refundBank.bankName} onChange={(event) => setRefundBank((current) => ({ ...current, bankName: event.target.value }))} maxLength={120}/></label><label>Account name<input value={refundBank.accountName} onChange={(event) => setRefundBank((current) => ({ ...current, accountName: event.target.value }))} maxLength={160}/></label><label>Account number<input value={refundBank.accountNumber} onChange={(event) => setRefundBank((current) => ({ ...current, accountNumber: event.target.value.replace(/[^0-9 -]/g, "") }))} inputMode="numeric" maxLength={30}/></label></div><div className="cancel-refund-options"><button onClick={() => void cancelPendingOrder("store_credit")} disabled={cancelBusy}><span><AtSign size={19}/></span><strong>Full account credit</strong><small>{money(Number(cancelTarget.total_kobo) / 100)} for future purchases · No fee; bank fields are not required</small></button><button onClick={() => void cancelPendingOrder("bank_refund")} disabled={cancelBusy || Number(cancelTarget.total_kobo) <= 50000 || !refundBank.bankName.trim() || !refundBank.accountName.trim() || refundBank.accountNumber.replace(/[^0-9]/g, "").length < 6}><span><RotateCcw size={19}/></span><strong>Refund to bank</strong><small>{money(Math.max(0, Number(cancelTarget.total_kobo) / 100 - 500))} after the ₦500 cancellation fee</small></button></div>{error && <p className="auth-error" role="alert">{error}</p>}{cancelBusy && <div className="cancel-processing"><LoaderCircle size={17}/> Submitting cancellation...</div>}</div></div>}
  </main>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function OrdersPage({ products, onShop }: { products: Product[]; onShop: () => void }) {
  const [tab, setTab] = useState<"active" | "past">("active");
  if (products.length < 6) return <DataLoading />;
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

// Kept as a visual reference while the database-backed workspace is rolled out.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function FarmerDashboard({ products, onShop }: { products: Product[]; onShop: () => void }) {
  if (!products.length) return <DataLoading />;
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

type FarmerWorkspaceData = {
  user: CurrentUser;
  farm: { id: string; name: string; verification_status: string };
  farms: Array<{ id: string; name: string; verification_status: string; city: string; state: string }>;
  metrics: { today_sales_kobo: number; open_orders: number; available_stock: number; active_listings: number; payout_gross_kobo: number; payout_fee_kobo: number; next_payout_kobo: number; cumulative_gross_kobo: number; cumulative_fee_kobo: number; cumulative_net_kobo: number };
  orders: Array<{ id: string; order_number: string; status: string; placed_at: string; subtotal_kobo: number; farmer_net_kobo: number; customer: string; customer_email: string; customer_phone: string | null; customer_avatar: string | null; items: string; itemTracking: Array<{ id: string; name: string; quantity: number; unit: string; status: string; preparing_at: string | null; ready_at: string | null; dispatched_at: string | null; received_at: string | null; updated_at: string }>; fulfilment_method: string; delivery_address_snapshot: { line1?: string; city?: string; state?: string; landmark?: string } | null; customer_note: string | null; tracking_code: string | null; delivery_status: string | null; window_start: string | null; window_end: string | null }>;
  listings: Array<{ id: string; title: string; unit: string; unit_price_kobo: number; quantity_available: number; quantity_reserved: number; quantity_sold: number; status: string; harvest_date: string; category_id: string; image_url: string | null; stored_image_url: string | null; badge?: string | null }>;
  categories: Array<{ id: string; name: string }>;
};

function ExpandedFarmerOrders({ orders, busy, readOnly, onAdvance }: { orders: FarmerWorkspaceData["orders"]; busy: boolean; readOnly: boolean; onAdvance: (order: FarmerWorkspaceData["orders"][number]) => void }) {
  return <section className="farmer-orders-expanded"><div className="panel-head"><div><h2>Orders to fulfil</h2><p>Customer and delivery information</p></div><span>{orders.length} open</span></div>{orders.length ? orders.map((order) => {
    const address = order.delivery_address_snapshot;
    const pickup = ["farm_pickup","collection_hub"].includes(order.fulfilment_method);
    const nextItem = order.itemTracking.find((item) => ["confirmed","paid","preparing"].includes(item.status) || (item.status === "ready" && !pickup));
    const action = !nextItem ? "Awaiting customer receipt" : ["confirmed","paid"].includes(nextItem.status) ? `Prepare ${nextItem.name}` : nextItem.status === "preparing" ? `Mark ${nextItem.name} ready` : `Dispatch ${nextItem.name}`;
    const actionable = Boolean(nextItem);
    return <article className="fulfilment-card" key={order.id}><header><span className={`fulfilment-avatar ${order.customer_avatar ? "has-photo" : ""}`}>{order.customer_avatar ? <img src={order.customer_avatar} alt=""/> : order.customer.split(" ").map((part) => part[0]).slice(0,2).join("")}</span><div><small>ORDER #{order.order_number}</small><h3>{order.customer}</h3><p>{new Date(order.placed_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</p></div><b className={`status-badge ${order.status}`}>{order.status.replaceAll("_", " ")}</b></header><div className="fulfilment-info"><section><strong><UserRound size={14}/> Customer contact</strong><a href={`mailto:${order.customer_email}`}>{order.customer_email}</a><a href={order.customer_phone ? `tel:${order.customer_phone}` : undefined}>{order.customer_phone || "No phone number provided"}</a></section><section><strong><MapPin size={14}/> {order.fulfilment_method === "doorstep" ? "Delivery address" : "Collection method"}</strong>{address ? <><span>{[address.line1, address.city, address.state].filter(Boolean).join(", ")}</span>{address.landmark && <small>Landmark: {address.landmark}</small>}</> : <span>{order.fulfilment_method.replaceAll("_", " ")}</span>}<small>{order.window_start ? `Window: ${String(order.window_start).slice(0,5)}–${String(order.window_end).slice(0,5)}` : "Coordinate with the customer before handover"}</small></section><section><strong><ShoppingBag size={14}/> Produce</strong><span>{order.items}</span>{order.customer_note && <small>Note: {order.customer_note}</small>}</section><section><strong><Truck size={14}/> Tracking</strong><span>{order.tracking_code || "Pickup order"}</span><small>{order.delivery_status ? order.delivery_status.replaceAll("_", " ") : "Awaiting fulfilment update"}</small></section></div><footer><span>{readOnly ? "Administrator impersonation is read-only. Sign in as this farmer to update fulfilment." : "Customer confirmation is required before this order is completed and added to your payout."}</span><button disabled={readOnly || busy || !actionable} onClick={() => onAdvance(order)}>{readOnly ? "Read-only view" : actionable ? action : <><Clock3 size={14}/> {action}</>}</button></footer></article>;
  }) : <div className="panel-empty">No orders to fulfil.</div>}</section>;
}

function FarmerWorkspace({ onShop }: { onShop: () => void }) {
  const [data, setData] = useState<FarmerWorkspaceData | null>(null);
  const [error, setError] = useState("");
  const [listingOpen, setListingOpen] = useState(false);
  const [farmOpen, setFarmOpen] = useState(false);
  const [manageListing, setManageListing] = useState<FarmerWorkspaceData["listings"][number] | null>(null);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [showAllListings, setShowAllListings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      setGreeting(hour >= 5 && hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : hour < 22 ? "Good evening" : "Welcome back");
    };
    queueMicrotask(updateGreeting);
    const timer = window.setInterval(updateGreeting, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  async function refresh(farmId?: string) {
    const activeFarmId = farmId || data?.farm.id;
    const response = await fetch(`/api/farmer/dashboard${activeFarmId ? `?farmId=${encodeURIComponent(activeFarmId)}` : ""}`, { cache: "no-store" });
    const result = await response.json() as FarmerWorkspaceData & { error?: string };
    if (!response.ok) throw new Error(result.error || "Could not load farmer workspace");
    setData(result);
  }

  async function createFarm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch("/api/farmer/dashboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "farm", ...values }) });
      const result = await response.json() as { farm?: { id: string }; error?: string };
      if (!response.ok || !result.farm) throw new Error(result.error || "Could not add farm");
      setFarmOpen(false); await refresh(result.farm.id);
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }

  useEffect(() => {
    fetch("/api/farmer/dashboard", { cache: "no-store" }).then(async (response) => {
      const result = await response.json() as FarmerWorkspaceData & { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not load farmer workspace");
      setData(result);
    }).catch((reason: Error) => setError(reason.message));
  }, []);

  async function createListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!data) return;
    setBusy(true); setError("");
    let uploadedUrl = "";
    try {
      const form = new FormData(event.currentTarget);
      const image = form.get("image");
      form.delete("image");
      const values = Object.fromEntries(form.entries());
      const imageUrl = image instanceof File && image.size ? await uploadListingImage(image) : "";
      uploadedUrl = imageUrl;
      const response = await fetch("/api/farmer/dashboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, imageUrl, farmId: data.farm.id }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not create listing");
      setListingOpen(false); await refresh();
    } catch (reason) { if (uploadedUrl) void fetch("/api/uploads/listing-image", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: uploadedUrl }) }); setError((reason as Error).message); } finally { setBusy(false); }
  }

  async function advanceOrder(order: FarmerWorkspaceData["orders"][number]) {
    if (data?.user.impersonating) return setError("Administrator impersonation is read-only. Return to administration and sign in as the farmer to update fulfilment.");
    const pickup = ["farm_pickup","collection_hub"].includes(order.fulfilment_method);
    const item = order.itemTracking.find((entry) => ["confirmed","paid","preparing"].includes(entry.status) || (entry.status === "ready" && !pickup));
    const status = !item ? null : item.status === "confirmed" || item.status === "paid" ? "preparing" : item.status === "preparing" ? "ready" : item.status === "ready" && !pickup ? "dispatched" : null;
    if (!status) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/farmer/dashboard", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "item", id: item!.id, status }) });
      const result = await response.json() as { error?: string }; if (!response.ok) throw new Error(result.error || "Could not update order"); await refresh();
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }

  async function updateInventory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!manageListing) return;
    setBusy(true); setError("");
    let uploadedUrl = "";
    try {
      const form = new FormData(event.currentTarget);
      const image = form.get("image");
      form.delete("image");
      const values = Object.fromEntries(form.entries());
      const imageUrl = image instanceof File && image.size ? await uploadListingImage(image) : manageListing.stored_image_url || "";
      if (image instanceof File && image.size) uploadedUrl = imageUrl;
      const response = await fetch("/api/farmer/dashboard", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, imageUrl, type: "listing", id: manageListing.id }) });
      const result = await response.json() as { error?: string }; if (!response.ok) throw new Error(result.error || "Could not update listing"); setManageListing(null); await refresh();
    } catch (reason) { if (uploadedUrl) void fetch("/api/uploads/listing-image", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: uploadedUrl }) }); setError((reason as Error).message); } finally { setBusy(false); }
  }

  if (error && !data) return <main className="farmer-page"><div className="empty-state"><X size={28}/><h3>Farmer workspace unavailable</h3><p>{error}</p></div></main>;
  if (!data) return <DataLoading />;
  const fulfilmentOrders = data.orders.filter((order) => ["paid","confirmed","preparing","ready","dispatched"].includes(order.status));
  const closedOrders = data.orders.filter((order) => ["delivered","collected","cancelled","refunded"].includes(order.status));
  const shownClosedOrders = showAllOrders ? closedOrders : closedOrders.slice(0, 3);
  const listings = showAllListings ? data.listings : data.listings.slice(0, 3);
  return <main className="farmer-page">
    <div className="farmer-heading"><div><button onClick={onShop}><ArrowLeft size={16}/> Marketplace</button><p className="eyebrow"><span/> FARMER WORKSPACE</p><h1>{greeting}, {data.user.firstName}.</h1><p className="active-farm-identity"><span>{data.farm.name}</span>{data.farm.verification_status === "verified" ? <span className="farm-verified-mark" title="Verified farm" aria-label="Verified farm"><BadgeCheck size={18} strokeWidth={2}/></span> : <span className={`farm-verification ${data.farm.verification_status}`}>{data.farm.verification_status}</span>}</p></div><div className="farmer-heading-actions"><label>Active farm<select value={data.farm.id} onChange={(event) => { setError(""); void refresh(event.target.value); }}>{data.farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name} · {farm.verification_status}</option>)}</select></label><button className="add-farm" onClick={() => { setError(""); setFarmOpen(true); }} disabled={Boolean(data.user.impersonating)}><Store size={17}/> Add farm</button><button className="new-listing" onClick={() => { setError(""); setListingOpen(true); }} disabled={Boolean(data.user.impersonating) || data.farm.verification_status !== "verified"}><Plus size={18}/> Add new listing</button></div></div>
    {data.user.impersonating && <div className="farmer-readonly-notice"><Eye size={18}/><span><strong>Read-only administrator preview</strong>Fulfilment, listings, and farm changes are disabled while viewing another user&apos;s account.</span></div>}
    {data.farm.verification_status !== "verified" && <div className="farmer-notice"><Clock3 size={18}/><span><strong>Farm verification required</strong>Your farm must be verified before produce can be published.</span></div>}
    {error && <p className="admin-error" role="alert">{error}</p>}
    <div className="metric-grid"><div><span>Today&apos;s sales</span><strong>{money(Number(data.metrics.today_sales_kobo) / 100)}</strong><small>Net earnings from paid orders</small></div><div><span>Open orders</span><strong>{data.metrics.open_orders}</strong><small>Orders requiring fulfilment</small></div><div><span>Produce listed</span><strong>{Number(data.metrics.available_stock)} <i>units</i></strong><small>Across {data.metrics.active_listings} active listings</small></div><div className="payout-metric"><span>Next payout</span><strong>{money(Number(data.metrics.next_payout_kobo) / 100)}</strong><div className="payout-breakdown"><p><span>Gross sales</span><b>{money(Number(data.metrics.payout_gross_kobo) / 100)}</b></p><p><span>Platform fee (10%)</span><b>-{money(Number(data.metrics.payout_fee_kobo) / 100)}</b></p><p><span>Net payout</span><b>{money(Number(data.metrics.next_payout_kobo) / 100)}</b></p></div><small>Fulfilled orders awaiting settlement</small></div></div>
    <section className="cumulative-sales-card"><div className="cumulative-sales-heading"><span><AtSign size={19}/></span><div><small>CUMULATIVE EARNINGS</small><h2>Lifetime net sales</h2><p>Completed farm orders since joining HarvestNearU.</p></div></div><strong>{money(Number(data.metrics.cumulative_net_kobo) / 100)}</strong><div className="cumulative-sales-breakdown"><span><small>Gross sales processed</small><b>{money(Number(data.metrics.cumulative_gross_kobo) / 100)}</b></span><span className="fees"><small>Processing fees</small><b>-{money(Number(data.metrics.cumulative_fee_kobo) / 100)}</b></span><span className="net"><small>Net sales earned</small><b>{money(Number(data.metrics.cumulative_net_kobo) / 100)}</b></span></div></section>
    <div className="farmer-columns">
      <ExpandedFarmerOrders orders={fulfilmentOrders} busy={busy} readOnly={Boolean(data.user.impersonating)} onAdvance={advanceOrder}/>
      <section className="orders-panel closed-orders-panel"><div className="panel-head"><div><h2>Closed orders</h2><p>Completed, cancelled, and refunded orders</p></div><span>{closedOrders.length} total</span>{closedOrders.length > 3 && <button onClick={() => setShowAllOrders((value) => !value)}>{showAllOrders ? "Show recent" : "View all"} <ArrowRight className={showAllOrders ? "back" : ""} size={15}/></button>}</div>{shownClosedOrders.length ? shownClosedOrders.map((order) => <div className="order-row closed-order-row" key={order.id}><span className="order-icon"><PackageCheck size={18}/></span><div><strong>{order.customer}</strong><p>#{order.order_number} · {order.items}</p></div><small>{new Date(order.placed_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</small><span className={`status-badge ${order.status}`}>{order.status.replaceAll("_", " ")}</span><b>{["delivered","collected"].includes(order.status) ? `${money(Number(order.farmer_net_kobo) / 100)} net` : money(Number(order.subtotal_kobo) / 100)}</b></div>) : <div className="panel-empty">No closed orders yet.</div>}</section>
      <section className="inventory-panel"><div className="panel-head"><div><h2>Inventory pulse</h2><p>Your produce listings</p></div>{data.listings.length > 3 && <button onClick={() => setShowAllListings((value) => !value)}>{showAllListings ? "Show recent" : "View all"} <ArrowRight className={showAllListings ? "back" : ""} size={15}/></button>}</div>{listings.length ? listings.map((listing) => { const available = Number(listing.quantity_available) - Number(listing.quantity_reserved); const total = Number(listing.quantity_available) + Number(listing.quantity_sold); const percent = total ? Math.round(available / total * 100) : 0; return <button className="inventory-row farmer-inventory-row" key={listing.id} onClick={() => { setError(""); setManageListing(listing); }}><span className="inventory-image">{listing.image_url ? <img src={listing.image_url} alt=""/> : <Leaf size={18}/>}</span><div><strong>{listing.title}</strong><p>{available} {listing.unit}s available · {listing.status}</p><span><i style={{ width: `${Math.max(0, percent)}%` }}/></span></div><b>{percent}%</b></button>}) : <div className="panel-empty">No listings yet.</div>}</section>
    </div>
    {listingOpen && <div className="modal-overlay" onMouseDown={() => setListingOpen(false)}><div className="admin-add-modal farmer-listing-modal" onMouseDown={(event) => event.stopPropagation()}><button className="close-modal" onClick={() => setListingOpen(false)}><X size={19}/></button><p className="auth-kicker">NEW HARVEST</p><h2>Add a produce listing</h2><p>Publish available produce from {data.farm.name}.</p><form onSubmit={createListing}><label>Category<select name="categoryId" required><option value="">Select category</option>{data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Produce name<input name="name" required/></label><div className="form-row"><label>Unit<input name="unit" placeholder="basket" required/></label><label>Price (NGN)<input name="price" type="number" min="1" required/></label></div><div className="form-row"><label>Available quantity<input name="stock" type="number" min="1" required/></label><label>Harvest date<input name="harvestDate" type="date" required/></label></div><label>Produce picture<input name="image" type="file" accept="image/png,image/jpeg,image/webp" required/><small>Uploaded securely to Blob. JPG, PNG, or WebP up to 4 MB.</small></label><label>Badge<input name="badge" placeholder="Picked today"/></label>{error && <p className="admin-error">{error}</p>}<button className="admin-submit" disabled={busy}>{busy ? "Uploading and publishing..." : "Publish listing"} {!busy && <ArrowRight size={16}/>}</button></form></div></div>}
    {farmOpen && <div className="modal-overlay" onMouseDown={() => setFarmOpen(false)}><div className="admin-add-modal" onMouseDown={(event) => event.stopPropagation()}><button className="close-modal" onClick={() => setFarmOpen(false)}><X size={19}/></button><p className="auth-kicker">NEW FARM</p><h2>Add another farm</h2><p>Each farm has separate verification, listings, orders, and earnings.</p><form onSubmit={createFarm}><label>Farm or business name<input name="name" required/></label><label>Farm address or area<input name="location" placeholder="Kuje, Abuja" required/></label><label>Farm phone<input name="phone" required/></label><FarmCoordinateFields/>{error && <p className="admin-error">{error}</p>}<button className="admin-submit" disabled={busy}>{busy ? "Adding farm..." : "Add farm for verification"}</button></form></div></div>}
    {manageListing && <div className="modal-overlay" onMouseDown={() => setManageListing(null)}><div className="admin-add-modal farmer-listing-modal" onMouseDown={(event) => event.stopPropagation()}><button className="close-modal" onClick={() => setManageListing(null)}><X size={19}/></button><p className="auth-kicker">EDIT HARVEST</p><h2>{manageListing.title}</h2><p>Update the listing details shown to customers.</p><form onSubmit={updateInventory}><label>Category<select name="categoryId" defaultValue={manageListing.category_id} required>{data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Produce name<input name="name" defaultValue={manageListing.title} required/></label><div className="form-row"><label>Unit<input name="unit" defaultValue={manageListing.unit} required/></label><label>Price (NGN)<input name="price" type="number" min="1" defaultValue={Number(manageListing.unit_price_kobo) / 100} required/></label></div><div className="form-row"><label>Available quantity<input name="stock" type="number" min={Number(manageListing.quantity_reserved)} defaultValue={Number(manageListing.quantity_available)} required/></label><label>Harvest date<input name="harvestDate" type="date" defaultValue={String(manageListing.harvest_date).slice(0, 10)} required/></label></div>{manageListing.image_url && <div className="listing-image-preview"><img src={manageListing.image_url} alt={`Current ${manageListing.title}`}/><span>Current picture</span></div>}<label>Change picture<input name="image" type="file" accept="image/png,image/jpeg,image/webp"/><small>Leave empty to keep the current picture. Maximum 4 MB.</small></label><label>Badge<input name="badge" defaultValue={manageListing.badge || ""} placeholder="Picked today"/></label><label>Listing status<select name="status" defaultValue={manageListing.status === "paused" ? "paused" : "active"}><option value="active">Active</option><option value="paused">Paused</option></select></label>{error && <p className="admin-error">{error}</p>}<button className="admin-submit" disabled={busy}>{busy ? "Saving..." : "Save listing"} {!busy && <ArrowRight size={16}/>}</button></form></div></div>}
  </main>;
}
