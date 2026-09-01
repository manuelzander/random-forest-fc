REVOKE ALL ON FUNCTION public.can_vote_mvp(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_vote_mvp(uuid, uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_vote_mvp(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_vote_mvp(uuid, uuid, uuid) TO service_role;