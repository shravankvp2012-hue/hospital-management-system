ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('master', 'admin', 'manager', 'doctor', 'receptionist', 'billing', 'nurse', 'pharmacist', 'laboratory_technician', 'accountant', 'staff'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE profiles p
SET username = coalesce(nullif(left(lower(regexp_replace(split_part(u.email, '@', 1), '[^a-zA-Z0-9]', '', 'g')), 24), ''), 'staff') || '_' || substr(p.id::text, 1, 4)
FROM auth.users u
WHERE u.id = p.id AND p.username IS NULL;

ALTER TABLE profiles ALTER COLUMN username SET NOT NULL;
ALTER TABLE profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
ALTER TABLE profiles ADD CONSTRAINT profiles_username_format CHECK (username ~ '^[a-z0-9][a-z0-9._-]{2,31}$');

ALTER TABLE master_bootstrap ADD COLUMN IF NOT EXISTS setup_code_hash text;
UPDATE master_bootstrap SET setup_code_hash = 'c93cdc835e3933cd68bbbe8d5aac6dc50613433c4117b7b4c9aa3e5c7725ce2f' WHERE id = true AND claimed_at IS NULL;
