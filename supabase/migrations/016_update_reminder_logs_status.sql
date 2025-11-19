-- 016_update_reminder_logs_status.sql
-- Allow reminder logs to store auto-dismiss events from triggers

ALTER TABLE reminder_logs
    DROP CONSTRAINT IF EXISTS reminder_logs_status_check;

ALTER TABLE reminder_logs
    ADD CONSTRAINT reminder_logs_status_check
        CHECK (status IN (
            'sent',
            'delivered',
            'tapped',
            'dismissed',
            'skipped',
            'auto_dismissed'
        ));

COMMENT ON CONSTRAINT reminder_logs_status_check ON reminder_logs
    IS '允許 auto_dismissed 狀態，以儲存自動解除提醒的日誌';
