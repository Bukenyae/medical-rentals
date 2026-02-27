BEGIN;

CREATE TABLE IF NOT EXISTS user_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flagged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  flag_type text NOT NULL CHECK (flag_type IN ('identity', 'payment', 'behavior', 'incident', 'other')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_user_flags_user_id ON user_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_user_flags_status ON user_flags(status);
CREATE INDEX IF NOT EXISTS idx_user_flags_severity ON user_flags(severity);
CREATE INDEX IF NOT EXISTS idx_user_flags_created_at ON user_flags(created_at);

ALTER TABLE user_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin read/write user_flags" ON user_flags;
CREATE POLICY "Admin read/write user_flags" ON user_flags
  FOR ALL USING (is_admin_or_ops()) WITH CHECK (is_admin_or_ops());

COMMIT;
