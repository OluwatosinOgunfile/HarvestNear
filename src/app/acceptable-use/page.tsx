import type { Metadata } from "next";
import Link from "next/link";
import { LegalFooter, LegalHeader, LegalPageShell } from "../LegalChrome";
import styles from "../legal.module.css";
import { TERMS_VERSION } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Acceptable Use Policy | HarvestNearU",
  description: "What may and may not be listed, bought, or done on the HarvestNearU marketplace, and what happens when this policy is breached.",
  alternates: { canonical: "https://www.harvestnearu.com/acceptable-use" },
};

export default function AcceptableUsePolicy() {
  return <LegalPageShell><LegalHeader/><main className={styles.legalMain}>
    <article className={styles.hero}>
      <p className={styles.eyebrow}>Acceptable use policy | Version {TERMS_VERSION}</p>
      <h1>What belongs here, and what does not.</h1>
      <p className={styles.intro}>HarvestNearU is a marketplace for fresh agricultural produce from verified Nigerian farms. This policy sets out what may be listed and how the marketplace may be used. It forms part of our <Link href="/terms">terms of service</Link> and applies to every customer, farm, and visitor.</p>
    </article>
    <div className={styles.content}>
      <section>
        <h2>What may be sold</h2>
        <p>Listings are limited to fresh agricultural produce and closely related farm goods: fruit and vegetables, tubers and roots, grains, legumes, spices and herbs, nuts and seeds, poultry and eggs, fish, honey, dairy, and similar unprocessed or minimally processed farm output.</p>
        <p>A farm may only list produce it genuinely has available, in the quantity stated, at the stated price, and may only sell under the farm identity it was verified under.</p>
      </section>
      <section>
        <h2>What may not be sold</h2>
        <p>The following may not be listed or sold through HarvestNearU under any circumstances:</p>
        <ul>
          <li>Alcohol, tobacco, nicotine products, and any controlled or illegal drug.</li>
          <li>Prescription or over-the-counter medicines, veterinary medicines, supplements making medicinal claims, and herbal preparations sold as treatment for any condition.</li>
          <li>Live animals other than poultry and fish sold as food, and any product from a protected, endangered, or bushmeat species.</li>
          <li>Weapons, ammunition, explosives, and agricultural chemicals restricted under Nigerian law, including unregistered pesticides.</li>
          <li>Produce that is spoiled, contaminated, knowingly unsafe to eat, or subject to a recall.</li>
          <li>Counterfeit goods, stolen goods, and goods a seller has no lawful right to sell.</li>
          <li>Currency, financial instruments, cryptocurrency, gift cards, vouchers, airtime, and data bundles.</li>
          <li>Anything whose sale would require a licence the farm does not hold.</li>
        </ul>
      </section>
      <section>
        <h2>Honest listings</h2>
        <p>Do not misdescribe produce, its origin, its weight, its condition, or its harvest date. Photographs must show the produce actually being sold. Prices must be the full price a customer pays, with no charge added after checkout other than the delivery fee shown in the basket.</p>
      </section>
      <section>
        <h2>Identity and verification</h2>
        <p>Do not misrepresent who you are. Farms must submit genuine identity and business details belonging to the person or entity operating the farm, and must not use another person&apos;s identity, a fabricated registration number, or a bank account they do not own. Holding more than one farm account to disguise a suspension is not permitted.</p>
      </section>
      <section>
        <h2>Payments and payouts</h2>
        <p>Payments must be made through the channels offered at checkout. Do not seek to move a transaction off the platform to avoid fees, ask a customer to pay a farm directly for an order placed here, use the marketplace to move money unrelated to a genuine sale, or attempt to obtain a payout for an order that was not fulfilled. Account credit may be spent on produce only; it cannot be exchanged for cash.</p>
      </section>
      <section>
        <h2>Ratings, reviews, and messages</h2>
        <p>Ratings and reviews must describe a genuine purchase. Do not post or solicit fake reviews, offer anything in exchange for a rating, or use reviews or order messages to threaten, harass, defame, or send unlawful, misleading, or unsolicited commercial content. Order messaging is for arranging and resolving that order.</p>
      </section>
      <section>
        <h2>The platform itself</h2>
        <p>Do not interfere with the service or its security, attempt to access data belonging to others, probe or bypass access controls, scrape or bulk-collect listings or personal data, submit automated traffic that degrades the service, or upload anything containing malicious code.</p>
      </section>
      <section>
        <h2>How we enforce this</h2>
        <p>Where we reasonably believe this policy has been breached we may remove a listing, withhold a payout pending review, suspend or close an account, refuse future access, and report the matter to the relevant authorities. Payouts are withheld automatically while an order has an unresolved refund or complaint. We act proportionately, and the seriousness of the breach determines the response; a breach involving identity, payment, or food safety will normally lead to closure.</p>
        <p>If you believe we have acted wrongly, contact us through the <Link href="/help">Help Centre</Link> and we will review the decision.</p>
      </section>
      <section>
        <h2>Reporting a problem</h2>
        <p>To report a listing, a farm, a customer, or a message that breaches this policy, raise it through the <Link href="/help">Help Centre</Link> with the order number or farm name. Reports about food safety or identity fraud are prioritised.</p>
      </section>
      <section>
        <h2>Changes</h2>
        <p>We may update this policy as the marketplace changes or as the law requires. Material changes will be notified in the application, and continued use after a change means accepting the updated policy.</p>
      </section>
    </div>
  </main><LegalFooter/></LegalPageShell>;
}
