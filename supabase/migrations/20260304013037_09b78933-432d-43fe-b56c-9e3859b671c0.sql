-- Set challenge to look like it's in its final week, with all but 1 session done
UPDATE challenges 
SET 
  sessions_per_week = 3,
  duration_months = 1,
  total_sessions = 12,
  first_week_sessions = NULL,
  started_at = now() - interval '3 weeks 5 days'
WHERE id = '9c6b9d13-8edd-4ca3-aef7-ea1bc4565a2e';

-- Insert 11 verified check-ins spread across past weeks
INSERT INTO check_ins (user_id, challenge_id, verified, checked_in_at) VALUES
  ('ebb48213-bed6-42cd-89d3-51c5e2419085', '9c6b9d13-8edd-4ca3-aef7-ea1bc4565a2e', true, now() - interval '25 days'),
  ('ebb48213-bed6-42cd-89d3-51c5e2419085', '9c6b9d13-8edd-4ca3-aef7-ea1bc4565a2e', true, now() - interval '24 days'),
  ('ebb48213-bed6-42cd-89d3-51c5e2419085', '9c6b9d13-8edd-4ca3-aef7-ea1bc4565a2e', true, now() - interval '23 days'),
  ('ebb48213-bed6-42cd-89d3-51c5e2419085', '9c6b9d13-8edd-4ca3-aef7-ea1bc4565a2e', true, now() - interval '18 days'),
  ('ebb48213-bed6-42cd-89d3-51c5e2419085', '9c6b9d13-8edd-4ca3-aef7-ea1bc4565a2e', true, now() - interval '17 days'),
  ('ebb48213-bed6-42cd-89d3-51c5e2419085', '9c6b9d13-8edd-4ca3-aef7-ea1bc4565a2e', true, now() - interval '16 days'),
  ('ebb48213-bed6-42cd-89d3-51c5e2419085', '9c6b9d13-8edd-4ca3-aef7-ea1bc4565a2e', true, now() - interval '11 days'),
  ('ebb48213-bed6-42cd-89d3-51c5e2419085', '9c6b9d13-8edd-4ca3-aef7-ea1bc4565a2e', true, now() - interval '10 days'),
  ('ebb48213-bed6-42cd-89d3-51c5e2419085', '9c6b9d13-8edd-4ca3-aef7-ea1bc4565a2e', true, now() - interval '9 days'),
  ('ebb48213-bed6-42cd-89d3-51c5e2419085', '9c6b9d13-8edd-4ca3-aef7-ea1bc4565a2e', true, now() - interval '3 days'),
  ('ebb48213-bed6-42cd-89d3-51c5e2419085', '9c6b9d13-8edd-4ca3-aef7-ea1bc4565a2e', true, now() - interval '2 days');