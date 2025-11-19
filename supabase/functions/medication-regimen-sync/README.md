# medication-regimen-sync

Edge Function responsible for keeping medication regimens in sync with reminder + cycle tables.

## Environment variables

| Variable | Description |
| --- | --- |
| `SUPABASE_URL` | Project URL (injected automatically on Supabase) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service key with rights to read/write protected tables |

## Request body

```json
{
  "regimen_id": "UUID",
  "operation": "create | update | pause | resume",
  "reminder_preferences": {
    "title": "Custom reminder title",
    "window_start": "09:00:00",
    "window_end": "21:00:00",
    "timezone": "Asia/Taipei",
    "lead_time_minutes": 720,
    "snooze_minutes": 15,
    "auto_dismiss_rule": "manual_only",
    "schedule_type": "relative_cycle | every_n_days | cron",
    "interval_days": 56,
    "metadata": {
      "cycle_offset_days": 2
    }
  }
}
```

- `regimen_id` is required and must reference an existing row in `medication_regimens`.
- `operation` defaults to `create`.
- `reminder_preferences` is optional; omitted fields fall back to sensible defaults (user timezone, 09:00–21:00 window, etc.).

## Behaviour

1. Loads the regimen + related user record to retrieve timezone and medication display name.
2. Upserts a single `user_reminders` row targeting the regimen:
   - Injection regimens become `schedule_type=relative_cycle`.
   - Cron/planned oral regimens keep their specified schedule.
   - PRN regimens remain paused but still capture metadata for UI display.
3. Ensures there is one scheduled `medication_cycles` record:
   - Inserts a new cycle when none exist.
   - Updates the upcoming cycle when anchor/interval changes.
   - Marks pending cycles as `skipped` when the regimen is no longer cycle-based.

## Response

```json
{
  "success": true,
  "data": {
    "reminder_id": "UUID",
    "reminder_status": "active",
    "cycle_action": "created | updated | skipped | disabled",
    "cycle_id": "UUID or null",
    "expected_next_date": "2025-02-01"
  }
}
```

Errors always include a machine-readable `code` (`MISSING_REGIMEN_ID`, `INVALID_INTERVAL_DAYS`, etc.) so API callers can map to UI messages.
