import type { Metadata } from "next";
import { AdminTemplatesClient } from "@/components/admin-templates-client";

export const metadata: Metadata = { title: "Canva Templates — Admin" };

export default function AdminTemplatesPage() {
  return <AdminTemplatesClient />;
}
