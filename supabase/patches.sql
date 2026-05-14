-- ============================================================
-- U vs U — Patches de RLS
-- Ejecutar en: Supabase SQL Editor → New query
-- ============================================================

-- 1. Permite que los usuarios actualicen su challenge_id en group_members
--    (necesario para que syncMemberChallengeId funcione y el leaderboard muestre datos)
create policy "Usuario actualiza su membresía"
  on public.group_members for update
  using (auth.uid() = user_id);

-- 2. Permite que el creador del grupo lo elimine
--    (CASCADE borra automáticamente group_members y activity_feed del grupo)
create policy "Creador elimina grupo"
  on public.groups for delete
  using (auth.uid() = created_by);
