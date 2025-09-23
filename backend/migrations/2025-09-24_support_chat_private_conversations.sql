-- Add conversation_key to support_chats for private conversations (user<->admin)
ALTER TABLE IF EXISTS support_chats
  ADD COLUMN IF NOT EXISTS conversation_key text;

-- Backfill existing rows: default conversation per user
UPDATE support_chats
SET conversation_key = 'user:' || username
WHERE conversation_key IS NULL;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_support_chats_conversation_key
  ON support_chats (conversation_key);
