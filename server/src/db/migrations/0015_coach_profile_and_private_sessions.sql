ALTER TABLE users
  ADD COLUMN IF NOT EXISTS coach_headline varchar(255),
  ADD COLUMN IF NOT EXISTS coach_experience_years smallint,
  ADD COLUMN IF NOT EXISTS coach_hourly_price integer,
  ADD COLUMN IF NOT EXISTS coach_specialties text,
  ADD COLUMN IF NOT EXISTS coach_certifications text,
  ADD COLUMN IF NOT EXISTS coach_languages text;

CREATE TABLE IF NOT EXISTS coach_private_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date varchar(10) NOT NULL,
  start_time varchar(5) NOT NULL,
  end_time varchar(5) NOT NULL,
  location varchar(255),
  notes text,
  status varchar(20) NOT NULL DEFAULT 'pending',
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_private_sessions_coach_id ON coach_private_sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_private_sessions_user_id ON coach_private_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_coach_private_sessions_date ON coach_private_sessions(date);
CREATE INDEX IF NOT EXISTS idx_coach_private_sessions_status ON coach_private_sessions(status);
