
-- Create the check-in-photos storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('check-in-photos', 'check-in-photos', true);

-- Policy: authenticated users can upload their own photos
CREATE POLICY "Users can upload check-in photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'check-in-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: anyone can view check-in photos (public bucket)
CREATE POLICY "Anyone can view check-in photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'check-in-photos');

-- Policy: users can delete their own photos
CREATE POLICY "Users can delete their own check-in photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'check-in-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add UPDATE policy for check_ins so we can set photo_url after insert
CREATE POLICY "Users can update their own check_ins"
ON public.check_ins FOR UPDATE
USING (auth.uid() = user_id);

-- pg_cron job: cleanup photos older than 24h every hour
SELECT cron.schedule(
  'cleanup-old-check-in-photos',
  '0 * * * *',
  $$
    UPDATE public.check_ins
    SET photo_url = NULL
    WHERE photo_url IS NOT NULL
      AND checked_in_at < now() - interval '24 hours';
    
    DELETE FROM storage.objects
    WHERE bucket_id = 'check-in-photos'
      AND created_at < now() - interval '24 hours';
  $$
);
