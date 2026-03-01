import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Admin Settings</CardTitle>
          <CardDescription>Operational defaults and environment guardrails for admin workflows.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p><strong>Timezone:</strong> Property-level timezone defaults are expected in `properties.timezone` (fallback `America/Chicago`).</p>
          <p><strong>Roles:</strong> Admin access requires `admin` or `ops` role.</p>
          <p><strong>Audit policy:</strong> All admin mutations should append rows in `audit_log` with actor, action, entity, before/after.</p>
          <p><strong>Migration source:</strong> Use `supabase/migrations/*` as the canonical apply path.</p>
        </CardContent>
      </Card>
    </div>
  );
}
