export type UserRole = "guest" | "candidate" | "company" | "admin";

export type JobStatus = "draft" | "pending_review" | "active" | "paused" | "rejected" | "expired";

export type ApplicationStage = "applied" | "review" | "interview" | "shortlist" | "offer" | "hired" | "rejected";

export type Profile = {
  id: string;
  role: UserRole;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  avatar_path: string | null;
  cv_data?: CvData | null;
  cv_updated_at?: string | null;
};

export type CvData = {
  fullName?: string;
  title?: string;
  city?: string;
  phone?: string;
  email?: string;
  summary?: string;
  skills?: string;
  languages?: string;
  experience?: string;
  education?: string;
  certificates?: string;
  availability?: string;
};

export type Company = {
  id: number;
  owner_id?: string;
  name: string;
  slug: string;
  city: string | null;
  industry: string | null;
  description: string | null;
  logo_path: string | null;
  website: string | null;
  approved: boolean;
};

export type LookupItem = {
  id: number;
  name: string;
  slug: string;
};

export type Job = {
  id: number;
  title: string;
  slug: string;
  description: string;
  contract_type: string | null;
  salary_text: string | null;
  deadline: string | null;
  status: JobStatus;
  featured: boolean;
  company_id: number;
  companies?: Pick<Company, "id" | "name" | "slug" | "logo_path"> | null;
  categories?: { id: number; name: string } | null;
  cities?: { id: number; name: string } | null;
};

export type JobApplication = {
  id: number;
  job_id: number;
  candidate_id: string;
  stage: ApplicationStage;
  cover_letter: string | null;
  reference_code: string | null;
  created_at: string;
  jobs?: Pick<Job, "id" | "title" | "company_id"> & { companies?: Pick<Company, "name"> | null };
  profiles?: Profile | null;
};

export type Plan = {
  id: number;
  name: string;
  price_eur: number;
  active_jobs: number;
  unlock_credits: number;
  features: string[];
};

export type Order = {
  id: number;
  company_id: number;
  plan_id: number | null;
  status: "pending" | "paid" | "rejected" | "cancelled";
  amount_eur: number;
  payment_reference: string;
  activation_code: string | null;
  created_at: string;
  plans?: Pick<Plan, "name"> | null;
  companies?: Pick<Company, "name"> | null;
};

export type PaymentProof = {
  id: number;
  order_id: number;
  company_id: number;
  uploaded_by: string;
  amount_eur: number | null;
  file_path: string;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  orders?: Order | null;
  companies?: Pick<Company, "name"> | null;
};


export type SavedJob = {
  id: number;
  user_id: string;        // DB column is user_id (not candidate_id)
  job_id: number;
  created_at: string;
  jobs?: Job | null;
};

export type JobAlert = {
  id: number;
  candidate_id: string;   // DB column is candidate_id
  city_id: number | null;
  category_id: number | null;
  contract_type: string | null;
  keywords: string | null;
  active: boolean;
  created_at: string;
  cities?: { id: number; name: string } | null;
  categories?: { id: number; name: string } | null;
};

export type NotificationType =
  | "application_received" | "application_sent" | "stage_changed"
  | "company_approved" | "company_rejected"
  | "job_approved" | "job_rejected"
  | "payment_confirmed" | "payment_rejected"
  | "system";

export type Notification = {
  id: number;
  recipient_id: string;
  title: string;
  message: string;
  notification_type: NotificationType;
  link: string | null;
  read: boolean;
  created_at: string;
};

export type ApplicationComment = {
  id: number;
  application_id: number;
  author_id: string;
  text: string;
  created_at: string;
  profiles?: { full_name: string | null; email: string | null } | null;
};

export type ApplicationLabel = {
  application_id: number;
  label: "top" | "interview" | "rejected" | "followup" | "star";
  created_at: string;
};

export type ApplicationEvent = {
  id: number;
  application_id: number;
  actor_id: string | null;
  from_stage: ApplicationStage | null;
  to_stage: ApplicationStage | null;
  created_at: string;
};

export type Subscription = {
  id: number;
  plan_id: number;
  plan_name: string;
  active_jobs: number;
  unlock_credits_remaining: number;
  active_until: string | null;
  status: "active" | "expired";
};

export type CompanyActivePlan = {
  subscription_id: number;
  plan_id: number;
  plan_name: string;
  active_jobs_limit: number;
  active_until: string | null;
  is_active: boolean;
};

export type BannerPlacement =
  | "homepage_hero"      // ← NOVO: hero carousel
  | "homepage_top"
  | "homepage_middle"
  | "homepage_bottom"
  | "jobs_list_top"
  | "jobs_list_middle"
  | "jobs_list_bottom"
  | "jobs_left_tower"
  | "jobs_right_tower"
  | "job_detail_top"
  | "job_detail_bottom"
  | "company_pages_top"
  | "company_pages_bottom"
  | "city_page_top"
  | "category_page_top"
  | "footer_banner";

export type BannerFormat =
  | "leaderboard_728x90"
  | "large_leaderboard_970x90"
  | "billboard_970x250"
  | "medium_rectangle_300x250"
  | "half_page_300x600"
  | "wide_inline_1200x250"
  | "mobile_banner_320x50"
  | "mobile_large_320x100"
  | "mobile_inline_responsive";

export type BannerAudience = "all" | "candidates" | "companies";
export type BannerDevice = "all" | "desktop" | "mobile";

export type Banner = {
  id: number;
  title: string;
  image_path: string | null;
  target_url: string | null;
  placement: BannerPlacement | string;
  format: BannerFormat | string | null;
  target_audience: BannerAudience;
  device: BannerDevice;
  approved: boolean;
  priority: number;
  start_date: string | null;
  end_date: string | null;
  impressions: number;
  clicks: number;
  created_at: string;
  updated_at: string;
};

// ── COMPANY WITH EXTRAS (post-migration) ──────────────────────────────────
export type CompanyWithExtras = Company & {
  recommended: boolean;
  recommended_priority: number;
  instagram_url: string | null;
  updated_at: string;
};

// ── JOB_PROMOTIONS ────────────────────────────────────────────────────────
export type JobPromotionType = "featured" | "paid_top" | "homepage_top" | "urgent";
export type JobPromotionStatus = "active" | "paused" | "expired";
export type JobPromotionSource = "admin" | "package" | "payment" | "credit";

export type JobPromotion = {
  id: number;
  job_id: number;
  company_id: number;
  type: JobPromotionType;
  status: JobPromotionStatus;
  priority: number;
  starts_at: string;
  ends_at: string | null;
  source: JobPromotionSource;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type JobWithPromotion = Job & {
  promotion_type?: JobPromotionType | null;
  promotion_priority?: number;
  promotion_ends_at?: string | null;
  quick_job?: boolean;
  urgent?: boolean;
  daily_rate?: number | null;
};

// ── HOMEPAGE DATA ─────────────────────────────────────────────────────────
export type HomepageData = {
  paidTopJobs: JobWithPromotion[];
  featuredJobs: JobWithPromotion[];
  regularJobs: Job[];
  quickJobs: Job[];
  recommendedCompanies: CompanyWithExtras[];
};

// ── CREDIT TRANSACTIONS ───────────────────────────────────────────────────
export type CreditTransactionType =
  | "package_activation" | "cv_unlock" | "admin_adjustment"
  | "bonus" | "refund" | "promotion_spend" | "banner_spend";

export type CreditTransaction = {
  id: number;
  company_id: number;
  subscription_id: number | null;
  type: CreditTransactionType;
  amount: number;
  balance_after: number;
  reference_type: string | null;
  reference_id: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

// ── BANNER REQUESTS ───────────────────────────────────────────────────────
export type BannerRequestStatus = "pending" | "approved" | "rejected" | "active" | "expired";

export type BannerRequest = {
  id: number;
  company_id: number;
  title: string;
  image_path: string | null;
  target_url: string | null;
  requested_placement: string | null;
  requested_device: "all" | "desktop" | "mobile";
  requested_start_date: string | null;
  requested_end_date: string | null;
  note: string | null;
  status: BannerRequestStatus;
  admin_note: string | null;
  approved_banner_id: number | null;
  created_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

// ── WORKER RATINGS ────────────────────────────────────────────────────────
export type WorkerRating = {
  id: number;
  company_id: number;
  worker_id: string;
  job_id: number | null;
  rating: number;
  tags: string[];
  note: string | null;
  visibility: "private" | "admin_only";
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

// ── CREATIVE TEMPLATES ────────────────────────────────────────────────────
export type CreativeTemplateFormat =
  | "instagram_post" | "instagram_story" | "facebook_feed"
  | "banner" | "square" | "vertical" | "horizontal";

export type CreativeTemplatePurpose =
  | "job_ad" | "featured_job" | "paid_top"
  | "company_promo" | "quick_job" | "generic";

export type CreativeTemplate = {
  id: number;
  name: string;
  template_url: string;
  format: CreativeTemplateFormat;
  purpose: CreativeTemplatePurpose;
  active: boolean;
  created_at: string;
  updated_at: string;
};

// ════════════════════════════════════════════════════════════════════════════
// BRZI POSLOVI — quick gigs + worker marketplace
// ════════════════════════════════════════════════════════════════════════════

export type WorkerStatus = "pending" | "active" | "hidden" | "rejected";
export type GigStatus = "pending_review" | "active" | "closed" | "rejected" | "expired";
export type AvailabilityType =
  | "immediately" | "weekends" | "seasonal" | "by_agreement" | "specific_date";

export type Profession = {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  sort: number;
  active: boolean;
};

export type WorkerProfile = {
  id: number;
  user_id: string;
  display_name: string;
  profession_id: number | null;
  profession_text: string | null;
  cities: string[];
  availability: AvailabilityType;
  available_from: string | null;
  experience_years: number;
  price_text: string | null;
  languages: string | null;
  bio: string | null;
  photo_path: string | null;
  contact_phone: string | null;
  contact_viber: string | null;
  contact_email: string | null;
  show_phone: boolean;
  is_public: boolean;
  status: WorkerStatus;
  is_premium: boolean;
  premium_until: string | null;
  is_verified: boolean;
  slug: string | null;
  views: number;
  created_at: string;
  updated_at: string;
  professions?: Pick<Profession, "id" | "name" | "slug" | "icon"> | null;
  worker_portfolio?: WorkerPortfolioItem[];
};

export type WorkerPortfolioItem = {
  id: number;
  worker_id: number;
  image_path: string;
  sort: number;
  created_at: string;
};

export type QuickGig = {
  id: number;
  posted_by: string;
  company_id: number | null;
  title: string;
  profession_id: number | null;
  city: string;
  gig_date: string | null;
  gig_timing: string | null;
  pay_text: string | null;
  description: string | null;
  is_urgent: boolean;
  is_featured: boolean;
  status: GigStatus;
  created_at: string;
  updated_at: string;
  professions?: Pick<Profession, "id" | "name" | "slug" | "icon"> | null;
  companies?: Pick<Company, "id" | "name" | "slug"> | null;
};

export type QuickGigApplication = {
  id: number;
  gig_id: number;
  candidate_id: string;
  message: string | null;
  created_at: string;
  quick_gigs?: (Pick<QuickGig, "id" | "title" | "city"> & { status?: GigStatus }) | null;
  profiles?: Pick<Profile, "full_name" | "email" | "phone"> | null;
};

export type WorkerMessage = {
  id: number;
  worker_id: number;
  from_user: string;
  from_name: string | null;
  from_contact: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type CandidateInterests = {
  user_id: string;
  professions: number[];
  cities: string[];
  categories: number[];
  job_types: string[];
  min_daily_pay: number | null;
  email_enabled: boolean;
  email_frequency: string;
  updated_at: string;
};

// Public-safe worker payload (no contact fields) — from public_worker_profiles view
export type PublicWorkerProfile = Omit<
  WorkerProfile,
  "contact_phone" | "contact_viber" | "contact_email"
>;

// Contact info returned only via get_worker_contact RPC (login-only, opt-in)
export type WorkerContactInfo = {
  contact_email: string | null;
  contact_phone: string | null;
  contact_viber: string | null;
  show_phone: boolean;
};

export type SavedWorker = {
  id: number;
  user_id: string;
  worker_id: number;
  created_at: string;
};

export type PremiumRequest = {
  id: number;
  worker_id: number;
  user_id: string;
  plan: string;
  note: string | null;
  status: "pending" | "paid" | "rejected";
  created_at: string;
};
