-- ============================================================================
-- admin_login 마이그레이션 (실제 프로덕션 DB에 적용된 내용 그대로)
-- ----------------------------------------------------------------------------
-- 배경: "Upgrade again" 커밋에서 관리자 로그인이 고정 비밀번호 클라이언트 체크에서
-- admin_login RPC(+모든 admin_* 호출에 p_admin_id/p_admin_password 동봉) 방식으로
-- 바뀌었는데, 이 SQL이 반영이 안 되어 있었음:
--   1) admin_login 함수 자체가 없어서 "Could not find the function
--      public.admin_login(p_password, p_username)" 에러 발생
--   2) 로그인이 됐어도 admin_get_players 등 기존 9개 함수는 p_admin_id/p_admin_password를
--      안 받아서 이후 모든 관리자 기능이 같은 에러로 연쇄 실패했을 것
--
-- 주의: players 테이블 비밀번호 컬럼은 "password"가 아니라 "password_hash"이고,
-- login()/signup()/save_game()과 동일하게 pgcrypto의 crypt(p_password, hash) 방식으로
-- bcrypt 검증한다. players.admin 컬럼은 이미 존재했음 (별도 ALTER 불필요).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.verify_admin(p_admin_id UUID, p_admin_password TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_hash TEXT;
  v_admin BOOLEAN;
  v_banned BOOLEAN;
BEGIN
  SELECT password_hash, admin, COALESCE(banned, FALSE) INTO v_hash, v_admin, v_banned
  FROM public.players WHERE id = p_admin_id;

  IF v_hash IS NULL OR v_hash <> crypt(p_admin_password, v_hash) THEN
    RAISE EXCEPTION '관리자 인증에 실패했어요';
  END IF;
  IF NOT v_admin OR v_banned THEN
    RAISE EXCEPTION '관리자 권한이 없어요';
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_login(p_username TEXT, p_password TEXT)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_id UUID;
  v_hash TEXT;
  v_admin BOOLEAN;
  v_banned BOOLEAN;
BEGIN
  SELECT id, password_hash, admin, COALESCE(banned, FALSE) INTO v_id, v_hash, v_admin, v_banned
  FROM public.players WHERE username = p_username;

  IF v_id IS NULL OR v_hash <> crypt(p_password, v_hash) THEN
    RAISE EXCEPTION '아이디 또는 비밀번호가 올바르지 않아요';
  END IF;
  IF NOT v_admin THEN
    RAISE EXCEPTION '관리자 계정이 아니에요';
  END IF;
  IF v_banned THEN
    RAISE EXCEPTION '차단된 계정이에요';
  END IF;

  RETURN json_build_object('id', v_id, 'username', p_username);
END; $$;

-- 기존 admin_* 9개 함수: 예전 비인증 시그니처를 DROP하고 p_admin_id/p_admin_password로 재생성.
-- (CREATE OR REPLACE만 쓰면 새 오버로드가 "추가"만 되고 예전 비인증 버전이 그대로 남아
--  누구나 apikey만으로 호출 가능한 구멍이 생기므로 DROP이 필수)

DROP FUNCTION IF EXISTS public.admin_get_players(INT);
CREATE OR REPLACE FUNCTION public.admin_get_players(p_admin_id UUID, p_admin_password TEXT, p_limit INT DEFAULT 100)
RETURNS TABLE (
  id UUID, username TEXT, money NUMERIC, total_revenue NUMERIC,
  total_produced NUMERIC, last_saved TIMESTAMPTZ, created_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions' AS $$
BEGIN
  PERFORM public.verify_admin(p_admin_id, p_admin_password);
  RETURN QUERY
  SELECT p.id, p.username,
         (gs.data->>'money')::NUMERIC, (gs.data->>'totalRevenue')::NUMERIC,
         (gs.data->>'totalProduced')::NUMERIC, gs.updated_at, p.created_at
  FROM players p LEFT JOIN game_saves gs ON gs.player_id = p.id
  ORDER BY (gs.data->>'money')::NUMERIC DESC NULLS LAST LIMIT p_limit;
END; $$;

DROP FUNCTION IF EXISTS public.admin_get_stats();
CREATE OR REPLACE FUNCTION public.admin_get_stats(p_admin_id UUID, p_admin_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions' AS $$
DECLARE result JSON;
BEGIN
  PERFORM public.verify_admin(p_admin_id, p_admin_password);
  SELECT json_build_object(
    'total_players', (SELECT COUNT(*) FROM players),
    'total_saves', (SELECT COUNT(*) FROM game_saves),
    'oldest_player', (SELECT MIN(created_at) FROM players),
    'newest_player', (SELECT MAX(created_at) FROM players)
  ) INTO result;
  RETURN result;
END; $$;

DROP FUNCTION IF EXISTS public.admin_get_player_detail(UUID);
CREATE OR REPLACE FUNCTION public.admin_get_player_detail(p_admin_id UUID, p_admin_password TEXT, p_player_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions' AS $$
DECLARE result JSON;
BEGIN
  PERFORM public.verify_admin(p_admin_id, p_admin_password);
  SELECT json_build_object('player', to_jsonb(p), 'save_data', gs.data, 'save_updated', gs.updated_at) INTO result
  FROM players p LEFT JOIN game_saves gs ON gs.player_id = p.id WHERE p.id = p_player_id;
  RETURN result;
END; $$;

DROP FUNCTION IF EXISTS public.admin_player_action(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.admin_player_action(p_admin_id UUID, p_admin_password TEXT, p_player_id UUID, p_action TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions' AS $$
BEGIN
  PERFORM public.verify_admin(p_admin_id, p_admin_password);
  IF p_action = 'reset' THEN
    UPDATE game_saves SET data = '{}'::jsonb, updated_at = NOW() WHERE player_id = p_player_id;
  ELSIF p_action = 'ban' THEN
    UPDATE players SET banned = TRUE WHERE id = p_player_id;
    DELETE FROM game_saves WHERE player_id = p_player_id;
  END IF;
END; $$;

DROP FUNCTION IF EXISTS public.admin_adjust_money(UUID, NUMERIC);
CREATE OR REPLACE FUNCTION public.admin_adjust_money(p_admin_id UUID, p_admin_password TEXT, p_player_id UUID, p_amount NUMERIC)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions' AS $$
BEGIN
  PERFORM public.verify_admin(p_admin_id, p_admin_password);
  UPDATE game_saves SET data = jsonb_set(
    COALESCE(data, '{}'::jsonb), '{money}',
    to_jsonb(GREATEST(0, COALESCE((data->>'money')::NUMERIC, 0) + p_amount))
  ), updated_at = NOW() WHERE player_id = p_player_id;
END; $$;

DROP FUNCTION IF EXISTS public.admin_toggle_ads(UUID, BOOLEAN);
CREATE OR REPLACE FUNCTION public.admin_toggle_ads(p_admin_id UUID, p_admin_password TEXT, p_player_id UUID, p_enabled BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions' AS $$
BEGIN
  PERFORM public.verify_admin(p_admin_id, p_admin_password);
  UPDATE game_saves SET data = jsonb_set(COALESCE(data, '{}'::jsonb), '{adsEnabled}', to_jsonb(p_enabled)),
  updated_at = NOW() WHERE player_id = p_player_id;
END; $$;

DROP FUNCTION IF EXISTS public.admin_set_jackpot_rate(NUMERIC);
CREATE OR REPLACE FUNCTION public.admin_set_jackpot_rate(p_admin_id UUID, p_admin_password TEXT, p_rate NUMERIC)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions' AS $$
BEGIN
  PERFORM public.verify_admin(p_admin_id, p_admin_password);
  INSERT INTO public.game_config (key, value, updated_at) VALUES ('slotJackpotBaseRate', p_rate::TEXT, NOW())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
END; $$;

DROP FUNCTION IF EXISTS public.admin_set_config(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.admin_set_config(p_admin_id UUID, p_admin_password TEXT, p_key TEXT, p_value TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions' AS $$
BEGIN
  PERFORM public.verify_admin(p_admin_id, p_admin_password);
  INSERT INTO public.game_config (key, value, updated_at) VALUES (p_key, p_value, NOW())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
END; $$;

DROP FUNCTION IF EXISTS public.admin_export_all_data();
CREATE OR REPLACE FUNCTION public.admin_export_all_data(p_admin_id UUID, p_admin_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions' AS $$
DECLARE result JSON;
BEGIN
  PERFORM public.verify_admin(p_admin_id, p_admin_password);
  SELECT json_build_object(
    'exported_at', NOW(),
    'players', (SELECT json_agg(to_jsonb(p)) FROM players p),
    'saves', (SELECT json_agg(to_jsonb(gs)) FROM game_saves gs),
    'config', (SELECT json_agg(to_jsonb(gc)) FROM game_config gc)
  ) INTO result;
  RETURN result;
END; $$;

-- admin_get_config()는 공개 설정 조회용이라 그대로 둔다 (변경 없음)

-- ============================================================================
-- 이미 Supabase 프로젝트(nfahizdxaytdtsuaaqpt)에 적용 완료.
-- 관리자 계정: username='테토', username='관리자' 둘 다 admin=true, banned=false 상태.
-- ============================================================================
