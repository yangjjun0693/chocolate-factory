-- 관리자용 플레이어 목록 조회
CREATE OR REPLACE FUNCTION public.admin_get_players(p_limit INT DEFAULT 100)
RETURNS TABLE (
  id UUID,
  username TEXT,
  money NUMERIC,
  total_revenue NUMERIC,
  total_produced NUMERIC,
  last_saved TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.username, 
         (gs.data->>'money')::NUMERIC as money,
         (gs.data->>'totalRevenue')::NUMERIC as total_revenue,
         (gs.data->>'totalProduced')::NUMERIC as total_produced,
         gs.updated_at as last_saved,
         p.created_at
  FROM players p
  LEFT JOIN game_saves gs ON gs.player_id = p.id
  ORDER BY (gs.data->>'money')::NUMERIC DESC NULLS LAST
  LIMIT p_limit;
END; $$;

-- 관리자용 전체 통계
CREATE OR REPLACE FUNCTION public.admin_get_stats()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_players', (SELECT COUNT(*) FROM players),
    'total_saves', (SELECT COUNT(*) FROM game_saves),
    'oldest_player', (SELECT MIN(created_at) FROM players),
    'newest_player', (SELECT MAX(created_at) FROM players)
  ) INTO result;
  RETURN result;
END; $$;

-- 플레이어 상세 정보
CREATE OR REPLACE FUNCTION public.admin_get_player_detail(p_player_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'player', to_jsonb(p),
    'save_data', gs.data,
    'save_updated', gs.updated_at
  ) INTO result
  FROM players p
  LEFT JOIN game_saves gs ON gs.player_id = p.id
  WHERE p.id = p_player_id;
  RETURN result;
END; $$;

-- 플레이어 액션 (초기화/차단)
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.admin_player_action(p_player_id UUID, p_action TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_action = 'reset' THEN
    UPDATE game_saves SET data = '{}'::jsonb, updated_at = NOW() WHERE player_id = p_player_id;
  ELSIF p_action = 'ban' THEN
    UPDATE players SET banned = TRUE WHERE id = p_player_id;
    DELETE FROM game_saves WHERE player_id = p_player_id;
  END IF;
END; $$;

-- 자금 조정 (지급/차감)
CREATE OR REPLACE FUNCTION public.admin_adjust_money(p_player_id UUID, p_amount NUMERIC)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE game_saves 
  SET data = jsonb_set(
    COALESCE(data, '{}'::jsonb),
    '{money}',
    to_jsonb(GREATEST(0, COALESCE((data->>'money')::NUMERIC, 0) + p_amount))
  ),
  updated_at = NOW()
  WHERE player_id = p_player_id;
END; $$;

-- 배너 광고 토글
CREATE OR REPLACE FUNCTION public.admin_toggle_ads(p_player_id UUID, p_enabled BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE game_saves 
  SET data = jsonb_set(
    COALESCE(data, '{}'::jsonb),
    '{adsEnabled}',
    to_jsonb(p_enabled)
  ),
  updated_at = NOW()
  WHERE player_id = p_player_id;
END; $$;

-- 잭팟 확률 설정
CREATE OR REPLACE FUNCTION public.admin_set_jackpot_rate(p_rate NUMERIC)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.game_config (key, value, updated_at)
  VALUES ('slotJackpotBaseRate', p_rate::TEXT, NOW())
  ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();
END; $$;

-- 전역 게임 설정
CREATE TABLE IF NOT EXISTS public.game_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.admin_set_config(p_key TEXT, p_value TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.game_config (key, value, updated_at)
  VALUES (p_key, p_value, NOW())
  ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();
END; $$;

-- 전체 데이터 내보내기
CREATE OR REPLACE FUNCTION public.admin_export_all_data()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'exported_at', NOW(),
    'players', (SELECT json_agg(to_jsonb(p)) FROM players p),
    'saves', (SELECT json_agg(to_jsonb(gs)) FROM game_saves gs),
    'config', (SELECT json_agg(to_jsonb(gc)) FROM game_config gc)
  ) INTO result;
  RETURN result;
END; $$;

-- 초기 설정값 삽입
INSERT INTO public.game_config (key, value, description) VALUES
  ('slotJackpotBaseRate', '3', '잭팟 기본 확률 (%)'),
  ('slotPartialPayoutMult', '0.5', '페어 배당 배율'),
  ('casinoMaxBet', '50000', '최대 베팅액'),
  ('casinoEnabled', 'true', '카지노 활성화'),
  ('productionSpeedMult', '1.0', '생산 속도 전역 배율'),
  ('ingredientCostMult', '1.0', '원재료 비용 배율'),
  ('baseProductionSpeed', '20', '기본 생산 속도'),
  ('productionPerLevel', '6', '라인 레벨당 속도 증가'),
  ('warehouseBaseCap', '220', '기본 창고 용량'),
  ('warehouseUpgrade1', '100', '창고 확장 I 추가량'),
  ('warehouseUpgrade2', '250', '창고 확장 II 추가량'),
  ('loanInterestRate', '0.0008', '대출 이자율 (초당 복리)'),
  ('maxDebt', '6000', '대출 한도'),
  ('staffProductionBoostPerLevel', '9', '생산직 레벨당 속도 보너스'),
  ('staffRevenueBonusPerLevel', '3', '생산직 레벨당 수익 보너스 (%)'),
  ('staffRevenueBonusCap', '100', '수익 보너스 상한 (%)'),
  ('researchDiscountPerStaff', '4', '연구직 1인당 할인 (%)'),
  ('maxResearchDiscount', '30', '최대 연구 할인 (%)'),
  ('recipePriceMult', '1.0', '전체 판매가 배율'),
  ('premiumBrandingBonus', '25', '프리미엄 브랜딩 보너스 (%)'),
  ('ingredientSaveBonus', '20', '원재료 절감 보너스 (%)'),
  ('autoSaveInterval', '20000', '자동 저장 간격 (ms)'),
  ('gameTickInterval', '1000', '게임 틱 간격 (ms)'),
  ('maxLines', '10', '최대 생산 라인 수'),
  ('staffMaxLevel', '10', '직원 최대 레벨')
ON CONFLICT (key) DO NOTHING;

-- RLS 정책: 관리자 함수는 SECURITY DEFINER로 실행되므로 RLS 우회 가능

-- 게임 설정 전체 조회
CREATE OR REPLACE FUNCTION public.admin_get_config()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_object_agg(key, value) INTO result
  FROM public.game_config;
  RETURN COALESCE(result, '{}'::json);
END; $$;
