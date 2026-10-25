CREATE TABLE IF NOT EXISTS loom_business_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,
  evidence_type text NOT NULL CHECK (evidence_type IN ('registration', 'domain')),
  evidence_reference text NOT NULL CHECK (char_length(evidence_reference) BETWEEN 3 AND 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  review_note text,
  reviewed_by_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS loom_business_verifications_status_submitted_idx ON loom_business_verifications(status, submitted_at);
