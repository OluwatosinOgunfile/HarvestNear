const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do payments work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Paystack is the primary secure payment option. If administrators enable manual bank transfer, checkout displays the company account and accepts a receipt that remains pending until administrator verification.",
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
        text: "Open My Orders to track every product separately. Confirm each product after delivery or collection and rate its supplying farm immediately. The overall order completes after every product is acknowledged.",
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
    {
      "@type": "Question",
      name: "Can I view a farm before ordering?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Select a farm name on a produce card to view its address, verified buyer feedback, current produce and related recommendations.",
      },
    },
  ],
};

export default function HelpLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}/></>;
}
