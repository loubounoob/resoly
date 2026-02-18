-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- RLS: users can upload their avatar
CREATE POLICY "Users can upload their avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: users can update their avatar
CREATE POLICY "Users can update their avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: users can delete their avatar
CREATE POLICY "Users can delete their avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: public read access
CREATE POLICY "Public avatar access"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');
