CREATE TABLE support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE,
  requester_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  subject varchar(180) NOT NULL,
  category varchar(40) NOT NULL CHECK (category IN ('order','payment','delivery','refund','account','farm','technical','other')),
  priority varchar(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status varchar(24) NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting_customer','resolved','closed')),
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- statement-breakpoint

CREATE TABLE support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- statement-breakpoint

CREATE INDEX support_tickets_requester_idx ON support_tickets(requester_id, created_at DESC);

-- statement-breakpoint

CREATE INDEX support_tickets_queue_idx ON support_tickets(status, priority, updated_at DESC);

-- statement-breakpoint

CREATE INDEX support_ticket_messages_ticket_idx ON support_ticket_messages(ticket_id, created_at);
