
-- app-files
CREATE POLICY "Admins can upload app files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'app-files' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can update app files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'app-files' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can delete app files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'app-files' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can read app files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'app-files' AND public.has_role(auth.uid(),'admin'));

-- portfolio-images
CREATE POLICY "Admins can upload portfolio images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'portfolio-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can update portfolio images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'portfolio-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can delete portfolio images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'portfolio-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can read portfolio images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'portfolio-images' AND public.has_role(auth.uid(),'admin'));

-- personal-audio
CREATE POLICY "Admins upload personal audio" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'personal-audio' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update personal audio" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'personal-audio' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete personal audio" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'personal-audio' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins read personal audio" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'personal-audio' AND public.has_role(auth.uid(),'admin'));

-- personal-notes-media
CREATE POLICY "Admins upload note media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'personal-notes-media' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update note media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'personal-notes-media' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete note media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'personal-notes-media' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins read note media" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'personal-notes-media' AND public.has_role(auth.uid(),'admin'));
