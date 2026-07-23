ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_category_check;

-- statement-breakpoint

ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_category_check
  CHECK (category IN ('order','payment','delivery','refund','account','farm','technical','feedback','other'));
