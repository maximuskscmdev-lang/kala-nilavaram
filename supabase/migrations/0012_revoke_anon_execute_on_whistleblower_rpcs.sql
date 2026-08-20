-- ============================================================================
-- 0012_revoke_anon_execute_on_whistleblower_rpcs.sql
-- PURPOSE: The app only invokes the audited submit/reveal RPCs from
--          authenticated server actions (verified-member / moderator
--          sessions). Anonymous callers have no legitimate use, so drop the
--          default PUBLIC EXECUTE grant and expose them to the authenticated
--          role only. get_report_status_by_tracking_id intentionally keeps
--          anon EXECUTE for the tracking-ID lookup without login.
-- ============================================================================

revoke execute on function public.submit_whistleblower_report(uuid, public.whistleblower_category, text, text[], bytea) from public, anon;
grant execute on function public.submit_whistleblower_report(uuid, public.whistleblower_category, text, text[], bytea) to authenticated;

revoke execute on function public.reveal_whistleblower_identity(uuid, text) from public, anon;
grant execute on function public.reveal_whistleblower_identity(uuid, text) to authenticated;
