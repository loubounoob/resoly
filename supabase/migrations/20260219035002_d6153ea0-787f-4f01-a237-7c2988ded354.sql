
-- Allow friends to view each other's challenges
CREATE POLICY "Friends can view challenges"
ON public.challenges
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
    AND (
      (f.user_id = auth.uid() AND f.friend_id = challenges.user_id)
      OR (f.friend_id = auth.uid() AND f.user_id = challenges.user_id)
    )
  )
);

-- Allow friends to view each other's check_ins
CREATE POLICY "Friends can view check_ins"
ON public.check_ins
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
    AND (
      (f.user_id = auth.uid() AND f.friend_id = check_ins.user_id)
      OR (f.friend_id = auth.uid() AND f.user_id = check_ins.user_id)
    )
  )
);
