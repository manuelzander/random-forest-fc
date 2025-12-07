-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule the low signup check to run every hour
SELECT cron.schedule(
  'check-low-signups-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://prnauaeqflapasesrnen.supabase.co/functions/v1/check-low-signups',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBybmF1YWVxZmxhcGFzZXNybmVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNDQwOTYsImV4cCI6MjA2ODkyMDA5Nn0.STLxYWXMMtXnPiVmG8JBBh0J1i00f5T6Ol1ZUldDphM"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);