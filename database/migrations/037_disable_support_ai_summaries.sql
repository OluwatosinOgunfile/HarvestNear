UPDATE support_tickets
SET ai_summary = NULL,
    ai_summary_updated_at = NULL
WHERE ai_summary IS NOT NULL
   OR ai_summary_updated_at IS NOT NULL;
