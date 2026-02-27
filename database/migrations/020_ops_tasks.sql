BEGIN;

CREATE TABLE IF NOT EXISTS ops_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  task_type text NOT NULL CHECK (task_type IN ('cleaning', 'prep', 'inspection', 'vendor', 'other')),
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'blocked')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  due_at timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ops_tasks_property_id ON ops_tasks(property_id);
CREATE INDEX IF NOT EXISTS idx_ops_tasks_booking_id ON ops_tasks(booking_id);
CREATE INDEX IF NOT EXISTS idx_ops_tasks_status ON ops_tasks(status);
CREATE INDEX IF NOT EXISTS idx_ops_tasks_due_at ON ops_tasks(due_at);

ALTER TABLE ops_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin read/write ops_tasks" ON ops_tasks;
CREATE POLICY "Admin read/write ops_tasks" ON ops_tasks
  FOR ALL USING (is_admin_or_ops()) WITH CHECK (is_admin_or_ops());

COMMIT;
