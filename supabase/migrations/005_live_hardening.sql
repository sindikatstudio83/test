-- Supabase production hardening applied on 2026-05-05.
-- Safe to re-run. Does not delete or overwrite application data.

alter function public.safe_user_role(text) set search_path = public;

revoke execute on function public.confirm_payment_proof(bigint) from anon;
revoke execute on function public.is_admin() from anon;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_new_user_profile() from public, anon, authenticated;
revoke execute on function public.log_application_stage_change() from public, anon, authenticated;
revoke execute on function public.prevent_company_admin_field_change() from public, anon, authenticated;
revoke execute on function public.prevent_company_job_moderation() from public, anon, authenticated;
revoke execute on function public.prevent_company_self_approval() from public, anon, authenticated;
revoke execute on function public.prevent_profile_role_change() from public, anon, authenticated;
revoke execute on function public.prevent_profile_role_self_change() from public, anon, authenticated;

create index if not exists application_events_actor_id_idx on public.application_events(actor_id);
create index if not exists application_events_application_id_idx on public.application_events(application_id);
create index if not exists application_stage_events_application_id_idx on public.application_stage_events(application_id);
create index if not exists application_stage_events_changed_by_idx on public.application_stage_events(changed_by);
create index if not exists ats_comments_application_id_idx on public.ats_comments(application_id);
create index if not exists ats_comments_author_id_idx on public.ats_comments(author_id);
create index if not exists banners_company_id_idx on public.banners(company_id);
create index if not exists companies_owner_id_idx on public.companies(owner_id);
create index if not exists job_applications_candidate_id_idx on public.job_applications(candidate_id);
create index if not exists jobs_category_id_idx on public.jobs(category_id);
create index if not exists jobs_city_id_idx on public.jobs(city_id);
create index if not exists jobs_company_id_idx on public.jobs(company_id);
create index if not exists orders_company_id_idx on public.orders(company_id);
create index if not exists orders_confirmed_by_idx on public.orders(confirmed_by);
create index if not exists orders_plan_id_idx on public.orders(plan_id);
create index if not exists payment_proofs_reviewed_by_idx on public.payment_proofs(reviewed_by);
create index if not exists subscriptions_company_id_idx on public.subscriptions(company_id);
create index if not exists subscriptions_plan_id_idx on public.subscriptions(plan_id);
