import type { Metadata } from "next";
import { BannerRequestClient } from "@/components/banner-request-client";

export const metadata: Metadata = { title: "Banner zahtjevi — Firma panel" };

export default function FirmaBaneriPage() {
  return <BannerRequestClient />;
}
