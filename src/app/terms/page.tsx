import type { Metadata } from "next";
import Link from "next/link";
import { LegalFooter, LegalHeader, LegalPageShell } from "../LegalChrome";
import styles from "../legal.module.css";
import { TERMS_VERSION } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service | HarvestNearU",
  description: "The agreement between HarvestNearU, the customers who buy produce, and the farms that sell it.",
  alternates: { canonical: "https://www.harvestnearu.com/terms" },
};

export default function TermsOfService() {
  return <LegalPageShell><LegalHeader/><main className={styles.legalMain}>
    <article className={styles.hero}>
      <p className={styles.eyebrow}>Terms of service | Version {TERMS_VERSION}</p>
      <h1>The agreement between us.</h1>
      <p className={styles.intro}>These terms govern use of the HarvestNearU website and mobile application by customers, farmers, and anyone browsing the marketplace. Using the service means accepting them.</p>
    </article>
    <div className={styles.content}>
      <section>
        <h2>Who we are and what we do</h2>
        <p>HarvestNearU is operated in Nigeria and runs a marketplace that connects customers with independent farms. <strong>We are an intermediary.</strong> The contract of sale for produce is between the customer and the supplying farm. HarvestNearU provides the platform, takes payment on the farm&apos;s behalf, and supports fulfilment and dispute resolution; it does not grow, harvest, store, or own the produce sold through it.</p>
      </section>
      <section>
        <h2>Accounts</h2>
        <p>You must be at least 18 to hold an account and must give accurate details. You are responsible for activity under your account and for keeping your password private. Tell us promptly if you believe your account has been used without your permission. We may suspend an account where we reasonably believe it is being used unlawfully, fraudulently, or in breach of these terms.</p>
      </section>
      <section>
        <h2>Selling on HarvestNearU</h2>
        <p>Farms must complete verification before selling or being paid, which includes confirming the identity of the account holder and that the payout account belongs to them. Farms are responsible for the accuracy of their listings, for the quality, safety, weight, and legality of what they sell, for holding any licence their produce requires, and for fulfilling orders as described.</p>
        <p>An administration and processing fee is deducted from each sale. The current rate is shown wherever a price is set, and we will give notice inside the product before any change takes effect. Earnings from fulfilled orders are paid to the farm&apos;s verified payout account, subject to the checks described in the product.</p>
      </section>
      <section>
        <h2>Prices, orders, and payment</h2>
        <p>Prices are set by the farm and shown in naira. Placing an order is an offer to buy; the order is accepted when payment is confirmed and the farm receives it. Stock is checked again at checkout, and an order that cannot be fulfilled is cancelled and refunded. Payments are processed by Paystack; we do not receive or store card numbers.</p>
      </section>
      <section>
        <h2>Delivery, pickup, and risk</h2>
        <p>Fulfilment options depend on the supplying farm and your location: doorstep delivery priced by distance, free collection from the farm, or delivery arranged directly with the farmer. Travel times shown in the marketplace are estimates, not guarantees. Risk in the produce passes to the customer on delivery or collection.</p>
      </section>
      <section>
        <h2>Cancellations, refunds, and complaints</h2>
        <p>Fresh produce is perishable, so cancellation rights are limited once a farm has begun fulfilment. Our <Link href="/returns-refunds">returns and refunds policy</Link> forms part of these terms and explains when an order can be cancelled, when a refund is due, and how to raise a problem. Nothing in these terms removes rights you have under the Federal Competition and Consumer Protection Act 2018 or any other law that cannot be excluded by agreement.</p>
        <p>Raise a complaint through the <Link href="/help">Help centre</Link>. We aim to acknowledge within one business day. If we cannot resolve it together, you may refer the matter to the Federal Competition and Consumer Protection Commission.</p>
      </section>
      <section>
        <h2>Acceptable use</h2>
        <p>Do not misrepresent produce or identity, list anything you may not lawfully sell, interfere with the service or its security, scrape it, or use it to send unlawful or misleading messages. Ratings and reviews must describe a genuine purchase.</p>
      </section>
      <section>
        <h2>Our responsibility to you</h2>
        <p>We provide the marketplace with reasonable skill and care, but we do not promise it will always be available or free of interruption. <strong>We are not liable for the quality, safety, or legality of produce sold by a farm</strong>, beyond our role in resolving disputes and processing refunds as described.</p>
        <p>To the extent the law allows, we are not liable for loss of profit, loss of business, or indirect or consequential loss, and our total liability arising from any order is limited to the amount paid for that order. <strong>Nothing here limits liability for death or personal injury caused by negligence, for fraud, or for anything else that cannot lawfully be limited.</strong></p>
      </section>
      <section>
        <h2>Your information</h2>
        <p>How we handle personal information, the legal bases we rely on, how long we keep it, and the rights you have are set out in our <Link href="/privacy">privacy policy</Link>, which forms part of these terms.</p>
      </section>
      <section>
        <h2>Changes, ending, and governing law</h2>
        <p>We may change these terms as the service changes or the law requires. Material changes are notified in the product and the version above is updated; continuing to use the service after that means accepting the new version. You may close your account at any time from <Link href="/account-deletion">account deletion</Link>; we may end access for serious or repeated breach.</p>
        <p>These terms are governed by the laws of the Federal Republic of Nigeria, and the courts of Nigeria have jurisdiction over any dispute. We ask that you contact us first so we can try to resolve the matter directly.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>Write to <a href="mailto:hello@harvestnearu.com">hello@harvestnearu.com</a> or use the <Link href="/help">Help centre</Link>.</p>
      </section>
    </div>
  </main><LegalFooter/></LegalPageShell>;
}
