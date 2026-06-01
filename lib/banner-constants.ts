import type { BannerPlacement, BannerFormat } from "@/types/domain";

export const placementLabels: Record<BannerPlacement, string> = {
  homepage_hero: "Početna — hero carousel",
  homepage_top: "Početna — vrh",
  homepage_middle: "Početna — sredina",
  homepage_bottom: "Početna — dno",
  jobs_list_top: "Lista oglasa — vrh",
  jobs_list_middle: "Lista oglasa — sredina",
  jobs_list_bottom: "Lista oglasa — dno",
  jobs_left_tower: "Lista oglasa — lijevi toranj (desktop)",
  jobs_right_tower: "Lista oglasa — desni toranj (desktop)",
  job_detail_top: "Detalj oglasa — vrh",
  job_detail_bottom: "Detalj oglasa — dno",
  company_pages_top: "Stranica firme — vrh",
  company_pages_bottom: "Stranica firme — dno",
  city_page_top: "Grad — vrh",
  category_page_top: "Kategorija — vrh",
  footer_banner: "Footer banner"
};

export const formatLabels: Record<BannerFormat, string> = {
  leaderboard_728x90: "Leaderboard (728×90)",
  large_leaderboard_970x90: "Large leaderboard (970×90)",
  billboard_970x250: "Billboard (970×250)",
  medium_rectangle_300x250: "Medium rectangle (300×250)",
  half_page_300x600: "Half page (300×600)",
  wide_inline_1200x250: "Wide inline (1200×250)",
  mobile_banner_320x50: "Mobile banner (320×50)",
  mobile_large_320x100: "Mobile large (320×100)",
  mobile_inline_responsive: "Mobile responsive"
};

export const formatDimensions: Record<BannerFormat, { w: number; h: number }> = {
  leaderboard_728x90: { w: 728, h: 90 },
  large_leaderboard_970x90: { w: 970, h: 90 },
  billboard_970x250: { w: 970, h: 250 },
  medium_rectangle_300x250: { w: 300, h: 250 },
  half_page_300x600: { w: 300, h: 600 },
  wide_inline_1200x250: { w: 1200, h: 250 },
  mobile_banner_320x50: { w: 320, h: 50 },
  mobile_large_320x100: { w: 320, h: 100 },
  mobile_inline_responsive: { w: 0, h: 0 }
};

export const audienceLabels = {
  all: "Svi posjetioci",
  candidates: "Kandidati",
  companies: "Firme"
};

export const deviceLabels = {
  all: "Svi uređaji",
  desktop: "Samo desktop",
  mobile: "Samo mobilni"
};
