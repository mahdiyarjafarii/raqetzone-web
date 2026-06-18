CREATE TABLE IF NOT EXISTS coach_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating smallint NOT NULL,
  comment text,
  coach_reply text,
  coach_replied_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_reviews_coach_id ON coach_reviews(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_reviews_user_id ON coach_reviews(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_coach_reviews_coach_user ON coach_reviews(coach_id, user_id);
