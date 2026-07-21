INSERT INTO notifications (user_id, type, title, message, action_url, metadata)
SELECT farm.owner_id, 'account', 'Your farm is verified',
  farm.name || ' has been approved and can now publish harvests to the marketplace.',
  '/profile', jsonb_build_object('farmId', farm.id::text, 'verificationStatus', 'verified')
FROM farms farm
WHERE farm.verification_status = 'verified'
  AND NOT EXISTS (
    SELECT 1 FROM notifications notification
    WHERE notification.user_id = farm.owner_id
      AND notification.type = 'account'
      AND notification.metadata->>'farmId' = farm.id::text
      AND notification.metadata->>'verificationStatus' = 'verified'
  );
