
-- Fix: replace the overly permissive INSERT policy with a more restrictive one
-- Notifications are inserted via edge functions using service_role key,
-- so we restrict user INSERT to prevent abuse
DROP POLICY "Service role can insert notifications" ON public.notifications;

CREATE POLICY "Users cannot insert notifications directly"
  ON public.notifications FOR INSERT
  WITH CHECK (false);
