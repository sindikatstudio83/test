import type { BannerPlacement } from "@/types/domain";

export type MockBanner = {
  imageUrl: string;
  targetUrl: string;
  label: string;
  width: number;
  height: number;
  deviceClass: string;
};

/**
 * Centralizovani mock/placeholder baneri.
 * Prikazuju se samo kada nema aktivnog banera u bazi za datu poziciju.
 * Koristimo picsum.photos sa seed-om radi konzistentnog vizualnog izgleda.
 */
const MOCK_BANNERS: Record<BannerPlacement, MockBanner> = {
  homepage_hero: {
    imageUrl: "https://picsum.photos/seed/imaposla-hero/1200/280",
    targetUrl: "https://example.com/?utm_source=imaposla&utm_medium=banner&utm_campaign=mock_hero",
    label: "1200×280",
    width: 1200,
    height: 280,
    deviceClass: "",
  },
  homepage_top: {
    imageUrl: "https://picsum.photos/seed/imaposla-home-top/970/250",
    targetUrl: "https://example.com/?utm_source=imaposla&utm_medium=banner&utm_campaign=mock_home_top",
    label: "970×250",
    width: 970,
    height: 250,
    deviceClass: "",
  },
  homepage_middle: {
    imageUrl: "https://picsum.photos/seed/imaposla-home-mid/728/90",
    targetUrl: "https://example.com/?utm_source=imaposla&utm_medium=banner&utm_campaign=mock_home_mid",
    label: "728×90",
    width: 728,
    height: 90,
    deviceClass: "",
  },
  homepage_bottom: {
    imageUrl: "https://picsum.photos/seed/imaposla-home-bot/970/90",
    targetUrl: "https://example.com/?utm_source=imaposla&utm_medium=banner&utm_campaign=mock_home_bot",
    label: "970×90",
    width: 970,
    height: 90,
    deviceClass: "",
  },
  jobs_list_top: {
    imageUrl: "https://picsum.photos/seed/imaposla-jobs-top/728/90",
    targetUrl: "https://example.com/?utm_source=imaposla&utm_medium=banner&utm_campaign=mock_jobs_top",
    label: "728×90",
    width: 728,
    height: 90,
    deviceClass: "",
  },
  jobs_list_middle: {
    imageUrl: "https://picsum.photos/seed/imaposla-jobs-mid/300/250",
    targetUrl: "https://example.com/?utm_source=imaposla&utm_medium=banner&utm_campaign=mock_jobs_mid",
    label: "300×250",
    width: 300,
    height: 250,
    deviceClass: "",
  },
  jobs_list_bottom: {
    imageUrl: "https://picsum.photos/seed/imaposla-jobs-bot/728/90",
    targetUrl: "https://example.com/?utm_source=imaposla&utm_medium=banner&utm_campaign=mock_jobs_bot",
    label: "728×90",
    width: 728,
    height: 90,
    deviceClass: "",
  },
  job_detail_top: {
    imageUrl: "https://picsum.photos/seed/imaposla-job-dtop/728/90",
    targetUrl: "https://example.com/?utm_source=imaposla&utm_medium=banner&utm_campaign=mock_job_detail_top",
    label: "728×90",
    width: 728,
    height: 90,
    deviceClass: "",
  },
  job_detail_bottom: {
    imageUrl: "https://picsum.photos/seed/imaposla-job-dbot/300/250",
    targetUrl: "https://example.com/?utm_source=imaposla&utm_medium=banner&utm_campaign=mock_job_detail_bot",
    label: "300×250",
    width: 300,
    height: 250,
    deviceClass: "",
  },
  company_pages_top: {
    imageUrl: "https://picsum.photos/seed/imaposla-co-top/970/90",
    targetUrl: "https://example.com/?utm_source=imaposla&utm_medium=banner&utm_campaign=mock_company_top",
    label: "970×90",
    width: 970,
    height: 90,
    deviceClass: "",
  },
  company_pages_bottom: {
    imageUrl: "https://picsum.photos/seed/imaposla-co-bot/728/90",
    targetUrl: "https://example.com/?utm_source=imaposla&utm_medium=banner&utm_campaign=mock_company_bot",
    label: "728×90",
    width: 728,
    height: 90,
    deviceClass: "",
  },
  city_page_top: {
    imageUrl: "https://picsum.photos/seed/imaposla-city-top/728/90",
    targetUrl: "https://example.com/?utm_source=imaposla&utm_medium=banner&utm_campaign=mock_city_top",
    label: "728×90",
    width: 728,
    height: 90,
    deviceClass: "",
  },
  category_page_top: {
    imageUrl: "https://picsum.photos/seed/imaposla-cat-top/728/90",
    targetUrl: "https://example.com/?utm_source=imaposla&utm_medium=banner&utm_campaign=mock_category_top",
    label: "728×90",
    width: 728,
    height: 90,
    deviceClass: "",
  },
  footer_banner: {
    imageUrl: "https://picsum.photos/seed/imaposla-footer/970/90",
    targetUrl: "https://example.com/?utm_source=imaposla&utm_medium=banner&utm_campaign=mock_footer",
    label: "970×90",
    width: 970,
    height: 90,
    deviceClass: "",
  },
  jobs_left_tower: {
    imageUrl: "https://picsum.photos/seed/imaposla-tower-left/160/600",
    targetUrl: "https://example.com/?utm_source=imaposla&utm_medium=banner&utm_campaign=mock_tower_left",
    label: "160×600",
    width: 160,
    height: 600,
    deviceClass: "ad-desktop",
  },
  jobs_right_tower: {
    imageUrl: "https://picsum.photos/seed/imaposla-tower-right/160/600",
    targetUrl: "https://example.com/?utm_source=imaposla&utm_medium=banner&utm_campaign=mock_tower_right",
    label: "160×600",
    width: 160,
    height: 600,
    deviceClass: "ad-desktop",
  },
};

export function getMockBanner(placement: BannerPlacement): MockBanner {
  return MOCK_BANNERS[placement] ?? MOCK_BANNERS.homepage_top;
}
