"use client";
/* eslint-disable @next/next/no-img-element */

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BadgeCheck,
  Bell,
  Check,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Clock3,
  CreditCard,
  Heart,
  Handshake,
  Headphones,
  House,
  AtSign,
  Leaf,
  LocateFixed,
  LogIn,
  LoaderCircle,
  MapPin,
  Mail,
  MessageCircle,
  Maximize2,
  Minus,
  Moon,
  PackageCheck,
  Plus,
  Printer,
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
import { FormEvent, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

function playNotificationChime(){try{const AudioContextClass=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!AudioContextClass)return;const context=new AudioContextClass();const oscillator=context.createOscillator();const gain=context.createGain();oscillator.frequency.value=740;gain.gain.setValueAtTime(.0001,context.currentTime);gain.gain.exponentialRampToValueAtTime(.12,context.currentTime+.02);gain.gain.exponentialRampToValueAtTime(.0001,context.currentTime+.28);oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+.3);oscillator.addEventListener("ended",()=>void context.close());}catch{}}
import Image from "next/image";
import { usePathname } from "next/navigation";
import { readJsonResponse } from "@/lib/client-api";
import { matchesSearchTerms, searchIntentFallback } from "@/lib/search-intent";
import { NewsletterSignup } from "./NewsletterSignup";

type Product = {
  id: string;
  farmId: string;
  name: string;
  farmer: string;
  location: string;
  distance: number;
  price: number;
  unit: string;
  stock: number;
  sold: number;
  restockTotal: number;
  category: string;
  available: string;
  rating: number;
  reviewCount: number;
  image: string;
  badge?: string;
};

function ModalBrand() {
  return <div className="modal-brand" aria-hidden="true"><img src="/brand/harvestnearu-opaque-seal-se2-lockup.png" alt=""/></div>;
}

function GoogleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a5.8 5.8 0 0 1-5.5-4H3.2v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.5 14.1a6 6 0 0 1 0-4.2V7.3H3.2a10 10 0 0 0 0 9.4l3.3-2.6Z"/><path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 3.2 7.3l3.3 2.6A5.8 5.8 0 0 1 12 5.9Z"/></svg>;
}

function VerificationSeal({ label = "Verified" }: { label?: string }) {
  return <span className="verification-seal" title={label} aria-label={label}><BadgeCheck size={16} strokeWidth={2.4}/></span>;
}

type ManualPaymentSettings = { bank_name: string; account_name: string; account_number: string; instructions: string | null; is_enabled: boolean };

type MarketplaceStats = {
  farms: number;
  listings: number;
  averageRating: number;
  consumers: number;
  farmers: number;
};

const fallbackDeliveryLocations = [
  { name: "Gudu, Abuja", latitude: 9.0019, longitude: 7.4534 },
  { name: "Wuse 2, Abuja", latitude: 9.0765, longitude: 7.4651 },
  { name: "Maitama, Abuja", latitude: 9.0962, longitude: 7.4923 },
  { name: "Gwarinpa, Abuja", latitude: 9.1099, longitude: 7.4042 },
  { name: "Lugbe, Abuja", latitude: 8.9672, longitude: 7.3679 },
  { name: "Kuje, Abuja", latitude: 8.8795, longitude: 7.2276 },
];
type DeliveryLocation = { id?: string; name: string; latitude: number; longitude: number };
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

function deductionMoney(value: number) {
  return value > 0 ? `-${money(value)}` : money(0);
}

function quantityLabel(quantity: number, unit: string) {
  const normalized = unit.trim();
  if (quantity === 1 || !normalized || /\s/.test(normalized) || normalized.endsWith("s")) return `${quantity} ${normalized}`;
  if (/(ch|sh|x|z)$/i.test(normalized)) return `${quantity} ${normalized}es`;
  if (/[^aeiou]y$/i.test(normalized)) return `${quantity} ${normalized.slice(0, -1)}ies`;
  return `${quantity} ${normalized}s`;
}

function listingStatusLabel(status: unknown) {
  const value = String(status || "");
  return value === "sold_out" ? "Out of Stock" : statusLabel(value);
}

function statusLabel(status: unknown) {
  return String(status || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function lagosDateTimeInput(value: unknown) {
  const timestamp = new Date(String(value)).getTime();
  return Number.isFinite(timestamp) ? new Date(timestamp + 60 * 60 * 1000).toISOString().slice(0, 16) : "";
}

function clampCartToStock(cart: Record<string, number>, inventory: Product[]) {
  if (!inventory.length) return cart;
  const stock = new Map(inventory.map((product) => [product.id, product.stock]));
  return Object.fromEntries(Object.entries(cart).flatMap(([id, quantity]) => {
    const available = stock.get(id);
    if (available === undefined || available <= 0) return [];
    return [[id, Math.min(Math.max(1, Math.floor(quantity)), available)]];
  }));
}

function quantityUnit(unit: string, quantity: number) {
  if (Number(quantity) === 1) return unit;
  const normalized = unit.trim().toLowerCase();
  if (["kg", "g", "litre", "litres"].includes(normalized) || normalized.endsWith("s")) return unit;
  if (normalized.endsWith("ch") || normalized.endsWith("sh") || normalized.endsWith("x")) return `${unit}es`;
  if (normalized.endsWith("y") && !/[aeiou]y$/.test(normalized)) return `${unit.slice(0, -1)}ies`;
  return `${unit}s`;
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
  const result = await readJsonResponse(response) as { url?: string; error?: string };
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
  const pathname = usePathname();
  const [products, setProducts] = useState<Product[]>([]);
  const [marketplaceStats, setMarketplaceStats] = useState<MarketplaceStats | null>(null);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(false);
  const [view, setView] = useState<View>(() => viewFromPath(pathname));
  const [category, setCategory] = useState("All produce");
  const [query, setQuery] = useState("");
  const [intentTerms, setIntentTerms] = useState<string[]>([]);
  const [intentExplanation, setIntentExplanation] = useState("");
  const [intentLoading, setIntentLoading] = useState(false);
  const [intentResolvedQuery, setIntentResolvedQuery] = useState("");
  const [intentEnhanced, setIntentEnhanced] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [basketToast, setBasketToast] = useState<{ id: number; product: string } | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [paid, setPaid] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [basketCheckoutError, setBasketCheckoutError] = useState("");
  const [paymentReceipt, setPaymentReceipt] = useState<File | null>(null);
  const [manualPaymentSettings, setManualPaymentSettings] = useState<ManualPaymentSettings | null>(null);
  const [manualPaymentAvailable, setManualPaymentAvailable] = useState(false);
  const [paystackAvailable, setPaystackAvailable] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"paystack" | "manual" | null>(null);
  const [storeCreditKobo, setStoreCreditKobo] = useState(0);
  const [confirmedOrderNumber, setConfirmedOrderNumber] = useState("");
  const [orderAwaitingReview, setOrderAwaitingReview] = useState(true);
  const [delivery, setDelivery] = useState<"doorstep" | "farm_pickup" | "farmer_delivery">("doorstep");
  const [deliveryQuote, setDeliveryQuote] = useState<{ available: boolean; feeKobo: number | null; distanceKm: number; radiusKm?: number | null; unavailableReason: string | null } | null>(null);
  const [liked, setLiked] = useState<string[]>([]);
  const [savedOnly, setSavedOnly] = useState(false);
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
  const [recoveryStage, setRecoveryStage] = useState<"signin" | "request" | "reset" | "done">("signin");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState("");
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const notificationUserId = currentUser?.id;
  const [sessionLoading, setSessionLoading] = useState(true);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const [accountCreditKobo, setAccountCreditKobo] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const notificationIdsRef = useRef<Set<string>>(new Set());
  const [showSigninPassword, setShowSigninPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [sortBy, setSortBy] = useState<"nearest" | "price-low" | "price-high" | "rating" | "stock">("nearest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const filterPopoverRef = useRef<HTMLDivElement>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const locationPickerRef = useRef<HTMLDivElement>(null);
  const [deliveryLocations, setDeliveryLocations] = useState<DeliveryLocation[]>([]);
  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocation>(fallbackDeliveryLocations[0]);
  const [locationOverride, setLocationOverride] = useState(false);
  const [savedLocationLabel, setSavedLocationLabel] = useState("");
  const [maxDistance, setMaxDistance] = useState(20);
  const [maxPrice, setMaxPrice] = useState(50000);
  const [distanceFilterActive, setDistanceFilterActive] = useState(false);
  const [priceFilterActive, setPriceFilterActive] = useState(false);
  const [todayOnly, setTodayOnly] = useState(false);
  const [hideLowStock, setHideLowStock] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetch("/api/service-areas", { cache: "no-store" }).then((response) => readJsonResponse<{ areas?: Array<{ id: string; name: string; city: string; state: string; latitude: number; longitude: number }> }>(response))
      .then(({ areas }) => {
        const locations = (areas || []).map((area) => ({ id: area.id, name: `${area.name}, ${area.city}`, latitude: Number(area.latitude), longitude: Number(area.longitude) }));
        setDeliveryLocations(locations);
        setDeliveryLocation((current) => current.name === "Current location" || locations.some((location) => location.id === current.id) ? current : locations[0] || current);
        setLocationOverride((current) => current && locations.length > 0);
      }).catch(() => undefined);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [view]);

  useEffect(() => {
    if (!previewProduct) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewProduct(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [previewProduct]);

  useEffect(() => {
    if (!cartOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [cartOpen]);

  useEffect(() => {
    const syncView = () => {
      setView(viewFromPath(window.location.pathname));
      setSavedOnly(window.location.pathname === viewPaths.market && new URLSearchParams(window.location.search).get("saved") === "1");
    };
    syncView();
    window.addEventListener("popstate", syncView);
    return () => window.removeEventListener("popstate", syncView);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const authError = url.searchParams.get("authError");
    if (!authError) return;
    const messages: Record<string, string> = {
      google_not_configured: "Google sign-in is not configured yet.",
      too_many_attempts: "Too many Google sign-in attempts. Try again shortly.",
      invalid_google_request: "This Google sign-in request expired or could not be verified. Please try again.",
      account_disabled: "This HarvestNearU account has been disabled.",
      staff_password_required: "Administrator and support accounts must sign in with their HarvestNearU password.",
      google_signin_failed: "Google could not sign you in. Please try again.",
    };
    queueMicrotask(() => {
      openSignIn(false);
      setSigninError(messages[authError] || "Google sign-in could not be completed.");
    });
    url.searchParams.delete("authError");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadProduce() {
      try {
        const produceUrl = locationOverride
          ? `/api/produce?origin=selected&lat=${deliveryLocation.latitude}&lng=${deliveryLocation.longitude}`
          : "/api/produce";
        const response = await fetch(produceUrl, { signal: controller.signal });
        if (!response.ok) throw new Error("Could not load produce");
        const data = await readJsonResponse(response) as { produce: Product[]; stats: MarketplaceStats; proximity?: { source: string; label: string | null } };
        setProducts(data.produce);
        setCart((current) => {
          return clampCartToStock(current, data.produce);
        });
        setMarketplaceStats(data.stats);
        if (data.proximity?.source === "saved_address") setSavedLocationLabel(data.proximity.label || "Saved address");
        setProductsError(false);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setProductsError(true);
      } finally {
        if (!controller.signal.aborted) setProductsLoading(false);
      }
    }
    loadProduce();
    return () => controller.abort();
  }, [deliveryLocation.latitude, deliveryLocation.longitude, locationOverride]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("payment") !== "success") return;
    localStorage.removeItem("harvestnearu-cart");
    void fetch("/api/cart", { method: "DELETE" });
  }, []);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => readJsonResponse<{ user: CurrentUser | null }>(response))
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
        const cartData = await readJsonResponse(cartResponse) as { cart?: Record<string, number> };
        const favouriteData = await readJsonResponse(favouriteResponse) as { favourites?: string[] };
        const mergedCart = { ...(cartData.cart || {}), ...localCart };
        const mergedFavourites = [...new Set([...(favouriteData.favourites || []), ...localFavourites])];
        setCart(mergedCart); setLiked(mergedFavourites);
        if (Object.keys(localCart).length) {
          const persistResponse = await fetch("/api/cart", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: Object.entries(mergedCart).map(([listingId, quantity]) => ({ listingId, quantity })) }) });
          if (persistResponse.ok) localStorage.removeItem("harvestnearu-cart");
        } else localStorage.removeItem("harvestnearu-cart");
        localStorage.removeItem("harvestnearu-favourites");
        for (const listingId of localFavourites) fetch("/api/favourites", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId, saved: true }) });
        if (notificationResponse.ok) {
          const data = await readJsonResponse(notificationResponse) as { notifications: Array<{ id: string; type: NotificationItem["type"]; title: string; message: string; action_url: string | null; read_at: string | null; created_at: string }> };
          setNotifications(data.notifications.map((item) => ({ id: item.id, type: item.type, title: item.title, message: item.message, time: relativeTime(item.created_at), read: Boolean(item.read_at), target: notificationView(item.action_url) })));
        }
      })
      .finally(() => setSessionLoading(false));
  }, []);

  useEffect(() => {
    const refreshAccount = () => fetch("/api/auth/session", { cache: "no-store" }).then((response) => readJsonResponse<{ user: CurrentUser | null }>(response)).then((data) => setCurrentUser(data.user));
    window.addEventListener("harvestnearu-profile-updated", refreshAccount);
    return () => window.removeEventListener("harvestnearu-profile-updated", refreshAccount);
  }, []);

  useEffect(() => {
    if (sessionLoading || currentUser) return;
    localStorage.setItem("harvestnearu-cart", JSON.stringify(cart));
    localStorage.setItem("harvestnearu-favourites", JSON.stringify(liked));
  }, [cart, liked, currentUser, sessionLoading]);

  useEffect(() => {
    if (!accountMenuOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) setAccountMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setAccountMenuOpen(false);
      accountMenuRef.current?.querySelector<HTMLButtonElement>(".account-menu-trigger")?.focus();
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    if (!locationOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!locationPickerRef.current?.contains(event.target as Node)) setLocationOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setLocationOpen(false);
      locationPickerRef.current?.querySelector<HTMLButtonElement>(".location-button")?.focus();
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [locationOpen]);

  useEffect(() => {
    if (!filtersOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!filterButtonRef.current?.contains(target) && !filterPopoverRef.current?.contains(target)) setFiltersOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setFiltersOpen(false);
      filterButtonRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [filtersOpen]);

  useEffect(() => {
    if (!notificationUserId) return;
    const stream=new EventSource("/api/notifications/stream");
    stream.addEventListener("notifications",(event)=>{const data=JSON.parse((event as MessageEvent).data) as {notifications:Array<{id:string;type:NotificationItem["type"];title:string;message:string;action_url:string|null;read_at:string|null;created_at:string}>};const next=data.notifications.map(item=>({id:item.id,type:item.type,title:item.title,message:item.message,time:relativeTime(item.created_at),read:Boolean(item.read_at),target:notificationView(item.action_url)}));const known=notificationIdsRef.current;if(known.size&&next.some(item=>!known.has(item.id)))playNotificationChime();notificationIdsRef.current=new Set(next.map(item=>item.id));setNotifications(next);});
    return()=>stream.close();
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
      const result = await readJsonResponse(response) as { balanceKobo?: number };
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
    setRecoveryStage("signin");
    setRecoveryEmail("");
    setRecoveryCode("");
    setRecoveryPassword("");
    setRecoveryConfirmPassword("");
    setRecoveryMessage("");
    setShowRecoveryPassword(false);
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
    if (next === "market") setSavedOnly(false);
    if (window.location.pathname !== viewPaths[next] || window.location.search) window.history.pushState({}, "", viewPaths[next]);
    setView(next);
  }

  function openSavedProduce() {
    if (!currentUser || !canPurchase) {
      openSignIn(false);
      return;
    }
    setAccountMenuOpen(false);
    setSavedOnly(true);
    setCurrentPage(1);
    setQuery("");
    setCategory("All produce");
    window.history.pushState({}, "", `${viewPaths.market}?saved=1`);
    setView("market");
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSigninBusy(true);
    setSigninError("");
    try {
      const response = await fetch("/api/auth/signin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier: signinIdentifier, password: signinPassword }) });
      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await readJsonResponse(response) as { user?: CurrentUser; error?: string }
        : { error: response.status === 404 ? "Sign-in service is unavailable. Refresh the page and try again." : "The sign-in service returned an unexpected response. Try again shortly." };
      if (!response.ok || !data.user) throw new Error(data.error || "Sign in failed");
      setCurrentUser(data.user);
      if (pendingCheckout && ["consumer", "farmer"].includes(data.user.role)) {
        setPendingCheckout(false);
        setSigninOpen(false);
        try {
          await prepareCheckout(data.user);
        } catch (checkoutFailure) {
          setCheckout(false);
          setBasketCheckoutError((checkoutFailure as Error).message || "Could not prepare checkout. Please try again.");
          setCartOpen(true);
        }
        return;
      }
      await hydrateShoppingState(data.user);
      setPendingCheckout(false);
      setSigninComplete(true);
    } catch (error) {
      setSigninError((error as Error).message);
    } finally {
      setSigninBusy(false);
    }
  }

  async function requestPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSigninBusy(true); setSigninError("");
    try {
      const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: recoveryEmail }) });
      const data = await readJsonResponse(response) as { message?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "Could not send the reset code");
      setRecoveryMessage(data.message || "Check your email for a six-digit reset code.");
      setRecoveryStage("reset");
    } catch (error) { setSigninError((error as Error).message); }
    finally { setSigninBusy(false); }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSigninBusy(true); setSigninError("");
    try {
      const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: recoveryEmail, code: recoveryCode, password: recoveryPassword, confirmPassword: recoveryConfirmPassword }) });
      const data = await readJsonResponse(response) as { message?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "Could not update the password");
      setRecoveryMessage(data.message || "Password updated. You can now sign in.");
      setRecoveryPassword(""); setRecoveryConfirmPassword(""); setRecoveryStage("done");
    } catch (error) { setSigninError((error as Error).message); }
    finally { setSigninBusy(false); }
  }

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    setCurrentUser(null);
    setSavedLocationLabel(""); setLocationOverride(false);
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
      const cartData = await readJsonResponse(cartResponse) as { cart?: Record<string, number> };
      const favouriteData = await readJsonResponse(favouriteResponse) as { favourites?: string[] };
      setCart(cartData.cart || {}); setLiked(favouriteData.favourites || []);
      if (notificationResponse.ok) {
        const data = await readJsonResponse(notificationResponse) as { notifications: Array<{ id: string; type: NotificationItem["type"]; title: string; message: string; action_url: string | null; read_at: string | null; created_at: string }> };
        setNotifications(data.notifications.map((item) => ({ id: item.id, type: item.type, title: item.title, message: item.message, time: relativeTime(item.created_at), read: Boolean(item.read_at), target: notificationView(item.action_url) })));
      }
    });
  }

  async function prepareCheckout(user: CurrentUser) {
      await hydrateShoppingState(user);
      const quoteResponse = await fetch("/api/orders/delivery-quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: items.map((item) => ({ listingId: item.id })) }) });
      const quoteResult = await readJsonResponse<{ doorstep?: { available: boolean; feeKobo: number | null; distanceKm: number; radiusKm?: number | null; unavailableReason: string | null }; error?: string }>(quoteResponse);
      if (quoteResponse.ok && quoteResult.doorstep) setDeliveryQuote(quoteResult.doorstep);
      if (delivery === "doorstep" && (!quoteResponse.ok || !quoteResult.doorstep?.available)) throw new Error(quoteResult.error || quoteResult.doorstep?.unavailableReason || "Doorstep delivery is unavailable");
      const settingsResponse = await fetch("/api/payments/manual/settings", { cache: "no-store" });
      const settingsResult = await readJsonResponse(settingsResponse) as { settings?: ManualPaymentSettings; storeCreditKobo?: number; manualPaymentAvailable?: boolean; paystackAvailable?: boolean; error?: string };
      setManualPaymentSettings(settingsResponse.ok && settingsResult.settings ? settingsResult.settings : null);
      const hasPaystack = Boolean(settingsResult.paystackAvailable);
      const hasManualPayment = Boolean(settingsResult.manualPaymentAvailable && settingsResult.settings);
      setPaystackAvailable(hasPaystack);
      setManualPaymentAvailable(hasManualPayment);
      setPaymentMethod(hasPaystack ? "paystack" : hasManualPayment ? "manual" : null);
      setStoreCreditKobo(settingsResponse.ok ? Number(settingsResult.storeCreditKobo || 0) : 0);
      const creditCoversOrder = Number(settingsResult.storeCreditKobo || 0) >= Math.round((subtotal + deliveryFee) * 100);
      setCheckoutError(settingsResponse.ok && (settingsResult.paystackAvailable || settingsResult.settings || creditCoversOrder) ? "" : settingsResult.error || "No payment method is currently available");
      setCartOpen(false);
      setCheckout(true);
  }

  async function beginCheckout() {
    setBasketCheckoutError("");
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const data = await readJsonResponse(response) as { user: CurrentUser | null };
      if (!response.ok) throw new Error("Could not verify your session. Please try again.");
      if (!data.user || !["consumer", "farmer"].includes(data.user.role)) {
        setCurrentUser(data.user || null);
        setCartOpen(false);
        openSignIn(true);
        return;
      }
      setCurrentUser(data.user);
      await prepareCheckout(data.user);
    } catch (error) {
      setCheckout(false);
      setBasketCheckoutError((error as Error).message || "Could not prepare checkout. Please try again.");
      setCartOpen(true);
    }
  }

  async function completeOrder() {
    setCheckoutBusy(true); setCheckoutError("");
    try {
      const requiresPayment = storeCreditKobo < Math.round((subtotal + deliveryFee) * 100);
      if (requiresPayment && !paymentMethod) throw new Error("No payment method is currently available");
      const requiresReceipt = requiresPayment && paymentMethod === "manual";
      if (requiresReceipt && !paymentReceipt) throw new Error("Select your payment receipt");
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: items.map((item) => ({ listingId: item.id, quantity: cart[item.id] })), fulfilmentMethod: delivery, paymentMethod }) });
      const result = await readJsonResponse<{ orderId?: string; orderNumber?: string; requiresReceipt?: boolean; paymentMethod?: string; error?: string }>(response);
      if (!response.ok || !result.orderId || !result.orderNumber) throw new Error(result.error || "Could not create order");
      if (result.paymentMethod === "paystack") {
        const paystackResponse = await fetch("/api/payments/paystack/initialize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: result.orderId }) });
        const paystackResult = await readJsonResponse<{ authorizationUrl?: string; error?: string }>(paystackResponse);
        if (!paystackResponse.ok || !paystackResult.authorizationUrl) throw new Error(paystackResult.error || `Order ${result.orderNumber} was created, but Paystack could not start. Retry payment from My orders.`);
        setCart({});
        localStorage.removeItem("harvestnearu-cart");
        window.location.assign(paystackResult.authorizationUrl);
        return;
      }
      if (result.requiresReceipt !== false) {
        const receipt = new FormData(); receipt.set("receipt", paymentReceipt!);
        const receiptResponse = await fetch(`/api/payments/manual/${result.orderId}?initial=1`, { method: "POST", body: receipt });
        const receiptResult = await readJsonResponse<{ error?: string }>(receiptResponse);
        if (!receiptResponse.ok) throw new Error(receiptResult.error || `Order ${result.orderNumber} was created, but the receipt could not be submitted. Upload it from My orders.`);
      }
      setOrderAwaitingReview(result.requiresReceipt !== false);
      setConfirmedOrderNumber(result.orderNumber); setPaid(true);
      setCart({});
      localStorage.removeItem("harvestnearu-cart");
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
      const data = await readJsonResponse(response) as { user?: CurrentUser; error?: string };
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

  const availableCategories = useMemo(() => [
    "All produce",
    ...new Set(products.map((product) => product.category).filter(Boolean).sort((left, right) => left.localeCompare(right))),
  ], [products]);
  const effectiveCategory = availableCategories.includes(category) ? category : "All produce";
  const searchInput = query.trim();
  const fallbackIntent = useMemo(() => searchIntentFallback(searchInput), [searchInput]);
  const localSearchMatchCount = useMemo(() => {
    if (searchInput.length < 3) return 0;
    const normalizedQuery = searchInput.toLowerCase();
    return products.filter((product) =>
      (effectiveCategory === "All produce" || product.category === effectiveCategory) &&
      (`${product.name} ${product.farmer} ${product.category}`.toLowerCase().includes(normalizedQuery) ||
        matchesSearchTerms(`${product.name} ${product.category}`, fallbackIntent.terms))
    ).length;
  }, [products, effectiveCategory, searchInput, fallbackIntent.terms]);
  const effectiveIntentTerms = useMemo(() => searchInput.length >= 3
    ? [...new Set([...fallbackIntent.terms, ...(localSearchMatchCount === 0 && intentResolvedQuery === searchInput ? intentTerms : [])])]
    : [], [searchInput, fallbackIntent.terms, localSearchMatchCount, intentResolvedQuery, intentTerms]);
  const effectiveIntentExplanation = localSearchMatchCount === 0 && intentResolvedQuery === searchInput ? intentExplanation : fallbackIntent.explanation;
  const effectiveIntentLoading = localSearchMatchCount === 0 && intentLoading && intentResolvedQuery === searchInput;
  const effectiveIntentEnhanced = localSearchMatchCount === 0 && intentResolvedQuery === searchInput && intentEnhanced;

  useEffect(() => {
    const input = query.trim();
    if (productsLoading || productsError) return;
    if (input.length < 3 || localSearchMatchCount > 0) return;
    const fallback = searchIntentFallback(input);
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIntentResolvedQuery(input);
      setIntentLoading(true);
      setIntentEnhanced(false);
      try {
        const response = await fetch("/api/ai/assist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feature: "search", input }), signal: controller.signal });
        const data = await response.json().catch(() => null) as { terms?: string[]; explanation?: string; enhanced?: boolean; error?: string } | null;
        if (response.ok && data?.terms?.length) {
          setIntentTerms([...new Set([...fallback.terms, ...data.terms].map((term) => term.toLowerCase()))]);
          setIntentExplanation(data.explanation || fallback.explanation);
          setIntentEnhanced(Boolean(data.enhanced) || data.terms.some((term) => !fallback.terms.includes(term.toLowerCase())));
        } else {
          setIntentTerms(fallback.terms);
          setIntentExplanation(data?.error || "No broader marketplace matches were found");
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setIntentTerms(fallback.terms);
          setIntentExplanation("No broader marketplace matches were found");
        }
      } finally {
        if (!controller.signal.aborted) setIntentLoading(false);
      }
    }, 450);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, localSearchMatchCount, productsLoading, productsError]);

  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = products.filter((product) =>
      (!savedOnly || liked.includes(product.id)) &&
      (effectiveCategory === "All produce" || product.category === effectiveCategory) &&
      (!normalizedQuery || `${product.name} ${product.farmer} ${product.category}`.toLowerCase().includes(normalizedQuery) || matchesSearchTerms(`${product.name} ${product.category}`, effectiveIntentTerms)) &&
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
  }, [products, liked, savedOnly, effectiveCategory, query, effectiveIntentTerms, distanceFilterActive, maxDistance, priceFilterActive, maxPrice, todayOnly, hideLowStock, sortBy]);

  const activeFilterCount = Number(distanceFilterActive) + Number(priceFilterActive) + Number(todayOnly) + Number(hideLowStock);
  const matchedIntentTerms = useMemo(() => effectiveIntentTerms.filter((term) => products.some((product) => matchesSearchTerms(`${product.name} ${product.category}`, [term]))), [effectiveIntentTerms, products]);
  // Keep full rows across the catalog's three- and four-column desktop layouts.
  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = visible.slice((safePage - 1) * pageSize, safePage * pageSize);

  const items = products.filter((p) => cart[p.id]);
  const itemCount = Object.values(cart).reduce((sum, n) => sum + n, 0);
  const subtotal = items.reduce((sum, p) => sum + p.price * cart[p.id], 0);
  const deliveryFee = delivery === "doorstep" ? Number(deliveryQuote?.feeKobo || 0) / 100 : 0;
  const checkoutCredit = Math.min(subtotal + deliveryFee, storeCreditKobo / 100);
  const checkoutAmount = Math.max(0, subtotal + deliveryFee - checkoutCredit);
  const paymentUnavailable = checkoutAmount > 0 && !paystackAvailable && !manualPaymentAvailable;
  const unreadNotificationCount = notifications.filter((item) => !item.read).length;
  const visibleNotifications = notificationFilter === "unread" ? notifications.filter((item) => !item.read) : notifications;

  async function hydrateShoppingState(user: CurrentUser) {
    if (!["consumer", "farmer"].includes(user.role)) return;
    const [cartResponse, favouriteResponse, notificationResponse] = await Promise.all([fetch("/api/cart", { cache: "no-store" }), fetch("/api/favourites", { cache: "no-store" }), fetch("/api/notifications", { cache: "no-store" })]);
    const cartData = await readJsonResponse(cartResponse) as { cart?: Record<string, number> };
    const favouriteData = await readJsonResponse(favouriteResponse) as { favourites?: string[] };
    const mergedCart = clampCartToStock({ ...cart, ...(cartData.cart || {}) }, products);
    const mergedFavourites = [...new Set([...(favouriteData.favourites || []), ...liked])];
    setCart(mergedCart); setLiked(mergedFavourites);
    if (Object.keys(cart).length) {
      const persistResponse = await persistCartForUser(mergedCart);
      if (!persistResponse.ok) throw new Error("Could not save your basket after sign-in. Please try checkout again.");
      localStorage.removeItem("harvestnearu-cart");
    }
    for (const listingId of liked) fetch("/api/favourites", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId, saved: true }) });
    if (notificationResponse.ok) {
      const data = await readJsonResponse(notificationResponse) as { notifications: Array<{ id: string; type: NotificationItem["type"]; title: string; message: string; action_url: string | null; read_at: string | null; created_at: string }> };
      setNotifications(data.notifications.map((item) => ({ id: item.id, type: item.type, title: item.title, message: item.message, time: relativeTime(item.created_at), read: Boolean(item.read_at), target: notificationView(item.action_url) })));
    }
  }

  function persistCartForUser(next: Record<string, number>) {
    return fetch("/api/cart", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: Object.entries(next).map(([listingId, quantity]) => ({ listingId, quantity })) }) });
  }

  function persistCart(next: Record<string, number>) {
    if (!currentUser || !canPurchase) return;
    void persistCartForUser(next);
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
    setNotifications((current) => current.filter((item) => item.id !== id));
    fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
  }

  function markAllNotificationsRead() {
    setNotifications([]);
    fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
  }

  function openNotification(item: NotificationItem) {
    markNotificationRead(item.id);
    setNotificationOpen(false);
    navigate(item.target);
  }

  function add(product: Product) {
    setCart((current) => { const next = { ...current, [product.id]: Math.min((current[product.id] || 0) + 1, product.stock) }; persistCart(next); return next; });
    setBasketToast({ id: Date.now(), product: product.name });
  }

  useEffect(() => {
    if (!basketToast) return;
    const timer = window.setTimeout(() => setBasketToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [basketToast]);

  function update(id: string, delta: number) {
    setCart((current) => {
      const available = products.find((product) => product.id === id)?.stock ?? 0;
      const next = Math.min(available, Math.max(0, (current[id] || 0) + delta));
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
      setLocationOverride(true);
      setLocationOpen(false);
      setCurrentPage(1);
    });
  }

  return (
    <div className="app-shell" data-theme={theme}>
      {currentUser?.impersonating && <div className="impersonation-banner" role="status"><span><Eye size={16}/><strong>Viewing as {currentUser.firstName} {currentUser.lastName}</strong><small>{roleLabel(currentUser.role)} · Read-only administrator preview.</small></span><button onClick={stopViewingAsUser}><ArrowLeft size={15}/> Return to administration</button></div>}
      <header className="topbar">
        <button className="brand brand-image" onClick={() => navigate(isAdmin ? "admin" : "landing")} aria-label={isAdmin ? "HarvestNearU administration" : "HarvestNearU home"}><img className="brand-lockup" src="/brand/harvestnearu-opaque-seal-se2-lockup.png" alt="HarvestNearU" /></button>
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
          <div className="account-menu-wrap" ref={accountMenuRef}>
            <button className={`account-menu-trigger ${accountMenuOpen ? "active" : ""}`} onClick={() => setAccountMenuOpen((open) => !open)} aria-expanded={accountMenuOpen} aria-haspopup="menu" disabled={sessionLoading}>
              <span className={`account-avatar ${currentUser?.avatarUrl ? "has-photo" : ""}`}>{currentUser?.avatarUrl ? <img src={currentUser.avatarUrl} alt=""/> : <UserRound size={17} />}</span><ChevronDown size={15} /><span className="sr-only">Account menu</span>
            </button>
            {accountMenuOpen && <>
              <div className="account-menu" role="menu">
                <div className="account-menu-heading"><span className={`account-avatar ${currentUser?.avatarUrl ? "has-photo" : ""}`}>{currentUser?.avatarUrl ? <img src={currentUser.avatarUrl} alt=""/> : <UserRound size={17} />}</span><div><strong>{currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : sessionLoading ? "Checking your account" : "Welcome to HarvestNearU"}</strong><small>{currentUser ? roleLabel(currentUser.role) : "Manage your account and preferences"}</small></div></div>
                {currentUser && !isAdmin && <button role="menuitem" onClick={() => { navigate("profile"); setAccountMenuOpen(false); }}><UserRound size={17} /><span><strong>My profile</strong><small>{isFarmer ? "Farm and owner information" : "Customer information"}</small></span><ChevronRight size={15} /></button>}
                {currentUser && canPurchase && <button role="menuitem" onClick={openSavedProduce}><Heart size={17} fill={liked.length ? "currentColor" : "none"}/><span><strong>Saved produce</strong><small>{liked.length ? `${liked.length} saved harvest${liked.length === 1 ? "" : "s"}` : "Your favourite harvests"}</small></span><ChevronRight size={15}/></button>}
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

      {basketToast && <div className="basket-toast" role="status" aria-live="polite" key={basketToast.id}><span><Check size={16}/></span><div><strong>Added to your basket</strong><small>{basketToast.product} is ready for checkout.</small></div><button onClick={() => { setBasketToast(null); setCartOpen(true); }}>View basket</button></div>}
      {!sessionLoading && <nav className="mobile-nav" aria-label="Mobile navigation">
        {!isAdmin && <button className={view === "landing" ? "active" : ""} onClick={() => navigate("landing")}><House size={17} /><span>Home</span></button>}
        {!isAdmin && <button className={view === "market" ? "active" : ""} onClick={() => navigate("market")}><ShoppingBag size={17} /><span>Shop</span></button>}
        {canPurchase && <button className={view === "orders" ? "active" : ""} onClick={() => navigate("orders")}><PackageCheck size={17} /><span>Orders</span></button>}
        {isFarmer && <button className={view === "farmer" ? "active" : ""} onClick={() => navigate("farmer")}><Store size={17} /><span>Farm</span></button>}
        {isAdmin && <button className={view === "admin" ? "active" : ""} onClick={() => navigate("admin")}><SlidersHorizontal size={17} /><span>Admin</span></button>}
        {!currentUser && <button onClick={() => openSignIn(false)}><LogIn size={17}/><span>Sign in</span></button>}
      </nav>}

      {sessionLoading ? <DataLoading view={view}/> : view === "landing" ? <LandingPage stats={marketplaceStats} signedOut={!currentUser} onShop={() => navigate("market")} onFarmer={() => navigate("farmer")} onSignup={openSignup} /> : view === "market" ? (
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
            <div className="location-picker" ref={locationPickerRef}><button className={`location-button ${locationOpen ? "active" : ""}`} onClick={() => { setLocationOpen((open) => !open); setFiltersOpen(false); }} aria-expanded={locationOpen} aria-haspopup="listbox"><span className="loc-icon"><LocateFixed size={18}/></span><span><small>DELIVERING TO</small><strong>{locationOverride ? deliveryLocation.name : savedLocationLabel || deliveryLocation.name}</strong></span><ChevronDown className={locationOpen ? "open" : ""} size={17}/></button>{locationOpen && <><button className="location-backdrop" aria-label="Close delivery locations" onClick={() => setLocationOpen(false)}/><div className="location-menu" role="listbox" aria-label="Delivery location"><header><strong>Choose your area</strong><small>Travel times update automatically</small></header>{savedLocationLabel && <button role="option" aria-selected={!locationOverride} className={`device-location saved-location ${!locationOverride ? "selected" : ""}`} onClick={() => { setLocationOverride(false); setLocationOpen(false); setCurrentPage(1); }}><House size={16}/><span><strong>Home</strong><small>{savedLocationLabel}</small></span>{!locationOverride && <Check size={14}/>}</button>}<button className="device-location" onClick={useDeviceLocation}><LocateFixed size={16}/><span><strong>Use current location</strong><small>Allow location access in your browser</small></span></button>{deliveryLocations.map((location) => <button role="option" aria-selected={locationOverride && deliveryLocation.name === location.name} className={locationOverride && deliveryLocation.name === location.name ? "selected" : ""} key={location.name} onClick={() => { setDeliveryLocation(location); setLocationOverride(true); setLocationOpen(false); setCurrentPage(1); }}><MapPin size={15}/><span>{location.name}</span>{locationOverride && deliveryLocation.name === location.name && <Check size={14}/>}</button>)}</div></>}</div>
            <button ref={filterButtonRef} className={`filter-button ${activeFilterCount ? "active" : ""}`} onClick={() => setFiltersOpen((open) => !open)}><SlidersHorizontal size={18} /> Filters {activeFilterCount > 0 && <b>{activeFilterCount}</b>}</button>
            {filtersOpen && <div className="filter-popover" ref={filterPopoverRef}>
              <div className="filter-head"><div><strong>Filter harvests</strong><span>Refine what is shown near you</span></div><button onClick={() => setFiltersOpen(false)}><X size={17}/></button></div>
              <label className="range-filter"><span><strong>Maximum distance</strong><b>{distanceFilterActive ? `${maxDistance} km · ${walkingTime(maxDistance)}` : "Any distance"}</b></span><input type="number" min="1" step="1" value={distanceFilterActive ? maxDistance : ""} placeholder="Enter distance in km" onChange={(event) => { const value = event.target.value; setDistanceFilterActive(value !== ""); if (value) setMaxDistance(Number(value)); setCurrentPage(1); }}/></label>
              <label className="range-filter"><span><strong>Maximum unit price</strong><b>{priceFilterActive ? money(maxPrice) : "Any price"}</b></span><input type="number" min="1" step="100" value={priceFilterActive ? maxPrice : ""} placeholder="Enter maximum price" onChange={(event) => { const value = event.target.value; setPriceFilterActive(value !== ""); if (value) setMaxPrice(Number(value)); setCurrentPage(1); }}/></label>
              <div className="quick-filters"><label><span><strong>Available today</strong><small>Only produce ready now</small></span><input type="checkbox" checked={todayOnly} onChange={(event) => { setTodayOnly(event.target.checked); setCurrentPage(1); }}/></label><label><span><strong>Hide low stock</strong><small>More than 15 units left</small></span><input type="checkbox" checked={hideLowStock} onChange={(event) => { setHideLowStock(event.target.checked); setCurrentPage(1); }}/></label></div>
              <div className="filter-actions"><button onClick={() => { setMaxDistance(20); setMaxPrice(50000); setDistanceFilterActive(false); setPriceFilterActive(false); setTodayOnly(false); setHideLowStock(false); setCurrentPage(1); }}>Reset all</button><button onClick={() => setFiltersOpen(false)}>Show {visible.length} harvests</button></div>
            </div>}
          </section>

          <section className="catalog">
            {query.trim() && (effectiveIntentLoading || matchedIntentTerms.length > 0 || (localSearchMatchCount === 0 && intentResolvedQuery === searchInput)) && <div className="search-intent-status" role="status" aria-live="polite">
              <img src="/brand/amara-avatar.png" alt="Amara, HarvestNearU assistant" style={{width:34,height:34,objectFit:"cover",borderRadius:9,flex:"none"}}/><span><strong>{effectiveIntentLoading ? "Amara is looking for broader matches..." : effectiveIntentEnhanced ? `Amara suggests: ${effectiveIntentExplanation}` : effectiveIntentExplanation}</strong>{matchedIntentTerms.length > 0 && <small>Matching available produce: {matchedIntentTerms.join(", ")}</small>}</span>
            </div>}
            <div className="catalog-head">
              <div><h2>{savedOnly ? "Saved produce" : "Harvests near you"}</h2><p>{savedOnly ? `${visible.length} saved harvest${visible.length === 1 ? "" : "s"} currently available` : `${visible.length} available listing${visible.length === 1 ? "" : "s"} near ${locationOverride ? deliveryLocation.name : savedLocationLabel || deliveryLocation.name}`}</p></div>
              <label className="sort"><span>Sort by</span><select value={sortBy} onChange={(event) => { setSortBy(event.target.value as typeof sortBy); setCurrentPage(1); }}><option value="nearest">Shortest walk first</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="rating">Highest rated</option><option value="stock">Most available</option></select><ChevronDown size={15}/></label>
            </div>
            <div className="category-row">
              <button className={savedOnly ? "selected saved-produce-filter" : "saved-produce-filter"} onClick={() => { setSavedOnly((current) => { const next = !current; window.history.replaceState({}, "", next ? `${viewPaths.market}?saved=1` : viewPaths.market); return next; }); setCurrentPage(1); }}><Heart size={14} fill={savedOnly ? "currentColor" : "none"}/> Saved <span>{liked.length}</span></button>
              {availableCategories.map((item) => <button key={item} onClick={() => { setCategory(item); setCurrentPage(1); }} className={effectiveCategory === item ? "selected" : ""}>{item}</button>)}
            </div>

            {productsLoading ? <ProductGridSkeleton/> : productsError ? <div className="empty-state"><RotateCcw size={28} /><h3>Could not load harvests</h3><p>Please refresh the page to try again.</p></div> : visible.length ? <div className="product-grid">
              {paginatedProducts.map((product) => (
                <article className="product-card" key={product.id} onClick={(event) => { if (!(event.target as HTMLElement).closest("button, a")) setPreviewProduct(product); }}>
                  <div className="product-image">
                    <Image src={product.image} alt={product.name} fill sizes="(max-width: 620px) calc(100vw - 28px), (max-width: 800px) 50vw, (max-width: 1100px) 33vw, 25vw" />
                    <button className="product-image-preview-trigger" onClick={() => setPreviewProduct(product)} aria-label={`View full image of ${product.name}`}><Maximize2 size={17}/><span>View full image</span></button>
                    <span className="distance" title={`${product.distance} km straight-line distance`}><MapPin size={13} /> {walkingTime(product.distance)}</span>
                    <button className={`heart ${liked.includes(product.id) ? "liked" : ""}`} onClick={() => toggleFavourite(product.id)} aria-label={liked.includes(product.id) ? "Remove saved product" : "Save product"}><Heart size={18} fill={liked.includes(product.id) ? "currentColor" : "none"} /></button>
                    {product.badge && <span className="product-badge">{product.badge}</span>}
                  </div>
                  <div className="product-body">
                    <div className="availability"><span /> {product.available}</div>
                    <h3>{product.name}</h3>
                    <a className="farmer farmer-link" href={`/farms/${product.farmId}`} aria-label={`View ${product.farmer} store`}><Store size={14} /> <span>{product.farmer}</span> <VerificationSeal label="Verified farm"/></a>
                    <div className="rating"><Star size={14} fill="currentColor" /> {product.rating} <span>({product.reviewCount})</span></div>
                    <div className="stock-track" title={`${Math.round(product.stock / Math.max(1, product.restockTotal) * 100)}% of the last restock remaining`}><span style={{ width: `${Math.max(0, Math.min(100, product.stock / Math.max(1, product.restockTotal) * 100))}%` }} /></div>
                    <p className="stock-copy">{product.stock} {quantityUnit(product.unit, product.stock)} left</p>
                    <div className="price-row">
                      <div><strong>{money(product.price)}</strong><span> / {product.unit}</span></div>
                      {cart[product.id] ? (
                        <div className="stepper"><button onClick={() => update(product.id, -1)} aria-label={`Remove one ${product.name}`}><Minus size={15} /></button><span>{cart[product.id]}</span><button onClick={() => update(product.id, 1)} disabled={cart[product.id] >= product.stock} aria-label={cart[product.id] >= product.stock ? `All available ${product.name} is already in your basket` : `Add one ${product.name}`}><Plus size={15} /></button></div>
                      ) : <button className="add-button" onClick={() => add(product)}><Plus size={18} /> Add</button>}
                    </div>
                  </div>
                </article>
              ))}
            </div> : savedOnly && liked.length === 0 ? <div className="marketplace-empty">
              <div className="marketplace-empty-visual" aria-hidden="true"><span><Heart size={25}/></span><i><Leaf size={14}/></i></div>
              <span className="marketplace-empty-kicker">YOUR FAVOURITES</span>
              <h3>No produce saved yet.</h3>
              <p>Use the heart on any harvest to keep it here for quick access later.</p>
              <div><button onClick={() => { setSavedOnly(false); window.history.replaceState({}, "", viewPaths.market); }}>Browse all harvests <ArrowRight size={15}/></button></div>
            </div> : <div className="marketplace-empty">
              <div className="marketplace-empty-visual" aria-hidden="true"><span><Search size={25}/></span><i><Leaf size={14}/></i></div>
              <span className="marketplace-empty-kicker">FRESH OPTIONS AWAIT</span>
              <h3>No harvests matched your search.</h3>
              <p>{query.trim() ? <>We could not find <strong>&ldquo;{query.trim()}&rdquo;</strong> in today&apos;s available produce.{localSearchMatchCount === 0 && intentResolvedQuery === searchInput && !effectiveIntentLoading ? " A broader AI-assisted search was also checked." : ""} Try a broader term or browse everything nearby.</> : "No produce currently matches these filters. Adjust them or browse all available harvests."}</p>
              {matchedIntentTerms.length > 0 && <small>Related terms checked: {matchedIntentTerms.join(", ")}</small>}
              <div><button onClick={() => { setQuery(""); setCategory("All produce"); setCurrentPage(1); }}>Show all harvests <ArrowRight size={15}/></button><button onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={15}/> Adjust filters</button></div>
            </div>}
            {visible.length > 0 && <nav className="pagination" aria-label="Produce pagination">
              <p>Showing <strong>{(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, visible.length)}</strong> of {visible.length} harvests</p>
              <div><button className="page-arrow" onClick={() => setCurrentPage(Math.max(1, safePage - 1))} disabled={safePage === 1} aria-label="Previous page"><ChevronLeft size={17}/></button>{Array.from({length:totalPages},(_,index)=>index+1).map(page=><button key={page} className={safePage === page ? "selected" : ""} onClick={() => { setCurrentPage(page); document.querySelector(".catalog")?.scrollIntoView({behavior:"smooth",block:"start"}); }} aria-label={`Page ${page}`} aria-current={safePage === page ? "page" : undefined}>{page}</button>)}<button className="page-arrow" onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))} disabled={safePage === totalPages} aria-label="Next page"><ChevronRight size={17}/></button></div>
            </nav>}
          </section>

          <section className="trust-band">
            <div><PackageCheck size={23} /><span><strong>Harvest checked</strong>Farmers confirm availability daily</span></div>
            <div><Clock3 size={23} /><span><strong>Stock checked at checkout</strong>Orders cannot exceed live availability</span></div>
            <div><Truck size={23} /><span><strong>Flexible fulfilment</strong>Doorstep delivery or farm pickup</span></div>
          </section>
        </main>
      ) : view === "orders" && canPurchase ? <DatabaseOrdersPage onShop={() => navigate("market")} onHelp={() => navigate("help")} /> : view === "profile" && (isConsumer || isFarmer) ? <DatabaseProfilePage role={isFarmer ? "farmer" : "consumer"} onShop={() => navigate("market")} onFarmer={() => navigate("farmer")} onUpgraded={(user) => { setCurrentUser(user); window.history.pushState({}, "", viewPaths.farmer); setView("farmer"); }} /> : view === "admin" && isAdmin ? <AdminPage user={currentUser!} readOnly={role === "support" || Boolean(currentUser?.impersonating)} supportAccess={role === "support"} onImpersonated={enterImpersonatedView} /> : view === "help" || view === "delivery" || view === "returns" ? <SupportPage page={view} onNavigate={navigate} user={currentUser} onSignIn={() => openSignIn(false)} /> : view === "farmer" && isFarmer ? <FarmerWorkspace onShop={() => navigate("market")} /> : <LandingPage stats={marketplaceStats} signedOut={!currentUser} onShop={() => navigate("market")} onFarmer={() => navigate("farmer")} onSignup={openSignup} />}

      {!sessionLoading && <SiteFooter view={view} user={currentUser} onNavigate={navigate} />}

      {previewProduct && <div className="modal-overlay product-preview-overlay" onMouseDown={() => setPreviewProduct(null)} role="presentation">
        <section className="product-preview-modal" role="dialog" aria-modal="true" aria-labelledby="product-preview-title" onMouseDown={(event) => event.stopPropagation()}>
          <button className="product-preview-close" onClick={() => setPreviewProduct(null)} aria-label="Close full image"><X size={22}/></button>
          <div className="product-preview-canvas"><Image src={previewProduct.image} alt={previewProduct.name} fill sizes="(max-width: 700px) calc(100vw - 32px), 75vw" priority/></div>
          <div className="product-preview-details"><div><span>{previewProduct.available} · {previewProduct.category}</span><h2 id="product-preview-title">{previewProduct.name}</h2><a href={`/farms/${previewProduct.farmId}`}><Store size={15}/>{previewProduct.farmer}<VerificationSeal label="Verified farm"/></a></div><div className="product-preview-action"><strong>{money(previewProduct.price)} <small>/ {previewProduct.unit}</small></strong><button onClick={() => { add(previewProduct); setPreviewProduct(null); }} disabled={cart[previewProduct.id] >= previewProduct.stock}><Plus size={17}/>{cart[previewProduct.id] >= previewProduct.stock ? "Maximum in basket" : "Add to basket"}</button></div></div>
        </section>
      </div>}

      {cartOpen && <div className="overlay" onMouseDown={() => setCartOpen(false)}>
        <aside className="cart-drawer" onMouseDown={(e) => e.stopPropagation()}>
          <div className="drawer-head"><div><p>Your basket</p><span>{itemCount} {itemCount === 1 ? "item" : "items"} from local farms</span></div><button className="icon-btn" onClick={() => setCartOpen(false)}><X size={20} /></button></div>
          {items.length ? <>
            <div className="cart-items">{items.map((product) => <div className="cart-item" key={product.id}>
              <Image src={product.image} alt="" width={62} height={62} sizes="62px" />
              <div><h4>{product.name}</h4><p>{product.farmer}</p><strong>{money(product.price * cart[product.id])}</strong></div>
              <div className="stepper"><button onClick={() => update(product.id, -1)} aria-label={`Remove one ${product.name}`}><Minus size={14} /></button><span>{cart[product.id]}</span><button onClick={() => update(product.id, 1)} disabled={cart[product.id] >= product.stock} aria-label={cart[product.id] >= product.stock ? `All available ${product.name} is already in your basket` : `Add one ${product.name}`}><Plus size={14} /></button></div>
            </div>)}</div>
            <div className="delivery-choice"><p>How would you like it?</p><button className={delivery === "doorstep" ? "selected" : ""} onClick={() => { setDelivery("doorstep"); setBasketCheckoutError(""); }}><Truck size={20} /><span><strong>Doorstep delivery</strong><small>{deliveryQuote?.available ? `${deliveryQuote.distanceKm} km from the farthest farm` : "Calculated from your saved location"}</small></span><b>{deliveryQuote?.feeKobo != null ? money(deliveryQuote.feeKobo / 100) : "At checkout"}</b></button><button className={delivery === "farm_pickup" ? "selected" : ""} onClick={() => { setDelivery("farm_pickup"); setBasketCheckoutError(""); }}><Store size={20} /><span><strong>Farm pickup</strong><small>Collect directly from each supplying farm</small></span><b>Free</b></button><button className={delivery === "farmer_delivery" ? "selected" : ""} onClick={() => { setDelivery("farmer_delivery"); setBasketCheckoutError(""); }}><Handshake size={20}/><span><strong>Arrange with farmer</strong><small>Chat with each farmer after checkout to agree timing and charges</small></span><b>Arrange</b></button>{basketCheckoutError && <p className="basket-checkout-error" role="alert">{basketCheckoutError}</p>}</div>
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
        {!paid ? <><button className="close-modal" onClick={() => setCheckout(false)}><X size={20} /></button><ModalBrand/><p className="eyebrow center">SECURE PAYMENT</p><h2>{paymentUnavailable ? "Payment is temporarily unavailable" : checkoutAmount ? "Complete your payment" : "Use your account credit"}</h2><p>{paymentUnavailable ? "Paystack has not been detected and manual payments are disabled. Please try again after payment configuration is refreshed." : checkoutAmount ? paymentMethod === "paystack" ? "Pay securely with Paystack using card, bank, transfer, or another available channel." : "Transfer the exact remaining amount, then upload your receipt." : "Your available account credit covers this order in full."}</p><div className="pay-summary"><span>{checkoutCredit ? `Account credit: -${money(checkoutCredit)}` : "Total to pay"}</span><strong>{money(checkoutAmount)}</strong></div>{checkoutAmount > 0 && paystackAvailable && manualPaymentSettings && <div className="payment-method-picker"><button className={paymentMethod === "paystack" ? "active" : ""} onClick={() => setPaymentMethod("paystack")}><CreditCard size={18}/><span><strong>Paystack</strong><small>Instant secure confirmation</small></span></button><button className={paymentMethod === "manual" ? "active" : ""} onClick={() => setPaymentMethod("manual")}><AtSign size={18}/><span><strong>Bank transfer</strong><small>Receipt reviewed by admin</small></span></button></div>}{checkoutAmount > 0 && paymentMethod === "manual" && manualPaymentSettings && <section className="checkout-bank-details"><div><small>BANK</small><strong>{manualPaymentSettings.bank_name}</strong></div><div><small>ACCOUNT NAME</small><strong>{manualPaymentSettings.account_name}</strong></div><div><small>ACCOUNT NUMBER</small><strong>{manualPaymentSettings.account_number}</strong></div>{manualPaymentSettings.instructions && <p>{manualPaymentSettings.instructions}</p>}</section>}<label>Email address<input value={currentUser?.email || ""} readOnly /></label>{checkoutAmount > 0 && paymentMethod === "manual" && manualPaymentAvailable && <label className="payment-receipt-field">Payment receipt<input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(event) => setPaymentReceipt(event.target.files?.[0] || null)} disabled={checkoutBusy || !manualPaymentSettings}/><small>JPG, PNG, WebP, or PDF · Maximum 5 MB</small></label>}{checkoutError && <p className="auth-error" role="alert">{checkoutError}</p>}<button className="pay-button" disabled={checkoutBusy || paymentUnavailable || (checkoutAmount > 0 && (paymentMethod === "manual" ? !paymentReceipt || !manualPaymentSettings : !paystackAvailable))} onClick={completeOrder}>{checkoutBusy ? "Processing order..." : paymentUnavailable ? "Payment unavailable" : checkoutAmount ? paymentMethod === "paystack" ? "Continue securely with Paystack" : "Place order and submit receipt" : "Place order with account credit"} {!checkoutBusy && <ArrowRight size={18} />}</button><small>{paymentUnavailable ? "Restart the application after adding Paystack environment variables." : checkoutAmount ? paymentMethod === "paystack" ? "You will return here after Paystack verifies your payment." : "Your order remains pending until an administrator verifies the transfer." : "No transfer or receipt is needed."}</small></> : <div className="success-state"><span><Check size={30} /></span><p className="eyebrow center">{orderAwaitingReview ? "RECEIPT SUBMITTED" : "ORDER CONFIRMED"}</p><h2>{orderAwaitingReview ? "Payment review is pending." : "Account credit applied."}</h2><p>Order <strong>#{confirmedOrderNumber}</strong> {orderAwaitingReview ? "is reserved. We will notify you after an administrator confirms your payment." : "has been paid and sent for fulfilment."}</p><button onClick={() => { setCheckout(false); setPaid(false); setPaymentReceipt(null); setCart({}); fetch("/api/cart", { method: "DELETE" }); navigate("orders"); }}>View order status</button></div>}
      </div></div>}

      {signupOpen && <div className="modal-overlay" onMouseDown={() => setSignupOpen(false)}><div className="signup-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="close-modal" onClick={() => setSignupOpen(false)}><X size={20} /></button>
        {!signupComplete ? <>
          <div className="signup-heading"><span className="auth-logo-lockup"><img className="auth-approved-lockup" src="/brand/harvestnearu-opaque-seal-se2-lockup.png" alt="HarvestNearU" /></span><div><p>JOIN HARVESTNEARU</p><h2>Create your account</h2></div></div>
          <p className="signup-intro">Choose how you want to use the marketplace. You can update your profile later.</p>
          <div className="role-tabs" role="tablist" aria-label="Account type">
            <button className={signupRole === "consumer" ? "selected" : ""} onClick={() => setSignupRole("consumer")}><ShoppingBag size={19} /><span><strong>Consumer</strong><small>Shop fresh produce</small></span></button>
            <button className={signupRole === "farmer" ? "selected" : ""} onClick={() => setSignupRole("farmer")}><Store size={19} /><span><strong>Farmer</strong><small>List and sell harvests</small></span></button>
          </div>
          {signupRole === "consumer" && <><a className="google-auth-button" href={`/api/auth/google?returnTo=${encodeURIComponent(viewPaths[view])}`}><GoogleIcon/><span>Continue with Google</span></a><div className="auth-divider"><span>or create with email</span></div></>}
          <form className="signup-form" onSubmit={submitSignup}>
            <div className="form-row"><label>First name<input name="firstName" required placeholder="Tola" /></label><label>Last name<input name="lastName" required placeholder="Adebayo" /></label></div>
            <label>Phone number<div className="phone-field"><span>+234</span><input name="phone" required type="tel" placeholder="801 234 5678" /></div></label>
            <label>Email address<input name="email" required type="email" placeholder="you@example.com" /></label>
            {signupRole === "farmer" && <div className="farmer-fields"><label>Farm or business name<input name="farmName" required placeholder="Adebayo Family Farm" /></label><label>Farm address or area<input name="farmLocation" required placeholder="Kuje, Abuja" /></label><FarmCoordinateFields/></div>}
            <label>Password<div className="password-field"><input name="password" required type={showSignupPassword ? "text" : "password"} autoComplete="new-password" minLength={8} placeholder="At least 8 characters"/><button type="button" onClick={() => setShowSignupPassword((value) => !value)} aria-label={showSignupPassword ? "Hide password" : "Show password"} aria-pressed={showSignupPassword} title={showSignupPassword ? "Hide password" : "Show password"}>{showSignupPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
            <label>Confirm password<div className="password-field"><input name="confirmPassword" required type={showSignupPassword ? "text" : "password"} autoComplete="new-password" minLength={8} placeholder="Enter the password again"/><button type="button" onClick={() => setShowSignupPassword((value) => !value)} aria-label={showSignupPassword ? "Hide passwords" : "Show passwords"} aria-pressed={showSignupPassword} title={showSignupPassword ? "Hide passwords" : "Show passwords"}>{showSignupPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
            <label className="terms"><input required type="checkbox" /> <span>I agree to the Terms of Service and <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.</span></label>
            {signupError && <p className="auth-error" role="alert">{signupError}</p>}
            <button className="create-account" type="submit" disabled={signupBusy}>{signupBusy ? "Creating account..." : `Create ${signupRole} account`} {!signupBusy && <ArrowRight size={17} />}</button>
          </form>
          <p className="signin-copy">Already have an account? <button onClick={() => { setSignupOpen(false); openSignIn(pendingCheckout); }}>Sign in</button></p>
        </> : <div className="signup-success"><span><Check size={30} /></span><p>ACCOUNT CREATED</p><h2>Welcome to HarvestNearU.</h2><p>{signupRole === "farmer" ? "Your farmer profile is ready for verification. Add your first harvest to get started." : "Your consumer account is ready. Fresh harvests near you are waiting."}</p><button onClick={() => { setSignupOpen(false); navigate(signupRole === "farmer" ? "farmer" : "market"); }}>{signupRole === "farmer" ? "Open farmer workspace" : "Start shopping"} <ArrowRight size={17} /></button></div>}
      </div></div>}

      {signinOpen && <div className="modal-overlay" onMouseDown={closeSignIn}><div className="signin-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="close-modal" onClick={closeSignIn}><X size={20} /></button>
        {!signinComplete && recoveryStage === "signin" ? <>
          <div className="auth-logo-lockup signin-brand"><img className="auth-approved-lockup" src="/brand/harvestnearu-opaque-seal-se2-lockup.png" alt="HarvestNearU" /></div>
          <p className="auth-kicker">WELCOME BACK</p>
          <h2>Sign in to HarvestNearU</h2>
          <p className="auth-intro">Continue shopping fresh harvests or manage your farm.</p>
          <form className="signin-form" onSubmit={signIn}>
            <label>Email or phone number<input required autoComplete="username" value={signinIdentifier} onChange={(event) => setSigninIdentifier(event.target.value)} placeholder="you@example.com or +234..." /></label>
            <label>Password<div className="password-field"><input required autoComplete="current-password" value={signinPassword} onChange={(event) => setSigninPassword(event.target.value)} type={showSigninPassword ? "text" : "password"} placeholder="Enter your password"/><button type="button" onClick={() => setShowSigninPassword((value) => !value)} aria-label={showSigninPassword ? "Hide password" : "Show password"} aria-pressed={showSigninPassword} title={showSigninPassword ? "Hide password" : "Show password"}>{showSigninPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
            {signinError && <p className="auth-error" role="alert">{signinError}</p>}
            <div className="signin-options"><label><input type="checkbox" /> Keep me signed in</label><button type="button" onClick={() => { setSigninError(""); setRecoveryEmail(signinIdentifier.includes("@") ? signinIdentifier : ""); setRecoveryStage("request"); }}>Forgot password?</button></div>
            <button className={`signin-submit${signinBusy ? " is-loading" : ""}`} type="submit" disabled={signinBusy} aria-busy={signinBusy}>
              {signinBusy ? <><LoaderCircle className="signin-spinner" size={18}/> <span>Signing in...</span></> : <><span>Sign in securely</span> <ArrowRight size={17}/></>}
            </button>
          </form>
          <div className="auth-divider"><span>or</span></div>
          <a className="google-auth-button" href={`/api/auth/google?returnTo=${encodeURIComponent(viewPaths[view])}`}><GoogleIcon/><span>Continue with Google</span></a>
          <p className="signin-copy">New to HarvestNearU? <button onClick={() => { setSigninOpen(false); openSignup(); }}>Create an account</button></p>
        </> : signinComplete ? <div className="signup-success"><span><Check size={30} /></span><p>SIGNED IN</p><h2>Good to have you back.</h2><p>Your {currentUser ? roleLabel(currentUser.role) : "account"} is ready.</p><button onClick={() => { closeSignIn(); navigate(isAdmin ? "admin" : isFarmer ? "farmer" : "market"); }}>Continue to my workspace <ArrowRight size={17} /></button></div> : <div className="recovery-panel">
          <div className="auth-logo-lockup signin-brand"><img className="auth-approved-lockup" src="/brand/harvestnearu-opaque-seal-se2-lockup.png" alt="HarvestNearU" /></div>
          <p className="auth-kicker">{recoveryStage === "request" ? "ACCOUNT RECOVERY" : recoveryStage === "reset" ? "CHECK YOUR EMAIL" : "PASSWORD UPDATED"}</p>
          <h2>{recoveryStage === "request" ? "Reset your password" : recoveryStage === "reset" ? "Enter your reset code" : "You can sign in again"}</h2>
          <p className="auth-intro">{recoveryStage === "request" ? "We will email a six-digit code to the address on your account." : recoveryStage === "reset" ? recoveryMessage : "Your old sessions have been signed out to protect your account."}</p>
          {recoveryStage === "request" ? <form className="signin-form" onSubmit={requestPasswordReset}>
            <label>Email address<input required type="email" autoComplete="email" value={recoveryEmail} onChange={(event) => setRecoveryEmail(event.target.value)} placeholder="you@example.com" /></label>
            {signinError && <p className="auth-error" role="alert">{signinError}</p>}
            <button className={`signin-submit${signinBusy ? " is-loading" : ""}`} disabled={signinBusy}>{signinBusy ? <><LoaderCircle className="signin-spinner" size={18}/> Sending code...</> : <>Send reset code <ArrowRight size={17}/></>}</button>
          </form> : recoveryStage === "reset" ? <form className="signin-form" onSubmit={resetPassword}>
            <label>Email address<input required type="email" autoComplete="email" value={recoveryEmail} onChange={(event) => setRecoveryEmail(event.target.value)} /></label>
            <label>Six-digit code<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={recoveryCode} onChange={(event) => setRecoveryCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" /></label>
            <label>New password<div className="password-field"><input required minLength={8} maxLength={128} autoComplete="new-password" type={showRecoveryPassword ? "text" : "password"} value={recoveryPassword} onChange={(event) => setRecoveryPassword(event.target.value)} placeholder="At least 8 characters"/><button type="button" onClick={() => setShowRecoveryPassword((value) => !value)} aria-label={showRecoveryPassword ? "Hide passwords" : "Show passwords"}>{showRecoveryPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
            <label>Confirm new password<div className="password-field"><input required minLength={8} maxLength={128} autoComplete="new-password" type={showRecoveryPassword ? "text" : "password"} value={recoveryConfirmPassword} onChange={(event) => setRecoveryConfirmPassword(event.target.value)} placeholder="Enter the password again"/><button type="button" onClick={() => setShowRecoveryPassword((value) => !value)} aria-label={showRecoveryPassword ? "Hide passwords" : "Show passwords"}>{showRecoveryPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
            {signinError && <p className="auth-error" role="alert">{signinError}</p>}
            <button className={`signin-submit${signinBusy ? " is-loading" : ""}`} disabled={signinBusy}>{signinBusy ? <><LoaderCircle className="signin-spinner" size={18}/> Updating password...</> : <>Update password <ArrowRight size={17}/></>}</button>
            <button className="recovery-resend" type="button" disabled={signinBusy} onClick={(event) => void requestPasswordReset(event as unknown as FormEvent<HTMLFormElement>)}>Send a new code</button>
          </form> : <div className="signup-success recovery-success"><span><Check size={30}/></span><p>{recoveryMessage}</p><button onClick={() => { setSigninError(""); setSigninIdentifier(recoveryEmail); setRecoveryStage("signin"); }}>Return to sign in <ArrowRight size={17}/></button></div>}
          {recoveryStage !== "done" && <button className="recovery-back" type="button" onClick={() => { setSigninError(""); setRecoveryStage("signin"); }}><ArrowLeft size={15}/> Back to sign in</button>}
        </div>}
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
  const [staff, setStaff] = useState(false);
  const [currentStaffId, setCurrentStaffId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const selected = tickets.find((ticket) => ticket.id === selectedId) || tickets[0] || null;
  async function loadTickets() {
    if (!user) return;
    const response = await fetch("/api/support/tickets", { cache: "no-store" });
    const data = await readJsonResponse(response) as { tickets?: SupportTicket[]; staff?: boolean; currentUserId?: string; error?: string };
    if (!response.ok) throw new Error(data.error || "Could not load support tickets");
    setTickets(data.tickets || []); setStaff(Boolean(data.staff)); setCurrentStaffId(data.currentUserId || "");
  }
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch("/api/support/tickets", { cache: "no-store" }).then(async (response) => {
      const data = await readJsonResponse(response) as { tickets?: SupportTicket[]; staff?: boolean; currentUserId?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "Could not load support tickets");
      if (!cancelled) { setTickets(data.tickets || []); setStaff(Boolean(data.staff)); setCurrentStaffId(data.currentUserId || ""); }
    }).catch((reason: Error) => { if (!cancelled) setError(reason.message); });
    return () => { cancelled = true; };
  }, [user]);
  async function createTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch("/api/support/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const data = await readJsonResponse(response) as { ticket?: { id: string }; error?: string };
      if (!response.ok) throw new Error(data.error || "Could not create ticket");
      event.currentTarget.reset(); await loadTickets(); setSelectedId(data.ticket?.id || null);
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }
  async function reply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return; setBusy(true); setError("");
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch("/api/support/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, ticketId: selected.id }) });
      const data = await readJsonResponse(response) as { error?: string };
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
      const data = await readJsonResponse(response) as { ticket?: { id: string }; error?: string };
      if (!response.ok) throw new Error(data.error || "Could not submit feedback");
      event.currentTarget.reset(); setFeedbackRating(0); setFeedbackSent(true); await loadTickets(); setSelectedId(data.ticket?.id || null);
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }
  async function updateTicket(field: "status" | "priority", value: string) {
    if (!selected) return; setBusy(true); setError("");
    const payload = { ticketId: selected.id, status: selected.status, priority: selected.priority, [field]: value };
    try {
      const response = await fetch("/api/support/tickets", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await readJsonResponse(response) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not update ticket");
      await loadTickets();
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }
  async function changeAssignment(assignmentAction: "claim" | "release") {
    if (!selected) return; setBusy(true); setError("");
    try {
      const response = await fetch("/api/support/tickets", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticketId: selected.id, assignmentAction }) });
      const data = await readJsonResponse(response) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not update ticket assignment");
      await loadTickets();
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }
  if (!user) return <section className="ticket-signin"><span><Headphones size={23}/></span><div><h2>Need personal support?</h2><p>Sign in to create a ticket, follow replies, and keep your issue history in one place.</p></div><button onClick={onSignIn}>Sign in to contact support</button></section>;
  return <section className="ticket-centre">
    <header><div><p className="eyebrow"><span/> {staff ? "SUPPORT OPERATIONS" : "PERSONAL SUPPORT"}</p><h2>{staff ? "Ticket queue" : "Your support tickets"}</h2><p>{staff ? "Claim a ticket before responding so every case has one accountable owner." : "Report an issue and follow the conversation with our team."}</p></div><span>{tickets.filter((ticket) => !["resolved","closed"].includes(ticket.status)).length} open</span></header>
    {!staff && <form className="ticket-create" onSubmit={createTicket}><h3>Create a support ticket</h3><div className="form-row"><label>Issue category<select name="category" required defaultValue=""><option value="" disabled>Select category</option>{["order","payment","delivery","refund","account","farm","technical","other"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>Subject<input name="subject" maxLength={180} required placeholder="Briefly describe the issue"/></label></div><label>What happened?<textarea name="message" maxLength={4000} required placeholder="Include the order number, what you expected, and what happened."/></label><button disabled={busy}>{busy ? "Submitting..." : "Create ticket"} <ArrowRight size={15}/></button></form>}
    {!staff && <form className="experience-feedback" onSubmit={submitFeedback}><div><p className="eyebrow"><span/> PRODUCT FEEDBACK</p><h3>How is HarvestNearU working for you?</h3><p>Share what feels easy, confusing, slow, or missing. Your feedback is reviewed by the product support team.</p></div><fieldset><legend>Rate your experience</legend>{[1,2,3,4,5].map((rating) => <label key={rating} className={rating <= feedbackRating ? "selected" : ""}><input type="radio" name="rating" value={rating} checked={feedbackRating === rating} onChange={() => setFeedbackRating(rating)} required/><Star size={20} fill="currentColor"/><span>{rating} {rating === 1 ? "star" : "stars"}</span></label>)}</fieldset><label>Area of the experience<select name="area" required defaultValue="overall"><option value="overall">Overall experience</option><option value="shopping">Finding and buying produce</option><option value="orders">Orders and tracking</option><option value="farmer_workspace">Farmer workspace</option><option value="account">Account and profile</option><option value="accessibility">Accessibility</option><option value="performance">Speed and reliability</option></select></label><label>Your feedback<textarea name="comment" required maxLength={4000} placeholder="Tell us what worked well and what we should improve."/></label><button disabled={busy}>{busy ? "Sending..." : "Send feedback"} <ArrowRight size={15}/></button>{feedbackSent && <p className="feedback-success" role="status"><Check size={14}/> Thank you. Your feedback has been added to the review queue.</p>}</form>}
    {error && <p className="admin-error" role="alert">{error}</p>}
    <div className="ticket-workspace"><aside className="ticket-list">{tickets.length ? tickets.map((ticket) => <button key={ticket.id} className={selected?.id === ticket.id ? "active" : ""} onClick={() => setSelectedId(ticket.id)}><span><strong>{ticket.ticket_number}</strong><i className={ticket.priority}>{ticket.priority}</i></span><b>{ticket.subject}</b><small>{staff ? `${ticket.requester_name} · ` : ""}{ticket.status.replaceAll("_", " ")} · {new Date(ticket.updated_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</small></button>) : <div className="ticket-empty"><div className="ticket-empty-visual" aria-hidden="true"><span><Headphones size={27}/></span><i><Check size={14}/></i><b><Bell size={14}/></b></div><span className="ticket-empty-kicker">{staff ? "QUEUE CLEAR" : "SUPPORT READY"}</span><strong>{staff ? "Everything is handled." : "No support tickets yet."}</strong><p>{staff ? "New customer requests will appear here as soon as they arrive." : "When you contact support, your conversations and their status will be kept here."}</p></div>}</aside>
      {selected && <article className="ticket-thread"><header><div><small>{selected.ticket_number} · {selected.category}</small><h3>{selected.subject}</h3>{staff && <p>{selected.requester_name} · {selected.requester_email}</p>}</div><b className={selected.status}>{selected.status.replaceAll("_", " ")}</b></header>{staff && <div className="ticket-controls"><label>Status<select value={selected.status} disabled={busy || selected.assigned_to !== currentStaffId} onChange={(event) => void updateTicket("status", event.target.value)}>{["open","in_progress","waiting_customer","resolved","closed"].map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label><label>Priority<select value={selected.priority} disabled={busy || selected.assigned_to !== currentStaffId} onChange={(event) => void updateTicket("priority", event.target.value)}>{["low","normal","high","urgent"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label><div className="ticket-assignment"><span>Assigned to</span><strong>{selected.assignee_name || "Unassigned"}</strong>{!selected.assigned_to ? <button disabled={busy} onClick={() => void changeAssignment("claim")}>Assign to me</button> : selected.assigned_to === currentStaffId ? <button disabled={busy} onClick={() => void changeAssignment("release")}>Release ticket</button> : <small>Another staff member is handling this ticket.</small>}</div></div>}<div className="ticket-messages">{selected.messages.map((message) => <div className={`${message.author_role} ${message.is_internal ? "internal" : ""}`} key={message.id}><span><strong>{message.author_name}</strong><small>{message.is_internal ? "Internal note · " : ""}{new Date(message.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</small></span><p>{message.body}</p></div>)}</div><form className="ticket-reply" onSubmit={reply}><label>{staff ? "Reply or internal note" : "Reply"}<textarea name="message" required maxLength={4000} disabled={staff && selected.assigned_to !== currentStaffId} placeholder={staff && selected.assigned_to !== currentStaffId ? "Assign this ticket to yourself to respond." : "Write a clear update..."}/></label>{staff && <label className="admin-check"><input type="checkbox" name="internal" value="true" disabled={selected.assigned_to !== currentStaffId}/> Internal note, hidden from requester</label>}<button disabled={busy || (staff && selected.assigned_to !== currentStaffId)}>{busy ? "Sending..." : "Send reply"} <ArrowRight size={14}/></button></form></article>}
    </div>
  </section>;
}

function SupportPage({ page, onNavigate, user, onSignIn }: { page: "help" | "delivery" | "returns"; onNavigate: (view: View) => void; user: CurrentUser | null; onSignIn: () => void }) {
  const [query, setQuery] = useState("");
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState<{answer:string;sourceTitle:string}|null>(null);
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [pickupCentres, setPickupCentres] = useState<Array<{ id: string; name: string; address_text: string; city: string; state: string; latitude: number; longitude: number; opening_hours: { summary?: string } | null }>>([]);
  useEffect(() => {
    if (page !== "delivery") return;
    let active = true;
    fetch("/api/collection-hubs").then((response) => readJsonResponse<{ centres?: typeof pickupCentres }>(response)).then((result) => {
      if (active) setPickupCentres(result.centres || []);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [page]);
  const faqs = [
    ["Do I need an account to place an order?", "You can browse produce without signing in, but you must create an account or sign in before checkout. Both consumer and farmer accounts can purchase produce and access My orders."],
    ["How do I place an order?", "Open Shop produce, add the quantities you need to your basket, choose distance-priced doorstep delivery, free farm pickup, or Arrange with farmer, and continue to payment. Your order will appear in My orders after it is submitted."],
    ["How are nearby harvests ranked?", "Active produce is shown without a default category or distance filter and is ranked by proximity when you choose Shortest walk first. Walking times are estimates based on the farm's location; the underlying distance is retained for filtering."],
    ["How is produce availability confirmed?", "Farmers publish quantities and harvest dates from their workspace. Optional Available from and Available until dates restrict a listing only when both are supplied. Stock is reserved during checkout, reduced when orders are created, and marked out of stock when exhausted."],
    ["Can I view a farm and get directions before ordering?", "Yes. Select the farm name on any produce card to open its storefront. You can review its address, verified buyer ratings and feedback, current produce, and related recommendations. The free map shows the farm location, and Get directions routes from your current location or falls back to your saved address."],
    ["Can I order produce from more than one farm?", "Yes. A basket can contain produce from multiple farms. Each order keeps the farm and item breakdown, while delivery or pickup availability is shown before payment."],
    ["Where can I find available pickup centres?", "Open Delivery areas to see active HarvestNearU pickup centres, their full address, opening hours, and map location. Farm pickup availability is still confirmed for the produce in your basket."],
    ["How do payments work?", "Paystack is the primary secure payment option. When administrators enable manual bank transfer, checkout displays the company account details and accepts a JPG, PNG, WebP, or PDF receipt. Manual-payment orders remain pending until an administrator verifies the receipt."],
    ["Can I pay with my account credit?", "Yes. Available account credit is applied during checkout. If it covers the full order, no bank transfer or receipt is required. You can see your current balance in the account menu and on your profile."],
    ["Can I cancel an order after submitting payment?", "You can cancel a pending-payment order before an administrator confirms it. Choose full account credit for a future purchase or request a bank refund. Bank refunds include the displayed cancellation fee and require administrator review."],
    ["How do I track and confirm receipt of an order?", "Open My orders to follow every product separately. Confirm each product only after it is delivered or ready for collection. You can rate its farm immediately, while the overall order completes after every product has been acknowledged."],
    ["How do farm ratings work?", "After confirming an individual product, you will be invited to rate the farm that supplied it. You can give one to five stars, add a comment, and update the rating later from the completed order."],
    ["Can a consumer account become a farmer account?", "Yes. Open your profile and choose Become a farmer. Your existing orders, saved produce, and customer history remain on the account while you add farm information for verification."],
    ["Can a farmer manage more than one farm?", "Yes. Farmers can add multiple farms, switch the active farm in the workspace and profile, and manage separate verification, listings, orders, delivery settings, and earnings for each farm."],
    ["How do farmer payouts work?", "Configure a payout account separately for each farm. After customers acknowledge fulfilled items, eligible net earnings appear in the farm workspace. Submit a payout request for administrator review, then follow its status and view or print the payout statement from Payout account and history."],
    ["How do I report a problem and follow the response?", "Sign in and open the Help Centre, then create a support ticket with the category, order number, affected item, and a clear description. You can read staff replies and continue the conversation from your ticket history. Support may ask you to email supporting photographs."],
    ["How do notifications and email preferences work?", "The notification bell shows payment, payout, order, delivery, farm verification, rating, support, and harvest updates. The mobile app can also play a sound for actionable push notifications. Choose optional email categories on your profile; essential security, payment, refund, and active-order messages are always sent. Opening an update marks it as read, and reviewed notifications are cleaned up after you have had time to read them."],
    ["How can I suggest an improvement to HarvestNearU?", "Use Product feedback in the Help Centre to rate your experience, select the affected area, and describe what worked or should improve. The feedback enters the support team's review queue and remains visible in your history."],
  ];
  const visibleFaqs = faqs.filter(([question, answer]) => `${question} ${answer}`.toLowerCase().includes(query.toLowerCase()));
  async function askHelpAssistant(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!assistantQuestion.trim())return;setAssistantBusy(true);try{const response=await fetch("/api/ai/assist",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({feature:"faq",input:assistantQuestion})});const result=await readJsonResponse<{answer?:string;sourceTitle?:string;error?:string}>(response);if(!response.ok)throw new Error(result.error||"The assistant is unavailable");setAssistantAnswer({answer:result.answer||"Please create a support ticket.",sourceTitle:result.sourceTitle||"Help Centre"});}catch(reason){setAssistantAnswer({answer:(reason as Error).message,sourceTitle:"Help Centre"});}finally{setAssistantBusy(false)}}

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
      <form className="help-assistant" onSubmit={askHelpAssistant}><span><img src="/brand/amara-avatar.png" alt="Amara" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:7}}/></span><div><strong>Ask Amara</strong><p>Your HarvestNearU guide. Answers are limited to verified Help Centre guidance.</p><label><span className="sr-only">Ask a question</span><input value={assistantQuestion} onChange={(event)=>setAssistantQuestion(event.target.value)} maxLength={500} placeholder="Ask Amara about orders, delivery, payments, or payouts"/><button disabled={assistantBusy||!assistantQuestion.trim()}>{assistantBusy?"Checking...":"Ask Amara"}</button></label>{assistantAnswer&&<blockquote><p>{assistantAnswer.answer}</p><cite>Amara · Source: {assistantAnswer.sourceTitle}</cite></blockquote>}</div></form>
      <div className="faq-list">{visibleFaqs.map(([question, answer], index) => <article className={`faq-item ${openFaq === index ? "open" : ""}`} key={question}><button aria-expanded={openFaq === index} onClick={() => setOpenFaq(openFaq === index ? null : index)}>{question}<ChevronRight size={16}/></button><div className={`faq-answer-collapse ${openFaq === index ? "open" : ""}`} aria-hidden={openFaq !== index}><div><p>{answer}</p></div></div></article>)}</div>
      {!visibleFaqs.length && <div className="empty-state"><Search size={26}/><h3>No answers found</h3><p>Try a shorter search term or contact our support team.</p></div>}
      <div className="support-note"><Headphones size={24}/><div><strong>Still need help?</strong><span>Our support team is available Monday to Saturday, 8am to 6pm.</span></div><button onClick={() => window.location.href = "mailto:hello@harvestnearu.com"}>Email support</button></div>
      <SupportTicketCentre user={user} onSignIn={onSignIn}/>
    </section>}

    {page === "delivery" && <section className="support-content">
      <div className="support-intro"><div><h2>Current delivery coverage</h2><p>Availability depends on your address and the farm supplying each item. Your exact options appear in the basket.</p></div></div>
      <div className="coverage-grid">
        <article className="coverage-card"><span><Truck size={20}/></span><h3>Central Abuja</h3><p>Doorstep delivery may be offered by farms serving these areas.</p><ul><li><span>Gudu, Wuse, Jabi</span><strong>Check at checkout</strong></li><li><span>Maitama, Asokoro</span><strong>Farm dependent</strong></li><li><span>Lugbe, Gwarinpa</span><strong>Farm dependent</strong></li></ul></article>
        <article className="coverage-card"><span><MapPin size={20}/></span><h3>Greater Abuja</h3><p>Availability depends on each farm&apos;s location, delivery radius, and current circumstances.</p><ul><li><span>Kuje, Bwari</span><strong>Check at checkout</strong></li><li><span>Gwagwalada, Kwali</span><strong>Farm dependent</strong></li><li><span>Karu, Mararaba</span><strong>Farm dependent</strong></li></ul></article>
        {pickupCentres.length ? pickupCentres.map((centre) => <article className="coverage-card pickup-centre-card" key={centre.id}><span><Store size={20}/></span><h3>{centre.name}</h3><p>{centre.address_text}, {centre.city}, {centre.state}</p><ul><li><span>Opening hours</span><strong>{centre.opening_hours?.summary || "Confirm before collection"}</strong></li><li><span>Collection</span><strong>Confirm per item</strong></li></ul><a href={`https://www.openstreetmap.org/?mlat=${centre.latitude}&mlon=${centre.longitude}#map=16/${centre.latitude}/${centre.longitude}`} target="_blank" rel="noreferrer"><MapPin size={14}/> View pickup centre map</a></article>) : <article className="coverage-card"><span><Store size={20}/></span><h3>Farm pickup</h3><p>Pickup is available only from farms that enable it for their listings.</p><ul><li><span>Pickup location</span><strong>Shown in order</strong></li><li><span>Handover timing</span><strong>Coordinate with farm</strong></li><li><span>Receipt</span><strong>Confirm per item</strong></li></ul></article>}
      </div>
      <div className="support-note"><LocateFixed size={24}/><div><strong>Is your area not listed?</strong><span>Coverage is expanding based on demand. Tell us your neighbourhood so we can plan the next route.</span></div><button onClick={() => window.location.href = "mailto:hello@harvestnearu.com?subject=Delivery area request"}>Request my area</button></div>
    </section>}

    {page === "returns" && <section className="support-content">
      <div className="support-intro"><div><h2>Our fresh produce promise</h2><p>Because produce is perishable, issues should be reported promptly. We assess every request fairly with the supplying farmer.</p></div></div>
      <div className="policy-grid">
        <article className="policy-card"><span><Check size={20}/></span><h3>Eligible issues</h3><p>Items that arrive spoiled, damaged, materially different from the listing, or missing from a paid order.</p></article>
        <article className="policy-card"><span><Clock3 size={20}/></span><h3>Report within 6 hours</h3><p>Contact us within six hours of delivery or pickup. Include clear photos and your HarvestNearU order number.</p></article>
        <article className="policy-card"><span><RotateCcw size={20}/></span><h3>Refund review</h3><p>Administrators review each request and record its progress. Bank processing time begins after approval and varies by provider.</p></article>
      </div>
      <div className="refund-steps"><div><strong>Open your order</strong><p>Find the affected purchase under My orders.</p></div><div><strong>Create a ticket</strong><p>Include the order number, farm, and affected item.</p></div><div><strong>Share evidence if asked</strong><p>Support will explain how to provide photographs when needed.</p></div><div><strong>Follow the resolution</strong><p>Track replies and the recorded refund status in your account.</p></div></div>
      <div className="support-note"><PackageCheck size={24}/><div><strong>Need to report an order?</strong><span>Have your order number, farm name, affected item, and a clear description ready.</span></div><button onClick={() => onNavigate(user ? "help" : "orders")}>{user ? "Create support ticket" : "Go to my orders"}</button></div>
    </section>}
  </main>;
}

function SiteFooter({ view, user, onNavigate }: { view: View; user: CurrentUser | null; onNavigate: (view: View) => void }) {
  const role = user?.role;
  return <footer className="site-footer">
    <div className="footer-main">
      <div className="footer-brand">
        <button className="footer-logo" onClick={() => onNavigate("landing")} aria-label="HarvestNearU home"><img src="/brand/harvestnearu-opaque-seal-se2-lockup.png" alt="HarvestNearU" /></button>
        <p>Fresh Nigerian produce, fair prices, and stronger local farming communities.</p>
        <div className="footer-contact"><a href="mailto:hello@harvestnearu.com"><Mail size={15}/> hello@harvestnearu.com</a><a href="#" aria-label="HarvestNearU social profile"><AtSign size={16}/></a></div>
      </div>
      <nav className="footer-links" aria-label="Marketplace links"><strong>Marketplace</strong><button className={view === "landing" ? "active" : ""} onClick={() => onNavigate("landing")}>About HarvestNearU</button>{role !== "admin" && role !== "support" && <button className={view === "market" ? "active" : ""} onClick={() => onNavigate("market")}>Shop produce</button>}{(role === "consumer" || role === "farmer") && <button className={view === "orders" ? "active" : ""} onClick={() => onNavigate("orders")}>My orders</button>}{role === "farmer" && <button className={view === "farmer" ? "active" : ""} onClick={() => onNavigate("farmer")}>Farmer workspace</button>}{(role === "admin" || role === "support") && <button className={view === "admin" ? "active" : ""} onClick={() => onNavigate("admin")}>Administration</button>}</nav>
      <nav className="footer-links" aria-label="Support links"><strong>Account & support</strong>{(role === "consumer" || role === "farmer") && <button className={view === "profile" ? "active" : ""} onClick={() => onNavigate("profile")}>My profile</button>}<button className={view === "help" ? "active" : ""} onClick={() => onNavigate("help")}>Help centre</button><button className={view === "delivery" ? "active" : ""} onClick={() => onNavigate("delivery")}>Delivery areas</button><button className={view === "returns" ? "active" : ""} onClick={() => onNavigate("returns")}>Returns & refunds</button></nav>
      <div className="footer-newsletter"><strong>Harvest notes</strong><p>Subscribe for weekly produce updates and seasonal picks. You can unsubscribe at any time.</p><NewsletterSignup/></div>
    </div>
    <div className="footer-bottom"><span>© 2026 HarvestNearU Nigeria</span><div><a href="/privacy">Privacy</a><a href="/account-deletion">Delete account</a></div><span className="footer-local"><MapPin size={12}/> Fresh Local Produce, Found Here</span></div>
  </footer>;
}

type AdminOverview = {
  metrics: { users: number; verified_farms: number; pending_farms: number; listings: number; orders: number; open_orders: number; open_refunds: number; open_payouts: number; failed_deliveries: number; hidden_reviews: number; active_carts: number; unread_notifications: number; outstanding_credit_kobo: number; gross_sales_kobo: number; cumulative_gross_kobo: number; cumulative_fee_kobo: number; cumulative_net_kobo: number };
  users: Array<{ id: string; first_name: string; last_name: string; email: string; role: string; is_active: boolean; created_at: string }>;
};

type AdminAnalytics = {
  summary: { active_users: number; paying_customers: number; orders_30d: number; revenue_30d_kobo: number; average_order_kobo: number; fulfilment_rate: number };
  daily: Array<{ day: string; orders: number; revenue_kobo: number; customers: number }>;
  statuses: Array<{ status: string; count: number }>;
  farms: Array<{ id: string; name: string; units: number; sales_kobo: number; orders: number }>;
  categories: Array<{ name: string; units: number; sales_kobo: number }>;
};

type AdminEntityType = "users" | "farms" | "produce" | "areas" | "pickup_centres" | "orders" | "refunds" | "payouts" | "reviews" | "subscribers" | "activity";
type AdminEntity = Record<string, unknown> & { id: string };
type AdminOptions = { owners: Array<{ id: string; name: string }>; farms: Array<{ id: string; name: string }>; categories: Array<{ id: string; name: string }>; areas: Array<{ id: string; name: string; city: string; state: string }> };

type CategoryOption = { id: string; name: string };

function ProduceCategoryCreator({ onCreated }: { onCreated: (category: CategoryOption) => void }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  async function createCategory() {
    if (name.trim().length < 2) { setCategoryError("Enter at least 2 characters."); return; }
    setCategoryBusy(true); setCategoryError("");
    try {
      const response = await fetch("/api/produce/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const result = await readJsonResponse<{ category?: CategoryOption; error?: string }>(response);
      if (!response.ok || !result.category) throw new Error(result.error || "Could not create category");
      onCreated(result.category); setName(""); setCreating(false);
    } catch (reason) { setCategoryError((reason as Error).message); } finally { setCategoryBusy(false); }
  }
  return <div className={`produce-category-creator ${creating ? "open" : ""}`}><button type="button" className="add-category-trigger" onClick={() => { setCreating((value) => !value); setCategoryError(""); }} aria-expanded={creating}>{creating ? <X size={15}/> : <Plus size={15}/>} {creating ? "Cancel" : "Add produce category"}</button>{creating && <div className="category-create-row"><label><span>Category name</span><input value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void createCategory(); } }} maxLength={60} placeholder="e.g. Herbs and spices" autoFocus/></label><button type="button" onClick={() => void createCategory()} disabled={categoryBusy}>{categoryBusy ? <LoaderCircle className="spin" size={15}/> : <Check size={15}/>} {categoryBusy ? "Adding..." : "Add category"}</button></div>}{categoryError && <p className="category-create-error" role="alert">{categoryError}</p>}</div>;
}

function adminEntityFilterValue(section: AdminEntityType, entity: AdminEntity) {
  if (section === "users") return String(entity.role || "unknown");
  if (section === "subscribers") return entity.is_active ? "active" : "unsubscribed";
  if (["farms", "produce", "areas", "pickup_centres", "orders", "refunds", "payouts"].includes(section)) return String(entity.status || entity.verification_status || "unknown");
  if (section === "reviews") return entity.is_visible ? "visible" : "hidden";
  return String(entity.entity_type || "system");
}

function AdminAnalyticsView({ analytics, loading, error }: { analytics: AdminAnalytics | null; loading: boolean; error: string }) {
  if (loading && !analytics) return <div className="analytics-loading"><LoaderCircle className="spin" size={24}/><strong>Calculating marketplace performance...</strong></div>;
  if (error && !analytics) return <div className="entity-empty"><BarChart3 size={24}/><strong>Analytics unavailable</strong><p>{error}</p></div>;
  if (!analytics) return null;
  const maxRevenue = Math.max(...analytics.daily.map((item) => Number(item.revenue_kobo)), 1);
  const maxFarmSales = Math.max(...analytics.farms.map((item) => Number(item.sales_kobo)), 1);
  const maxCategorySales = Math.max(...analytics.categories.map((item) => Number(item.sales_kobo)), 1);
  const conversion = Number(analytics.summary.active_users) ? Math.round(Number(analytics.summary.paying_customers) / Number(analytics.summary.active_users) * 1000) / 10 : 0;
  return <section className="admin-analytics">
    <header className="analytics-heading"><div><p className="eyebrow">MARKETPLACE ANALYTICS</p><h2>Performance at a glance</h2><p>Live commercial and customer activity calculated from marketplace records.</p></div><span>Last 30 days</span></header>
    <div className="analytics-kpis">
      <article><small>30-DAY REVENUE</small><strong>{money(Number(analytics.summary.revenue_30d_kobo) / 100)}</strong><p>Paid orders, excluding cancellations and refunds</p></article>
      <article><small>ORDERS</small><strong>{analytics.summary.orders_30d}</strong><p>Orders created during the last 30 days</p></article>
      <article><small>AVERAGE ORDER</small><strong>{money(Number(analytics.summary.average_order_kobo) / 100)}</strong><p>Average value of successful purchases</p></article>
      <article><small>BUYER CONVERSION</small><strong>{conversion}%</strong><p>{analytics.summary.paying_customers} of {analytics.summary.active_users} active users purchased</p></article>
      <article><small>FULFILMENT RATE</small><strong>{Number(analytics.summary.fulfilment_rate).toFixed(1)}%</strong><p>Non-pending orders completed successfully</p></article>
    </div>
    <div className="analytics-grid">
      <section className="analytics-panel analytics-trend"><header><div><h3>Revenue trend</h3><p>Daily paid revenue for the last 30 days</p></div><strong>{money(analytics.daily.reduce((sum, item) => sum + Number(item.revenue_kobo), 0) / 100)}</strong></header><div className="analytics-bars" aria-label="Daily revenue chart">{analytics.daily.map((item) => <div className="analytics-bar-column" key={item.day} title={`${new Date(item.day).toLocaleDateString("en-NG")}: ${money(Number(item.revenue_kobo) / 100)}`}><span style={{ height: `${Math.max(3, Number(item.revenue_kobo) / maxRevenue * 100)}%` }}/><i>{new Date(item.day).getDate()}</i></div>)}</div></section>
      <section className="analytics-panel"><header><div><h3>Order status</h3><p>Current lifecycle distribution</p></div></header><div className="analytics-statuses">{analytics.statuses.map((item) => <div key={item.status}><span className={`status-dot ${item.status}`}/><strong>{statusLabel(item.status)}</strong><b>{item.count}</b></div>)}</div></section>
      <section className="analytics-panel"><header><div><h3>Top-performing farms</h3><p>Ranked by completed sales value</p></div></header><div className="analytics-ranking">{analytics.farms.map((farm, index) => <div key={farm.id}><b>{index + 1}</b><span><strong>{farm.name}</strong><i>{farm.units} units · {farm.orders} orders</i><em><span style={{ width: `${Number(farm.sales_kobo) / maxFarmSales * 100}%` }}/></em></span><mark>{money(Number(farm.sales_kobo) / 100)}</mark></div>)}</div></section>
      <section className="analytics-panel"><header><div><h3>Category performance</h3><p>Sales contribution by produce category</p></div></header><div className="analytics-ranking">{analytics.categories.map((category, index) => <div key={category.name}><b>{index + 1}</b><span><strong>{category.name}</strong><i>{category.units} units sold</i><em><span style={{ width: `${Number(category.sales_kobo) / maxCategorySales * 100}%` }}/></em></span><mark>{money(Number(category.sales_kobo) / 100)}</mark></div>)}</div></section>
    </div>
  </section>;
}

function AdminPage({ user, readOnly, supportAccess, onImpersonated }: { user: CurrentUser; readOnly: boolean; supportAccess: boolean; onImpersonated: (user: CurrentUser) => void }) {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [section, setSection] = useState<"overview" | "analytics" | "tickets" | AdminEntityType>(supportAccess ? "tickets" : "overview");
  const [entities, setEntities] = useState<AdminEntity[]>([]);
  const [selected, setSelected] = useState<AdminEntity | null>(null);
  const [options, setOptions] = useState<AdminOptions>({ owners: [], farms: [], categories: [], areas: [] });
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pickupCentreModal, setPickupCentreModal] = useState<"add" | "edit" | null>(null);
  const [areaModal, setAreaModal] = useState<"add" | "edit" | null>(null);
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
  const [activityAction, setActivityAction] = useState("all");
  const [activityActor, setActivityActor] = useState("all");
  const [activityDate, setActivityDate] = useState("all");
  const [filterReferenceTime] = useState(() => Date.now());
  const [userTimeZone, setUserTimeZone] = useState("UTC");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detectedTimeZone) setUserTimeZone(detectedTimeZone);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function loadOverview() {
    const response = await fetch("/api/admin/overview");
    if (!response.ok) throw new Error("Forbidden");
    setOverview(await readJsonResponse<AdminOverview>(response));
  }

  async function loadEntities(type: AdminEntityType) {
    setBusy(true);
    const response = await fetch(`/api/admin/entities?type=${type}`);
    const data = await readJsonResponse<{ entities?: AdminEntity[]; error?: string }>(response);
    if (!response.ok) throw new Error(data.error || "Could not load records");
    setEntities(data.entities || []);
    setBusy(false);
  }
  async function loadOptions() {
    const response = await fetch("/api/admin/entities?type=options");
    if (!response.ok) throw new Error("Could not load administration options");
    setOptions(await readJsonResponse<AdminOptions>(response));
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/overview").then((response) => { if (!response.ok) throw new Error("Forbidden"); return readJsonResponse<AdminOverview>(response); }),
      fetch("/api/admin/entities?type=options").then((response) => { if (!response.ok) throw new Error("Forbidden"); return readJsonResponse<AdminOptions>(response); }),
      fetch("/api/admin/payment-settings").then((response) => { if (!response.ok) throw new Error("Forbidden"); return readJsonResponse<{ settings?: ManualPaymentSettings }>(response); }),
    ]).then(([overviewData, optionsData, settingsData]) => {
      setOverview(overviewData);
      setOptions(optionsData);
      if (settingsData.settings) setPaymentSettings(settingsData.settings);
    }).catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    if (section === "overview" || section === "tickets") return;
    let cancelled = false;
    if (section === "analytics") {
      fetch("/api/admin/analytics").then(async (response) => {
        const data = await readJsonResponse<AdminAnalytics & { error?: string }>(response);
        if (!response.ok) throw new Error(data.error || "Could not load analytics");
        if (!cancelled) { setAnalytics(data); setBusy(false); }
      }).catch((reason: Error) => { if (!cancelled) { setError(reason.message); setBusy(false); } });
      return () => { cancelled = true; };
    }
    fetch(`/api/admin/entities?type=${section}`).then(async (response) => {
      const data = await readJsonResponse<{ entities?: AdminEntity[]; error?: string }>(response);
      if (!response.ok) throw new Error(data.error || "Could not load records");
      if (!cancelled) { setEntities(data.entities || []); setBusy(false); }
    }).catch((reason: Error) => { if (!cancelled) { setError(reason.message); setBusy(false); } });
    return () => { cancelled = true; };
  }, [section]);

  const filterOptions = useMemo(() => {
    if (section === "overview" || section === "analytics" || section === "tickets") return [];
    const values = new Set(entities.map((entity) => adminEntityFilterValue(section, entity)).filter(Boolean));
    return [...values].sort((left, right) => left.localeCompare(right));
  }, [entities, section]);
  const effectiveEntityFilter = filterOptions.includes(entityFilter) ? entityFilter : "all";
  const activityActions = useMemo(() => [...new Set(entities.map((entity) => String(entity.action || "")).filter(Boolean))].sort(), [entities]);
  const activityActors = useMemo(() => [...new Set(entities.map((entity) => String(entity.actor_name || "")).filter(Boolean))].sort(), [entities]);
  const visibleEntities = useMemo(() => {
    if (section === "overview" || section === "analytics" || section === "tickets") return entities;
    const query = entitySearch.trim().toLowerCase();
    const filtered = entities.filter((entity) => {
      if (effectiveEntityFilter !== "all" && adminEntityFilterValue(section, entity) !== effectiveEntityFilter) return false;
      if (section === "users" && balanceOnly && Number(entity.account_credit_kobo || 0) <= 0) return false;
      if (section === "users" && joinedDateFilter !== "all") {
        const joinedAt = new Date(String(entity.created_at)).getTime();
        const days = Number(joinedDateFilter);
        if (!Number.isFinite(joinedAt) || joinedAt < filterReferenceTime - days * 24 * 60 * 60 * 1000) return false;
      }
      if (section === "activity") {
        if (activityAction !== "all" && String(entity.action) !== activityAction) return false;
        if (activityActor !== "all" && String(entity.actor_name) !== activityActor) return false;
        if (activityDate !== "all") {
          const occurredAt = new Date(String(entity.created_at)).getTime();
          if (!Number.isFinite(occurredAt)) return false;
          if (activityDate === "today") {
            const dateKey = (value: number) => new Intl.DateTimeFormat("en-CA", { timeZone: userTimeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
            if (dateKey(occurredAt) !== dateKey(filterReferenceTime)) return false;
          } else if (occurredAt < filterReferenceTime - Number(activityDate) * 24 * 60 * 60 * 1000) return false;
        }
      }
      if (!query) return true;
      return Object.entries(entity).some(([key, value]) => !["password_hash", "items"].includes(key) && value !== null && String(value).toLowerCase().includes(query));
    });
    if (section !== "users") return filtered;
    return [...filtered].sort((left, right) => {
      const difference = new Date(String(right.created_at)).getTime() - new Date(String(left.created_at)).getTime();
      return joinedDateSort === "oldest" ? -difference : difference;
    });
  }, [activityAction, activityActor, activityDate, balanceOnly, effectiveEntityFilter, entities, entitySearch, filterReferenceTime, joinedDateFilter, joinedDateSort, section, userTimeZone]);

  async function openDetails(type: AdminEntityType, id: string) {
    setError("");
    const response = await fetch(`/api/admin/entities?type=${type}&id=${id}`);
    const data = await readJsonResponse(response) as { entity?: AdminEntity; error?: string };
    if (!response.ok || !data.entity) return setError(data.error || "Could not load details");
    setSelected(data.entity);
  }

  async function addEntity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (section === "overview" || section === "analytics" || section === "tickets") return;
    setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const image = form.get("image");
    form.delete("image");
    const values = Object.fromEntries(form.entries());
    let uploadedUrl = "";
    if (section === "produce") {
      if (!(image instanceof File) || !image.size) {
        setError("Upload a produce picture before creating the listing."); setBusy(false); return;
      }
      try {
        uploadedUrl = await uploadListingImage(image);
        values.imageUrl = uploadedUrl;
      } catch (reason) {
        setError((reason as Error).message); setBusy(false); return;
      }
    }
    if (["farms", "areas", "pickup_centres"].includes(section) && (!values.latitude || !values.longitude)) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000 }));
        values.latitude = String(position.coords.latitude);
        values.longitude = String(position.coords.longitude);
      } catch {
        setError(`Allow location access while at the ${section === "farms" ? "farm" : section === "areas" ? "area" : "pickup centre"} so its coordinates can be recorded.`); setBusy(false); return;
      }
    }
    const response = await fetch(`/api/admin/entities?type=${section}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const data = await readJsonResponse(response) as { error?: string };
    if (!response.ok) {
      if (uploadedUrl) void fetch("/api/uploads/listing-image", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: uploadedUrl }) });
      setError(data.error || "Could not add record"); setBusy(false); return;
    }
    setAddOpen(false);
    setPickupCentreModal(null);
    setAreaModal(null);
    await Promise.all([loadEntities(section), loadOverview(), section === "areas" ? loadOptions() : Promise.resolve()]);
  }

  async function removeEntity() {
    if (!selected || section === "overview" || section === "analytics" || section === "tickets" || !window.confirm(`Remove this ${section === "produce" ? "produce listing" : section === "pickup_centres" ? "pickup centre" : section.slice(0, -1)}? Historical records will be retained.`)) return;
    setBusy(true); setError("");
    const response = await fetch(`/api/admin/entities?type=${section}&id=${selected.id}`, { method: "DELETE" });
    const data = await readJsonResponse(response) as { error?: string };
    if (!response.ok) { setError(data.error || "Could not remove record"); setBusy(false); return; }
    setSelected(null);
    await Promise.all([loadEntities(section), loadOverview(), section === "areas" ? loadOptions() : Promise.resolve()]);
  }

  async function editEntity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || section === "overview" || section === "analytics" || section === "tickets") return;
    setBusy(true); setError("");
    let uploadedUrl = "";
    try {
      const form = new FormData(event.currentTarget);
      const image = form.get("image");
      form.delete("image");
      const values = Object.fromEntries(form.entries());
      if (section === "produce" && image instanceof File && image.size) {
        uploadedUrl = await uploadListingImage(image);
        values.imageUrl = uploadedUrl;
      }
      const response = await fetch(`/api/admin/entities?type=${section}&id=${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const responseText = await response.text();
      const data = responseText ? JSON.parse(responseText) as { entity?: AdminEntity; error?: string } : {};
      if (!response.ok || !data.entity) throw new Error(data.error || "Could not update record");
      setEditOpen(false);
      setPickupCentreModal(null);
      setAreaModal(null);
      await Promise.all([loadEntities(section), loadOverview(), section === "areas" ? loadOptions() : Promise.resolve()]);
      await openDetails(section, selected.id);
    } catch (reason) {
      if (uploadedUrl) void fetch("/api/uploads/listing-image", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: uploadedUrl }) });
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
      const data = await readJsonResponse(response) as { user?: CurrentUser; error?: string };
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
  async function updatePayout(status: "processing" | "paid" | "rejected" | "cancelled") {
    if (!selected || section !== "payouts") return;
    const action = status === "paid" ? "mark this payout as paid" : `${status} this payout request`;
    if (!window.confirm(`Are you sure you want to ${action}?`)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/entities?type=payouts&id=${selected.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
      });
      const result = await readJsonResponse<{ entity?: AdminEntity; error?: string }>(response);
      if (!response.ok || !result.entity) throw new Error(result.error || "Could not update payout request");
      await Promise.all([loadEntities("payouts"), loadOverview()]);
      await openDetails("payouts", selected.id);
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }

  async function cancelAdminOrder() {
    if (!selected || section !== "orders") return;
    if (!window.confirm(`Cancel order #${String(selected.order_number)}? The customer and affected farms will be notified.`)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/entities?type=orders&id=${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const result = await readJsonResponse<{ error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "Could not cancel the order");
      setSelected(null);
      await Promise.all([loadEntities("orders"), loadOverview()]);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function savePaymentSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch("/api/admin/payment-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bankName: values.bankName, accountName: values.accountName, accountNumber: values.accountNumber, instructions: values.instructions, isEnabled: values.isEnabled === "true" }) });
      const result = await readJsonResponse(response) as { settings?: ManualPaymentSettings; error?: string };
      if (!response.ok || !result.settings) throw new Error(result.error || "Could not save payment settings");
      setPaymentSettings(result.settings); setPaymentSettingsOpen(false);
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }

  if (failed) return <main className="admin-page"><div className="empty-state"><X size={28}/><h3>Administration unavailable</h3><p>Your session does not have permission to view this workspace.</p></div></main>;
  if (!overview) return <DataLoading />;
  const metrics = overview.metrics;
  return <main className="admin-page">
    <header className="admin-heading"><div><p className="eyebrow"><span/> MARKETPLACE OPERATIONS</p><h1>Administration</h1><p>Monitor people, farms, listings, orders, and customer resolutions.</p></div><div className="admin-heading-tools">{!readOnly && <button onClick={() => { setError(""); setPaymentSettingsOpen(true); }}><AtSign size={15}/> Bank payment details</button>}<span className="admin-live"><i/> {readOnly ? "Read-only support access" : "Live database"}</span></div></header>
    {section === "produce" && !readOnly && <ProduceCategoryCreator onCreated={(category) => setOptions((current) => ({ ...current, categories: [...current.categories.filter((item) => item.id !== category.id), category].sort((a,b) => a.name.localeCompare(b.name)) }))}/>} 
    <div className="admin-workspace">
      <label className="admin-mobile-section"><span className="sr-only">Administration section</span><select aria-label="Administration section" value={section} onChange={(event) => { const next = event.target.value as typeof section; setSection(next); setSelected(null); setError(""); setBusy(next !== "overview" && next !== "tickets"); }}>{(["overview", "tickets", "analytics", "users", "farms", "produce", "areas", "pickup_centres", "orders", "refunds", "payouts", "reviews", "subscribers", "activity"] as const).filter((item) => supportAccess ? !["analytics", "subscribers", "activity"].includes(item) : true).map((item) => <option key={item} value={item}>{item === "produce" ? "Produce listings" : item === "pickup_centres" ? "Pickup centres" : item === "tickets" ? "Support tickets" : item === "subscribers" ? "Campaign subscribers" : item[0].toUpperCase() + item.slice(1)}{item === "refunds" && metrics.open_refunds > 0 ? ` (${metrics.open_refunds})` : item === "payouts" && metrics.open_payouts > 0 ? ` (${metrics.open_payouts})` : ""}</option>)}</select><ChevronDown size={16}/></label>
      <nav className="admin-tabs" aria-label="Administration sections"><small>Workspace</small>{(["overview", "tickets", "analytics", "users", "farms", "produce", "areas", "pickup_centres", "orders", "refunds", "payouts", "reviews", "subscribers", "activity"] as const).filter((item) => supportAccess ? !["analytics", "subscribers", "activity"].includes(item) : true).map((item) => <button key={item} className={section === item ? "active" : ""} onClick={() => { setSection(item); setSelected(null); setError(""); setBusy(item !== "overview" && item !== "tickets"); }}>{item === "overview" ? <House size={15}/> : item === "tickets" ? <Headphones size={15}/> : item === "analytics" ? <BarChart3 size={15}/> : item === "users" ? <UserRound size={15}/> : item === "farms" ? <Store size={15}/> : item === "produce" ? <Leaf size={15}/> : item === "areas" || item === "pickup_centres" ? <MapPin size={15}/> : item === "orders" ? <PackageCheck size={15}/> : item === "refunds" ? <RotateCcw size={15}/> : item === "payouts" ? <CreditCard size={15}/> : item === "reviews" ? <Star size={15}/> : item === "subscribers" ? <Mail size={15}/> : <Clock3 size={15}/>}<span>{item === "pickup_centres" ? "Pickup centres" : item === "tickets" ? "Support tickets" : item === "subscribers" ? "Campaign subscribers" : item}</span>{item === "refunds" && metrics.open_refunds > 0 && <b className="admin-tab-count">{metrics.open_refunds}</b>}{item === "payouts" && metrics.open_payouts > 0 && <b className="admin-tab-count">{metrics.open_payouts}</b>}</button>)}</nav>
      <div className="admin-workspace-content">
    {section === "overview" ? <>
      <section className="admin-metrics"><article><span><UserRound size={19}/></span><small>ACTIVE USERS</small><strong>{metrics.users}</strong><p>{metrics.active_carts} active shopping carts</p></article><article><span><Store size={19}/></span><small>VERIFIED FARMS</small><strong>{metrics.verified_farms}</strong><p>{metrics.pending_farms} awaiting review</p></article><article><span><Leaf size={19}/></span><small>ACTIVE LISTINGS</small><strong>{metrics.listings}</strong><p>Available marketplace harvests</p></article><article><span><PackageCheck size={19}/></span><small>OPEN ORDERS</small><strong>{metrics.open_orders}</strong><p>{metrics.orders} orders recorded</p></article><article><span><RotateCcw size={19}/></span><small>OPEN REFUNDS</small><strong>{metrics.open_refunds}</strong><p>Awaiting a resolution</p></article><article><span><CreditCard size={19}/></span><small>OPEN PAYOUTS</small><strong>{metrics.open_payouts}</strong><p>Farmer requests requiring action</p></article><article><span><AtSign size={19}/></span><small>CUMULATIVE GROSS SALES</small><strong>{money(Number(metrics.cumulative_gross_kobo) / 100)}</strong><p>Completed produce sales</p></article><article><span><Minus size={19}/></span><small>PROCESSING FEES</small><strong>{money(Number(metrics.cumulative_fee_kobo) / 100)}</strong><p>Cumulative platform revenue</p></article><article><span><Check size={19}/></span><small>FARMER NET SALES</small><strong>{money(Number(metrics.cumulative_net_kobo) / 100)}</strong><p>Earned after processing fees</p></article><article><span><Truck size={19}/></span><small>DELIVERY ISSUES</small><strong>{metrics.failed_deliveries}</strong><p>Failed deliveries</p></article><article><span><Bell size={19}/></span><small>UNREAD UPDATES</small><strong>{metrics.unread_notifications}</strong><p>{metrics.hidden_reviews} hidden reviews</p></article></section>
      <section className="admin-credit-balance"><span><AtSign size={20}/></span><div><small>OUTSTANDING ACCOUNT CREDIT</small><strong>{money(Number(metrics.outstanding_credit_kobo) / 100)}</strong><p>Total customer credit currently available for future marketplace purchases.</p></div><button onClick={() => { setBusy(true); setSection("users"); }}>View customer balances <ArrowRight size={15}/></button></section>
      <div className="admin-grid"><section className="admin-panel"><div className="admin-panel-head"><div><h2>Recent users</h2><p>Latest accounts across the marketplace</p></div><button onClick={() => { setBusy(true); setSection("users"); }}>View all <ArrowRight size={15}/></button></div><div className="admin-user-list">{overview.users.slice(0, 8).map((user) => <button className="admin-user-row" key={user.id} onClick={() => { setBusy(true); setSection("users"); setTimeout(() => openDetails("users", user.id), 0); }}><span>{user.first_name[0]}{user.last_name[0]}</span><div><strong>{user.first_name} {user.last_name}</strong><small>{user.email}</small></div><b className={`role-badge ${user.role}`}>{user.role}</b><i className={user.is_active ? "active" : ""}>{user.is_active ? "Active" : "Disabled"}</i></button>)}</div></section><aside className="admin-side"><section><div className="admin-panel-head"><div><h2>Attention needed</h2><p>Items requiring administrator action</p></div></div><button onClick={() => { setBusy(true); setSection("farms"); }}><span><Store size={17}/></span><div><strong>Farm verification</strong><small>{metrics.pending_farms} pending applications</small></div><ChevronRight size={16}/></button><button onClick={() => { setBusy(true); setSection("refunds"); }}><span><RotateCcw size={17}/></span><div><strong>Refund requests</strong><small>{metrics.open_refunds} open cases</small></div><ChevronRight size={16}/></button><button onClick={() => { setBusy(true); setSection("payouts"); }}><span><CreditCard size={17}/></span><div><strong>Farmer payouts</strong><small>{metrics.open_payouts} awaiting action</small></div><ChevronRight size={16}/></button><button onClick={() => { setBusy(true); setSection("orders"); }}><span><Truck size={17}/></span><div><strong>Delivery exceptions</strong><small>{metrics.failed_deliveries} failed deliveries</small></div><ChevronRight size={16}/></button></section><section className="admin-health"><div className="admin-panel-head"><div><h2>System status</h2><p>Core marketplace services</p></div></div><div><span><i/> Neon database</span><strong>Operational</strong></div><div><span><i/> Blob image storage</span><strong>Operational</strong></div><div><span><i/> Authentication</span><strong>Operational</strong></div></section></aside></div>
    </> : section === "tickets" ? <SupportTicketCentre user={user} onSignIn={() => undefined}/> : section === "analytics" ? <AdminAnalyticsView analytics={analytics} loading={busy} error={error}/> : <section className="entity-manager">
      <div className="entity-toolbar"><div><h2>{section === "produce" ? "Produce listings" : section === "pickup_centres" ? "Pickup centres" : section === "subscribers" ? "Campaign subscribers" : section[0].toUpperCase() + section.slice(1)}</h2><p>{entities.length} database records</p></div>{!readOnly && ["users","farms","produce","areas","pickup_centres"].includes(section) && <button onClick={() => { setError(""); if (section === "pickup_centres") setPickupCentreModal("add"); else if (section === "areas") setAreaModal("add"); else setAddOpen(true); }}><Plus size={16}/> Add {section === "produce" ? "produce" : section === "pickup_centres" ? "pickup centre" : section.slice(0, -1)}</button>}</div>
      <div className="entity-list-controls">
        <div className="entity-search"><Search size={16}/><input type="search" aria-label={`Search ${section}`} value={entitySearch} onChange={(event) => setEntitySearch(event.target.value)} placeholder={`Search ${section === "produce" ? "produce listings" : section}...`}/>{entitySearch && <button type="button" onClick={() => setEntitySearch("")} aria-label="Clear search"><X size={14}/></button>}</div>
        <label className="entity-filter"><SlidersHorizontal size={16}/><span className="sr-only">Filter {section}</span><select value={effectiveEntityFilter} onChange={(event) => setEntityFilter(event.target.value)}><option value="all">All {section === "users" ? "roles" : section === "reviews" ? "visibility" : section === "activity" ? "entity types" : "statuses"}</option>{filterOptions.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></label>
        {section === "activity" && <><label className="entity-filter"><Clock3 size={16}/><select aria-label="Filter activity action" value={activityAction} onChange={(event) => setActivityAction(event.target.value)}><option value="all">All activity types</option>{activityActions.map((action) => <option key={action} value={action}>{action.replaceAll("_", " ").replaceAll(".", " ")}</option>)}</select></label><label className="entity-filter"><UserRound size={16}/><select aria-label="Filter activity actor" value={activityActor} onChange={(event) => setActivityActor(event.target.value)}><option value="all">All team members</option>{activityActors.map((actor) => <option key={actor} value={actor}>{actor}</option>)}</select></label><label className="entity-filter"><Clock3 size={16}/><select aria-label="Filter activity date" value={activityDate} onChange={(event) => setActivityDate(event.target.value)}><option value="all">Any date</option><option value="today">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label></>}
        {section === "users" && <label className="entity-filter entity-date-filter"><Clock3 size={16}/><span className="sr-only">Filter by joined date</span><select value={joinedDateFilter} onChange={(event) => setJoinedDateFilter(event.target.value)}><option value="all">Joined anytime</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last 12 months</option></select></label>}
        {section === "users" && <label className="entity-filter entity-date-sort"><span className="sr-only">Sort by joined date</span><select value={joinedDateSort} onChange={(event) => setJoinedDateSort(event.target.value)}><option value="newest">Newest joined</option><option value="oldest">Oldest joined</option></select></label>}
        {section === "users" && <button className={`entity-balance-filter ${balanceOnly ? "active" : ""}`} type="button" aria-pressed={balanceOnly} onClick={() => setBalanceOnly((current) => !current)}><AtSign size={15}/> Has balance <b>{entities.filter((entity) => Number(entity.account_credit_kobo || 0) > 0).length}</b></button>}
        <span className="entity-result-count">Showing <strong>{visibleEntities.length}</strong> of {entities.length}</span>
        {(entitySearch || effectiveEntityFilter !== "all" || (section === "activity" && (activityAction !== "all" || activityActor !== "all" || activityDate !== "all")) || (section === "users" && (balanceOnly || joinedDateFilter !== "all" || joinedDateSort !== "newest"))) && <button className="entity-clear-filters" type="button" onClick={() => { setEntitySearch(""); setEntityFilter("all"); setBalanceOnly(false); setJoinedDateFilter("all"); setJoinedDateSort("newest"); setActivityAction("all"); setActivityActor("all"); setActivityDate("all"); }}><X size={14}/> Clear</button>}
      </div>
      {error && <p className="admin-error" role="alert">{error}</p>}
      {busy && !addOpen ? <div className="entity-loading"><Clock3 size={20}/> Updating records...</div> : visibleEntities.length ? <div className="entity-table">{visibleEntities.map((entity) => <AdminEntityRow key={entity.id} section={section} entity={entity} onOpen={() => openDetails(section, entity.id)} onReviewRefund={(refundId) => { setSection("refunds"); setSelected(null); setBusy(true); void openDetails("refunds", refundId).finally(() => setBusy(false)); }}/>)}</div> : <div className="entity-empty"><Search size={22}/><strong>No matching records</strong><p>Try a different search term or filter.</p><button type="button" onClick={() => { setEntitySearch(""); setEntityFilter("all"); setBalanceOnly(false); setJoinedDateFilter("all"); setJoinedDateSort("newest"); }}>Clear search and filter</button></div>}
    </section>}
      </div>
    </div>

    {areaModal && <div className="modal-overlay admin-edit-overlay" onMouseDown={() => setAreaModal(null)}><div className="admin-add-modal" onMouseDown={(event) => event.stopPropagation()}><button className="close-modal" onClick={() => setAreaModal(null)}><X size={19}/></button><p className="auth-kicker">{areaModal === "add" ? "NEW SERVICE AREA" : "EDIT SERVICE AREA"}</p><h2>{areaModal === "add" ? "Add delivery area" : String(selected?.name || "Area")}</h2><p>Areas appear in the marketplace location picker and group pickup centres.</p><form onSubmit={areaModal === "add" ? addEntity : editEntity}><label>Area name<input name="name" defaultValue={areaModal === "edit" ? String(selected?.name || "") : ""} required placeholder="e.g. Gudu"/></label><div className="form-row"><label>City<input name="city" defaultValue={areaModal === "edit" ? String(selected?.city || "") : "Abuja"} required/></label><label>State<input name="state" defaultValue={areaModal === "edit" ? String(selected?.state || "") : "FCT"} required/></label></div><div className="form-row"><label>Latitude<input name="latitude" type="number" step="any" min="-90" max="90" defaultValue={areaModal === "edit" ? Number(selected?.latitude) : undefined} placeholder="Capture automatically"/></label><label>Longitude<input name="longitude" type="number" step="any" min="-180" max="180" defaultValue={areaModal === "edit" ? Number(selected?.longitude) : undefined} placeholder="Capture automatically"/></label></div>{areaModal === "edit" && <label className="admin-check"><input name="isActive" type="checkbox" value="true" defaultChecked={Boolean(selected?.is_active)}/> Show to customers</label>}{error && <p className="admin-error" role="alert">{error}</p>}<button className="admin-submit" disabled={busy}>{busy ? "Saving..." : areaModal === "add" ? "Create area" : "Save area"} {!busy && <ArrowRight size={16}/>}</button></form></div></div>}

    {pickupCentreModal && <div className="modal-overlay admin-edit-overlay" onMouseDown={() => setPickupCentreModal(null)}><div className="admin-add-modal" onMouseDown={(event) => event.stopPropagation()}><button className="close-modal" onClick={() => setPickupCentreModal(null)}><X size={19}/></button><p className="auth-kicker">{pickupCentreModal === "add" ? "NEW PICKUP CENTRE" : "EDIT PICKUP CENTRE"}</p><h2>{pickupCentreModal === "add" ? "Add pickup centre" : String(selected?.name || "Pickup centre")}</h2><p>{pickupCentreModal === "add" ? "Create a customer collection location. Enter coordinates or allow location access while at the centre." : "Keep the public location, opening hours, and availability accurate."}</p><form onSubmit={pickupCentreModal === "add" ? addEntity : editEntity}><label>Service area<select name="areaId" defaultValue={pickupCentreModal === "edit" ? String(selected?.area_id || "") : ""} required><option value="" disabled>Select area</option>{options.areas.map((area) => <option key={area.id} value={area.id}>{area.name}, {area.city} · {area.state}</option>)}</select></label><label>Centre name<input name="name" defaultValue={pickupCentreModal === "edit" ? String(selected?.name || "") : ""} required placeholder="e.g. Gudu Community Pickup Centre"/></label><label>Street address<input name="address" defaultValue={pickupCentreModal === "edit" ? String(selected?.address_text || "") : ""} required/></label><div className="form-row"><label>City<input name="city" defaultValue={pickupCentreModal === "edit" ? String(selected?.city || "") : ""} required/></label><label>State<input name="state" defaultValue={pickupCentreModal === "edit" ? String(selected?.state || "") : ""} required/></label></div><div className="form-row"><label>Latitude<input name="latitude" type="number" step="any" min="-90" max="90" defaultValue={pickupCentreModal === "edit" ? Number(selected?.latitude) : undefined} placeholder="Capture automatically"/></label><label>Longitude<input name="longitude" type="number" step="any" min="-180" max="180" defaultValue={pickupCentreModal === "edit" ? Number(selected?.longitude) : undefined} placeholder="Capture automatically"/></label></div><label>Opening hours<input name="openingHours" defaultValue={pickupCentreModal === "edit" && selected?.opening_hours && typeof selected.opening_hours === "object" ? String((selected.opening_hours as { summary?: string }).summary || "") : ""} required placeholder="Mon-Sat, 8:00am-6:00pm"/></label>{pickupCentreModal === "edit" && <label className="admin-check"><input name="isActive" type="checkbox" value="true" defaultChecked={Boolean(selected?.is_active)}/> Available to customers</label>}{error && <p className="admin-error" role="alert">{error}</p>}<button className="admin-submit" disabled={busy}>{busy ? "Saving..." : pickupCentreModal === "add" ? "Create pickup centre" : "Save pickup centre"} {!busy && <ArrowRight size={16}/>}</button></form></div></div>}

    {selected && section !== "overview" && section !== "tickets" && section !== "analytics" && <div className="admin-drawer-overlay" onMouseDown={() => setSelected(null)}>
      <aside className="admin-detail" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><small>{section === "produce" ? "PRODUCE LISTING" : section === "activity" ? "AUDIT EVENT" : section.slice(0, -1).toUpperCase()}</small><h2>{entityTitle(section, selected)}</h2></div><button onClick={() => setSelected(null)} aria-label="Close details"><X size={19}/></button></header>
        {["orders", "refunds"].includes(section) && Boolean(selected.payment_receipt_name) && <section className="admin-payment-review"><span><PackageCheck size={19}/></span><div><strong>Manual payment receipt</strong><small>Submitted {formatEntityValue("submitted_at", selected.payment_receipt_submitted_at)}</small></div><a href={`/api/payments/manual/${section === "orders" ? selected.id : selected.order_id}`} target="_blank" rel="noreferrer">Open receipt</a></section>}
        {section === "payouts" && <section className="admin-payment-review"><span><CreditCard size={19}/></span><div><strong>Payout destination</strong><small>{selected.account_name ? `${String(selected.account_name)} · account ending ${String(selected.account_last4)}` : "No payout account configured"}</small></div><b>{money(Number(selected.net_amount_kobo) / 100)}</b></section>}
        {section === "payouts" && Array.isArray(selected.orders) && <section className="payout-drawer-breakdown"><header><div><small>SETTLEMENT BREAKDOWN</small><strong>{String(selected.order_count)} fulfilled {Number(selected.order_count) === 1 ? "order" : "orders"}</strong></div><span>{money(Number(selected.net_amount_kobo) / 100)} net</span></header><div className="payout-drawer-orders">{(selected.orders as Array<Record<string, unknown>>).map((order, index) => <article key={`${String(order.order_number)}-${index}`}><strong>Order #{String(order.order_number)}</strong><dl><div><dt>Gross</dt><dd>{money(Number(order.gross_kobo) / 100)}</dd></div><div><dt>Fee</dt><dd className="fee">-{money(Number(order.fee_kobo) / 100)}</dd></div><div><dt>Net</dt><dd>{money(Number(order.net_kobo) / 100)}</dd></div></dl></article>)}</div></section>}
        <div className="entity-details">{Object.entries(selected).filter(([key, value]) => showAdminDetailField(key, value)).map(([key, value]) => <div key={key}><span>{key.replaceAll("_", " ")}</span><strong>{formatEntityValue(key, value)}</strong></div>)}</div>
        {!readOnly && !["activity", "subscribers"].includes(section) && <footer className="admin-detail-actions">
          {section === "users" && <button className="impersonate-user" onClick={impersonateUser} disabled={busy}><Eye size={16}/> View as this user</button>}
          {section === "orders" && selected.status === "pending_payment" && Boolean(selected.payment_receipt_name) && <button className="confirm-manual-payment" onClick={confirmManualPayment} disabled={busy}><Check size={16}/> {busy ? "Confirming..." : "Confirm payment"}</button>}
          {section === "orders" && selected.status !== "cancelled" && <button className="cancel-admin-order" onClick={cancelAdminOrder} disabled={busy}><X size={16}/> {busy ? "Working..." : "Cancel order"}</button>}
          {section === "payouts" && selected.status === "requested" && <button className="edit-entity" onClick={() => void updatePayout("processing")} disabled={busy}><Eye size={16}/> Begin review</button>}
          {section === "payouts" && ["requested", "processing"].includes(String(selected.status)) && <button className="verify-farm" onClick={() => void updatePayout("paid")} disabled={busy}><Check size={16}/> Mark as paid</button>}
          {section === "payouts" && ["requested", "processing"].includes(String(selected.status)) && <button className="reject-farm" onClick={() => void updatePayout("rejected")} disabled={busy}><X size={16}/> Reject request</button>}
          {section !== "payouts" && !(section === "orders" && selected.status === "pending_payment") && <button className="edit-entity" onClick={() => { setError(""); if (section === "pickup_centres") setPickupCentreModal("edit"); else if (section === "areas") setAreaModal("edit"); else setEditOpen(true); }} disabled={busy}>{["orders","refunds","reviews"].includes(section) ? "Manage record" : "Edit details"}</button>}
          {section === "farms" && selected.verification_status !== "verified" && <button className="verify-farm" onClick={() => updateFarmVerification("verified")} disabled={busy}><Check size={16}/> Verify farm</button>}
          {section === "farms" && selected.verification_status !== "rejected" && <button className="reject-farm" onClick={() => updateFarmVerification("rejected")} disabled={busy}><X size={16}/> Reject</button>}
          {["users","farms","produce","areas","pickup_centres"].includes(section) && <button className="remove-entity" onClick={removeEntity} disabled={busy}><Trash2 size={16}/> {section === "pickup_centres" ? "Deactivate centre" : section === "areas" ? "Deactivate area" : <>Remove {section === "produce" ? "listing" : section.slice(0, -1)}</>}</button>}
        </footer>}
      </aside>
    </div>}

    {addOpen && section !== "overview" && <div className="modal-overlay" onMouseDown={() => setAddOpen(false)}><div className="admin-add-modal" onMouseDown={(event) => event.stopPropagation()}><button className="close-modal" onClick={() => setAddOpen(false)}><X size={19}/></button><p className="auth-kicker">NEW {section === "produce" ? "LISTING" : section.slice(0, -1).toUpperCase()}</p><h2>Add {section === "produce" ? "produce" : section.slice(0, -1)}</h2><p>Create a new marketplace record. Required fields are marked.</p><form onSubmit={addEntity}>{section === "users" ? <><div className="form-row"><label>First name<input name="firstName" required/></label><label>Last name<input name="lastName" required/></label></div><label>Email<input name="email" type="email" required/></label><label>Phone<input name="phone" required/></label><label>Role<select name="role" required><option value="consumer">Consumer</option><option value="farmer">Farmer</option><option value="support">Support</option><option value="admin">Administrator</option></select></label><label>Temporary password<input name="password" type="password" minLength={8} required/></label></> : section === "farms" ? <><label>Farmer owner<select name="ownerId" required><option value="">Select owner</option>{options.owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select></label><label>Farm name<input name="name" required/></label><div className="form-row"><label>Phone<input name="phone" required/></label><label>Email<input name="email" type="email"/></label></div><label>Address<input name="address" required/></label><div className="form-row"><label>City<input name="city" required/></label><label>State<input name="state" required/></label></div><label className="admin-check"><input type="checkbox" name="offersDelivery" value="true"/> Offers delivery</label></> : <><label>Farm<select name="farmId" required><option value="">Select farm</option>{options.farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select></label><label>Category<select name="categoryId" required><option value="">Select category</option>{options.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Produce name<input name="name" required/></label><div className="form-row"><label>Unit<input name="unit" placeholder="basket" required/></label><label>Price (NGN)<input name="price" type="number" min="1" required/></label></div><div className="form-row"><label>Stock quantity<input name="stock" type="number" min="1" required/></label><label>Harvest date<input name="harvestDate" type="date" required/></label></div><div className="form-row"><label>Available from (optional)<input name="availableFrom" type="datetime-local"/></label><label>Available until (optional)<input name="availableUntil" type="datetime-local"/></label></div><label>Produce picture<input name="image" type="file" accept="image/png,image/jpeg,image/webp" required/><small>Required. JPG, PNG, or WebP up to 4 MB.</small></label><label>Badge<input name="badge" placeholder="New harvest"/></label></>} {error && <p className="admin-error" role="alert">{error}</p>}<button className="admin-submit" disabled={busy}>{busy ? "Saving..." : "Create record"} {!busy && <ArrowRight size={16}/>}</button></form></div></div>}
    {editOpen && selected && section !== "overview" && <div className="modal-overlay admin-edit-overlay" onMouseDown={() => setEditOpen(false)}><div className="admin-add-modal" onMouseDown={(event) => event.stopPropagation()}><button className="close-modal" onClick={() => setEditOpen(false)}><X size={19}/></button><p className="auth-kicker">EDIT {section === "produce" ? "LISTING" : section.slice(0, -1).toUpperCase()}</p><h2>{entityTitle(section, selected)}</h2><p>Update this record. Changes are saved to the audit log.</p><form onSubmit={editEntity}>{section === "orders" ? <label>Order status<select name="status" defaultValue={String(selected.status)} required>{["paid","confirmed","preparing","ready","dispatched","delivered","collected","cancelled","refunded"].map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label> : section === "refunds" ? <><label>Refund status<select name="status" defaultValue={String(selected.status)} required>{["requested","under_review","approved","rejected","processing","completed","failed"].map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label><label>Resolution note<textarea name="adminNote" defaultValue={String(selected.resolution_note || "")} placeholder="Explain the decision or next action"/></label></> : section === "reviews" ? <><label>Visibility<select name="isVisible" defaultValue={selected.is_visible ? "true" : "false"}><option value="true">Visible</option><option value="false">Hidden</option></select></label><label>Farmer reply<textarea name="farmerReply" defaultValue={String(selected.farmer_reply || "")} placeholder="Optional public response"/></label></> : section === "users" ? <><div className="form-row"><label>First name<input name="firstName" defaultValue={String(selected.first_name)} required/></label><label>Last name<input name="lastName" defaultValue={String(selected.last_name)} required/></label></div><label>Email<input name="email" type="email" defaultValue={String(selected.email)} required/></label><label>Phone<input name="phone" defaultValue={String(selected.phone || "")} required/></label><label>Role<select name="role" defaultValue={String(selected.role)} required><option value="consumer">Consumer</option><option value="farmer">Farmer</option><option value="support">Support</option><option value="admin">Administrator</option></select></label><label>Account status<select name="isActive" defaultValue={selected.is_active ? "true" : "false"}><option value="true">Active</option><option value="false">Disabled</option></select></label></> : section === "farms" ? <><label>Farmer owner<select name="ownerId" defaultValue={String(selected.owner_id)} required>{options.owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select></label><label>Farm name<input name="name" defaultValue={String(selected.name)} required/></label><div className="form-row"><label>Phone<input name="phone" defaultValue={String(selected.phone)} required/></label><label>Email<input name="email" type="email" defaultValue={String(selected.email || "")}/></label></div><label>Address<input name="address" defaultValue={String(selected.address_text)} required/></label><div className="form-row"><label>City<input name="city" defaultValue={String(selected.city)} required/></label><label>State<input name="state" defaultValue={String(selected.state)} required/></label></div><label className="admin-check"><input type="checkbox" name="offersDelivery" value="true" defaultChecked={Boolean(selected.offers_delivery)}/> Offers delivery</label></> : <><label>Farm<select name="farmId" defaultValue={String(selected.farm_id)} required>{options.farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select></label>
<label>Category<select name="categoryId" defaultValue={String(selected.category_id)} required>{options.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Listing title<input name="title" defaultValue={String(selected.title)} required/></label><div className="form-row"><label>Unit<input name="unit" defaultValue={String(selected.unit)} required/></label><label>Price (NGN)<input name="price" type="number" min="1" defaultValue={Number(selected.unit_price_kobo) / 100} required/></label></div><div className="form-row"><label>Available stock<input name="stock" type="number" min={Number(selected.quantity_reserved || 0)} defaultValue={Number(selected.quantity_available)} required/></label><label>Harvest date<input name="harvestDate" type="date" defaultValue={String(selected.harvest_date).slice(0, 10)} required/></label></div><div className="form-row"><label>Available from (optional)<input name="availableFrom" type="datetime-local" defaultValue={lagosDateTimeInput(selected.available_from)}/></label><label>Available until (optional)<input name="availableUntil" type="datetime-local" defaultValue={lagosDateTimeInput(selected.available_until)}/></label></div><label>Status<select name="status" defaultValue={String(selected.status)}><option value="draft">Draft</option><option value="active">Active</option><option value="paused">Paused</option><option value="sold_out">Out of stock</option><option value="expired">Expired</option></select></label>{selected.image_url && <div className="listing-image-preview"><img src={String(selected.image_url)} alt={`Current ${String(selected.title)}`}/><span>Current picture</span></div>}<label>Replace picture<input name="image" type="file" accept="image/png,image/jpeg,image/webp"/><small>Select a JPG, PNG, or WebP image up to 4 MB. Leave empty to keep the current picture.</small></label><label>Badge<input name="badge" defaultValue={String(selected.badge || "")}/></label></>} {error && <p className="admin-error" role="alert">{error}</p>}<button className="admin-submit" disabled={busy}>{busy ? "Saving changes..." : "Save changes"} {!busy && <ArrowRight size={16}/>}</button></form></div></div>}
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
      <span><strong>Order #{String(entity.order_number)}</strong><small>{String(entity.customer_name)} · {String(entity.item_count)} items</small><span className="entity-farms"><Store size={11}/>{String(entity.farm_names || "Farm not assigned")}</span><span className="entity-farmers"><UserRound size={11}/>{String(entity.farmer_names || "Farmer not assigned")}</span>{Boolean(entity.refund_id) ? <span className={`entity-refund-alert ${entity.refund_status}`}><RotateCcw size={11}/> Refund {String(entity.refund_status).replaceAll("_", " ")} · {String(entity.refund_method).replaceAll("_", " ")}</span> : Boolean(entity.receipt_submitted) && <span className="entity-payment-receipt"><Check size={11}/> Receipt ready for review</span>}<AdminEntityDate label="Placed" value={entity.placed_at}/></span>
      <b className={`status-badge ${entity.status}`}>{statusLabel(entity.status)}</b>
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
  if (section === "farms") return <button onClick={onOpen}><span className="entity-icon"><Store size={17}/></span><span><strong>{String(entity.name)}</strong><small>{String(entity.city)}, {String(entity.state)} · {String(entity.owner_name)}</small><AdminEntityDate label="Created" value={entity.created_at}/></span><b className={`status-badge ${entity.verification_status}`}>{statusLabel(entity.verification_status)}</b><i>{String(entity.listing_count)} listings</i></button>;
  if (section === "produce") return <button onClick={onOpen}><span className="entity-thumb">{entity.image_url ? <img src={String(entity.image_url)} alt=""/> : <Leaf size={17}/>}</span><span><strong>{String(entity.title)}</strong><small>{String(entity.farm_name)} · {String(entity.category_name)}</small><span className="entity-date-group"><AdminEntityDate label="Listed" value={entity.created_at}/><AdminEntityDate label="Harvest" value={entity.harvest_date}/></span></span><b className={`status-badge ${entity.status}`}>{listingStatusLabel(entity.status)}</b><i>{money(Number(entity.unit_price_kobo) / 100)} / {String(entity.unit)}</i></button>;
  if (section === "pickup_centres") return <button onClick={onOpen}><span className="entity-icon"><MapPin size={17}/></span><span><strong>{String(entity.name)}</strong><small>{String(entity.area_name)} area · {String(entity.address_text)}</small><AdminEntityDate label="Created" value={entity.created_at}/></span><b className={`status-badge ${entity.is_active ? "verified" : "suspended"}`}>{entity.is_active ? "Active" : "Inactive"}</b><i>{String(entity.order_count || 0)} orders</i></button>;
  if (section === "areas") return <button onClick={onOpen}><span className="entity-icon"><MapPin size={17}/></span><span><strong>{String(entity.name)}</strong><small>{String(entity.city)}, {String(entity.state)}</small><AdminEntityDate label="Created" value={entity.created_at}/></span><b className={`status-badge ${entity.is_active ? "verified" : "suspended"}`}>{entity.is_active ? "Active" : "Inactive"}</b><i>{String(entity.pickup_centre_count || 0)} centres</i></button>;
  if (section === "subscribers") return <button onClick={onOpen}><span className="entity-icon"><Mail size={17}/></span><span><strong>{String(entity.email)}</strong><small>{entity.account_name ? `${String(entity.account_name)} · ` : ""}{String(entity.source).replaceAll("_", " ")}</small><AdminEntityDate label="Subscribed" value={entity.consented_at}/></span><b className={`status-badge ${entity.is_active ? "verified" : "suspended"}`}>{entity.is_active ? "Active" : "Unsubscribed"}</b><i>Email campaign</i></button>;
  if (section === "orders") return <AdminOrderRow entity={entity} onOpen={onOpen} onReviewRefund={onReviewRefund}/>;
  if (section === "refunds") return <button onClick={onOpen}><span className="entity-icon"><RotateCcw size={17}/></span><span><strong>Order #{String(entity.order_number)}</strong><small>{String(entity.customer_name)} · {String(entity.resolution_method || "bank_refund").replaceAll("_", " ")}{Number(entity.cancellation_fee_kobo) ? ` · ${money(Number(entity.cancellation_fee_kobo) / 100)} fee` : " · no fee"}</small><AdminEntityDate label="Requested" value={entity.requested_at}/></span><b className={`status-badge ${entity.status}`}>{statusLabel(entity.status)}</b><i>{money(Number(entity.amount_kobo) / 100)}</i></button>;
  if (section === "payouts") return <button onClick={onOpen}><span className="entity-icon"><CreditCard size={17}/></span><span><strong>{String(entity.farm_name)}</strong><small>{String(entity.farmer_name)} · {String(entity.order_count)} fulfilled {Number(entity.order_count) === 1 ? "order" : "orders"}</small><AdminEntityDate label="Requested" value={entity.requested_at}/></span><b className={`status-badge ${entity.status}`}>{statusLabel(entity.status)}</b><i>{money(Number(entity.net_amount_kobo) / 100)}</i></button>;
  if (section === "reviews") return <button onClick={onOpen}><span className="entity-icon"><Star size={17}/></span><span><strong>{String(entity.farm_name)}</strong><small>{String(entity.customer_name)} · Order #{String(entity.order_number)}</small><AdminEntityDate label="Reviewed" value={entity.created_at}/></span><b className={`status-badge ${entity.is_visible ? "verified" : "suspended"}`}>{entity.is_visible ? "Visible" : "Hidden"}</b><i>{String(entity.rating)}/5</i></button>;
  return <button onClick={onOpen}><span className="entity-icon"><Clock3 size={17}/></span><span><strong>{String(entity.action).replaceAll("_", " ").replaceAll(".", " ")}</strong><small>{String(entity.actor_name)} · {String(entity.entity_label || entity.entity_type).replaceAll("_", " ")}</small><AdminEntityDate label="Logged" value={entity.created_at}/></span><b className="status-badge verified">{String(entity.entity_type).replaceAll("_", " ")}</b><i>{new Date(String(entity.created_at)).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}</i></button>;
}

function entityTitle(type: AdminEntityType | "analytics" | "tickets", entity: AdminEntity) {
  if (type === "analytics") return "Analytics";
  if (type === "users") return `${entity.first_name} ${entity.last_name}`;
  if (type === "farms") return String(entity.name);
  if (type === "produce") return String(entity.title);
  if (type === "pickup_centres") return String(entity.name);
  if (type === "areas") return String(entity.name);
  if (type === "orders" || type === "refunds") return `Order #${entity.order_number}`;
  if (type === "payouts") return `${entity.farm_name} payout`;
  if (type === "reviews") return `${entity.farm_name} review`;
  if (type === "subscribers") return String(entity.email);
  return String(entity.action).replaceAll("_", " ");
}

function showAdminDetailField(key: string, value: unknown) {
  if (value === null || value === "") return false;
  if (key === "id" || key.endsWith("_id")) return false;
  return ![
    "order_number",
    "items",
    "orders",
    "delivery_events",
    "password_hash",
    "payment_receipt_name",
    "payment_receipt_submitted_at",
    "gross_amount_kobo",
    "platform_fee_kobo",
    "net_amount_kobo",
    "farm_name",
    "farmer_name",
    "farmer_email",
    "order_count",
    "payout_provider",
    "bank_code",
    "account_name",
    "account_last4",
    "recipient_code",
  ].includes(key);
}

function formatEntityValue(key: string, value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (key.endsWith("_kobo")) return money(Number(value) / 100);
  if (key.endsWith("_at") || key.endsWith("_date") || key === "available_from" || key === "available_until") {
    return new Date(String(value)).toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: key.endsWith("_date") ? undefined : "short",
      timeZone: "Africa/Lagos",
    });
  }
  if (typeof value === "object" && value) return Object.entries(value as Record<string, unknown>).map(([field, detail]) => `${field.replaceAll("_", " ")}: ${typeof detail === "object" ? "Updated information" : String(detail).replaceAll("_", " ")}`).join(" · ");
  if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(String(value))) return "Internal record";
  return String(value);
}

function DataLoading({ view = "landing" }: { view?: View }) {
  const content = view === "market"
    ? ["Fresh produce near you", "Loading available harvests from verified Nigerian farms."]
    : view === "help"
      ? ["HarvestNearU Help Centre", "Loading help for orders, payments, delivery, refunds, and accounts."]
      : view === "delivery"
        ? ["Fresh produce delivery areas", "Loading farm pickup and doorstep delivery information for Abuja."]
        : view === "returns"
          ? ["Returns and refunds", "Loading HarvestNearU cancellation, account credit, and refund guidance."]
          : ["HarvestNearU", "Fresh local produce from verified farms near you."];
  return <main className="profile-page loading-page"><div className="sr-only"><h1>{content[0]}</h1><p>{content[1]}</p></div><HarvestSpinner label="Loading marketplace data"/></main>;
}

function ProductGridSkeleton() {
  return <div className="product-grid product-grid-skeleton" role="status" aria-label="Loading nearby harvests">
    {Array.from({ length: 4 }, (_, index) => <article className="product-card" key={index} aria-hidden="true"><div className="product-image skeleton-block"/><div className="product-body"><span className="skeleton-line short"/><span className="skeleton-line title"/><span className="skeleton-line medium"/><span className="skeleton-line"/><div className="skeleton-price"><span/><b/></div></div></article>)}
  </div>;
}

function HarvestSpinner({ compact = false, label }: { compact?: boolean; label: string }) {
  return <div className={`harvest-spinner ${compact ? "compact" : ""}`} role="status" aria-label={label}>
    <span className="spinner-orbit"><i/><b/><span><img src="/brand/harvestnearu-approved-mark.png" alt=""/></span></span>
  </div>;
}

type ProfileData = {
  user: { id: string; first_name: string; last_name: string; email: string; phone: string | null; avatar_url: string | null; created_at: string; email_verified_at: string | null };
  addresses: Array<{ id: string; label: string; recipient_phone: string; line1: string; city: string; state: string; latitude: number; longitude: number; is_default: boolean }>;
  stats: { total_orders: number; farms_supported: number; completed_orders: number };
  storeCredit: { balance_kobo: number; updated_at: string | null; transactions: Array<{ id: string; amount_kobo: number; transaction_type: string; reference_type: string; reference_id: string; description: string; created_at: string }> };
  preferences?: { preferred_radius_km: number; marketing_consent: boolean };
  emailPreferences: { delivery_updates: boolean; support_updates: boolean; farm_updates: boolean; rating_updates: boolean; nearby_produce: boolean; offers_and_promotions: boolean; weekly_digest: boolean };
  farm?: { id: string; name: string; description: string | null; phone: string; email: string | null; address_text: string; city: string; state: string; latitude: number; longitude: number; verification_status: string; delivery_radius_km: number; offers_pickup: boolean; offers_delivery: boolean; average_rating: number; review_count: number; created_at: string };
  farms?: Array<{ id: string; name: string; verification_status: string; city: string; state: string }>;
  listings?: Array<{ id: string; title: string; unit: string; unit_price_kobo: number; quantity_available: number; status: string; image_url: string | null }>;
  farmStats?: { fulfilled_orders: number; customers: number };
};

function DatabaseProfilePage({ role, onShop, onFarmer, onUpgraded }: { role: "consumer" | "farmer"; onShop: () => void; onFarmer: () => void; onUpgraded: (user: CurrentUser) => void }) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [editing, setEditing] = useState(false);
  const [locationEditing, setLocationEditing] = useState<"home" | "farm" | null>(null);
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
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
      const result = await readJsonResponse(response) as ProfileData & { error?: string };
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
      const result = await readJsonResponse(response) as ProfileData & { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not load profile");
      setData(result);
    }).catch((reason: Error) => setError(reason.message));
  }, []);
  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, marketingConsent: values.marketingConsent === "true", offersPickup: values.offersPickup === "true", offersDelivery: values.offersDelivery === "true" }) });
      const result = await readJsonResponse(response) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not save profile");
      setEditing(false); await loadProfile();
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }

  async function saveEmailPreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setEmailSaving(true); setError("");
    try {
      const values = new FormData(event.currentTarget);
      const enabled = (name: string) => values.get(name) === "true";
      const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "emailPreferences", deliveryUpdates: enabled("deliveryUpdates"), supportUpdates: enabled("supportUpdates"), farmUpdates: enabled("farmUpdates"), ratingUpdates: enabled("ratingUpdates"), nearbyProduce: enabled("nearbyProduce"), offersAndPromotions: enabled("offersAndPromotions"), weeklyDigest: enabled("weeklyDigest") }) });
      const result = await readJsonResponse(response) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not save email preferences");
      await loadProfile(data?.farm?.id);
    } catch (reason) { setError((reason as Error).message); } finally { setEmailSaving(false); }
  }
  async function saveLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "location", locationTarget: locationEditing, ...values }) });
      const result = await readJsonResponse(response) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not update location");
      setLocationEditing(null);
      await loadProfile(data?.farm?.id);
      window.dispatchEvent(new Event("harvestnearu-profile-updated"));
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }
  async function updateAvatar(event: FormEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0]; if (!file) return;
    setAvatarBusy(true); setError("");
    try {
      const form = new FormData(); form.set("file", file);
      const response = await fetch("/api/profile/avatar", { method: "POST", body: form });
      const result = await readJsonResponse(response) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not update profile picture");
      await loadProfile();
      window.dispatchEvent(new Event("harvestnearu-profile-updated"));
    } catch (reason) { setError((reason as Error).message); } finally { setAvatarBusy(false); input.value = ""; }
  }
  async function upgradeToFarmer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "farm", ...values }) });
      const result = await readJsonResponse(response) as { user?: CurrentUser; error?: string };
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
    <header className="profile-heading"><div><p className="eyebrow"><span/> {role.toUpperCase()} ACCOUNT</p><h1>My profile</h1><p>Manage your identity, preferences, and marketplace activity.</p></div><div className="profile-heading-actions"><label className="profile-photo-upload"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={updateAvatar} disabled={avatarBusy}/><UserRound size={15}/>{avatarBusy ? "Uploading..." : "Change picture"}</label><button className="profile-location-primary" onClick={() => { setError(""); setLocationEditing("home"); }}><House size={15}/> Update home location</button>{role === "farmer" && <button className="profile-location-primary farm-location" onClick={() => { setError(""); setLocationEditing("farm"); }}><MapPin size={15}/> Update farm location</button>}<button className="profile-edit-primary" onClick={() => { setError(""); setEditing(true); }}>Edit profile</button></div></header>
    <section className="profile-identity"><div className="identity-cover consumer-cover"><img src={role === "farmer" ? "/produce/fresh-sweet-corn.webp" : "/produce/garden-fresh-spinach.webp"} alt="Fresh produce"/><div/></div><div className="identity-row"><span className={`profile-avatar ${data.user.avatar_url ? "has-photo" : ""}`}>{data.user.avatar_url ? <img src={data.user.avatar_url} alt={name}/> : initials}</span><div><span className="verified-label"><Check size={11}/> {role === "farmer" ? data.farm?.verification_status || "pending" : data.user.email_verified_at ? "Verified customer" : "Customer account"}</span><h2>{role === "farmer" ? data.farm?.name || name : name}</h2><p><MapPin size={13}/> {role === "farmer" ? `${data.farm?.city || ""}, ${data.farm?.state || ""}` : data.addresses[0] ? `${data.addresses[0].city}, ${data.addresses[0].state}` : "Add your delivery address"} · Member since {new Date(data.user.created_at).getFullYear()}</p></div></div></section>
    <section className="profile-stats"><div><ShoppingBag size={18}/><strong>{data.stats.total_orders}</strong><span>Total orders</span></div><div><Leaf size={18}/><strong>{role === "farmer" ? data.listings?.length || 0 : data.stats.farms_supported}</strong><span>{role === "farmer" ? "Produce listings" : "Farms supported"}</span></div><div><PackageCheck size={18}/><strong>{role === "farmer" ? data.farmStats?.fulfilled_orders || 0 : data.stats.completed_orders}</strong><span>Completed orders</span></div><div><Star size={18}/><strong>{role === "farmer" ? Number(data.farm?.average_rating || 0).toFixed(1) : data.addresses.length}</strong><span>{role === "farmer" ? "Farm rating" : "Saved addresses"}</span></div></section>
    <section className="profile-credit"><header><span><AtSign size={20}/></span><div><p className="eyebrow">ACCOUNT CREDIT</p><h2>{money(Number(data.storeCredit.balance_kobo) / 100)}</h2><small>Automatically applied to your next eligible purchase.</small></div></header><div className="credit-ledger"><div className="profile-panel-head"><div><h3>Recent credit activity</h3><p>Refund credits and marketplace purchases.</p></div></div>{data.storeCredit.transactions.length ? data.storeCredit.transactions.map((transaction) => <article key={transaction.id}><span className={Number(transaction.amount_kobo) > 0 ? "credit" : "debit"}>{Number(transaction.amount_kobo) > 0 ? <Plus size={14}/> : <Minus size={14}/>}</span><div><strong>{transaction.description}</strong><small>{new Date(transaction.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</small></div><b className={Number(transaction.amount_kobo) > 0 ? "credit" : "debit"}>{Number(transaction.amount_kobo) > 0 ? "+" : "-"}{money(Math.abs(Number(transaction.amount_kobo)) / 100)}</b></article>) : <div className="credit-empty">No account credit activity yet.</div>}</div></section>
    {role === "consumer" ? <><div className="profile-live-grid"><section className="profile-contact"><div className="profile-panel-head"><h3>Personal information</h3><span>PRIVATE</span></div><dl className="profile-data-list"><div><dt>Full name</dt><dd>{name}</dd></div><div><dt>Email</dt><dd>{data.user.email}</dd></div><div><dt>Phone</dt><dd>{data.user.phone || "Not added"}</dd></div><div><dt>Preferred radius</dt><dd>{Number(data.preferences?.preferred_radius_km || 20)} km</dd></div></dl></section><section className="address-section"><div className="profile-panel-head"><div><h3>Delivery addresses</h3><p>Addresses saved to your account.</p></div></div><div className="address-list">{data.addresses.length ? data.addresses.map((address) => <article key={address.id}><span><MapPin size={18}/></span><div><strong>{address.label}</strong><p>{address.line1}, {address.city}, {address.state}</p><small>{address.is_default ? "Primary address" : "Saved address"}</small></div></article>) : <div className="panel-empty">No delivery address saved yet.</div>}</div></section></div><section className="farmer-upgrade-card"><span><Store size={21}/></span><div><p className="eyebrow">SELL ON HARVESTNEARU</p><h2>Do you also grow or sell produce?</h2><p>Upgrade this account to manage farms while keeping your orders, saved produce, and customer history.</p></div><button onClick={() => { setError(""); setUpgradeOpen(true); }}>Become a farmer <ArrowRight size={16}/></button></section></> : <><section className="profile-farm-switcher"><div><p className="eyebrow">YOUR FARMS</p><h2>Farm profiles</h2><p>Select a farm to view and edit its information, listings, and performance.</p></div><div>{data.farms?.map((farm) => <button key={farm.id} className={data.farm?.id === farm.id ? "active" : ""} onClick={() => { setError(""); void loadProfile(farm.id); }}><span><Store size={16}/></span><strong>{farm.name}</strong><small>{farm.city}, {farm.state}</small>{farm.verification_status === "verified" ? <BadgeCheck size={16} aria-label="Verified"/> : <i className={farm.verification_status}>{farm.verification_status}</i>}</button>)}</div></section><div className="profile-live-grid"><section className="farm-about"><div className="profile-panel-head"><div><h3>About the farm</h3><p>Public farm information · {data.farms?.length || 1} farms on this account.</p></div><button onClick={onFarmer}>Open workspace</button></div><p>{data.farm?.description || "Add a description so customers can learn about your farm."}</p><dl className="profile-data-list"><div><dt>Location</dt><dd>{data.farm?.address_text}, {data.farm?.city}, {data.farm?.state}</dd></div><div><dt>Delivery radius</dt><dd>{Number(data.farm?.delivery_radius_km || 0)} km</dd></div><div><dt>Fulfilment</dt><dd>{[data.farm?.offers_pickup && "Pickup", data.farm?.offers_delivery && "Delivery"].filter(Boolean).join(" and ") || "Not configured"}</dd></div></dl></section><section className="farm-produce"><div className="profile-panel-head"><div><h3>Current harvests</h3><p>Your latest database listings.</p></div><button onClick={onFarmer}><Plus size={14}/> Manage listings</button></div><div>{data.listings?.length ? data.listings.map((listing) => <article key={listing.id}>{listing.image_url ? <img src={listing.image_url} alt=""/> : <span className="profile-listing-placeholder"><Leaf size={18}/></span>}<div><span>{listingStatusLabel(listing.status)}</span><strong>{listing.title}</strong><p>{quantityLabel(Number(listing.quantity_available), listing.unit)} remaining</p><small>{money(Number(listing.unit_price_kobo) / 100)} / {listing.unit}</small></div></article>) : <div className="panel-empty">No listings yet.</div>}</div></section></div></>}
    {role === "farmer" && <section className="farmer-home-location"><span><House size={19}/></span><div><small>PERSONAL DELIVERY LOCATION</small><h3>{data.addresses[0]?.label || "Home location not added"}</h3><p>{data.addresses[0] ? `${data.addresses[0].line1}, ${data.addresses[0].city}, ${data.addresses[0].state}` : "Add a separate Home address for shopping and personal deliveries."}</p></div><button onClick={() => { setError(""); setLocationEditing("home"); }}>{data.addresses[0] ? "Update Home" : "Add Home"}</button></section>}
    <section className="email-preferences"><header><div><p className="eyebrow">EMAIL PREFERENCES</p><h2>Choose what reaches your inbox</h2><p>Security, payment, refund, and active-order emails are always sent.</p></div></header><form onSubmit={saveEmailPreferences}><div className="email-preference-grid"><PreferenceCheck name="deliveryUpdates" label="Delivery updates" detail="Handover and delivery progress" checked={data.emailPreferences.delivery_updates}/><PreferenceCheck name="supportUpdates" label="Support updates" detail="Replies and ticket decisions" checked={data.emailPreferences.support_updates}/><PreferenceCheck name="farmUpdates" label="Farm updates" detail="Verification and farmer activity" checked={data.emailPreferences.farm_updates}/><PreferenceCheck name="ratingUpdates" label="Ratings and reviews" detail="New or moderated feedback" checked={data.emailPreferences.rating_updates}/><PreferenceCheck name="nearbyProduce" label="Nearby produce" detail="New harvests available near you" checked={data.emailPreferences.nearby_produce}/><PreferenceCheck name="offersAndPromotions" label="Offers and promotions" detail="Discounts and marketplace campaigns" checked={data.emailPreferences.offers_and_promotions}/><PreferenceCheck name="weeklyDigest" label="Weekly harvest digest" detail="A weekly summary of fresh listings" checked={data.emailPreferences.weekly_digest}/></div><button className="email-preference-save" disabled={emailSaving}>{emailSaving ? "Saving preferences..." : "Save email preferences"}</button></form></section>
    <div className="profile-page-actions"><button onClick={onShop}><ShoppingBag size={16}/> Browse produce</button>{role === "farmer" && <button onClick={onFarmer}><Store size={16}/> Farmer workspace</button>}</div>
    {locationEditing && <div className="modal-overlay" onMouseDown={() => setLocationEditing(null)}><div className="admin-add-modal profile-location-modal" onMouseDown={(event) => event.stopPropagation()}><button className="close-modal" onClick={() => setLocationEditing(null)}><X size={19}/></button><p className="auth-kicker">{locationEditing === "farm" ? "FARM LOCATION" : "HOME LOCATION"}</p><h2>Update {locationEditing === "farm" ? data.farm?.name : "your primary address"}</h2><p>{locationEditing === "farm" ? "Customers use this location to understand how near this farm is." : "Your Home location is used to rank produce when you shop."}</p><form onSubmit={saveLocation}>{locationEditing === "farm" ? <input type="hidden" name="farmId" value={data.farm?.id || ""}/> : <><input type="hidden" name="addressId" value={data.addresses[0]?.id || ""}/><label>Address label<input name="label" defaultValue={data.addresses[0]?.label || "Home"} required/></label><label>Recipient phone<input name="recipientPhone" defaultValue={data.addresses[0]?.recipient_phone || data.user.phone || ""} required/></label></>}<label>Street address or area<input name="line1" defaultValue={locationEditing === "farm" ? data.farm?.address_text || "" : data.addresses[0]?.line1 || ""} required/></label><div className="form-row"><label>City<input name="city" defaultValue={locationEditing === "farm" ? data.farm?.city || "" : data.addresses[0]?.city || ""} required/></label><label>State<input name="state" defaultValue={locationEditing === "farm" ? data.farm?.state || "" : data.addresses[0]?.state || ""} required/></label></div><FarmCoordinateFields defaultLatitude={locationEditing === "farm" ? data.farm?.latitude || "" : data.addresses[0]?.latitude || ""} defaultLongitude={locationEditing === "farm" ? data.farm?.longitude || "" : data.addresses[0]?.longitude || ""}/>{error && <p className="admin-error">{error}</p>}<button className="admin-submit" disabled={busy}>{busy ? "Updating location..." : "Save location"} {!busy && <ArrowRight size={16}/>}</button></form></div></div>}
    {editing && <div className="modal-overlay" onMouseDown={() => setEditing(false)}><div className="admin-add-modal profile-edit-modal" onMouseDown={(event) => event.stopPropagation()}><button className="close-modal" onClick={() => setEditing(false)}><X size={19}/></button><p className="auth-kicker">ACCOUNT DETAILS</p><h2>Edit profile</h2><form onSubmit={saveProfile}><div className="form-row"><label>First name<input name="firstName" defaultValue={data.user.first_name} required/></label><label>Last name<input name="lastName" defaultValue={data.user.last_name} required/></label></div><label>Email<input name="email" type="email" defaultValue={data.user.email} required/></label><label>Phone<input name="phone" defaultValue={data.user.phone || ""}/></label>{role === "consumer" ? <><label>Preferred distance (km)<input name="preferredRadius" type="number" min="1" defaultValue={Number(data.preferences?.preferred_radius_km || 20)}/></label><label className="admin-check"><input name="marketingConsent" type="checkbox" value="true" defaultChecked={Boolean(data.preferences?.marketing_consent)}/> Receive marketplace updates</label></> : data.farm && <><input type="hidden" name="farmId" value={data.farm.id}/><label>Farm name<input name="farmName" defaultValue={data.farm.name} required/></label><label>Farm description<textarea name="description" defaultValue={data.farm.description || ""}/></label><div className="form-row"><label>Farm phone<input name="farmPhone" defaultValue={data.farm.phone} required/></label><label>Farm email<input name="farmEmail" type="email" defaultValue={data.farm.email || ""}/></label></div><label>Farm address<input name="address" defaultValue={data.farm.address_text} required/></label><div className="form-row"><label>City<input name="city" defaultValue={data.farm.city} required/></label><label>State<input name="state" defaultValue={data.farm.state} required/></label></div><label>Delivery radius (km)<input name="deliveryRadius" type="number" min="0" defaultValue={Number(data.farm.delivery_radius_km)}/></label><div className="profile-checks"><label><input name="offersPickup" type="checkbox" value="true" defaultChecked={data.farm.offers_pickup}/> Farm pickup</label><label><input name="offersDelivery" type="checkbox" value="true" defaultChecked={data.farm.offers_delivery}/> Delivery</label></div></>}{error && <p className="admin-error">{error}</p>}<button className="admin-submit" disabled={busy}>{busy ? "Saving..." : "Save profile"}</button></form></div></div>}
    {upgradeOpen && <div className="modal-overlay" onMouseDown={() => setUpgradeOpen(false)}><div className="admin-add-modal" onMouseDown={(event) => event.stopPropagation()}><button className="close-modal" onClick={() => setUpgradeOpen(false)}><X size={19}/></button><p className="auth-kicker">FARMER UPGRADE</p><h2>Add your first farm</h2><p>Your existing customer activity stays on this account.</p><form onSubmit={upgradeToFarmer}><label>Farm or business name<input name="name" required/></label><label>Farm address or area<input name="location" placeholder="Kuje, Abuja" required/></label><label>Farm phone<input name="phone" defaultValue={data.user.phone || ""} required/></label><FarmCoordinateFields/>{error && <p className="admin-error">{error}</p>}<button className="admin-submit" disabled={busy}>{busy ? "Upgrading account..." : "Upgrade and add farm"}</button></form></div></div>}
  </main>;
}

function PreferenceCheck({ name, label, detail, checked }: { name: string; label: string; detail: string; checked: boolean }) {
  return <label className="email-preference-option"><span><strong>{label}</strong><small>{detail}</small></span><input type="checkbox" name={name} value="true" defaultChecked={checked}/></label>;
}

type CustomerOrder = {
  id: string; order_number: string; status: string; total_kobo: number; subtotal_kobo: number; discount_kobo: number;
  delivery_fee_kobo: number; fulfilment_method: string; delivery_address_snapshot: { city?: string; state?: string } | null;
  placed_at: string; paid_at: string | null; delivered_at: string | null;
  receipt_submitted: boolean; payment_status: string | null; payment_provider: string | null;
  refund: null | { status: string; resolution_method: "bank_refund" | "store_credit"; amount_kobo: number; cancellation_fee_kobo: number; requested_at: string };
  tracking: null | { id: string; status: string; tracking_code: string; courier_name: string | null; courier_phone: string | null; events: Array<{ id: string; status: string; message: string; occurred_at: string }> };
  farms: Array<{ id: string; name: string; rating: number | null; comment: string | null }>;
  items: Array<{ id: string; name: string; farm: string; unit: string; quantity: number; unit_price_kobo: number; image: string | null; status: string; preparing_at: string | null; ready_at: string | null; dispatched_at: string | null; received_at: string | null; updated_at: string }>;
};

function CustomerOrderCard({ order, active, expanded, receiptBusy, onToggle, onUpload, onPaystack, onCancel, onConfirm, onRating, onChat }: { order: CustomerOrder; active: boolean; expanded: boolean; receiptBusy: boolean; onToggle: () => void; onUpload: (file: File | undefined) => void; onPaystack: () => void; onCancel: () => void; onConfirm: (item: CustomerOrder["items"][number]) => void; onRating: (farm: CustomerOrder["farms"][number]) => void; onChat: (farm: CustomerOrder["farms"][number]) => void }) {
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
    <div className="database-order-summary combined-order-summary"><button className="order-summary-main" onClick={toggleOrder} aria-expanded={expanded}><span className={`status-pill ${order.status}`}><i/> {statusLabel(order.status)}</span><span><strong>Order #{order.order_number}</strong><small>{new Date(order.placed_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })} · {order.items.length} {order.items.length === 1 ? "item" : "items"}</small></span><b>{money(Number(order.total_kobo) / 100)}</b></button><button className="order-expand-button" onClick={toggleOrder} aria-expanded={expanded} aria-label={`${expanded ? "Collapse" : "Expand"} order ${order.order_number}`}><ChevronDown className={expanded ? "open" : ""} size={19}/></button></div>
    {order.refund && <section className="order-refund-status"><span><RotateCcw size={18}/></span><div><strong>{order.refund.resolution_method === "store_credit" ? "Account credit" : "Bank refund"} · {order.refund.status.replaceAll("_", " ")}</strong><p>{money(Number(order.refund.amount_kobo) / 100)}{Number(order.refund.cancellation_fee_kobo) ? ` after ${money(Number(order.refund.cancellation_fee_kobo) / 100)} fee` : " · No cancellation fee"}</p></div></section>}
    {active && order.status === "pending_payment" && <section className="manual-payment-status"><span>{order.payment_provider === "paystack" ? <CreditCard size={20}/> : <Clock3 size={20}/>}</span><div><strong>{order.payment_provider === "paystack" ? "Complete Paystack payment" : order.receipt_submitted ? "Payment receipt under review" : "Payment receipt required"}</strong><p>{order.payment_provider === "paystack" ? "Continue to Paystack for secure payment and instant confirmation." : order.receipt_submitted ? "An administrator is checking your transfer." : "Upload your bank-transfer receipt to continue this order."}</p></div><div className="manual-payment-actions">{order.payment_provider === "paystack" ? <><button onClick={onPaystack} disabled={receiptBusy}>{receiptBusy ? "Opening Paystack..." : "Pay with Paystack"}</button><button onClick={onCancel}>Cancel order</button></> : order.receipt_submitted ? <><a href={`/api/payments/manual/${order.id}`} target="_blank" rel="noreferrer">View receipt</a><button onClick={onCancel}>Cancel order</button></> : <label className={receiptBusy ? "busy" : ""}><input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" disabled={receiptBusy} onChange={(event) => onUpload(event.target.files?.[0])}/>{receiptBusy ? "Uploading..." : "Upload receipt"}</label>}</div></section>}
    {active && <div className={`order-detail-collapse active-product-tracking ${expanded ? "open" : ""}`} aria-hidden={!expanded}><div><section className="live-tracking">
      <header><span><Truck size={18}/></span><div><small>PRODUCT TRACKING</small><strong>{order.items.length} individual {order.items.length === 1 ? "journey" : "journeys"}</strong></div><b>{order.tracking?.tracking_code || order.fulfilment_method.replaceAll("_", " ")}</b></header>
      <div className="item-tracking-list">{order.items.map((item) => {
        const itemSteps = ["confirmed","preparing","ready",...(order.fulfilment_method === "doorstep" ? ["dispatched"] : []),"received"];
        const received = ["delivered","collected"].includes(item.status);
        const itemIndex = received ? itemSteps.length - 1 : statusOrder.indexOf(item.status);
        const canConfirmItem = order.fulfilment_method === "doorstep" ? item.status === "dispatched" : ["ready","dispatched"].includes(item.status);
        const itemOpen = expandedItems.includes(item.id);
        const itemFarm = order.farms.find((farm) => farm.name === item.farm);
        return <article className={received ? "received" : ""} key={item.id}>
          <div className="item-tracking-heading"><button className="item-tracking-main" onClick={() => toggleItem(item.id)} aria-expanded={itemOpen}>{item.image ? <img src={item.image} alt=""/> : <span><Leaf size={17}/></span>}<p><strong>{item.name}</strong><small>{item.farm} · {item.quantity} {item.unit}</small></p><div className="item-tracking-meta"><strong>{money(Number(item.unit_price_kobo) * Number(item.quantity) / 100)}</strong><b className={`status-badge ${item.status}`}>{statusLabel(received ? "received" : item.status)}</b></div></button><button className="item-expand-button" onClick={() => toggleItem(item.id)} aria-expanded={itemOpen} aria-label={`${itemOpen ? "Hide" : "Show"} tracking progress for ${item.name}`}><ChevronDown className={itemOpen ? "open" : ""} size={18}/></button></div>
          <div className={`item-progress-collapse ${itemOpen ? "open" : ""}`} aria-hidden={!itemOpen}><div><div className="item-tracking-progress">{itemSteps.map((status, index) => { const complete = itemIndex >= index; return <div className={complete ? "complete" : ""} key={status}><span>{complete ? <Check size={11}/> : index + 1}</span><small>{status === "dispatched" ? "On the way" : status}</small>{index < itemSteps.length - 1 && <i/>}</div>; })}</div>
          <div className="item-receipt-row"><p className="item-tracking-time">Last updated {new Date(item.updated_at || order.placed_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</p>{canConfirmItem && <button onClick={() => onConfirm(item)} disabled={receiptBusy}><PackageCheck size={14}/>{receiptBusy ? "Confirming..." : `I received ${item.name}`}</button>}{received && <span><Check size={13}/> Receipt confirmed</span>}{received && itemFarm && <button onClick={() => onRating(itemFarm)}><Star size={14} fill={itemFarm.rating ? "currentColor" : "none"}/>{itemFarm.rating ? "Edit farm rating" : "Rate this farm"}</button>}</div></div></div>
        </article>;
      })}</div>
      {order.tracking?.events?.length ? <div className="tracking-events">{order.tracking.events.map((event) => <div key={event.id}><span/><p><strong>{event.message}</strong><small>{new Date(event.occurred_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</small></p></div>)}</div> : <p className="tracking-note">Confirm each product only after it reaches you. Feedback becomes available when all products are received.</p>}
    </section></div></div>}
    <div className={`order-detail-collapse ${expanded ? "open" : ""}`} aria-hidden={!expanded}><div><div className="database-order-detail">{!active && <div className="database-order-items">{order.items.map((item) => <div key={item.id}>{item.image ? <img src={item.image} alt=""/> : <span><Leaf size={18}/></span>}<p><strong>{item.name}</strong><small>{item.quantity} {item.unit} · {item.farm}</small></p><b>{money(Number(item.unit_price_kobo) * Number(item.quantity) / 100)}</b></div>)}</div>}{!active && <div className="order-farm-ratings">{order.farms.map((farm) => <div key={farm.id}><span><strong>{farm.name}</strong><small>{farm.rating ? `Your rating: ${farm.rating}/5` : "Share your experience with this farm"}</small></span><button onClick={() => onRating(farm)}><Star size={14} fill={farm.rating ? "currentColor" : "none"}/> {farm.rating ? "Edit rating" : "Rate farm"}</button></div>)}</div>}<div className="database-order-meta"><span><small>FULFILMENT</small><strong>{order.fulfilment_method.replaceAll("_", " ")}</strong></span><span><small>DELIVERY</small><strong>{money(Number(order.delivery_fee_kobo) / 100)}</strong></span><span><small>TOTAL</small><strong>{money(Number(order.total_kobo) / 100)}</strong></span></div></div></div></div>
    <div className="database-order-meta persistent-order-summary"><span><small>FULFILMENT</small><strong>{order.fulfilment_method.replaceAll("_", " ")}</strong></span><span><small>DELIVERY</small><strong>{money(Number(order.delivery_fee_kobo) / 100)}</strong></span><span><small>TOTAL</small><strong>{money(Number(order.total_kobo) / 100)}</strong></span></div>
    {Boolean(order.paid_at) && <a className="order-print-receipt" href={`/orders/${order.id}/receipt`} target="_blank" rel="noreferrer"><Printer size={15}/> Print receipt</a>}
    {expanded && order.fulfilment_method === "farmer_delivery" && <div className="order-chat-actions"><strong>Arrange delivery</strong><p>Agree on timing, handover location, and any farmer delivery charge.</p>{order.farms.map((farm) => <button key={farm.id} onClick={() => onChat(farm)}><MessageCircle size={15}/> Chat with {farm.name}</button>)}</div>}
  </article>;
}

function OrderChatDialog({ orderId, farmId, onClose }: { orderId: string; farmId: string; onClose: () => void }) {
  const [thread, setThread] = useState<{ order_number: string; farm_name: string } | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string; body: string; sender_name: string; created_at: string }>>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() { const response = await fetch(`/api/orders/messages?orderId=${encodeURIComponent(orderId)}&farmId=${encodeURIComponent(farmId)}`, { cache: "no-store" }); const result = await readJsonResponse(response) as { thread?: typeof thread; messages?: typeof messages; error?: string }; if (!response.ok || !result.thread) throw new Error(result.error || "Could not load conversation"); setThread(result.thread); setMessages(result.messages || []); }
  useEffect(() => {
    let active = true;
    void fetch(`/api/orders/messages?orderId=${encodeURIComponent(orderId)}&farmId=${encodeURIComponent(farmId)}`, { cache: "no-store" })
      .then(async (response) => ({ response, result: await readJsonResponse(response) as { thread?: typeof thread; messages?: typeof messages; error?: string } }))
      .then(({ response, result }) => { if (!response.ok || !result.thread) throw new Error(result.error || "Could not load conversation"); if (active) { setThread(result.thread); setMessages(result.messages || []); } })
      .catch((reason: Error) => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [orderId, farmId]);
  async function send(event: FormEvent) { event.preventDefault(); if (!draft.trim()) return; setBusy(true); setError(""); try { const response = await fetch("/api/orders/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, farmId, message: draft.trim() }) }); const result = await readJsonResponse(response) as { error?: string }; if (!response.ok) throw new Error(result.error || "Could not send message"); setDraft(""); await load(); } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); } }
  return <div className="order-chat-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="order-chat-dialog" role="dialog" aria-modal="true" aria-label="Farmer conversation"><header><div><small>ARRANGE DELIVERY</small><h2>{thread?.farm_name || "Farmer conversation"}</h2><p>{thread ? `Order #${thread.order_number}` : "Loading conversation..."}</p></div><button aria-label="Close conversation" onClick={onClose}><X size={19}/></button></header><div className="order-chat-thread">{messages.length ? messages.map((message) => <article key={message.id}><strong>{message.sender_name}</strong><p>{message.body}</p><small>{new Date(message.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</small></article>) : <p className="order-chat-empty">Start the conversation about timing, location, and the delivery charge.</p>}</div>{error && <p className="form-error">{error}</p>}<form onSubmit={send}><textarea maxLength={2000} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message"/><button disabled={busy || !draft.trim()}>{busy ? "Sending..." : <><MessageCircle size={16}/> Send message</>}</button></form></section></div>;
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
  const [chatTarget, setChatTarget] = useState<{ orderId: string; farmId: string } | null>(null);
  const [refundBank, setRefundBank] = useState({ bankName: "", accountName: "", accountNumber: "" });
  function openRating(target: { orderId: string; farm: CustomerOrder["farms"][number] }) {
    setError("");
    setRatingValue(Number(target.farm.rating) || 0);
    setHoverRating(0);
    setRatingTarget(target);
  }
  async function refreshOrders() {
    const response = await fetch("/api/orders", { cache: "no-store" });
    const result = await readJsonResponse(response) as { orders?: CustomerOrder[]; error?: string };
    if (!response.ok || !result.orders) throw new Error(result.error || "Could not load orders");
    setOrders(result.orders);
  }
  useEffect(() => {
    fetch("/api/orders", { cache: "no-store" }).then(async (response) => {
      const result = await readJsonResponse(response) as { orders?: CustomerOrder[]; error?: string };
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
      const result = await readJsonResponse(response) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not save rating");
      setRatingTarget(null); await refreshOrders();
    } catch (reason) { setError((reason as Error).message); } finally { setRatingBusy(false); }
  }
  async function confirmReceipt(order: CustomerOrder, item?: CustomerOrder["items"][number]) {
    if (!item) return;
    setReceiptBusy(order.id); setError("");
    try {
      const response = await fetch("/api/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: order.id, itemId: item.id, action: "confirm_item_receipt" }) });
      const result = await readJsonResponse(response) as { error?: string; completed?: boolean; farm?: CustomerOrder["farms"][number] };
      if (!response.ok) throw new Error(result.error || "Could not confirm receipt");
      await refreshOrders();
      const receivedFarm = result.farm && !result.farm.rating ? result.farm : null;
      if (result.completed) {
        setTab("past");
        setExpanded(order.id);
        const unratedFarm = receivedFarm || order.farms.find((farm) => !farm.rating);
        if (unratedFarm) openRating({ orderId: order.id, farm: unratedFarm });
      } else if (receivedFarm) openRating({ orderId: order.id, farm: receivedFarm });
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
  async function continuePaystackPayment(orderId: string) {
    setReceiptBusy(orderId); setError("");
    try {
      const response = await fetch("/api/payments/paystack/initialize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId }) });
      const result = await readJsonResponse<{ authorizationUrl?: string; error?: string }>(response);
      if (!response.ok || !result.authorizationUrl) throw new Error(result.error || "Could not open Paystack");
      window.location.assign(result.authorizationUrl);
    } catch (reason) { setError((reason as Error).message); setReceiptBusy(null); }
  }
  async function cancelPendingOrder(resolutionMethod: "bank_refund" | "store_credit") {
    if (!cancelTarget) return;
    setCancelBusy(true); setError("");
    try {
      const response = await fetch("/api/orders/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: cancelTarget.id, resolutionMethod, ...refundBank }) });
      const result = await readJsonResponse(response) as { error?: string };
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
    {shown.length > 0 && <div className="combined-orders">{shown.map((order) => <CustomerOrderCard key={order.id} order={order} active={tab === "active"} expanded={expanded === order.id} receiptBusy={receiptBusy === order.id} onToggle={() => transitionUpdate(() => setExpanded((current) => current === order.id ? null : order.id))} onUpload={(file) => void uploadPaymentReceipt(order.id, file)} onPaystack={() => void continuePaystackPayment(order.id)} onCancel={() => { setError(""); setCancelTarget(order); }} onConfirm={(item) => void confirmReceipt(order, item)} onRating={(farm) => openRating({ orderId: order.id, farm })} onChat={(farm) => setChatTarget({ orderId: order.id, farmId: farm.id })}/>)}</div>}
    {chatTarget && (
      <OrderChatDialog {...chatTarget} onClose={() => setChatTarget(null)}/>
    )}
    {shown.filter((order) => order.refund).map((order) => <section className="order-refund-status" key={`refund-${order.id}`}><span><RotateCcw size={18}/></span><div><strong>{order.refund!.resolution_method === "store_credit" ? "Account credit" : "Bank refund"} · {order.refund!.status.replaceAll("_", " ")}</strong><p>Order #{order.order_number} · {money(Number(order.refund!.amount_kobo) / 100)}{Number(order.refund!.cancellation_fee_kobo) ? ` after ${money(Number(order.refund!.cancellation_fee_kobo) / 100)} fee` : " · No cancellation fee"}</p></div></section>)}
    {tab === "active" && active.filter((order) => order.status === "pending_payment").map((order) => <section className="manual-payment-status" key={`payment-${order.id}`}><span><Clock3 size={20}/></span><div><strong>{order.receipt_submitted ? "Payment receipt under review" : "Payment receipt required"}</strong><p>{order.receipt_submitted ? `An administrator is checking the transfer for order #${order.order_number}.` : `Upload your bank-transfer receipt to continue order #${order.order_number}.`}</p></div><div className="manual-payment-actions">{order.receipt_submitted ? <><a href={`/api/payments/manual/${order.id}`} target="_blank" rel="noreferrer">View receipt</a><button onClick={() => { setError(""); setCancelTarget(order); }}>Cancel order</button></> : <label className={receiptBusy === order.id ? "busy" : ""}><input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" disabled={receiptBusy === order.id} onChange={(event) => void uploadPaymentReceipt(order.id, event.target.files?.[0])}/>{receiptBusy === order.id ? "Uploading..." : "Upload receipt"}</label>}</div></section>)}
    {tab === "active" && active.map((order) => <section className="live-tracking" key={`tracking-${order.id}`}><header><span><Truck size={18}/></span><div><small>ORDER TRACKING</small><strong>#{order.order_number}</strong></div><b>{order.tracking?.tracking_code || statusLabel(order.fulfilment_method)}</b></header><div className="tracking-progress">{["confirmed","preparing","ready",...(order.fulfilment_method === "doorstep" ? ["dispatched"] : [])].map((status, index, steps) => { const statuses = ["confirmed","preparing","ready","dispatched","delivered","collected"]; const complete = statuses.indexOf(order.status) >= statuses.indexOf(status); return <div className={complete ? "complete" : ""} key={status}><span>{complete ? <Check size={13}/> : index + 1}</span><strong>{status === "dispatched" ? "On the Way" : statusLabel(status)}</strong>{index < steps.length - 1 && <i/>}</div>; })}</div>{order.tracking?.events?.length ? <div className="tracking-events">{order.tracking.events.map((event) => <div key={event.id}><span/><p><strong>{event.message}</strong><small>{new Date(event.occurred_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</small></p></div>)}</div> : <p className="tracking-note">Updates will appear here as the farm prepares your order.</p>}{((order.fulfilment_method === "doorstep" && order.status === "dispatched") || (["farm_pickup","collection_hub"].includes(order.fulfilment_method) && ["ready","dispatched"].includes(order.status))) && <div className="receipt-confirm"><div><PackageCheck size={20}/><span><strong>Have you received your produce?</strong><small>Confirm only after checking your complete order.</small></span></div><button onClick={() => confirmReceipt(order)} disabled={receiptBusy === order.id}>{receiptBusy === order.id ? "Confirming..." : "I received my produce"}</button></div>}</section>)}
    {shown.length ? <div className="database-orders">{shown.map((order) => <article className="database-order" key={order.id}><button className="database-order-summary" onClick={() => setExpanded((current) => current === order.id ? null : order.id)}><span className={`status-pill ${order.status}`}><i/> {statusLabel(order.status)}</span><span><strong>Order #{order.order_number}</strong><small>{new Date(order.placed_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })} · {order.items.length} {order.items.length === 1 ? "item" : "items"}</small></span><b>{money(Number(order.total_kobo) / 100)}</b><ChevronDown className={expanded === order.id ? "open" : ""} size={18}/></button>{expanded === order.id && <div className="database-order-detail"><div className="database-order-items">{order.items.map((item) => <div key={item.id}>{item.image ? <img src={item.image} alt=""/> : <span><Leaf size={18}/></span>}<p><strong>{item.name}</strong><small>{item.quantity} {item.unit} · {item.farm}</small></p><b>{money(Number(item.unit_price_kobo) * Number(item.quantity) / 100)}</b></div>)}</div>{pastStatuses.includes(order.status) && <div className="order-farm-ratings">{order.farms.map((farm) => <div key={farm.id}><span><strong>{farm.name}</strong><small>{farm.rating ? `Your rating: ${farm.rating}/5` : "Share your experience with this farm"}</small></span><button onClick={() => openRating({ orderId: order.id, farm })}><Star size={14} fill={farm.rating ? "currentColor" : "none"}/> {farm.rating ? "Edit rating" : "Rate farm"}</button></div>)}</div>}<div className="database-order-meta"><span><small>FULFILMENT</small><strong>{statusLabel(order.fulfilment_method)}</strong></span><span><small>DELIVERY</small><strong>{money(Number(order.delivery_fee_kobo) / 100)}</strong></span><span><small>TOTAL</small><strong>{money(Number(order.total_kobo) / 100)}</strong></span></div></div>}</article>)}</div> : <section className="orders-empty"><div className="orders-empty-visual" aria-hidden="true"><span><Leaf size={18}/></span><span><ShoppingBag size={31}/></span><span><MapPin size={16}/></span></div><p className="eyebrow">{tab === "active" ? "YOUR BASKET IS READY" : "YOUR HARVEST JOURNEY"}</p><h3>{tab === "active" ? "Nothing on the way just yet." : "Your order history starts here."}</h3><p>{tab === "active" ? "Choose fresh produce from nearby farms and follow every step from confirmation to your doorstep." : "Completed, collected, and resolved orders will be kept here for easy reference."}</p><button onClick={onShop}><Leaf size={16}/> Browse nearby harvests <ArrowRight size={16}/></button><div className="orders-empty-benefits"><span><Check size={12}/> Verified farms</span><span><LocateFixed size={12}/> Proximity ranked</span><span><PackageCheck size={12}/> Track every order</span></div></section>}
    {ratingTarget && <div className="modal-overlay" onMouseDown={() => setRatingTarget(null)}><div className="payment-modal rating-modal" onMouseDown={(event) => event.stopPropagation()}><button className="close-modal" onClick={() => setRatingTarget(null)}><X size={19}/></button><p className="auth-kicker">FARM RATING</p><h2>Rate {ratingTarget.farm.name}</h2><p>Your rating helps nearby customers choose confidently.</p><form onSubmit={submitRating}><fieldset className="star-rating" onMouseLeave={() => setHoverRating(0)}><legend>Your rating</legend>{[1,2,3,4,5].map((value) => <label key={value} className={value <= (hoverRating || ratingValue) ? "selected" : ""} onMouseEnter={() => setHoverRating(value)}><input type="radio" name="rating" value={value} checked={ratingValue === value} onChange={() => setRatingValue(value)} required/><Star size={28} fill="currentColor"/><span>{value} {value === 1 ? "star" : "stars"}</span></label>)}</fieldset><p className="rating-selection" aria-live="polite">{ratingValue ? `${ratingValue} out of 5 stars selected` : "Select your rating"}</p><label className="rating-comment">Comment<textarea name="comment" maxLength={800} defaultValue={ratingTarget.farm.comment || ""} placeholder="What stood out about the produce or service?"/></label>{error && <p className="auth-error">{error}</p>}<button className="pay-button" disabled={ratingBusy || !ratingValue}>{ratingBusy ? "Saving rating..." : "Submit rating"}</button></form></div></div>}
    {cancelTarget && <div className="modal-overlay" onMouseDown={() => !cancelBusy && setCancelTarget(null)}><div className="payment-modal cancel-order-modal" onMouseDown={(event) => event.stopPropagation()}><button className="close-modal" onClick={() => setCancelTarget(null)} disabled={cancelBusy}><X size={19}/></button><p className="auth-kicker">CANCEL ORDER</p><h2>How should we return your payment?</h2><p>Order #{cancelTarget.order_number} will be cancelled immediately and its produce returned to availability. The selected value is issued after administrator review.</p><div className="cancel-bank-fields"><label>Bank name<input value={refundBank.bankName} onChange={(event) => setRefundBank((current) => ({ ...current, bankName: event.target.value }))} maxLength={120}/></label><label>Account name<input value={refundBank.accountName} onChange={(event) => setRefundBank((current) => ({ ...current, accountName: event.target.value }))} maxLength={160}/></label><label>Account number<input value={refundBank.accountNumber} onChange={(event) => setRefundBank((current) => ({ ...current, accountNumber: event.target.value.replace(/[^0-9 -]/g, "") }))} inputMode="numeric" maxLength={30}/></label></div><div className="cancel-refund-options"><button onClick={() => void cancelPendingOrder("store_credit")} disabled={cancelBusy}><span><AtSign size={19}/></span><strong>Full account credit</strong><small>{money(Number(cancelTarget.total_kobo) / 100)} for future purchases · No fee; bank fields are not required</small></button><button onClick={() => void cancelPendingOrder("bank_refund")} disabled={cancelBusy || Number(cancelTarget.total_kobo) <= 50000 || !refundBank.bankName.trim() || !refundBank.accountName.trim() || refundBank.accountNumber.replace(/[^0-9]/g, "").length < 6}><span><RotateCcw size={19}/></span><strong>Refund to bank</strong><small>{money(Math.max(0, Number(cancelTarget.total_kobo) / 100 - 500))} after the ₦500 cancellation fee</small></button></div>{error && <p className="auth-error" role="alert">{error}</p>}{cancelBusy && <div className="cancel-processing"><LoaderCircle size={17}/> Submitting cancellation...</div>}</div></div>}
  </main>;
}

type FarmerWorkspaceData = {
  user: CurrentUser;
  farm: { id: string; name: string; verification_status: string; average_rating: number; review_count: number };
  farms: Array<{ id: string; name: string; verification_status: string; city: string; state: string; average_rating: number; review_count: number }>;
  metrics: { today_sales_kobo: number; open_orders: number; available_stock: number; active_listings: number; payout_gross_kobo: number; payout_fee_kobo: number; next_payout_kobo: number; cumulative_gross_kobo: number; cumulative_fee_kobo: number; cumulative_net_kobo: number };
  payoutRequests: Array<{ id: string; net_amount_kobo: number; status: string; requested_at: string }>;
  orders: Array<{ id: string; order_id: string; order_number: string; status: string; placed_at: string; subtotal_kobo: number; farmer_net_kobo: number; customer: string; customer_email: string; customer_phone: string | null; customer_avatar: string | null; items: string; itemTracking: Array<{ id: string; name: string; quantity: number; unit: string; status: string; preparing_at: string | null; ready_at: string | null; dispatched_at: string | null; received_at: string | null; updated_at: string }>; fulfilment_method: string; delivery_address_snapshot: { line1?: string; city?: string; state?: string; landmark?: string } | null; customer_note: string | null; tracking_code: string | null; delivery_status: string | null }>;
  listings: Array<{ id: string; title: string; unit: string; unit_price_kobo: number; quantity_available: number; quantity_reserved: number; quantity_sold: number; last_restock_total: number; last_restocked_at: string; status: string; harvest_date: string; available_from: string | null; available_until: string | null; category_id: string; image_url: string | null; stored_image_url: string | null; badge?: string | null }>;
  categories: Array<{ id: string; name: string }>;
  reviews: Array<{ id: string; rating: number; comment: string | null; farmer_reply: string | null; created_at: string; customer_name: string; order_number: string }>;
};

function FarmReviews({ farmName, reviews, open, onToggle }: { farmName: string; reviews: FarmerWorkspaceData["reviews"]; open: boolean; onToggle: () => void }) {
  return <section className="farm-reviews-panel"><div className="panel-head"><div><h2>Customer ratings</h2><p>Reviews for {farmName}</p></div><span><Star size={14} fill="currentColor"/> {reviews.length} review{reviews.length === 1 ? "" : "s"}</span><button className="workspace-collapse" onClick={onToggle} aria-expanded={open} aria-label={`${open ? "Collapse" : "Expand"} customer ratings`}><ChevronDown className={open ? "open" : ""} size={18}/></button></div>{open ? reviews.length ? <div className="farm-review-list">{reviews.map((review) => <article key={review.id}><header><div><strong>{review.customer_name}</strong><small>Order #{review.order_number} · {new Date(review.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}</small></div><span aria-label={`${review.rating} out of 5 stars`}>{[1,2,3,4,5].map((value) => <Star key={value} size={15} fill={value <= Number(review.rating) ? "currentColor" : "none"}/>)}</span></header><p>{review.comment || "The customer submitted a rating without a written comment."}</p>{review.farmer_reply && <blockquote><strong>Your reply</strong>{review.farmer_reply}</blockquote>}</article>)}</div> : <div className="farm-reviews-empty"><Star size={24}/><strong>No customer reviews yet</strong><p>Ratings and feedback for this farm will appear after fulfilled orders.</p></div> : null}</section>;
}

function ExpandedFarmerOrders({ orders, busy, readOnly, onAdvance, onChat }: { orders: FarmerWorkspaceData["orders"]; busy: boolean; readOnly: boolean; onAdvance: (order: FarmerWorkspaceData["orders"][number]) => void; onChat: (order: FarmerWorkspaceData["orders"][number]) => void }) {
  return <section className="farmer-orders-expanded"><div className="panel-head"><div><h2>Orders to fulfil</h2><p>Customer and delivery information</p></div><span>{orders.length} open</span></div>{orders.length ? orders.map((order) => {
    const address = order.delivery_address_snapshot;
    const pickup = ["farm_pickup","collection_hub"].includes(order.fulfilment_method);
    const nextItem = order.itemTracking.find((item) => ["confirmed","paid","preparing"].includes(item.status) || (item.status === "ready" && !pickup));
    const action = !nextItem ? "Awaiting customer receipt" : ["confirmed","paid"].includes(nextItem.status) ? `Prepare ${nextItem.name}` : nextItem.status === "preparing" ? `Mark ${nextItem.name} ready` : `Dispatch ${nextItem.name}`;
    const actionable = Boolean(nextItem);
    return <article className="fulfilment-card" key={order.id}><header><span className={`fulfilment-avatar ${order.customer_avatar ? "has-photo" : ""}`}>{order.customer_avatar ? <img src={order.customer_avatar} alt=""/> : order.customer.split(" ").map((part) => part[0]).slice(0,2).join("")}</span><div><small>ORDER #{order.order_number}</small><h3>{order.customer}</h3><p>{new Date(order.placed_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</p></div><b className={`status-badge ${order.status}`}>{statusLabel(order.status)}</b></header><div className="fulfilment-info"><section><strong><UserRound size={14}/> Customer contact</strong><a href={`mailto:${order.customer_email}`}>{order.customer_email}</a><a href={order.customer_phone ? `tel:${order.customer_phone}` : undefined}>{order.customer_phone || "No phone number provided"}</a></section><section><strong><MapPin size={14}/> {order.fulfilment_method === "doorstep" ? "Delivery address" : "Collection method"}</strong>{address ? <><span>{[address.line1, address.city, address.state].filter(Boolean).join(", ")}</span>{address.landmark && <small>Landmark: {address.landmark}</small>}</> : <span>{statusLabel(order.fulfilment_method)}</span>}<small>Coordinate the handover time with the customer</small></section><section><strong><ShoppingBag size={14}/> Produce</strong><span>{order.items}</span>{order.customer_note && <small>Note: {order.customer_note}</small>}</section><section><strong><Truck size={14}/> Tracking</strong><span>{order.tracking_code || "Pickup order"}</span><small>{order.delivery_status ? statusLabel(order.delivery_status) : "Awaiting fulfilment update"}</small></section></div>{order.fulfilment_method === "farmer_delivery" && <button className="farmer-order-chat" onClick={() => onChat(order)}><MessageCircle size={15}/> Chat with customer</button>}<footer><span>{readOnly ? "Administrator impersonation is read-only. Sign in as this farmer to update fulfilment." : "Customer confirmation is required before this order is completed and added to your payout."}</span><button disabled={readOnly || busy || !actionable} onClick={() => onAdvance(order)}>{readOnly ? "Read-only view" : actionable ? action : <><Clock3 size={14}/> {action}</>}</button></footer></article>;
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
  const [closedOrdersOpen, setClosedOrdersOpen] = useState(true);
  const [inventoryOpen, setInventoryOpen] = useState(true);
  const [reviewsOpen, setReviewsOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [greeting, setGreeting] = useState("Welcome back");
  const [payoutAccountOpen, setPayoutAccountOpen] = useState(false);
  const [payoutAccount, setPayoutAccount] = useState<{bank_name?:string;account_name?:string;account_last4?:string}|null>(null);
  const [payoutBanks, setPayoutBanks] = useState<Array<{name:string;code:string}>>([]);
  const [chatOrder, setChatOrder] = useState<FarmerWorkspaceData["orders"][number] | null>(null);

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
    const result = await readJsonResponse(response) as FarmerWorkspaceData & { error?: string };
    if (!response.ok) throw new Error(result.error || "Could not load farmer workspace");
    setData(result);
  }

  async function createFarm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch("/api/farmer/dashboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "farm", ...values }) });
      const result = await readJsonResponse(response) as { farm?: { id: string }; error?: string };
      if (!response.ok || !result.farm) throw new Error(result.error || "Could not add farm");
      setFarmOpen(false); await refresh(result.farm.id);
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }

  useEffect(() => {
    fetch("/api/farmer/dashboard", { cache: "no-store" }).then(async (response) => {
      const result = await readJsonResponse(response) as FarmerWorkspaceData & { error?: string };
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
      if (!(image instanceof File) || !image.size) throw new Error("Upload a produce picture before publishing this listing");
      const imageUrl = await uploadListingImage(image);
      uploadedUrl = imageUrl;
      const response = await fetch("/api/farmer/dashboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, imageUrl, farmId: data.farm.id }) });
      const result = await readJsonResponse(response) as { error?: string };
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
      const result = await readJsonResponse(response) as { error?: string }; if (!response.ok) throw new Error(result.error || "Could not update order"); await refresh();
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }

  async function requestPayout() {
    if (!data || Number(data.metrics.next_payout_kobo) <= 0) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/farmer/payouts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ farmId: data.farm.id }) });
      const result = await readJsonResponse<{ error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "Could not request payout");
      await refresh(data.farm.id);
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }
  async function openPayoutAccount() {
    if (!data) return; setBusy(true); setError("");
    try { const response=await fetch(`/api/farmer/payout-account?farmId=${data.farm.id}`);const result=await readJsonResponse<{account:null|{bank_name?:string;account_name?:string;account_last4?:string};banks?:Array<{name:string;code:string}>;error?:string}>(response);if(!response.ok)throw new Error(result.error||"Could not load payout account");setPayoutAccount(result.account);setPayoutBanks(result.banks||[]);setPayoutAccountOpen(true);} catch(reason){setError((reason as Error).message);} finally{setBusy(false);}
  }
  async function savePayoutAccount(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!data)return;setBusy(true);setError("");try{const form=new FormData(event.currentTarget);const bankCode=String(form.get("bankCode")||"");const bank=payoutBanks.find((item)=>item.code===bankCode);const response=await fetch("/api/farmer/payout-account",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({farmId:data.farm.id,bankCode,bankName:bank?.name,accountNumber:String(form.get("accountNumber")||"")})});const result=await readJsonResponse<{account?:typeof payoutAccount;error?:string}>(response);if(!response.ok||!result.account)throw new Error(result.error||"Could not save payout account");setPayoutAccount(result.account);setPayoutAccountOpen(false);}catch(reason){setError((reason as Error).message);}finally{setBusy(false);}}

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
      const result = await readJsonResponse(response) as { error?: string }; if (!response.ok) throw new Error(result.error || "Could not update listing"); setManageListing(null); await refresh();
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
    {!data.user.impersonating && <ProduceCategoryCreator onCreated={(category) => setData((current) => current ? ({ ...current, categories: [...current.categories.filter((item) => item.id !== category.id), category].sort((a,b) => a.name.localeCompare(b.name)) }) : current)}/>} 
    <div className="farm-rating-summary" aria-label={`${Number(data.farm.average_rating).toFixed(1)} out of 5 from ${data.farm.review_count} reviews`}><span><Star size={17} fill="currentColor"/></span><div><small>FARM RATING</small><strong>{Number(data.farm.average_rating).toFixed(1)}<i>/5</i></strong></div><p>{data.farm.review_count ? `${data.farm.review_count} verified customer review${data.farm.review_count === 1 ? "" : "s"}` : "No customer reviews yet"}</p></div>
    {data.user.impersonating && <div className="farmer-readonly-notice"><Eye size={18}/><span><strong>Read-only administrator preview</strong>Fulfilment, listings, and farm changes are disabled while viewing another user&apos;s account.</span></div>}
    {data.farm.verification_status !== "verified" && <div className="farmer-notice"><Clock3 size={18}/><span><strong>Farm verification required</strong>Your farm must be verified before produce can be published.</span></div>}
    {error && <p className="admin-error" role="alert">{error}</p>}
    <div className="metric-grid"><div><span>Today&apos;s sales</span><strong>{money(Number(data.metrics.today_sales_kobo) / 100)}</strong><small>Net earnings from paid orders</small></div><div><span>Open orders</span><strong>{data.metrics.open_orders}</strong><small>Orders requiring fulfilment</small></div><div><span>Produce listed</span><strong>{Number(data.metrics.available_stock)} <i>units</i></strong><small>Across {data.metrics.active_listings} active listings</small></div><div className="payout-metric"><span>Available payout</span><strong>{money(Number(data.metrics.next_payout_kobo) / 100)}</strong><div className="payout-breakdown"><p><span>Gross sales</span><b>{money(Number(data.metrics.payout_gross_kobo) / 100)}</b></p><p><span>Platform fee (10%)</span><b>{deductionMoney(Number(data.metrics.payout_fee_kobo) / 100)}</b></p><p><span>Net payout</span><b>{money(Number(data.metrics.next_payout_kobo) / 100)}</b></p></div><button className="admin-submit" disabled={busy || Number(data.metrics.next_payout_kobo) <= 0} onClick={requestPayout}>{busy ? "Submitting..." : "Request payout"}</button><small>{data.payoutRequests?.[0] ? `Latest request: ${statusLabel(data.payoutRequests[0].status)}` : "Fulfilled orders awaiting settlement"}</small></div></div>
    <section className="farmer-payout-history"><header><div><small>PAYOUTS</small><h2>Payout account and history</h2><p>Manage where this farm is paid and keep printable settlement statements.</p></div><button onClick={()=>void openPayoutAccount()}><CreditCard size={16}/> {payoutAccount?.account_last4?"Update payout account":"Configure payout account"}</button></header>{data.payoutRequests?.length?<div>{data.payoutRequests.map((request)=><article key={request.id}><span><strong>{money(Number(request.net_amount_kobo)/100)}</strong><small>{new Date(request.requested_at).toLocaleDateString("en-NG",{dateStyle:"medium"})} · {statusLabel(request.status)}</small></span><a href={`/farmer/payouts/${request.id}/receipt`} target="_blank" rel="noreferrer"><Printer size={15}/> View or print</a></article>)}</div>:<p className="payout-history-empty">No payout requests yet.</p>}</section><section className="cumulative-sales-card"><div className="cumulative-sales-heading"><span><AtSign size={19}/></span><div><small>CUMULATIVE EARNINGS</small><h2>Lifetime net sales</h2><p>Completed farm orders since joining HarvestNearU.</p></div></div><strong>{money(Number(data.metrics.cumulative_net_kobo) / 100)}</strong><div className="cumulative-sales-breakdown"><span><small>Gross sales processed</small><b>{money(Number(data.metrics.cumulative_gross_kobo) / 100)}</b></span><span className="fees"><small>Processing fees</small><b>{deductionMoney(Number(data.metrics.cumulative_fee_kobo) / 100)}</b></span><span className="net"><small>Net sales earned</small><b>{money(Number(data.metrics.cumulative_net_kobo) / 100)}</b></span></div></section>
    <div className="farmer-columns">
      <ExpandedFarmerOrders orders={fulfilmentOrders} busy={busy} readOnly={Boolean(data.user.impersonating)} onAdvance={advanceOrder} onChat={setChatOrder}/>
      {chatOrder && (
        <OrderChatDialog orderId={chatOrder.order_id} farmId={data.farm.id} onClose={() => setChatOrder(null)}/>
      )}
      <section className="orders-panel closed-orders-panel"><div className="panel-head"><div><h2>Closed orders</h2><p>Completed, cancelled, and refunded orders</p></div><span>{closedOrders.length} total</span>{closedOrdersOpen && closedOrders.length > 3 && <button onClick={() => setShowAllOrders((value) => !value)}>{showAllOrders ? "Show recent" : "View all"} <ArrowRight className={showAllOrders ? "back" : ""} size={15}/></button>}<button className="workspace-collapse" onClick={() => setClosedOrdersOpen((value) => !value)} aria-expanded={closedOrdersOpen} aria-label={`${closedOrdersOpen ? "Collapse" : "Expand"} closed orders`}><ChevronDown className={closedOrdersOpen ? "open" : ""} size={18}/></button></div>{closedOrdersOpen ? shownClosedOrders.length ? shownClosedOrders.map((order) => <div className="order-row closed-order-row" key={order.id}><span className="order-icon"><PackageCheck size={18}/></span><div><strong>{order.customer}</strong><p>#{order.order_number} · {order.items}</p></div><small>{new Date(order.placed_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</small><span className={`status-badge ${order.status}`}>{statusLabel(order.status)}</span><b>{["delivered","collected"].includes(order.status) ? `${money(Number(order.farmer_net_kobo) / 100)} net` : money(Number(order.subtotal_kobo) / 100)}</b></div>) : <div className="panel-empty">No closed orders yet.</div> : null}</section>
      <section className="inventory-panel"><div className="panel-head"><div><h2>Inventory pulse</h2><p>Your produce listings</p></div>{inventoryOpen && data.listings.length > 3 && <button onClick={() => setShowAllListings((value) => !value)}>{showAllListings ? "Show recent" : "View all"} <ArrowRight className={showAllListings ? "back" : ""} size={15}/></button>}<button className="workspace-collapse" onClick={() => setInventoryOpen((value) => !value)} aria-expanded={inventoryOpen} aria-label={`${inventoryOpen ? "Collapse" : "Expand"} inventory`}><ChevronDown className={inventoryOpen ? "open" : ""} size={18}/></button></div>{inventoryOpen ? listings.length ? listings.map((listing) => { const available = Number(listing.quantity_available) - Number(listing.quantity_reserved); const restockTotal = Math.max(1, Number(listing.last_restock_total)); const percent = Math.max(0, Math.min(100, Math.round(available / restockTotal * 100))); return <button className="inventory-row farmer-inventory-row" key={listing.id} onClick={() => { setError(""); setManageListing(listing); }}><span className="inventory-image">{listing.image_url ? <img src={listing.image_url} alt=""/> : <Leaf size={18}/>}</span><div><strong>{listing.title}</strong><p>{quantityLabel(available, listing.unit)} available · {listingStatusLabel(listing.status)}</p><span title={`${percent}% of the last restock remaining`}><i style={{ width: `${percent}%` }}/></span></div><b>{percent}%</b></button>}) : <div className="panel-empty">No listings yet.</div> : null}</section>
    </div>
    <FarmReviews farmName={data.farm.name} reviews={data.reviews} open={reviewsOpen} onToggle={() => setReviewsOpen((value) => !value)}/>
    {listingOpen && <div className="modal-overlay" onMouseDown={() => setListingOpen(false)}><div className="admin-add-modal farmer-listing-modal" onMouseDown={(event) => event.stopPropagation()}><button className="close-modal" onClick={() => setListingOpen(false)}><X size={19}/></button><p className="auth-kicker">NEW HARVEST</p><h2>Add a produce listing</h2><p>Publish available produce from {data.farm.name}.</p><form onSubmit={createListing}><label>Category<select name="categoryId" required><option value="">Select category</option>{data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Produce name<input name="name" required/></label><div className="form-row"><label>Unit<input name="unit" placeholder="basket" required/></label><label>Price (NGN)<input name="price" type="number" min="1" required/></label></div><div className="form-row"><label>Available quantity<input name="stock" type="number" min="1" required/></label><label>Harvest date<input name="harvestDate" type="date" required/></label></div><div className="form-row"><label>Available from (optional)<input name="availableFrom" type="datetime-local"/></label><label>Available until (optional)<input name="availableUntil" type="datetime-local"/></label></div><label>Produce picture<input name="image" type="file" accept="image/png,image/jpeg,image/webp" required/><small>Uploaded securely to Blob. JPG, PNG, or WebP up to 4 MB.</small></label><label>Badge<input name="badge" placeholder="Picked today"/></label>{error && <p className="admin-error">{error}</p>}<button className="admin-submit" disabled={busy}>{busy ? "Uploading and publishing..." : "Publish listing"} {!busy && <ArrowRight size={16}/>}</button></form></div></div>}
    {farmOpen && <div className="modal-overlay" onMouseDown={() => setFarmOpen(false)}><div className="admin-add-modal" onMouseDown={(event) => event.stopPropagation()}><button className="close-modal" onClick={() => setFarmOpen(false)}><X size={19}/></button><p className="auth-kicker">NEW FARM</p><h2>Add another farm</h2><p>Each farm has separate verification, listings, orders, and earnings.</p><form onSubmit={createFarm}><label>Farm or business name<input name="name" required/></label><label>Farm address or area<input name="location" placeholder="Kuje, Abuja" required/></label><label>Farm phone<input name="phone" required/></label><FarmCoordinateFields/>{error && <p className="admin-error">{error}</p>}<button className="admin-submit" disabled={busy}>{busy ? "Adding farm..." : "Add farm for verification"}</button></form></div></div>}
    {payoutAccountOpen&&<div className="modal-overlay" onMouseDown={()=>setPayoutAccountOpen(false)}><div className="admin-add-modal payout-account-modal" onMouseDown={(event)=>event.stopPropagation()}><button className="close-modal" onClick={()=>setPayoutAccountOpen(false)}><X size={19}/></button><p className="auth-kicker">PAYOUT ACCOUNT</p><h2>{data.farm.name}</h2><p>Paystack verifies the account and HarvestNearU stores only the recipient token and last four digits.</p>{payoutAccount?.account_last4&&<div className="payout-account-current"><Check size={17}/><span><strong>{payoutAccount.account_name}</strong><small>{payoutAccount.bank_name} · ending {payoutAccount.account_last4}</small></span></div>}<form onSubmit={savePayoutAccount}><label>Bank<select name="bankCode" required defaultValue=""><option value="" disabled>Select bank</option>{payoutBanks.map((bank)=><option key={bank.code} value={bank.code}>{bank.name}</option>)}</select></label><label>Account number<input name="accountNumber" inputMode="numeric" pattern="[0-9]{10}" minLength={10} maxLength={10} required placeholder="10-digit NUBAN account"/></label>{error&&<p className="admin-error">{error}</p>}<button className="admin-submit" disabled={busy}>{busy?"Verifying account...":"Verify and save account"}</button></form></div></div>}
    {manageListing && <div className="modal-overlay" onMouseDown={() => setManageListing(null)}><div className="admin-add-modal farmer-listing-modal" onMouseDown={(event) => event.stopPropagation()}><button className="close-modal" onClick={() => setManageListing(null)}><X size={19}/></button><p className="auth-kicker">EDIT HARVEST</p><h2>{manageListing.title}</h2><p>Update the listing details shown to customers.</p><form onSubmit={updateInventory}><label>Category<select name="categoryId" defaultValue={manageListing.category_id} required>{data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Produce name<input name="name" defaultValue={manageListing.title} required/></label><div className="form-row"><label>Unit<input name="unit" defaultValue={manageListing.unit} required/></label><label>Price (NGN)<input name="price" type="number" min="1" defaultValue={Number(manageListing.unit_price_kobo) / 100} required/></label></div><div className="form-row"><label>Available quantity<input name="stock" type="number" min={Number(manageListing.quantity_reserved)} defaultValue={Number(manageListing.quantity_available)} required/></label><label>Harvest date<input name="harvestDate" type="date" defaultValue={String(manageListing.harvest_date).slice(0, 10)} required/></label></div><div className="form-row"><label>Available from (optional)<input name="availableFrom" type="datetime-local" defaultValue={lagosDateTimeInput(manageListing.available_from)}/></label><label>Available until (optional)<input name="availableUntil" type="datetime-local" defaultValue={lagosDateTimeInput(manageListing.available_until)}/></label></div>{manageListing.image_url && <div className="listing-image-preview"><img src={manageListing.image_url} alt={`Current ${manageListing.title}`}/><span>Current picture</span></div>}<label>Change picture<input name="image" type="file" accept="image/png,image/jpeg,image/webp"/><small>Leave empty to keep the current picture. Maximum 4 MB.</small></label><label>Badge<input name="badge" defaultValue={manageListing.badge || ""} placeholder="Picked today"/></label><label>Listing status<select name="status" defaultValue={manageListing.status === "paused" ? "paused" : "active"}><option value="active">Active</option><option value="paused">Paused</option></select></label>{error && <p className="admin-error">{error}</p>}<button className="admin-submit" disabled={busy}>{busy ? "Saving..." : "Save listing"} {!busy && <ArrowRight size={16}/>}</button></form></div></div>}
  </main>;
}
