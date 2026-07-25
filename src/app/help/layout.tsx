const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do manual bank-transfer payments work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Transfer the checkout amount to the displayed company account and upload a valid receipt. The order remains pending until an administrator verifies the payment.",
      },
    },
    {
      "@type": "Question",
      name: "Can I pay with HarvestNearU account credit?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Available account credit is automatically applied to an eligible purchase and can cover part or all of the order.",
      },
    },
    {
      "@type": "Question",
      name: "How do I track and confirm receipt of an order?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Open My Orders to track every product separately. Confirm each product after delivery or collection, then rate the farms involved when all products are fulfilled.",
      },
    },
    {
      "@type": "Question",
      name: "How do farm ratings work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "After confirming receipt, customers can give each farm a one-to-five-star rating and an optional comment.",
      },
    },
  ],
};

export default function HelpLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}/></>;
}
