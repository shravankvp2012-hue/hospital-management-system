/*
# Lock MediCore profile authorization columns

1. Purpose
Prevent a signed-in browser from changing its own role or doctor assignment.

2. Security changes
- Revoke profile updates from authenticated users by default.
- Grant authenticated users update access only to `full_name`.
- Keep `role` and `doctor_id` server-controlled for administrator workflows.

3. Data safety
No rows or columns are removed or changed.
*/

REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (full_name) ON profiles TO authenticated;
