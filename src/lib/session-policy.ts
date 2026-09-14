/**
 * How long a signed-in session lives, on two clocks rather than one.
 *
 * `idleMinutes` is inactivity: the clock is pushed forward every time the session is used, so an
 * active person is never signed out mid-task, while an abandoned session on a borrowed laptop dies
 * on its own. `absoluteMinutes` is the hard cap regardless of activity, which is what limits how
 * long a stolen token stays useful.
 *
 * The numbers differ by role because the blast radius does. Staff can release payouts, read personal
 * data and impersonate users, so their sessions are measured in hours and end well within a working
 * day. Farmers can change the bank account their earnings go to. Shoppers can spend their own money
 * and nothing else.
 *
 * They differ by client because the protection around the token does. A phone is one person's
 * device, sits behind a lock screen, and holds the token in the platform keystore. A browser may be
 * shared, so the same role gets a shorter window on the web.
 */
export type SessionClient = "web" | "mobile";
export type SessionRole = "consumer" | "farmer" | "admin" | "support";

const MINUTES_PER_DAY = 1440;

export const SESSION_POLICY: Record<SessionRole, Record<SessionClient, { idleMinutes: number; absoluteMinutes: number }>> = {
  admin: {
    web: { idleMinutes: 30, absoluteMinutes: 8 * 60 },
    mobile: { idleMinutes: 30, absoluteMinutes: 8 * 60 },
  },
  support: {
    web: { idleMinutes: 30, absoluteMinutes: 8 * 60 },
    mobile: { idleMinutes: 30, absoluteMinutes: 8 * 60 },
  },
  farmer: {
    web: { idleMinutes: 12 * 60, absoluteMinutes: 7 * MINUTES_PER_DAY },
    mobile: { idleMinutes: 14 * MINUTES_PER_DAY, absoluteMinutes: 60 * MINUTES_PER_DAY },
  },
  consumer: {
    web: { idleMinutes: 7 * MINUTES_PER_DAY, absoluteMinutes: 30 * MINUTES_PER_DAY },
    mobile: { idleMinutes: 30 * MINUTES_PER_DAY, absoluteMinutes: 90 * MINUTES_PER_DAY },
  },
};

/** Anything unrecognised is treated as staff, so a new role is short-lived until someone decides. */
export function sessionPolicyFor(role: string | null | undefined, client: SessionClient) {
  const key = (role || "") as SessionRole;
  return (SESSION_POLICY[key] || SESSION_POLICY.admin)[client];
}

/** Writing last_seen_at on every request would be a database write per API call. */
export const IDLE_TOUCH_THROTTLE_MINUTES = 2;
