"use client";

import { Printer } from "lucide-react";

export default function PrintReceiptButton() {
  return <button className="receipt-print-button" type="button" onClick={() => window.print()}><Printer size={17}/> Print or save as PDF</button>;
}
