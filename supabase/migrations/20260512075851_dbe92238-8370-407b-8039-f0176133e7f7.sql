REVOKE EXECUTE ON FUNCTION public.send_coin_gift(UUID, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_coin_gift(UUID, INTEGER, TEXT) TO authenticated;