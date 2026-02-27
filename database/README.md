# Belle Rouge Properties Database

This directory contains database migrations, schema definitions, and maintenance scripts for the Belle Rouge Properties platform, serving medical staff, academics, military members, college students, graduates, and young professionals.

## Database Structure

The Belle Rouge Properties platform uses Supabase (PostgreSQL) as its database with the following core tables:

- `properties` - Property listings with details and amenities
- `bookings` - Booking records with guest information and status
- `messages` - Communication between guests and property owners
- `expenses` - Financial records for property expenses
- `maintenance_tasks` - Property maintenance tracking

## Migrations

Migrations are stored in the `migrations` directory and should be applied in numerical order:

1. `001_initial_schema.sql` - Core tables and relationships
2. `002_rls_policies.sql` - Row Level Security policies
3. `003_functions_triggers.sql` - Database functions and triggers
4. `004_calendar_enhancements.sql` - Calendar and availability features
5. `004_chatbot_tables.sql` - AI chatbot support tables
6. `005_financial_functions.sql` - Financial reporting functions
7. `015_dual_rail_event_booking.sql` - Dual-rail booking model (`stay` + `event`)
8. `016_payment_hold_fields.sql` - Deposit/payment hold fields
9. `017_admin_portal_foundation.sql` - Admin portal tables, indexes, and admin/ops RLS for v1

## Admin Portal Seed (v1)

To seed development data for the admin dashboard:

1. Apply migrations through `017_admin_portal_foundation.sql`.
2. Run `database/seeds/admin_portal_v1_seed.sql` in Supabase SQL Editor.
3. Ensure at least 3 records exist in `auth.users` first, or the seed script will skip safely.

## Production Database Management

### Backup Procedures

1. Automated daily backups are configured in Supabase
2. Additional backups can be created using the `backup.sh` script:
   ```bash
   # Set environment variables first
   export DB_HOST=db.your-production-project.supabase.co
   export DB_PASSWORD=your_db_password
   
   # Run backup
   ./backup.sh
   ```

### Restore Procedures

To restore from a backup:

1. Access the Supabase dashboard
2. Navigate to the SQL Editor
3. For point-in-time recovery:
   - Use the "Point in Time Recovery" feature in the Supabase dashboard
4. For full restore from backup file:
   ```bash
   pg_restore -h db.your-production-project.supabase.co -p 5432 -U postgres -d postgres -v backup_file.sql
   ```

## Performance Optimization

The database includes the following optimizations:

1. Indexes on frequently queried columns
2. Partitioning for large tables (bookings)
3. Materialized views for complex reports
4. Query optimization through explain analyze

## Monitoring

Monitor database performance using:

1. Supabase dashboard metrics
2. Custom monitoring queries in `monitoring` directory
3. Connection pooling configuration for production load
