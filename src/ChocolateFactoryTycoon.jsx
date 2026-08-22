import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Factory, Warehouse, ShoppingCart, TrendingUp, Users, LayoutDashboard,
  Lock, Check, Plus, ChevronRight, Sparkles, Coins, Package, Wrench,
  UserPlus, Gauge, Award, ArrowUpCircle, X, Activity, Database, Ban,
  RotateCcw, Download, Trash2
} from 'lucide-react';

/* ---------------------------------------------------------------- */
/*  디자인 토큰                                                       */
/* ---------------------------------------------------------------- */
const C = {
  bgDeep: '#1C110A',
  bgPanel: '#2C1B0F',
  bgPanelLight: '#3B2716',
  bgPanelLighter: '#4A331D',
  cream: '#F2E4C9',
  creamDim: '#C9B49A',
  caramel: '#C17817',
  caramelLight: '#E39A3A',
  gold: '#EAC13A',
  pistachio: '#8FAE7C',
  berry: '#B0475F',
  epic: '#A97BE0',
  line: '#4A331D',
};

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap');`;

/* ---------------------------------------------------------------- */
/*  글래스모피즘 + 인터랙션 애니메이션 (공용)                              */
/*  Panel/Btn/StatChip 등 공용 컴포넌트에서 쓰는 클래스라, 로그인/환영/    */
/*  메인 화면 <style> 태그 세 군데에 모두 삽입해서 어디서든 먹히게 한다.    */
/* ---------------------------------------------------------------- */
const MOTION_CSS = `
  .ftc-glass {
    background: linear-gradient(155deg, rgba(59,39,22,0.62), rgba(28,17,10,0.42));
    backdrop-filter: blur(18px) saturate(150%);
    -webkit-backdrop-filter: blur(18px) saturate(150%);
    border: 1px solid rgba(242,228,201,0.08);
    transition: transform .28s cubic-bezier(.2,.8,.2,1), box-shadow .28s ease, border-color .28s ease, background .28s ease;
  }
  .ftc-glass:hover {
    transform: translateY(-3px);
    box-shadow: 0 16px 34px rgba(0,0,0,0.45);
    border-color: rgba(234,193,58,0.35);
  }
  .ftc-btn {
    transition: transform .18s cubic-bezier(.34,1.56,.64,1), box-shadow .18s ease, filter .12s ease;
    will-change: transform;
  }
  .ftc-btn:hover:not(:disabled) { transform: translateY(-2px) scale(1.035); box-shadow: 0 10px 22px rgba(0,0,0,0.4); }
  .ftc-btn:active:not(:disabled) { transform: scale(0.93); transition-duration: .08s; }
  @keyframes ftcBlobFloat {
    0%,100% { transform: translate(0,0) scale(1); }
    33% { transform: translate(30px,-40px) scale(1.08); }
    66% { transform: translate(-24px,26px) scale(0.94); }
  }
  .ftc-blob { position: absolute; border-radius: 999px; filter: blur(70px); opacity: 0.55; pointer-events: none; animation: ftcBlobFloat 16s ease-in-out infinite; z-index: 0; }
  @keyframes ftcFadeBlurIn {
    from { opacity: 0; filter: blur(10px); transform: translateY(12px) scale(.97); }
    to { opacity: 1; filter: blur(0); transform: translateY(0) scale(1); }
  }
  .ftc-fade-in { animation: ftcFadeBlurIn .5s cubic-bezier(.2,.8,.2,1) both; }
  @keyframes ftcTabIn {
    from { opacity: 0; filter: blur(8px); transform: translateX(16px); }
    to { opacity: 1; filter: blur(0); transform: translateX(0); }
  }
  .ftc-tab-content { animation: ftcTabIn .38s cubic-bezier(.2,.8,.2,1) both; position: relative; z-index: 1; }
  @keyframes ftcValueFlash {
    0% { filter: blur(4px); opacity: .35; transform: scale(1.18); }
    55% { filter: blur(0); opacity: 1; }
    100% { transform: scale(1); }
  }
  .ftc-value-flash { display: inline-block; animation: ftcValueFlash .45s ease-out; }
  @keyframes ftcTabBtnPop {
    0% { transform: scale(.85); opacity: .5; }
    100% { transform: scale(1); opacity: 1; }
  }
  .ftc-tab-btn { transition: color .2s ease, border-color .25s ease, transform .15s ease; }
  .ftc-tab-btn:hover { transform: translateY(-1px); }
  .ftc-tab-btn[data-active="true"] span.ftc-tab-underline { animation: ftcTabBtnPop .25s ease; }
`;

/* ---------------------------------------------------------------- */
/*  좌우 배너 광고                                                     */
/*  - 아래 src에 이미지 URL을 넣으면 화면 양옆에 배너가 표시됩니다.        */
/*  - href를 넣으면 배너 클릭 시 새 탭으로 이동합니다.                    */
/*  - 권장 사이즈: 160 x 600 (와이드 스크린 세로 배너)                    */
/* ---------------------------------------------------------------- */
const AD_BANNERS = {
  left: { src: 'https://i.imgur.com/lghIHV2.png', href: 'https://kasaneteto.jp/', alt: 'https://i.imgur.com/lghIHV2.png' },
  right: { src: 'https://i.imgur.com/xfa4mYF.png', href: 'https://tabbarr.pages.dev/돈줘.html', alt: 'https://i.imgur.com/xfa4mYF.png' },
};

/* ---------------------------------------------------------------- */
/*  Supabase 연동 (이름 + 비밀번호 인증 & 세이브)                        */
/*  - Supabase Auth(이메일 기반) 대신, players/game_saves 테이블 +      */
/*    security definer RPC(signup/login/save_game)로 직접 구현했다.    */
/*  - 세션 토큰이 없으므로, 저장할 때마다 비밀번호를 함께 보내 서버에서   */
/*    재검증한다 (이 게임 규모에서는 충분하지만, 프로덕션이라면 Supabase */
/*    Auth의 JWT 세션을 쓰는 편이 더 안전하다).                          */
/* ---------------------------------------------------------------- */
const SUPABASE_URL = 'https://nfahizdxaytdtsuaaqpt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_9EXf5jstSdFyxmP0sq181A_UjsRPJCw';

async function supabaseRpc(fn, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch (e) { /* 본문 없음(void 함수) */ }
  if (!res.ok) {
    const msg = (json && (json.message || json.error_description || json.hint)) || '요청이 실패했어요';
    throw new Error(msg);
  }
  return json;
}

/* ---------------------------------------------------------------- */
/*  게임 데이터                                                       */
/* ---------------------------------------------------------------- */
const RESOURCE_META = {
  cacao: { name: '카카오', emoji: '🌰' },
  sugar: { name: '설탕', emoji: '🧂' },
  freshMilk: { name: '우유', emoji: '🥛' },
  strawberry: { name: '딸기', emoji: '🍓' },
  blueberry: { name: '블루베리', emoji: '🫐' },
  hazelnut: { name: '헤이즐넛', emoji: '🥜' },
  matcha: { name: '말차가루', emoji: '🍵' },
};

// 원재료(RESOURCE_META) 또는 완제품(RECIPES) 어느 쪽이든 재료 아이콘/이름을 찾아주는 헬퍼
const getIngredientMeta = (key) => {
  if (RESOURCE_META[key]) return RESOURCE_META[key];
  const r = RECIPES.find((rc) => rc.id === key);
  return r ? { name: r.name, emoji: r.emoji } : { name: key, emoji: '❔' };
};

// tier 1: 원재료로 바로 만드는 기본 초콜릿 3종
// tier 2: 기본 초콜릿(창고 재고)을 "재료"로 소모해 만드는 상위 테크 4종
// tier 3: tier 2 초콜릿 2종을 동시에 재료로 소모하는 최상위 프레스티지 초콜릿
const RECIPES_BASE = [
  { id: 'dark', name: '다크 초콜릿', emoji: '🍫', tier: 1, ing: { cacao: 3, sugar: 1 }, price: 20 },
  { id: 'milk', name: '밀크 초콜릿', emoji: '🍬', tier: 1, ing: { cacao: 2, sugar: 1, freshMilk: 2 }, price: 22 },
  { id: 'white', name: '화이트 초콜릿', emoji: '🤍', tier: 1, ing: { sugar: 2, freshMilk: 3 }, price: 18 },
  { id: 'strawberry', name: '딸기 초콜릿', emoji: '🍓', tier: 2, ing: { milk: 1, strawberry: 2 }, price: 50 },
  { id: 'blueberry', name: '블루베리 초콜릿', emoji: '🫐', tier: 2, ing: { white: 1, blueberry: 2 }, price: 46 },
  { id: 'hazelnut', name: '헤이즐넛 초콜릿', emoji: '🟤', tier: 2, ing: { dark: 1, hazelnut: 2 }, price: 54 },
  { id: 'matcha', name: '말차 초콜릿', emoji: '💚', tier: 2, ing: { white: 1, matcha: 2 }, price: 56 },
  { id: 'truffle', name: '프리미엄 트러플', emoji: '🍩', tier: 3, ing: { hazelnut: 1, matcha: 1 }, price: 140 },
];

// 업그레이드 트리 — 5개 계열이 중앙(본사)에서 서로 다른 방향으로 뻗어나가는 구조.
// branch: 계열 키 (BRANCH_INFO 참고), tier: 해당 계열에서 몇 번째 노드인지(=중심에서 거리),
// angleOffset: 같은 계열 안에서 좌우로 갈라지는 정도(포크/합류 구조 표현용), req: 선행 업그레이드(문자열 또는 배열 — 배열이면 전부 필요).
const UPGRADES = [
  // ── 생산 속도 계열 ──
  { id: 'sp1', branch: 'speed', tier: 1, req: null, name: '로스터 개선', desc: '모든 생산 라인 속도 +15%', cost: 220, effect: { speed: 0.15 } },
  { id: 'sp2', branch: 'speed', tier: 2, req: 'sp1', name: '컨칭 자동화', desc: '모든 생산 라인 속도 +20%', cost: 480, effect: { speed: 0.20 } },
  { id: 'sp3', branch: 'speed', tier: 3, req: 'sp2', name: '냉각 터널 초고속화', desc: '모든 생산 라인 속도 +25%', cost: 900, effect: { speed: 0.25 } },
  { id: 'sp4', branch: 'speed', tier: 4, req: 'sp3', name: '풀 오토메이션 라인', desc: '모든 생산 라인 속도 +30%', cost: 1800, effect: { speed: 0.30 } },

  // ── 창고 & 물류 계열 ──
  { id: 'wh1', branch: 'warehouse', tier: 1, req: null, name: '창고 확장 I', desc: '창고 용량 +100', cost: 170, effect: { warehouse: 100 } },
  { id: 'wh2', branch: 'warehouse', tier: 2, req: 'wh1', name: '창고 확장 II', desc: '창고 용량 +250', cost: 620, effect: { warehouse: 250 } },
  { id: 'wh3', branch: 'warehouse', tier: 3, req: 'wh2', name: '스마트 랙 시스템', desc: '창고 용량 +400', cost: 1400, effect: { warehouse: 400 } },
  { id: 'wh4', branch: 'warehouse', tier: 4, req: 'wh3', name: '초대형 물류센터', desc: '창고 용량 +800', cost: 2600, effect: { warehouse: 800 } },

  // ── 공정 효율 계열 ──
  { id: 'ef1', branch: 'efficiency', tier: 1, req: null, name: '원재료 절감 공정', desc: '원재료 소모량 -20% (기본 초콜릿 3종에만 적용)', cost: 1050, effect: { ingSave: 0.20 } },
  { id: 'ef2', branch: 'efficiency', tier: 2, req: 'ef1', name: '정밀 계량 시스템', desc: '원재료 소모량 추가 -15%', cost: 2000, effect: { ingSave: 0.15 } },
  { id: 'ef3', branch: 'efficiency', tier: 3, req: 'ef2', name: '폐기물 제로 공정', desc: '원재료 소모량 추가 -15%', cost: 3600, effect: { ingSave: 0.15 } },

  // ── 레시피 연구 계열 (딸기·헤이즐넛 두 갈래로 나뉘었다가 트러플에서 합류) ──
  { id: 'rc_berry1', branch: 'recipe', tier: 1, angleOffset: -25, req: null, name: '딸기 조달 계약', desc: '딸기 초콜릿을 생산할 수 있어요. 밀크 초콜릿 재고를 재료로 소모해요.', cost: 400, effect: { unlock: 'strawberry' } },
  { id: 'rc_nut1', branch: 'recipe', tier: 1, angleOffset: 25, req: null, name: '헤이즐넛 조달 계약', desc: '헤이즐넛 초콜릿을 생산할 수 있어요. 다크 초콜릿 재고를 재료로 소모해요.', cost: 400, effect: { unlock: 'hazelnut' } },
  { id: 'rc_berry2', branch: 'recipe', tier: 2, angleOffset: -25, req: 'rc_berry1', name: '블루베리 조달 계약', desc: '블루베리 초콜릿을 생산할 수 있어요. 화이트 초콜릿 재고를 재료로 소모해요.', cost: 760, effect: { unlock: 'blueberry' } },
  { id: 'rc_nut2', branch: 'recipe', tier: 2, angleOffset: 25, req: 'rc_nut1', name: '말차 조달 계약', desc: '말차 초콜릿을 생산할 수 있어요. 화이트 초콜릿 재고를 재료로 소모해요.', cost: 760, effect: { unlock: 'matcha' } },
  { id: 'rc_truffle', branch: 'recipe', tier: 3, angleOffset: 0, req: ['rc_berry2', 'rc_nut2'], name: '프리미엄 트러플 공방', desc: '트러플을 생산할 수 있어요. 헤이즐넛·말차 초콜릿 재고를 모두 재료로 소모하는 최고급 레시피예요.', cost: 3200, effect: { unlock: 'truffle' } },

  // ── 브랜딩 계열 ──
  { id: 'br1', branch: 'branding', tier: 1, req: null, name: '로컬 마케팅', desc: '모든 판매가 +10%', cost: 260, effect: { priceMult: 0.10 } },
  { id: 'br2', branch: 'branding', tier: 2, req: 'br1', name: '프리미엄 브랜딩', desc: '모든 판매가 +20%', cost: 1300, effect: { priceMult: 0.20 } },
  { id: 'br3', branch: 'branding', tier: 3, req: 'br2', name: '플래그십 스토어', desc: '모든 판매가 +20%', cost: 2400, effect: { priceMult: 0.20 } },
  { id: 'br4', branch: 'branding', tier: 4, req: 'br3', name: '글로벌 프랜차이즈', desc: '모든 판매가 +25%', cost: 4500, effect: { priceMult: 0.25 } },
];

// 계열별 표시 정보 — 중앙(본사)에서 뻗어나가는 각도(0°=오른쪽, 시계방향)와 색상
const BRANCH_INFO = {
  speed: { label: '생산 속도', angle: 288, color: C.caramelLight, icon: '⚙️' },
  warehouse: { label: '창고 & 물류', angle: 0, color: C.pistachio, icon: '📦' },
  efficiency: { label: '공정 효율', angle: 72, color: C.gold, icon: '🔬' },
  recipe: { label: '레시피 연구', angle: 144, color: C.berry, icon: '🍫' },
  branding: { label: '브랜딩', angle: 216, color: C.caramel, icon: '📣' },
};
const TREE_CENTER = 1200;
const TREE_SIZE = 2400;
const CARD_W = 200;
const CARD_H = 158;
const tierRadius = (tier) => 250 + (tier - 1) * 300;
function upgradePos(u) {
  const info = BRANCH_INFO[u.branch];
  const angle = ((info.angle + (u.angleOffset || 0)) * Math.PI) / 180;
  const r = tierRadius(u.tier);
  return { x: TREE_CENTER + Math.cos(angle) * r, y: TREE_CENTER + Math.sin(angle) * r };
}
function reqIdsOf(u) {
  if (!u.req) return [];
  return Array.isArray(u.req) ? u.req : [u.req];
}

const STAFF_FIRST = ['민준', '서연', '도윤', '하은', '시우', '지아', '예준', '수아', '주원', '다은', '이안', '해나'];
const ROLES = {
  production: { label: '생산직', desc: '배정된 라인의 속도를 올려요', color: C.caramelLight },
  research: { label: '연구직', desc: '업그레이드 비용을 낮춰요', color: C.pistachio },
};

/* ---------------------------------------------------------------- */
/*  뽑기(가챠) 시스템                                                  */
/*  - 등급: 일반/희귀/영웅/전설 (직원·버프 공용) + 레시피(조각 전용)      */
/*  - 재화: 뽑기 코인(🎟️) — 판매 시 확률 획득 + 업적 보상 + 돈으로 소량 교환 */
/* ---------------------------------------------------------------- */
const RARITY_INFO = {
  common: { label: '일반', color: C.creamDim, weight: 55 },
  rare: { label: '희귀', color: C.pistachio, weight: 27 },
  epic: { label: '영웅', color: C.epic, weight: 13 },
  legendary: { label: '전설', color: C.gold, weight: 5 },
  recipe: { label: '레시피', color: C.berry, weight: 0 },
};
const GENERAL_RARITIES = ['common', 'rare', 'epic', 'legendary'];
const GACHA_COST = { staff: 3, fragment: 2, buff: 4 };
const GACHA_COIN_EXCHANGE_RATE = 500; // 돈 500$ → 뽑기 코인 1개

// 가중치 기반 랜덤 선택: entries = [{ key, weight }]
function weightedPick(entries) {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of entries) {
    if (r < e.weight) return e.key;
    r -= e.weight;
  }
  return entries[entries.length - 1].key;
}
const pickGeneralRarity = () => weightedPick(GENERAL_RARITIES.map((k) => ({ key: k, weight: RARITY_INFO[k].weight })));

// 직원 뽑기: 등급별 시작 레벨 & 능력치 보너스 배율
const STAFF_RARITY_CONFIG = {
  common: { level: 1, bonusMult: 1.0 },
  rare: { level: 1, bonusMult: 1.2 },
  epic: { level: 2, bonusMult: 1.45 },
  legendary: { level: 3, bonusMult: 1.9 },
};

// 영웅/전설 등급 뽑기 직원은 라인 배정 여부와 무관하게 "보유하는 것만으로" 상시 발동되는 특성을 하나씩 가진다.
// 여러 명 보유하면 중첩 적용된다. 환생하면 직원이 초기화되므로 이 효과도 함께 사라진다.
const STAFF_TRAITS = {
  epic: { key: 'goldenHands', label: '황금손', desc: '보유하는 동안 창고 용량 +80 (라인 배정 $필요)', effect: { warehouseFlat: 80 } },
  legendary: { key: 'masterChocolatier', label: '마스터 쇼콜라티에', desc: '보유하는 동안 모든 판매가 +8% (라인 배정 $필요)', effect: { priceMultFlat: 0.08 } },
};
const staffTraitBonus = (staff, key) => (staff || []).reduce((s, m) => s + ((STAFF_TRAITS[m.rarity]?.effect[key]) || 0), 0);

// 레시피 조각 뽑기로만 얻을 수 있는 히든 초콜릿 (업그레이드 트리와 무관한 별도 콘텐츠)
const HIDDEN_RECIPES = [
  { id: 'taco', name: '타코 초콜릿', emoji: '🌮', tier: 2, ing: { dark: 1, sugar: 2 }, price: 90, needFragments: 6, fragmentWeight: 42 },
  { id: 'coconut', name: '코코넛 초콜릿', emoji: '🥥', tier: 2, ing: { white: 1, freshMilk: 3 }, price: 78, needFragments: 6, fragmentWeight: 42 },
  { id: 'goldleaf', name: '골드리프 초콜릿', emoji: '⭐', tier: 4, ing: { truffle: 1 }, price: 260, needFragments: 8, fragmentWeight: 16 },
];
const HIDDEN_RECIPES_MAP = Object.fromEntries(HIDDEN_RECIPES.map((r) => [r.id, r]));

// 환생(프레스티지) 전용 레시피 — 업그레이드나 뽑기로는 절대 얻을 수 없고,
// 해당 환생 횟수를 채워야만 영구히 해금된다 (게임 틱에서 자동으로 unlockedRecipes에 반영됨).
const PRESTIGE_RECIPES = [
  { id: 'stardust', name: '스타더스트 초콜릿', emoji: '🌌', tier: 5, ing: { truffle: 1, goldleaf: 1 }, price: 620, requiresPrestige: 1 },
  { id: 'legendary_cacao', name: '레전더리 카카오', emoji: '👑', tier: 6, ing: { stardust: 2 }, price: 1800, requiresPrestige: 5 },
];

// 최종 레시피 목록: 기본(RECIPES_BASE) + 뽑기 전용 히든(HIDDEN_RECIPES) + 환생 전용(PRESTIGE_RECIPES)
// 셋 다 unlockedRecipes에 들어가야만 실제로 생산 가능해진다는 규칙은 동일하다.
const RECIPES = [...RECIPES_BASE, ...HIDDEN_RECIPES, ...PRESTIGE_RECIPES];

// 버프 아이템 뽑기: 등급 하나당 아이템 하나로 고정 매칭
const BUFF_BY_RARITY = {
  common: { id: 'speedBoost_s', name: '생산 부스터(소)', emoji: '⚡', kind: 'timed', effectKey: 'speed', value: 0.3, duration: 120, desc: '2분 동안 생산 속도 +30%' },
  rare: { id: 'priceBoost_s', name: '골든 세일즈(소)', emoji: '💰', kind: 'timed', effectKey: 'priceMult', value: 0.3, duration: 120, desc: '2분 동안 판매가 +30%' },
  epic: { id: 'speedBoost_l', name: '생산 부스터(대)', emoji: '⚡', kind: 'timed', effectKey: 'speed', value: 0.8, duration: 180, desc: '3분 동안 생산 속도 +80%' },
  legendary: { id: 'instantBatch', name: '즉석 생산 키트', emoji: '📦', kind: 'instant', desc: '사용 즉시 모든 라인이 진행률과 무관하게 1회분을 즉시 생산해요' },
};
const BUFF_ITEM_LIST = Object.values(BUFF_BY_RARITY);
const buffBonus = (g, effectKey) => (g.activeBuffs || []).reduce((s, b) => s + (b.effectKey === effectKey ? b.value : 0), 0);

const ACHIEVEMENTS = [
  { id: 'a1', name: '첫 생산', desc: '초콜릿을 처음으로 생산해요', cond: (g) => g.totalProduced >= 1 },
  { id: 'a2', name: '첫 매출', desc: '초콜릿을 처음으로 판매해요', cond: (g) => g.totalRevenue >= 1 },
  { id: 'a3', name: '자산 1,000$', desc: '보유 자산 1,000$을 달성해요', cond: (g) => g.money >= 1000 },
  { id: 'a4', name: '자산 5,000$', desc: '보유 자산 5,000$을 달성해요', cond: (g) => g.money >= 5000 },
  { id: 'a9', name: '자산 10,000$', desc: '보유 자산 10,000$을 달성해요', cond: (g) => g.money >= 10000 },
  { id: 'a10', name: '자산 50,000$', desc: '보유 자산 50,000$을 달성해요', cond: (g) => g.money >= 50000 },
  { id: 'a11', name: '자산 100,000$', desc: '보유 자산 100,000$을 달성해요', cond: (g) => g.money >= 100000 },
  { id: 'a5', name: '생산 라인 3개', desc: '생산 라인을 3개까지 늘려요', cond: (g) => g.lines.length >= 3 },
  { id: 'a20', name: '생산 라인 풀확장', desc: '생산 라인 슬롯을 최대치까지 확장해요', cond: (g) => g.maxLines >= MAX_LINE_CAP },
  { id: 'a6', name: '직원 3명 고용', desc: '직원을 3명 고용해요', cond: (g) => g.staff.length >= 3 },
  { id: 'a16', name: '직원 5명 고용', desc: '직원을 5명 고용해요', cond: (g) => g.staff.length >= 5 },
  { id: 'a17', name: '베테랑 직원', desc: '레벨 5 이상인 직원을 배출해요', cond: (g) => g.staff.some((s) => s.level >= 5) },
  { id: 'a26', name: '전설의 직원', desc: '레벨 10(만렙) 직원을 배출해요', cond: (g) => g.staff.some((s) => s.level >= STAFF_MAX_LEVEL) },
  { id: 'a7', name: '업그레이드 4개', desc: '업그레이드를 4개 연구해요', cond: (g) => g.upgrades.length >= 4 },
  { id: 'a18', name: '연구 완료', desc: '모든 업그레이드를 연구해요', cond: (g) => g.upgrades.length >= UPGRADES.length },
  { id: 'a19', name: '전 라인업 확보', desc: '모든 초콜릿 레시피를 잠금 해제해요', cond: (g) => g.unlockedRecipes.length >= RECIPES.length },
  { id: 'a8', name: '누적 생산 100개', desc: '초콜릿을 누적 100개 생산해요', cond: (g) => g.totalProduced >= 100 },
  { id: 'a12', name: '누적 생산 500개', desc: '초콜릿을 누적 500개 생산해요', cond: (g) => g.totalProduced >= 500 },
  { id: 'a13', name: '누적 생산 2,000개', desc: '초콜릿을 누적 2,000개 생산해요', cond: (g) => g.totalProduced >= 2000 },
  { id: 'a14', name: '누적 매출 10,000$', desc: '누적 매출 10,000$을 달성해요', cond: (g) => g.totalRevenue >= 10000 },
  { id: 'a15', name: '누적 매출 50,000$', desc: '누적 매출 50,000$을 달성해요', cond: (g) => g.totalRevenue >= 50000 },
  { id: 'a21', name: '창고왕', desc: '창고 용량을 500 이상으로 늘려요', cond: (g) => g.warehouseCap >= 500 },
  { id: 'a22', name: '빚 청산', desc: '대출을 받은 뒤 잔액을 모두 갚아요', cond: (g) => g.totalLoanTaken > 0 && g.debt === 0 },
  { id: 'a23', name: '잭팟!', desc: '카지노에서 트리플 매치를 터뜨려요', cond: (g) => g.casinoJackpotCount >= 1 },
  { id: 'a24', name: '카지노 큰손', desc: '카지노 잭팟을 3회 터뜨려요', cond: (g) => g.casinoJackpotCount >= 3 },
  { id: 'a25', name: '무차입 경영', desc: '빚 없이 자산 20,000$을 달성해요', cond: (g) => g.money >= 20000 && g.debt === 0 },
  { id: 'a27', name: '첫 뽑기', desc: '뽑기를 처음 이용해요', cond: (g) => (g.gachaPullCount || 0) >= 1 },
  { id: 'a28', name: '뽑기 매니아', desc: '뽑기를 30회 이용해요', cond: (g) => (g.gachaPullCount || 0) >= 30 },
  { id: 'a29', name: '전설의 뽑기운', desc: '뽑기로 전설 등급 직원을 얻어요', cond: (g) => g.staff.some((s) => s.rarity === 'legendary') },
  { id: 'a30', name: '히든 레시피 마스터', desc: '뽑기로만 얻을 수 있는 히든 레시피를 모두 조합해요', cond: (g) => HIDDEN_RECIPES.every((r) => g.unlockedRecipes.includes(r.id)) },
  { id: 'a31', name: '첫 환생', desc: '처음으로 환생해요', cond: (g) => (g.prestigeCount || 0) >= 1 },
  { id: 'a32', name: '환생의 끝', desc: '환생을 10회 달성해요', cond: (g) => (g.prestigeCount || 0) >= MAX_PRESTIGE },
];

const LINE_COST = (n) => 260 + n * 320;
const LEVEL_COST = (lvl) => 80 + lvl * 80;
const STAFF_COST = (n) => 120 + n * 90;
const STAFF_LEVEL_COST = (lvl) => 150 + lvl * 130;
const STAFF_MAX_LEVEL = 10;

// 생산직 보너스: 라인에 배정된 생산직의 레벨은 그 라인 속도(staffBoost)뿐 아니라
// "생산 라인 속도가 0초에 수렴해도" 계속 의미가 있도록 전체 판매 수익에도 보너스를 준다.
// perLevel/cap은 관리자 설정(staffRevenueBonusPerLevel/staffRevenueBonusCap, %)에서 온 값 —
// 모듈 스코프 함수라 컴포넌트의 cfg()에 직접 접근할 수 없어 호출부에서 인자로 넘겨받는다.
const STAFF_REVENUE_PER_LEVEL = 0.03; // 폴백 기본값: 레벨 1당 판매 수익 +3%
const STAFF_REVENUE_CAP = 1.0; // 폴백 기본값: 최대 +100%
function getStaffRevenueMult(staff, lines, perLevel = STAFF_REVENUE_PER_LEVEL, cap = STAFF_REVENUE_CAP) {
  const bonus = lines.reduce((sum, l) => {
    const st = staff.find((s) => s.id === l.staffId && s.role === 'production');
    return sum + (st ? st.level * perLevel * (st.bonusMult || 1) : 0);
  }, 0);
  return 1 + Math.min(cap, bonus);
}

// 대출 시스템 — 아래 값들은 관리자 설정이 없을 때의 폴백 기본값
const LOAN_INTEREST_RATE = 0.0008; // 초당 복리 이자율
const MAX_DEBT = 6000;
const LOAN_OPTIONS = [300, 1000, 3000];

// 카지노 시스템 (슬롯머신)
const SLOT_SYMBOLS = ['🍫', '🍬', '🤍', '🍓', '🫐', '💎'];
const SLOT_WEIGHTS = [30, 25, 20, 12, 10, 3]; // 합계 100, 희귀할수록 배당 높음
const SLOT_PAYOUTS = { '🍫': 2, '🍬': 2.5, '🤍': 3, '🍓': 5, '🫐': 6, '💎': 20 };
const SLOT_SYMBOL_H = 64;
// 스핀 중 보여줄 심볼 띠: 같은 심볼셋을 4번 반복해서 이어붙이면,
// 정확히 1/4 지점(SLOT_SYMBOLS.length개)만큼 스크롤했을 때 처음과 완전히 같은 모양이 되어
// CSS만으로 자연스럽게 끊김 없이 반복되는 세로 스크롤 릴을 만들 수 있다.
const SPIN_STRIP = [...SLOT_SYMBOLS, ...SLOT_SYMBOLS, ...SLOT_SYMBOLS, ...SLOT_SYMBOLS];
const CASINO_BETS = [50, 200, 500];

// 생산 라인 슬롯 확장
const MAX_LINE_CAP = 10;
const LINE_SLOT_COST = (maxLines) => 600 + (maxLines - 4) * 500;

// 주식 시스템 — 실제 기업과 무관한 패러디 성격의 가상 회사 4곳
const STOCKS = [
  {
    id: 'dino', ticker: 'DINO', name: '다이노버스 파크', emoji: '🦖',
    sector: '테마파크 · 영화 프랜차이즈',
    basePrice: 120, volatility: 0.045, drift: 0.0006,
    newsPos: ['신규 공룡 종 복원 성공, 입장객 폭증', '박스오피스 신기록! 후속편 제작 확정', '테마파크 신규 지점 개장 발표'],
    newsNeg: ['안전 사고로 일부 구역 임시 폐쇄', '공룡 탈출 소동... 주가 출렁', '흥행 부진, 후속편 제작 무기한 연기'],
  },
  {
    id: 'taco', ticker: 'TACO', name: '타코킹 푸드', emoji: '🌮',
    sector: '패스트푸드 프랜차이즈',
    basePrice: 45, volatility: 0.03, drift: 0.0004,
    newsPos: ['신메뉴 대박, 매출 급증', '심야 배달 서비스 확대', '한정판 메뉴 출시 당일 완판'],
    newsNeg: ['식자재 가격 급등으로 마진 축소', '위생 논란으로 $매 운동 확산', '경쟁사 신메뉴에 점유율 하락'],
  },
  {
    id: 'beast', ticker: 'BEAST', name: '챌린지비스트 미디어', emoji: '🎬',
    sector: '챌린지 · 콘텐츠 미디어',
    basePrice: 80, volatility: 0.06, drift: 0.0008,
    newsPos: ['초대형 상금 챌린지 영상 조회수 폭발', '신규 구독 서비스 가입자 급증', '자선 프로젝트로 브랜드 이미지 상승'],
    newsNeg: ['제작비 급증으로 수익성 우려', '콘텐츠 논란으로 광고주 이탈', '경쟁 채널 성장에 점유율 하락'],
  },
  {
    id: 'voca', ticker: 'VOCA', name: '신디보이스 스튜디오', emoji: '🎤',
    sector: '보컬 신디사이저 소프트웨어',
    basePrice: 60, volatility: 0.05, drift: 0.0005,
    newsPos: ['신규 보이스뱅크 출시, 예약 매진', '해외 라이선스 계약 체결', '팬 창작 콘텐츠 100만 건 돌파'],
    newsNeg: ['신규 캐릭터 저작권 분쟁', '경쟁 소프트웨어 등장으로 점유율 하락', '서버 장애로 서비스 일시 중단'],
  },
];
const STOCK_NEWS_CHANCE = 0.02; // 틱(1초)당 종목별 뉴스 이벤트 발생 확률
const STOCK_NEWS_IMPACT = 0.12; // 뉴스 이벤트 시 가격 충격 크기
const STOCK_HISTORY_LEN = 30;

const fmt = (n) => Math.floor(n).toLocaleString('ko-KR');

/* ---------------------------------------------------------------- */
/*  환생(프레스티지) 시스템                                             */
/*  - 최대 10회, 회차가 오를수록 필요 자산이 기하급수적으로 증가          */
/*  - 환생 1회당 판매가 영구 +25% (10회 완주 시 3.5배)                 */
/* ---------------------------------------------------------------- */
const MAX_PRESTIGE = 10;
const PRESTIGE_BASE_REQUIREMENT = 50000;
const PRESTIGE_REQUIREMENT_GROWTH = 2.3;
const PRESTIGE_MULT_PER_LEVEL = 0.25;
const prestigeRequirement = (count) => Math.round(PRESTIGE_BASE_REQUIREMENT * Math.pow(PRESTIGE_REQUIREMENT_GROWTH, count));
const prestigeMultOf = (count) => 1 + count * PRESTIGE_MULT_PER_LEVEL;

/* ---------------------------------------------------------------- */
/*  초기 상태                                                         */
/* ---------------------------------------------------------------- */
const initialGame = () => ({
  started: false,
  money: 500,
  resources: { cacao: 100, sugar: 100, freshMilk: 80, strawberry: 0, blueberry: 0, hazelnut: 0, matcha: 0 },
  prices: { cacao: 4, sugar: 2, freshMilk: 3, strawberry: 6, blueberry: 6, hazelnut: 7, matcha: 8 },
  warehouse: {},
  warehouseCap: 220,
  debt: 0,
  totalLoanTaken: 0,
  casinoLast: null,
  casinoJackpotCount: 0,
  stocks: Object.fromEntries(STOCKS.map((s) => [s.id, s.basePrice])),
  stockHistory: Object.fromEntries(STOCKS.map((s) => [s.id, [{ t: 0, p: s.basePrice }]])),
  portfolio: Object.fromEntries(STOCKS.map((s) => [s.id, 0])),
  stockAvgCost: Object.fromEntries(STOCKS.map((s) => [s.id, 0])),
  stockNews: [],
  stockRealizedPL: 0,
  lines: [{ id: 1, recipeId: 'dark', level: 1, progress: 0, staffId: null, blocked: false }],
  maxLines: 4,
  staff: [],
  upgrades: [],
  unlockedRecipes: ['dark', 'milk', 'white'],
  history: [{ t: 0, money: 500 }],
  achievements: [],
  totalRevenue: 0,
  totalProduced: 0,
  autoSell: false,
  tick: 0,
  gachaCoins: 0,
  gachaPullCount: 0,
  inventory: { fragments: {}, buffs: {} },
  activeBuffs: [],
  prestigeCount: 0,
  toast: null,
});

/* ---------------------------------------------------------------- */
/*  작은 유틸 컴포넌트                                                 */
/* ---------------------------------------------------------------- */
function Panel({ children, style, className, glass = true, ...rest }) {
  return (
    <div
      className={`${glass ? 'ftc-glass' : ''}${className ? ` ${className}` : ''}`}
      style={{
        background: glass ? undefined : C.bgPanel,
        border: glass ? undefined : `1px solid ${C.line}`,
        borderRadius: 14,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

function StatChip({ icon, label, value, accent }) {
  return (
    <div className="ftc-glass" style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10, padding: '7px 12px' }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: C.creamDim, letterSpacing: 0.4 }}>{label}</span>
        {/* key={value}로 값이 바뀔 때마다 다시 마운트시켜서, 매번 blur→선명 flash 애니메이션이 재생되게 한다 */}
        <span key={value} className="ftc-value-flash" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: accent || C.cream }}>{value}</span>
      </div>
    </div>
  );
}

function ProgressBar({ pct, color, height = 8 }) {
  const p = Math.min(100, pct);
  return (
    <div style={{ width: '100%', height, background: '#1C1108', borderRadius: 99, overflow: 'hidden', border: `1px solid ${C.line}` }}>
      <div style={{
        width: `${p}%`, height: '100%', background: color || C.caramel,
        transition: 'width .35s cubic-bezier(.2,.8,.2,1)',
        boxShadow: p > 0 ? `0 0 10px ${color || C.caramel}` : 'none',
      }} />
    </div>
  );
}

function Btn({ children, onClick, disabled, variant = 'primary', style, small, className }) {
  const base = {
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 600,
    fontSize: small ? 12 : 13.5,
    padding: small ? '6px 10px' : '9px 16px',
    borderRadius: 9,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };
  const variants = {
    primary: { background: C.caramel, color: '#1C1108' },
    gold: { background: C.gold, color: '#1C1108' },
    ghost: { background: 'rgba(74,51,29,0.55)', color: C.cream, border: `1px solid ${C.line}`, backdropFilter: 'blur(8px)' },
    danger: { background: C.berry, color: C.cream },
  };
  return (
    <button
      className={`ftc-btn${className ? ` ${className}` : ''}`}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.filter = 'brightness(1.1)')}
      onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
      style={{ ...base, ...variants[variant], ...style }}
    >
      {children}
    </button>
  );
}

function SectionTitle({ eyebrow, title, right }) {
  return (
    <div className="ftc-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
      <div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, letterSpacing: 2, color: C.caramelLight, textTransform: 'uppercase', marginBottom: 2 }}>{eyebrow}</div>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, color: C.cream }}>{title}</div>
      </div>
      {right}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  메인 컴포넌트                                                     */
/* ---------------------------------------------------------------- */
/* ---------------------------------------------------------------- */
/*  배너 광고 컴포넌트                                                  */
/*  - src가 비어있으면 자리만 차지하는 빈 플레이스홀더를 보여준다.          */
/*  - src가 있으면 실제 이미지를 렌더링하고, href가 있으면 클릭 가능.       */
/* ---------------------------------------------------------------- */
function AdBanner({ src, href, alt }) {
  const inner = src ? (
    <img
      src={src}
      alt={alt || '광고'}
      style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 12 }}
    />
  ) : (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 6, height: 480, color: C.creamDim, fontSize: 11, textAlign: 'center', padding: 12, lineHeight: 1.6,
      }}
    >
      <span style={{ fontSize: 22 }}>🖼️</span>
      AD_BANNERS 에<br />이미지 URL을 넣어주세요<br />(160×600 권장)
    </div>
  );

  const box = (
    <div
      style={{
        width: 160, flexShrink: 0, background: C.bgPanel, border: `1px dashed ${C.line}`,
        borderRadius: 12, overflow: 'hidden', position: 'sticky', top: 20,
      }}
    >
      {inner}
    </div>
  );

  if (!src) return box;

  return (
    <a href={href || '#'} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
      {box}
    </a>
  );
}

export default function ChocolateFactoryTycoon() {
  const [g, setG] = useState(initialGame());
  const [tab, setTab] = useState('factory');
  const toastTimer = useRef(null);

  // ---- 관리자 패널 (Ctrl+Shift+A로 토글, 로그인 여부와 무관하게 열림) ----
  // 인증은 이 컴포넌트가 아니라 AdminPage 안에서 Supabase Auth(실제 서버 검증)로 처리한다.
  const [showAdmin, setShowAdmin] = useState(false);
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setShowAdmin((prev) => !prev);
      }
      if (e.key === 'Escape') setShowAdmin(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ---- 게임 설정 (관리자 패널의 "게임 설정"에서 서버에 저장한 값을 가져온다) ----
  // 이 값은 민감 정보가 아니라 게임 밸런스 설정이라 apikey만으로 조회 가능하다.
  const [jackpotRate, setJackpotRate] = useState(3); // 기본값 3%
  const [gameConfig, setGameConfig] = useState({}); // admin_get_config가 준 원본(문자열) 값들
  const cfgRef = useRef({});
  useEffect(() => { cfgRef.current = gameConfig; }, [gameConfig]);
  // cfg('key', fallback): 관리자가 값을 설정 안 했거나 파싱 불가능하면 fallback(기존 기본값) 사용.
  // setG 업데이터/게임 틱처럼 컴포넌트 함수 내부 어디서든 최신 값을 읽을 수 있도록 ref를 사용한다.
  const cfg = (key, fallback) => {
    const raw = cfgRef.current[key];
    if (raw === undefined || raw === null || raw === '') return fallback;
    if (typeof fallback === 'boolean') return raw === true || raw === 'true';
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  };
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await supabaseRpc('admin_get_config', {});
        if (data) {
          setGameConfig(data);
          if (data.slotJackpotBaseRate) setJackpotRate(Number(data.slotJackpotBaseRate));
        }
      } catch (e) { /* 설정을 못 가져오면 기본값 유지 */ }
    };
    fetchConfig();
    // 관리자 패널에서 값을 바꾼 직후 즉시 반영할 수 있도록 새로고침 함수를 노출.
    // 이름은 예전 그대로(__refreshJackpotConfig) 유지해서 admin panel 쪽 호출부와 호환.
    window.__refreshJackpotConfig = fetchConfig;
    return () => { delete window.__refreshJackpotConfig; };
  }, []);

  // ---- 로그인 상태 & 저장 ----
  const [player, setPlayer] = useState(null); // { id, username, password }
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const [lastSaved, setLastSaved] = useState(null);
  const gRef = useRef(g);
  useEffect(() => { gRef.current = g; }, [g]);

  const pushToast = useCallback((msg, tone = 'gold') => {
    setG((prev) => ({ ...prev, toast: { msg, tone, key: Date.now() } }));
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setG((prev) => ({ ...prev, toast: null })), 2200);
  }, []);

  const handleAuth = useCallback(({ id, username, password, data }) => {
    setPlayer({ id, username, password, guest: false });
    // 서버에 저장된 세이브가 있으면 $러오고, 없으면(신규 가입) 기본값 유지
    if (data && Object.keys(data).length > 0) {
      setG((prev) => {
        const fresh = initialGame();
        // 주의: 단순 스프레드({...fresh, ...data})는 얕은 병합이라, 신규 재료(헤이즐넛/말차 등)가
        // 추가되기 "전"에 저장된 구버전 세이브의 resources/prices 객체가 기본값을 통째로 덮어써서
        // 새로 추가된 키가 통째로 사라진다 (→ 상점에서 NaN개/undefined$로 표시되고, 구매 시
        // undefined + amount = NaN이 영구히 박혀버림). resources/prices/inventory처럼 "새 키가
        // 계속 추가될 수 있는" 중첩 객체는 항상 기본값과 저장값을 깊게 병합해야 한다.
        return {
          ...fresh,
          ...data,
          resources: { ...fresh.resources, ...data.resources },
          prices: { ...fresh.prices, ...data.prices },
          warehouse: { ...fresh.warehouse, ...data.warehouse },
          inventory: {
            fragments: { ...fresh.inventory.fragments, ...data.inventory?.fragments },
            buffs: { ...fresh.inventory.buffs, ...data.inventory?.buffs },
          },
          toast: null,
        };
      });
    }
    pushToast(`${username}님, 환영해요!`, 'pistachio');
  }, [pushToast]);

  // 게스트 모드: 회원가입/로그인 없이 즉시 시작. 서버에 아무것도 저장되지 않는다.
  const startGuest = useCallback(() => {
    setPlayer({ id: null, username: '게스트', password: null, guest: true });
    setG({ ...initialGame(), warehouseCap: cfg('warehouseBaseCap', 220) });
    pushToast('게스트로 시작해요 (진행 상황은 저장되지 않아요)', 'pistachio');
  }, [pushToast]);

  const saveNow = useCallback(async () => {
    if (!player || player.guest) return;
    setSaveStatus('saving');
    try {
      const { toast, ...saveable } = gRef.current;
      await supabaseRpc('save_game', { p_player_id: player.id, p_password: player.password, p_data: saveable });
      setSaveStatus('saved');
      setLastSaved(new Date());
    } catch (err) {
      setSaveStatus('error');
      pushToast(`저장 실패: ${err.message}`, 'berry');
    }
  }, [player, pushToast]);

  const logout = useCallback(async () => {
    if (player && !player.guest) await saveNow();
    setPlayer(null);
    setG(initialGame());
  }, [player, saveNow]);

  const resetGame = useCallback(() => {
    const fresh = { ...initialGame(), warehouseCap: cfg('warehouseBaseCap', 220) };
    setG(fresh);
    if (player && !player.guest) {
      const { toast, ...saveable } = fresh;
      supabaseRpc('save_game', { p_player_id: player.id, p_password: player.password, p_data: saveable })
        .then(() => { setSaveStatus('saved'); setLastSaved(new Date()); })
        .catch((err) => { setSaveStatus('error'); pushToast(`저장 실패: ${err.message}`, 'berry'); });
    }
  }, [player, pushToast]);

  // 환생: 이번 판의 진행 상황(자산·자원·라인·직원·업그레이드 등)은 초기화되지만,
  // 뽑기 코인/인벤토리/히든 레시피 보유·업적·환생 횟수 자체는 영구히 유지된다.
  const doPrestige = useCallback(() => {
    setG((prev) => {
      const nextCount = (prev.prestigeCount || 0) + 1;
      if (nextCount > MAX_PRESTIGE) return prev;
      if (prev.money < prestigeRequirement(prev.prestigeCount || 0)) return prev;
      const fresh = { ...initialGame(), warehouseCap: cfg('warehouseBaseCap', 220) };
      return {
        ...fresh,
        started: true,
        prestigeCount: nextCount,
        gachaCoins: prev.gachaCoins,
        gachaPullCount: prev.gachaPullCount,
        inventory: prev.inventory,
        achievements: prev.achievements,
        casinoJackpotCount: prev.casinoJackpotCount,
        unlockedRecipes: [
          ...fresh.unlockedRecipes,
          ...HIDDEN_RECIPES.filter((r) => prev.unlockedRecipes.includes(r.id)).map((r) => r.id),
          ...PRESTIGE_RECIPES.filter((r) => nextCount >= r.requiresPrestige).map((r) => r.id),
        ],
      };
    });
    pushToast(`🌟 환생 완료! 판매가 영구 +${Math.round(PRESTIGE_MULT_PER_LEVEL * 100)}%`, 'gold');
  }, [pushToast]);

  // 자동 저장 (로그인 + 게임 시작 상태일 때만, 게스트는 제외). 간격은 관리자 설정(autoSaveInterval)을
  // 따르되, gameConfig가 바뀌면(관리자가 값 변경 후 새로고침) 인터벌을 다시 만들어 즉시 반영한다.
  useEffect(() => {
    if (!player || player.guest || !g.started) return;
    const iv = setInterval(saveNow, cfg('autoSaveInterval', 20000));
    return () => clearInterval(iv);
  }, [player, g.started, saveNow, gameConfig]);

  // effectFor: 업그레이드 효과값을 읽을 때, 관리자 설정에 대응하는 특정 업그레이드(ef1/br2/wh1/wh2)면
  // 그 설정값으로 덮어쓰고, 아니면 UPGRADES 배열에 정의된 원래 값을 그대로 쓴다.
  const effectFor = (upgradeId, key) => {
    const u = UPGRADES.find((x) => x.id === upgradeId);
    const base = (u && u.effect && u.effect[key]) || 0;
    if (upgradeId === 'ef1' && key === 'ingSave') return cfg('ingredientSaveBonus', base * 100) / 100;
    if (upgradeId === 'br2' && key === 'priceMult') return cfg('premiumBrandingBonus', base * 100) / 100;
    if (upgradeId === 'wh1' && key === 'warehouse') return cfg('warehouseUpgrade1', base);
    if (upgradeId === 'wh2' && key === 'warehouse') return cfg('warehouseUpgrade2', base);
    return base;
  };

  /* ---------------- 게임 틱 ---------------- */
  useEffect(() => {
    if (!g.started) return;
    const iv = setInterval(() => {
      setG((prev) => {
        const tick = prev.tick + 1;
        const activeBuffs = (prev.activeBuffs || []).filter((b) => b.expiresAtTick > tick);
        const speedBonus = prev.upgrades.reduce((s, id) => s + effectFor(id, 'speed'), 0) + buffBonus({ activeBuffs }, 'speed');
        const ingSave = prev.upgrades.reduce((s, id) => s + effectFor(id, 'ingSave'), 0);
        const priceMult = (1 + prev.upgrades.reduce((s, id) => s + effectFor(id, 'priceMult'), 0) + buffBonus({ activeBuffs }, 'priceMult') + staffTraitBonus(prev.staff, 'priceMultFlat')) * prestigeMultOf(prev.prestigeCount || 0) * cfg('recipePriceMult', 1);
        const staffRevMult = getStaffRevenueMult(prev.staff, prev.lines, cfg("staffRevenueBonusPerLevel", STAFF_REVENUE_PER_LEVEL * 100) / 100, cfg("staffRevenueBonusCap", STAFF_REVENUE_CAP * 100) / 100);

        let resources = { ...prev.resources };
        let warehouse = { ...prev.warehouse };
        let money = prev.money;
        let totalProduced = prev.totalProduced;
        let totalRevenue = prev.totalRevenue;
        let gachaCoins = prev.gachaCoins;
        let debt = prev.debt > 0 ? prev.debt * (1 + cfg('loanInterestRate', LOAN_INTEREST_RATE)) : prev.debt;

        const lines = prev.lines.map((line) => {
          const recipe = RECIPES.find((r) => r.id === line.recipeId);
          if (!recipe) return line;
          const staffMember = prev.staff.find((s) => s.id === line.staffId);
          const staffBoost = staffMember ? staffMember.level * cfg('staffProductionBoostPerLevel', 9) * (staffMember.bonusMult || 1) : 0;
          const speed = ((cfg('baseProductionSpeed', 20) + line.level * cfg('productionPerLevel', 6)) * (1 + speedBonus) + staffBoost) * cfg('productionSpeedMult', 1);
          let progress = line.progress + speed;
          let blocked = false;
          let blockedReason = null;

          if (progress >= 100) {
            const needed = {};
            let canProduce = true;
            Object.entries(recipe.ing).forEach(([k, v]) => {
              // 재료가 원재료(RESOURCE_META)인지, 창고에 쌓인 완제품(하위 티어 초콜릿)인지 구분

              const isProductIngredient = !RESOURCE_META[k];
              // 원재료 절감 업그레이드는 "기본 초콜릿 3종(tier 1)"의 원재료에만 적용
              const amt = isProductIngredient || recipe.tier !== 1 ? v : v * (1 - ingSave);
              needed[k] = { amt, isProductIngredient };
              // (resources[k] || 0) 방어: undefined일 때 "undefined < amt"는 항상 false라서
              // canProduce가 false로 안 걸리고 통과해버려, 아래 -= 에서 NaN이 영구히 박히는
              // 문제가 있었다. 0으로 폴백하면 "재료 없음"으로 정상 처리된다.
              const available = isProductIngredient ? (warehouse[k] || 0) : (resources[k] || 0);
              if (available < amt) canProduce = false;
            });
            // 자동판매가 꺼져 있으면, 창고에 넣을 자리가 있는지도 미리 확인해서
            // 재료만 소모되고 완성품이 증발하는 일이 없도록 한다
            const whTotal = Object.values(warehouse).reduce((a, b) => a + b, 0);
            const hasSpace = prev.autoSell || whTotal < prev.warehouseCap + staffTraitBonus(prev.staff, 'warehouseFlat');
            if (canProduce && hasSpace) {
              Object.entries(needed).forEach(([k, { amt, isProductIngredient }]) => {
                if (isProductIngredient) warehouse[k] = (warehouse[k] || 0) - amt;
                else resources[k] = (resources[k] || 0) - amt;
              });
              progress = 0;
              totalProduced += 1;
              if (prev.autoSell) {
                const sellPrice = recipe.price * priceMult * staffRevMult;
                money += sellPrice;
                totalRevenue += sellPrice;
                if (Math.random() < 0.08) gachaCoins += 1;
              } else {
                warehouse[recipe.id] = (warehouse[recipe.id] || 0) + 1;
              }
            } else {
              progress = 100;
              blocked = true;
              blockedReason = !canProduce ? 'ingredient' : 'warehouse';
            }
          }
          return { ...line, progress, blocked, blockedReason };
        });

        const history = [...prev.history, { t: prev.history.length, money: Math.round(money) }].slice(-40);

        const newlyUnlocked = ACHIEVEMENTS.filter((a) => !prev.achievements.includes(a.id) && a.cond({ ...prev, money, totalProduced, totalRevenue, lines }));
        let achievements = prev.achievements;
        if (newlyUnlocked.length) {
          achievements = [...prev.achievements, ...newlyUnlocked.map((a) => a.id)];
          gachaCoins += newlyUnlocked.length * 2;
        }

        // 환생 횟수 조건을 채운 환생 전용 레시피를 자동으로 해금한다
        const missingPrestigeRecipes = PRESTIGE_RECIPES.filter((r) => (prev.prestigeCount || 0) >= r.requiresPrestige && !prev.unlockedRecipes.includes(r.id));
        let unlockedRecipes = prev.unlockedRecipes;
        if (missingPrestigeRecipes.length) {
          unlockedRecipes = [...prev.unlockedRecipes, ...missingPrestigeRecipes.map((r) => r.id)];
        }

        return { ...prev, resources, warehouse, money, lines, history, totalProduced, totalRevenue, achievements, debt, tick, activeBuffs, gachaCoins, unlockedRecipes };
      });
    }, cfg('gameTickInterval', 1000));
    return () => clearInterval(iv);
  }, [g.started, gameConfig]);

  const prevAchRef = useRef([]);
  useEffect(() => {
    const newOnes = g.achievements.filter((id) => !prevAchRef.current.includes(id));
    if (newOnes.length) {
      const a = ACHIEVEMENTS.find((x) => x.id === newOnes[newOnes.length - 1]);
      if (a) pushToast(`🏆 업적 달성: ${a.name}`, 'gold');
    }
    prevAchRef.current = g.achievements;
  }, [g.achievements, pushToast]);

  /* ---------------- 액션들 ---------------- */
  const buyResource = (key, amount) => {
    setG((prev) => {
      // prices[key]가 undefined면 cost가 NaN이 되고, "money < NaN"은 항상 false라서
      // 자금 부족 체크를 그냥 통과해버려 money 전체가 NaN으로 오염된다. 0 폴백으로 방지.
      const cost = (prev.prices[key] || 0) * amount * cfg('ingredientCostMult', 1);
      if (prev.money < cost) { pushToast('자금이 부족해요', 'berry'); return prev; }
      return { ...prev, money: prev.money - cost, resources: { ...prev.resources, [key]: (prev.resources[key] || 0) + amount } };
    });
  };

  const sellProduct = (recipeId, amount) => {
    setG((prev) => {
      const have = prev.warehouse[recipeId] || 0;
      const sellAmt = Math.min(have, amount);
      if (sellAmt <= 0) return prev;
      const recipe = RECIPES.find((r) => r.id === recipeId);
      const priceMult = (1 + prev.upgrades.reduce((s, id) => s + effectFor(id, 'priceMult'), 0) + buffBonus(prev, 'priceMult') + staffTraitBonus(prev.staff, 'priceMultFlat')) * prestigeMultOf(prev.prestigeCount || 0) * cfg('recipePriceMult', 1);
      const staffRevMult = getStaffRevenueMult(prev.staff, prev.lines, cfg("staffRevenueBonusPerLevel", STAFF_REVENUE_PER_LEVEL * 100) / 100, cfg("staffRevenueBonusCap", STAFF_REVENUE_CAP * 100) / 100);
      const revenue = recipe.price * priceMult * staffRevMult * sellAmt;
      const gotCoin = Math.random() < 0.08;
      return {
        ...prev,
        money: prev.money + revenue,
        totalRevenue: prev.totalRevenue + revenue,
        warehouse: { ...prev.warehouse, [recipeId]: have - sellAmt },
        gachaCoins: prev.gachaCoins + (gotCoin ? 1 : 0),
      };
    });
  };

  const buyLine = () => {
    setG((prev) => {
      if (prev.lines.length >= prev.maxLines) { pushToast('라인 슬롯을 먼저 확장하세요', 'berry'); return prev; }
      const cost = LINE_COST(prev.lines.length);
      if (prev.money < cost) { pushToast('자금이 부족해요', 'berry'); return prev; }
      return {
        ...prev,
        money: prev.money - cost,
        lines: [...prev.lines, { id: Date.now(), recipeId: prev.unlockedRecipes[0], level: 1, progress: 0, staffId: null, blocked: false }],
      };
    });
  };

  const expandLineSlot = () => {
    setG((prev) => {
      const maxLineCap = cfg('maxLines', MAX_LINE_CAP);
      if (prev.maxLines >= maxLineCap) { pushToast('더 이상 확장할 수 없어요 (최대치 도달)', 'berry'); return prev; }
      const cost = LINE_SLOT_COST(prev.maxLines);
      if (prev.money < cost) { pushToast('자금이 부족해요', 'berry'); return prev; }
      return { ...prev, money: prev.money - cost, maxLines: prev.maxLines + 1 };
    });
    pushToast('🏗 생산 라인 슬롯을 확장했어요', 'gold');
  };

  const setLineRecipe = (lineId, recipeId) => {
    setG((prev) => ({ ...prev, lines: prev.lines.map((l) => (l.id === lineId ? { ...l, recipeId, progress: 0 } : l)) }));
  };

  const upgradeLine = (lineId) => {
    setG((prev) => {
      const line = prev.lines.find((l) => l.id === lineId);
      const cost = LEVEL_COST(line.level);
      if (prev.money < cost) { pushToast('자금이 부족해요', 'berry'); return prev; }
      return { ...prev, money: prev.money - cost, lines: prev.lines.map((l) => (l.id === lineId ? { ...l, level: l.level + 1 } : l)) };
    });
  };

  const assignStaff = (lineId, staffId) => {
    setG((prev) => ({ ...prev, lines: prev.lines.map((l) => (l.id === lineId ? { ...l, staffId: staffId || null } : l)) }));
  };

  const hireStaff = (role) => {
    setG((prev) => {
      const cost = STAFF_COST(prev.staff.length);
      if (prev.money < cost) { pushToast('자금이 부족해요', 'berry'); return prev; }
      const name = STAFF_FIRST[Math.floor(Math.random() * STAFF_FIRST.length)];
      const staffMember = { id: Date.now(), name, role, level: 1 };
      return { ...prev, money: prev.money - cost, staff: [...prev.staff, staffMember] };
    });
    pushToast('새 직원을 고용했어요', 'pistachio');
  };

  const levelUpStaff = (staffId) => {
    setG((prev) => {
      const member = prev.staff.find((s) => s.id === staffId);
      if (!member) return prev;
      const staffMaxLevel = cfg('staffMaxLevel', STAFF_MAX_LEVEL);
      if (member.level >= staffMaxLevel) { pushToast('이미 최고 레벨이에요', 'berry'); return prev; }
      const cost = STAFF_LEVEL_COST(member.level);
      if (prev.money < cost) { pushToast('자금이 부족해요', 'berry'); return prev; }
      return {
        ...prev,
        money: prev.money - cost,
        staff: prev.staff.map((s) => (s.id === staffId ? { ...s, level: s.level + 1 } : s)),
      };
    });
    pushToast('📈 직원을 훈련시켰어요 (레벨 업)', 'pistachio');
  };

  const buyUpgrade = (up) => {
    setG((prev) => {
      const researchers = prev.staff.filter((s) => s.role === 'research').length;
      const discount = Math.min(cfg('maxResearchDiscount', 30) / 100, researchers * (cfg('researchDiscountPerStaff', 4) / 100));
      const cost = Math.round(up.cost * (1 - discount));
      if (prev.upgrades.includes(up.id)) return prev;
      const reqMet = reqIdsOf(up).every((id) => prev.upgrades.includes(id));
      if (!reqMet) { pushToast('선행 업그레이드가 필요해요', 'berry'); return prev; }
      if (prev.money < cost) { pushToast('자금이 부족해요', 'berry'); return prev; }
      let next = { ...prev, money: prev.money - cost, upgrades: [...prev.upgrades, up.id] };
      if (up.effect.warehouse) next.warehouseCap += effectFor(up.id, 'warehouse');
      if (up.effect.unlock) next.unlockedRecipes = [...prev.unlockedRecipes, up.effect.unlock];
      return next;
    });
    pushToast(`✨ ${up.name} 완료`, 'gold');
  };

  const takeLoan = (amount) => {
    setG((prev) => {
      if (prev.debt + amount > cfg('maxDebt', MAX_DEBT)) { pushToast('대출 한도를 초과했어요', 'berry'); return prev; }
      return { ...prev, money: prev.money + amount, debt: prev.debt + amount, totalLoanTaken: prev.totalLoanTaken + amount };
    });
    pushToast(`🏦 ${fmt(amount)}$ 대출 받았어요`, 'gold');
  };

  const repayLoan = (amount) => {
    setG((prev) => {
      const pay = Math.min(prev.money, prev.debt, amount);
      if (pay <= 0) return prev;
      return { ...prev, money: prev.money - pay, debt: prev.debt - pay };
    });
  };

  // 스핀 애니메이션(릴이 도는 연출) 자체는 FinanceTab이 로컬로 담당하고,
  // 애니메이션이 다 끝난 뒤 이 함수로 실제 결과(자금 변동/토스트/업적 카운트)를 반영한다.
  /* ---------------- 뽑기(가챠) 시스템 액션들 ---------------- */
  const pullGacha = (kind) => {
    const cost = GACHA_COST[kind];
    if (g.gachaCoins < cost) { pushToast('🎟️ 뽑기 코인이 부족해요', 'berry'); return; }

    if (kind === 'staff') {
      const rarity = pickGeneralRarity();
      const rarityCfg = STAFF_RARITY_CONFIG[rarity];
      const role = Math.random() < 0.5 ? 'production' : 'research';
      const name = STAFF_FIRST[Math.floor(Math.random() * STAFF_FIRST.length)];
      const member = { id: Date.now() + Math.floor(Math.random() * 1000), name, role, level: rarityCfg.level, rarity, bonusMult: rarityCfg.bonusMult };
      setG((prev) => ({
        ...prev,
        gachaCoins: prev.gachaCoins - cost,
        gachaPullCount: (prev.gachaPullCount || 0) + 1,
        staff: [...prev.staff, member],
      }));
      const traitNote = STAFF_TRAITS[rarity] ? ` · 특성 [${STAFF_TRAITS[rarity].label}] 상시 발동!` : '';
      pushToast(`🎉 [${RARITY_INFO[rarity].label}] ${name}(${ROLES[role].label}) 직원을 얻었어요!${traitNote}`, rarity === 'legendary' ? 'gold' : 'pistachio');
    } else if (kind === 'fragment') {
      const id = weightedPick(HIDDEN_RECIPES.map((r) => ({ key: r.id, weight: r.fragmentWeight })));
      const recipe = HIDDEN_RECIPES_MAP[id];
      setG((prev) => ({
        ...prev,
        gachaCoins: prev.gachaCoins - cost,
        gachaPullCount: (prev.gachaPullCount || 0) + 1,
        inventory: { ...prev.inventory, fragments: { ...prev.inventory.fragments, [id]: (prev.inventory.fragments[id] || 0) + 1 } },
      }));
      pushToast(`🧩 ${recipe.emoji} ${recipe.name} 조각을 얻었어요!`, 'gold');
    } else if (kind === 'buff') {
      const rarity = pickGeneralRarity();
      const item = BUFF_BY_RARITY[rarity];
      setG((prev) => ({
        ...prev,
        gachaCoins: prev.gachaCoins - cost,
        gachaPullCount: (prev.gachaPullCount || 0) + 1,
        inventory: { ...prev.inventory, buffs: { ...prev.inventory.buffs, [item.id]: (prev.inventory.buffs[item.id] || 0) + 1 } },
      }));
      pushToast(`✨ [${RARITY_INFO[rarity].label}] ${item.emoji} ${item.name}을(를) 얻었어요!`, rarity === 'legendary' ? 'gold' : 'pistachio');
    }
  };

  const buyGachaCoin = () => {
    setG((prev) => {
      if (prev.money < GACHA_COIN_EXCHANGE_RATE) { pushToast('자금이 부족해요', 'berry'); return prev; }
      return { ...prev, money: prev.money - GACHA_COIN_EXCHANGE_RATE, gachaCoins: prev.gachaCoins + 1 };
    });
  };

  const useBuffItem = (itemId) => {
    const item = BUFF_ITEM_LIST.find((b) => b.id === itemId);
    if (!item) return;
    setG((prev) => {
      const have = prev.inventory.buffs[itemId] || 0;
      if (have <= 0) return prev;
      const buffs = { ...prev.inventory.buffs, [itemId]: have - 1 };
      let next = { ...prev, inventory: { ...prev.inventory, buffs } };
      if (item.kind === 'instant') {
        next.lines = prev.lines.map((l) => ({ ...l, progress: 100 }));
      } else {
        next.activeBuffs = [...(prev.activeBuffs || []), { id: Date.now(), key: item.id, label: item.name, effectKey: item.effectKey, value: item.value, expiresAtTick: prev.tick + item.duration }];
      }
      return next;
    });
    pushToast(`${item.emoji} ${item.name} 사용!`, 'gold');
  };

  const assembleRecipe = (recipeId) => {
    const recipe = HIDDEN_RECIPES_MAP[recipeId];
    if (!recipe) return;
    setG((prev) => {
      const have = prev.inventory.fragments[recipeId] || 0;
      if (have < recipe.needFragments || prev.unlockedRecipes.includes(recipeId)) return prev;
      return {
        ...prev,
        inventory: { ...prev.inventory, fragments: { ...prev.inventory.fragments, [recipeId]: have - recipe.needFragments } },
        unlockedRecipes: [...prev.unlockedRecipes, recipeId],
      };
    });
    pushToast(`🔓 ${recipe.emoji} ${recipe.name} 레시피를 조합했어요!`, 'gold');
  };

  const resolveCasino = ({ bet, reels, payout, outcome }) => {
    setG((prev) => ({
      ...prev,
      money: prev.money - bet + payout,
      casinoLast: { reels, payout, bet, outcome, key: Date.now() },
      casinoJackpotCount: prev.casinoJackpotCount + (outcome === 'jackpot' ? 1 : 0),
      gachaCoins: prev.gachaCoins + (outcome === 'jackpot' ? 1 : 0),
    }));
    if (outcome === 'jackpot') pushToast(`🎰 트리플 매치! +${fmt(payout)}$ · 🎟️+1`, 'gold');
    else if (outcome === 'partial') pushToast('🎰 페어 — 베팅 절반 회수', 'pistachio');
    else pushToast(`🎰 꽝... -${fmt(bet)}$`, 'berry');
  };

  /* ---------------- 렌더 ---------------- */
  if (showAdmin) {
    return <AdminPage onClose={() => setShowAdmin(false)} />;
  }
  if (!player) {
    return <AuthScreen onAuth={handleAuth} onGuest={startGuest} />;
  }

  if (!g.started) {
    return <WelcomeScreen onStart={() => setG((p) => ({ ...p, started: true }))} />;
  }

  const researchers = g.staff.filter((s) => s.role === 'research').length;
  const discount = Math.min(cfg('maxResearchDiscount', 30) / 100, researchers * (cfg('researchDiscountPerStaff', 4) / 100));
  const priceMult = (1 + g.upgrades.reduce((s, id) => s + (UPGRADES.find((u) => u.id === id)?.effect.priceMult || 0), 0) + buffBonus(g, 'priceMult') + staffTraitBonus(g.staff, 'priceMultFlat')) * prestigeMultOf(g.prestigeCount || 0);
  const effectiveWarehouseCap = g.warehouseCap + staffTraitBonus(g.staff, 'warehouseFlat');
  const staffRevMult = getStaffRevenueMult(g.staff, g.lines, cfg("staffRevenueBonusPerLevel", STAFF_REVENUE_PER_LEVEL * 100) / 100, cfg("staffRevenueBonusCap", STAFF_REVENUE_CAP * 100) / 100);
  const displayPriceMult = priceMult * staffRevMult;

  const TABS = [
    { id: 'factory', label: '공장 & 창고', icon: Factory },
    { id: 'shop', label: '상점 & 거래', icon: ShoppingCart },
    { id: 'upgrade', label: '업그레이드', icon: ArrowUpCircle },
    { id: 'staff', label: '직원 관리', icon: Users },
    { id: 'gacha', label: '뽑기', icon: Sparkles },
    { id: 'inventory', label: '인벤토리', icon: Package },
    { id: 'finance', label: '대출 & 카지노', icon: Coins },
    { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
    { id: 'achievements', label: '도전과제', icon: Award },
    { id: 'leaderboard', label: '랭킹', icon: TrendingUp },
  ];

  return (
    <div style={{ minHeight: 640, background: C.bgDeep, display: 'flex', justifyContent: 'center', gap: 16, padding: '20px 16px', position: 'relative', overflow: 'hidden' }}>
      {/* 배경 블러 블롭 — Panel/Btn의 backdrop-filter 유리효과가 실제로 보이도록 뒤에 색을 깔아준다 */}
      <div className="ftc-blob" style={{ width: 420, height: 420, left: '8%', top: -80, background: C.caramel, animationDelay: '0s' }} />
      <div className="ftc-blob" style={{ width: 360, height: 360, right: '6%', top: '30%', background: C.gold, animationDelay: '-5s' }} />
      <div className="ftc-blob" style={{ width: 380, height: 380, left: '30%', bottom: -100, background: C.berry, animationDelay: '-10s', opacity: 0.35 }} />
      <style>{`
        ${FONT_IMPORT}
        ${MOTION_CSS}
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { height: 6px; width: 6px; }
        ::-webkit-scrollbar-thumb { background: ${C.bgPanelLighter}; border-radius: 4px; }
        @keyframes beltMove { from { background-position: 0 0; } to { background-position: -48px 0; } }
        @keyframes toastIn { from { opacity: 0; filter: blur(6px); transform: translate(-50%, -8px); } to { opacity: 1; filter: blur(0); transform: translate(-50%, 0); } }
        @keyframes pulseGlow { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
        @keyframes slotScrollStrip { from { transform: translateY(0); } to { transform: translateY(-${SLOT_SYMBOLS.length * SLOT_SYMBOL_H}px); } }
        @keyframes slotLand { 0% { transform: scale(1.35) rotate(-5deg); } 55% { transform: scale(0.88) rotate(3deg); } 100% { transform: scale(1) rotate(0deg); } }
        @keyframes jackpotGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(234,193,58,0); border-color: ${C.line}; } 50% { box-shadow: 0 0 32px 10px rgba(234,193,58,0.55); border-color: ${C.gold}; } }
        @keyframes jackpotPop { 0% { transform: translate(-50%,-40%) scale(0.4) rotate(-8deg); opacity: 0; } 55% { transform: translate(-50%,-52%) scale(1.2) rotate(4deg); opacity: 1; } 100% { transform: translate(-50%,-50%) scale(1) rotate(0deg); opacity: 1; } }
        @keyframes confettiBurst { 0% { transform: translate(0,0) rotate(0deg); opacity: 1; } 100% { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); opacity: 0; } }
        select { font-family: 'Space Grotesk', sans-serif; }
        .ftc-ad-col { display: block; }
        @media (max-width: 1180px) { .ftc-ad-col { display: none; } }
      `}</style>

      <div className="ftc-ad-col"><AdBanner {...AD_BANNERS.left} /></div>

      <div style={{ width: '100%', maxWidth: 1500, minHeight: 640, background: C.bgDeep, fontFamily: "'Space Grotesk', sans-serif", position: 'relative', paddingBottom: 24 }}>
      {/* 헤더 */}
      <div style={{ padding: '18px 22px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: `linear-gradient(135deg, ${C.caramel}, ${C.gold})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏭</div>
            <div>
              <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 19, color: C.cream, letterSpacing: 0.3 }}>카카오 앤 코</div>
              <div style={{ fontSize: 10.5, color: C.creamDim, letterSpacing: 0.6 }}>CHOCOLATE FACTORY TYCOON</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <StatChip icon="💰" label="자산" value={`${fmt(g.money)}$`} accent={C.gold} />
            <StatChip icon="🎟️" label="뽑기 코인" value={fmt(g.gachaCoins)} accent={C.epic} />
            {(g.prestigeCount || 0) > 0 && <StatChip icon="🌟" label="환생 배율" value={`×${prestigeMultOf(g.prestigeCount).toFixed(2)}`} accent={C.gold} />}
            {g.debt > 0 && <StatChip icon="🏦" label="대출금" value={`${fmt(g.debt)}$`} accent={C.berry} />}
            <StatChip icon="🌰" label="카카오" value={fmt(g.resources.cacao)} />
            <StatChip icon="🧂" label="설탕" value={fmt(g.resources.sugar)} />
            <StatChip icon="🥛" label="우유" value={fmt(g.resources.freshMilk)} />
            <StatChip icon="🍓" label="딸기" value={fmt(g.resources.strawberry)} />
            <StatChip icon="🫐" label="블루베리" value={fmt(g.resources.blueberry)} />
          </div>
        </div>

        {/* 계정 & 저장 상태 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          <div style={{ fontSize: 11.5, color: C.creamDim }}>
            👤 <span style={{ color: C.cream, fontWeight: 600 }}>{player.username}</span>
            {'  '}·{'  '}
            {player.guest && <span style={{ color: C.caramelLight }}>게스트 모드 · 진행 상황이 저장되지 않아요</span>}
            {!player.guest && saveStatus === 'saving' && '저장 중...'}
            {!player.guest && saveStatus === 'saved' && lastSaved && `마지막 저장 ${lastSaved.toLocaleTimeString('ko-KR')}`}
            {!player.guest && saveStatus === 'error' && <span style={{ color: C.berry }}>저장 실패</span>}
            {!player.guest && saveStatus === 'idle' && '자동 저장 대기중 (20초마다)'}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {!player.guest && <Btn small variant="ghost" onClick={saveNow}>지금 저장</Btn>}
            <Btn small variant="ghost" onClick={logout}>{player.guest ? '게스트 모드 종료' : '로그아웃'}</Btn>
          </div>
        </div>

        {/* 컨베이어 벨트 시그니처 */}
        <div style={{
          marginTop: 14, height: 30, borderRadius: 8, overflow: 'hidden', position: 'relative',
          background: `repeating-linear-gradient(45deg, ${C.bgPanelLighter} 0 8px, ${C.bgPanel} 8px 16px)`,
          border: `1px solid ${C.line}`, backgroundSize: '48px 100%', animation: 'beltMove 1.4s linear infinite',
        }}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, fontSize: 13, background: 'rgba(28,17,10,0.55)', backdropFilter: 'blur(1px)' }}>
            {g.lines.map((l) => {
              const r = RECIPES.find((rc) => rc.id === l.recipeId);
              return (
                <span key={l.id} style={{ color: C.cream, fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ opacity: l.blocked ? 0.4 : 1 }}>{r?.emoji}</span>
                  <span style={{ fontSize: 11, color: l.blocked ? C.berry : C.pistachio }}>
                    {l.blocked ? (l.blockedReason === 'warehouse' ? '창고가득' : '재료부족') : `${Math.floor(l.progress)}%`}
                  </span>
                </span>
              );
            })}
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div style={{ display: 'flex', gap: 6, marginTop: 16, borderBottom: `1px solid ${C.line}`, overflowX: 'auto' }}>
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                className="ftc-tab-btn"
                data-active={active}
                onClick={() => setTab(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: 'none', border: 'none',
                  borderBottom: active ? `2px solid ${C.caramelLight}` : '2px solid transparent',
                  color: active ? C.cream : C.creamDim, cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap',
                }}
              >
                <Icon size={15} />
                <span className="ftc-tab-underline">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 컨텐츠 — key={tab}로 탭이 바뀔 때마다 blur+slide로 다시 나타나게 한다 */}
      <div key={tab} className="ftc-tab-content" style={{ padding: '20px 22px 0' }}>
        {tab === 'factory' && (
          <FactoryTab g={g} priceMult={displayPriceMult} effectiveWarehouseCap={effectiveWarehouseCap} buyLine={buyLine} expandLineSlot={expandLineSlot} setLineRecipe={setLineRecipe} upgradeLine={upgradeLine} assignStaff={assignStaff} setAutoSell={(v) => setG((p) => ({ ...p, autoSell: v }))} cfg={cfg} />
        )}
        {tab === 'shop' && <ShopTab g={g} priceMult={displayPriceMult} buyResource={buyResource} sellProduct={sellProduct} />}
        {tab === 'upgrade' && <UpgradeTab g={g} discount={discount} buyUpgrade={buyUpgrade} />}
        {tab === 'staff' && <StaffTab g={g} hireStaff={hireStaff} levelUpStaff={levelUpStaff} staffRevMult={staffRevMult} cfg={cfg} />}
        {tab === 'gacha' && <GachaTab g={g} pullGacha={pullGacha} buyGachaCoin={buyGachaCoin} />}
        {tab === 'inventory' && <InventoryTab g={g} useBuffItem={useBuffItem} assembleRecipe={assembleRecipe} />}
        {tab === 'finance' && <FinanceTab g={g} takeLoan={takeLoan} repayLoan={repayLoan} resolveCasino={resolveCasino} jackpotRate={jackpotRate} cfg={cfg} />}
        {tab === 'dashboard' && <DashboardTab g={g} resetGame={resetGame} doPrestige={doPrestige} />}
        {tab === 'achievements' && <AchievementsTab g={g} />}
        {tab === 'leaderboard' && <LeaderboardTab currentUsername={player.username} currentMoney={g.money} />}
      </div>

      {/* 토스트 */}
      {g.toast && (
        <div
          key={g.toast.key}
          className="ftc-glass"
          style={{
            position: 'fixed', top: 18, left: '50%', animation: 'toastIn .3s ease',
            border: `1px solid ${C.caramelLight}`, color: C.cream,
            padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          {g.toast.msg}
        </div>
      )}
      </div>

      <div className="ftc-ad-col"><AdBanner {...AD_BANNERS.right} /></div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  로그인 / 회원가입 화면                                             */
/* ---------------------------------------------------------------- */
function AuthScreen({ onAuth, onGuest }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const inputStyle = {
    width: '100%', background: C.bgPanelLighter, color: C.cream, border: `1px solid ${C.line}`,
    borderRadius: 9, padding: '10px 12px', fontSize: 14, fontFamily: "'Space Grotesk', sans-serif",
    marginBottom: 12, outline: 'none',
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    if (!username.trim() || !password) { setError('이름과 비밀번호를 입력해주세요'); return; }
    setBusy(true);
    try {
      const fn = mode === 'login' ? 'login' : 'signup';
      const rows = await supabaseRpc(fn, { p_username: username.trim(), p_password: password });
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (!row || !row.player_id) throw new Error('처리 중 문제가 생겼어요');
      onAuth({ id: row.player_id, username: username.trim(), password, data: row.data || null });
    } catch (err) {
      setError(err.message || '문제가 생겼어요. 다시 시도해주세요');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      minHeight: 640, background: `radial-gradient(circle at 30% 20%, #3B2716 0%, ${C.bgDeep} 60%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk', sans-serif", padding: 24,
    }}>
      <style>{`${FONT_IMPORT}${MOTION_CSS}`}</style>
      <Panel glass style={{ width: '100%', maxWidth: 380, padding: 28 }} className="ftc-fade-in">
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>🏭</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 22, color: C.cream }}>카카오 앤 코</div>
          <div style={{ fontSize: 11, color: C.creamDim, letterSpacing: 1, marginTop: 2 }}>
            {mode === 'login' ? '이름과 비밀번호로 로그인하세요' : '새 계정을 만들어 시작하세요'}
          </div>
        </div>

        <form onSubmit={submit}>
          <input
            style={inputStyle}
            placeholder="이름 (2자 이상)"
            value={username}
            maxLength={20}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
          <input
            style={{ ...inputStyle, marginBottom: 6 }}
            placeholder="비밀번호 (4자 이상)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
          {error && <div style={{ color: C.berry, fontSize: 12, margin: '6px 0 10px' }}>⚠ {error}</div>}
          <Btn
            variant="gold"
            disabled={busy}
            style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
            onClick={submit}
          >
            {busy ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
          </Btn>
        </form>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12.5, color: C.creamDim }}>
          {mode === 'login' ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}{' '}
          <span
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
            style={{ color: C.caramelLight, cursor: 'pointer', fontWeight: 600 }}
          >
            {mode === 'login' ? '회원가입' : '로그인'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' }}>
          <div style={{ flex: 1, height: 1, background: C.line }} />
          <span style={{ fontSize: 10.5, color: C.creamDim }}>또는</span>
          <div style={{ flex: 1, height: 1, background: C.line }} />
        </div>

        <Btn
          variant="ghost"
          disabled={busy}
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={onGuest}
        >
          게스트로 바로 시작하기
        </Btn>
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 10.5, color: C.creamDim, lineHeight: 1.5 }}>
          가입 없이 바로 플레이할 수 있어요. 다만 진행 상황은 저장되지 않고, 창을 닫으면 사라져요.
        </div>
      </Panel>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  환영 화면                                                         */
/* ---------------------------------------------------------------- */
function WelcomeScreen({ onStart }) {
  return (
    <div style={{
      minHeight: 640, background: `radial-gradient(circle at 30% 20%, #3B2716 0%, ${C.bgDeep} 60%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk', sans-serif", padding: 24,
    }}>
      <style>{`${FONT_IMPORT}${MOTION_CSS}
        @keyframes floatBar { 0%,100% { transform: translateY(0) rotate(-6deg);} 50% { transform: translateY(-10px) rotate(6deg);} }
        @keyframes shimmer { 0% { background-position: -200px 0;} 100% { background-position: 200px 0;} }
      `}</style>
      <div className="ftc-fade-in" style={{ maxWidth: 620, width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginBottom: 22 }}>
          {['🍫', '🌰', '🍬', '🥛'].map((e, i) => (
            <span key={i} style={{ fontSize: 32, display: 'inline-block', animation: `floatBar ${2.4 + i * 0.3}s ease-in-out infinite` }}>{e}</span>
          ))}
        </div>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 44, fontWeight: 700, color: C.cream, lineHeight: 1.15, marginBottom: 10 }}>
          카카오 앤 코
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 13, letterSpacing: 3, color: C.caramelLight,
            marginBottom: 22, textTransform: 'uppercase',
          }}
        >
          Chocolate Factory Tycoon
        </div>
        <p style={{ color: C.creamDim, fontSize: 15, lineHeight: 1.7, marginBottom: 30 }}>
          작은 초콜릿 공방에서 시작해 카카오 제국을 세워보세요.<br />
          원재료를 조달하고, 생산 라인을 돌리고, 직원을 고용하고, 설비를 업그레이드하며<br />
          창고를 채운 초콜릿을 시장에 팔아 자산을 $려나가세요.
        </p>
        <Btn variant="gold" onClick={onStart} style={{ fontSize: 15, padding: '13px 30px' }}>
          🏭 공장 문 열기 <ChevronRight size={16} />
        </Btn>
        <div style={{ marginTop: 26, display: 'flex', justifyContent: 'center', gap: 22, flexWrap: 'wrap' }}>
          {[
            ['🏭', '생산 라인 관리'],
            ['📦', '창고 & 재고'],
            ['🛒', '거래소'],
            ['🌳', '업그레이드 트리'],
            ['👥', '직원 채용'],
            ['📊', '대시보드'],
          ].map(([icon, label]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: 11, color: C.creamDim }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  공장 + 창고 탭                                                    */
/* ---------------------------------------------------------------- */
function FactoryTab({ g, priceMult, effectiveWarehouseCap, buyLine, expandLineSlot, setLineRecipe, upgradeLine, assignStaff, setAutoSell, cfg }) {
  const whTotal = Object.values(g.warehouse).reduce((a, b) => a + b, 0);
  const capForDisplay = effectiveWarehouseCap ?? g.warehouseCap;
  const maxLineCap = cfg('maxLines', MAX_LINE_CAP);
  return (
    <div>
      <SectionTitle
        eyebrow="Factory Floor"
        title="생산 라인"
        right={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.creamDim, cursor: 'pointer' }}>
              <input type="checkbox" checked={g.autoSell} onChange={(e) => setAutoSell(e.target.checked)} />
              생산 즉시 자동 판매
            </label>
            <Btn onClick={buyLine} disabled={g.lines.length >= g.maxLines}>
              <Plus size={14} /> 라인 추가 ({fmt(LINE_COST(g.lines.length))}$)
            </Btn>
            <Btn variant="ghost" onClick={expandLineSlot} disabled={g.maxLines >= maxLineCap}>
              <ArrowUpCircle size={14} /> 슬롯 확장 {g.maxLines >= maxLineCap ? '(최대)' : `(${fmt(LINE_SLOT_COST(g.maxLines))}$)`}
            </Btn>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, marginBottom: 30 }}>
        {g.lines.map((line, i) => {
          const recipe = RECIPES.find((r) => r.id === line.recipeId);
          const staffMember = g.staff.find((s) => s.id === line.staffId);
          const prodStaff = g.staff.filter((s) => s.role === 'production');
          return (
            <Panel key={line.id} className="ftc-fade-in" style={{ padding: 16, animationDelay: `${i * 0.06}s` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 700, color: C.cream }}>라인 · Lv.{line.level}</span>
                <span style={{ fontSize: 22 }}>{recipe?.emoji}</span>
              </div>
              <select
                value={line.recipeId}
                onChange={(e) => setLineRecipe(line.id, e.target.value)}
                style={{ width: '100%', background: C.bgPanelLighter, color: C.cream, border: `1px solid ${C.line}`, borderRadius: 8, padding: '7px 8px', fontSize: 12.5, marginBottom: 10 }}
              >
                {g.unlockedRecipes.map((rid) => {
                  const r = RECIPES.find((x) => x.id === rid);
                  return <option key={rid} value={rid}>{r.emoji} {r.name}</option>;
                })}
              </select>

              <div style={{ fontSize: 11, color: C.creamDim, marginBottom: 6 }}>
                재료: {Object.entries(recipe.ing).map(([k, v]) => `${getIngredientMeta(k).emoji}${v}`).join(' ')} → 판매가 {fmt(recipe.price * priceMult)}$
              </div>

              <ProgressBar pct={line.progress} color={line.blocked ? C.berry : C.pistachio} />
              <div style={{ fontSize: 11, color: line.blocked ? C.berry : C.creamDim, marginTop: 4, marginBottom: 12 }}>
                {line.blocked
                  ? (line.blockedReason === 'warehouse' ? '⚠ 창고가 가득 찼어요 — 판매하거나 창고를 늘리세요' : '⚠ 원재료 부족 — 상점에서 구매하세요')
                  : `생산 진행률 ${Math.floor(line.progress)}%`}
              </div>

              <select
                value={line.staffId || ''}
                onChange={(e) => assignStaff(line.id, e.target.value ? Number(e.target.value) : null)}
                style={{ width: '100%', background: C.bgPanelLighter, color: C.cream, border: `1px solid ${C.line}`, borderRadius: 8, padding: '7px 8px', fontSize: 12.5, marginBottom: 10 }}
              >
                <option value="">직원 미배정</option>
                {prodStaff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} (Lv.{s.level} 생산직)</option>
                ))}
              </select>

              <Btn small variant="ghost" onClick={() => upgradeLine(line.id)} style={{ width: '100%', justifyContent: 'center' }}>
                <Wrench size={13} /> 설비 업그레이드 ({fmt(LEVEL_COST(line.level))}$)
              </Btn>
            </Panel>
          );
        })}
      </div>

      <SectionTitle
        eyebrow="Warehouse"
        title="창고"
        right={<span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: C.creamDim }}>{fmt(whTotal)} / {fmt(capForDisplay)} 칸 사용중</span>}
      />
      <Panel style={{ padding: 16, marginBottom: 10 }}>
        <ProgressBar pct={(whTotal / capForDisplay) * 100} color={C.caramelLight} height={10} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: 10, marginTop: 16 }}>
          {RECIPES.filter((r) => g.unlockedRecipes.includes(r.id)).map((r, i) => (
            <div key={r.id} className="ftc-glass ftc-fade-in" style={{ borderRadius: 10, padding: 10, textAlign: 'center', animationDelay: `${i * 0.05}s` }}>
              <div style={{ fontSize: 22 }}>{r.emoji}</div>
              <div style={{ fontSize: 11.5, color: C.creamDim, margin: '4px 0' }}>{r.name}</div>
              <div key={g.warehouse[r.id] || 0} className="ftc-value-flash" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: C.gold, fontSize: 16 }}>{fmt(g.warehouse[r.id] || 0)}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  상점 & 거래 탭                                                    */
/* ---------------------------------------------------------------- */
function ShopTab({ g, priceMult, buyResource, sellProduct }) {
  const [customBuy, setCustomBuy] = useState({});
  const setAmt = (key, v) => setCustomBuy((prev) => ({ ...prev, [key]: v }));
  const confirmBuy = (key) => {
    const n = Math.floor(Number(customBuy[key]));
    if (!n || n <= 0) return;
    buyResource(key, n);
    setAmt(key, '');
  };
  return (
    <div>
      <SectionTitle eyebrow="Trading Post" title="원재료 구매" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 12, marginBottom: 30 }}>
        {Object.entries(RESOURCE_META).map(([key, meta], i) => (
          <Panel key={key} className="ftc-fade-in" style={{ padding: 14, animationDelay: `${i * 0.05}s` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 22 }}>{meta.emoji}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: C.gold, fontWeight: 700, fontSize: 13 }}>{g.prices[key]}$/개</span>
            </div>
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: C.cream, fontSize: 15, marginBottom: 2 }}>{meta.name}</div>
            <div style={{ fontSize: 11.5, color: C.creamDim, marginBottom: 10 }}>보유량 {fmt(g.resources[key])}개</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {[10, 50, 200].map((amt) => (
                <Btn key={amt} small variant="ghost" onClick={() => buyResource(key, amt)} style={{ flex: 1, justifyContent: 'center' }}>
                  +{amt}
                </Btn>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="number"
                min="1"
                placeholder="직접 입력"
                value={customBuy[key] ?? ''}
                onChange={(e) => setAmt(key, e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && confirmBuy(key)}
                style={{ flex: 1, minWidth: 0, background: C.bgPanelLighter, color: C.cream, border: `1px solid ${C.line}`, borderRadius: 8, padding: '6px 8px', fontSize: 12.5 }}
              />
              <Btn
                small
                variant="gold"
                disabled={!customBuy[key] || Number(customBuy[key]) <= 0}
                onClick={() => confirmBuy(key)}
              >
                구매
              </Btn>
            </div>
          </Panel>
        ))}
      </div>

      <SectionTitle eyebrow="Market" title="완제품 판매" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 12 }}>
        {RECIPES.filter((r) => g.unlockedRecipes.includes(r.id)).map((r, i) => {
          const qty = g.warehouse[r.id] || 0;
          return (
            <Panel key={r.id} className="ftc-fade-in" style={{ padding: 14, animationDelay: `${i * 0.05}s` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>{r.emoji}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: C.pistachio, fontWeight: 700, fontSize: 13 }}>{fmt(r.price * priceMult)}$/개</span>
              </div>
              <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: C.cream, fontSize: 15, marginBottom: 2 }}>{r.name}</div>
              <div style={{ fontSize: 11.5, color: C.creamDim, marginBottom: 10 }}>창고 재고 {fmt(qty)}개</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Btn small variant="primary" disabled={qty === 0} onClick={() => sellProduct(r.id, Math.max(1, Math.floor(qty / 2)))} style={{ flex: 1, justifyContent: 'center' }}>
                  절반 판매
                </Btn>
                <Btn small variant="gold" disabled={qty === 0} onClick={() => sellProduct(r.id, qty)} style={{ flex: 1, justifyContent: 'center' }}>
                  전량 판매
                </Btn>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  업그레이드 트리 탭                                                 */
/* ---------------------------------------------------------------- */
function UpgradeTab({ g, discount, buyUpgrade }) {
  const upgradeMap = React.useMemo(() => Object.fromEntries(UPGRADES.map((u) => [u.id, u])), []);

  // 마우스로 누른 채 드래그하면 트리 캔버스가 움직이는 팬(pan) 기능
  const scrollRef = useRef(null);
  const drag = useRef({ active: false, moved: false, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0 });

  const onDragStart = (e) => {
    const el = scrollRef.current;
    if (!el) return;
    drag.current = { active: true, moved: false, startX: e.clientX, startY: e.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop };
    el.style.cursor = 'grabbing';
  };
  const onDragMove = (e) => {
    const el = scrollRef.current;
    if (!el || !drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.current.moved = true;
    el.scrollLeft = drag.current.scrollLeft - dx;
    el.scrollTop = drag.current.scrollTop - dy;
  };
  const onDragEnd = () => {
    const el = scrollRef.current;
    if (el) el.style.cursor = 'grab';
    drag.current.active = false;
  };
  // 드래그로 캔버스를 움직인 직후에는 버튼 클릭이 실수로 눌리지 않도록 클릭을 한 번 막는다
  const onClickCapture = (e) => {
    if (drag.current.moved) { e.stopPropagation(); drag.current.moved = false; }
  };

  return (
    <div>
      <SectionTitle
        eyebrow="R&D Tree"
        title="업그레이드"
        right={discount > 0 ? <span style={{ fontSize: 12, color: C.pistachio }}>연구직 할인 -{Math.round(discount * 100)}%</span> : null}
      />

      {/* 계열 범례 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        {Object.entries(BRANCH_INFO).map(([key, info]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: C.creamDim }}>
            <span style={{ width: 10, height: 10, borderRadius: 99, background: info.color, display: 'inline-block', flexShrink: 0 }} />
            <span>{info.icon} {info.label}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: C.creamDim, marginBottom: 8 }}>💡 마우스로 캔버스를 누른 채 드래그하면 이동할 수 있어요</div>

      {/* 방사형 트리 캔버스: 본사(중앙)에서 5개 계열이 사방으로 뻗어나가는 구조.
          연결선과 카드를 모두 같은 SVG viewBox 안에 그려서, 화면 크기가 바뀌어도
          카드 크기·간격·선의 비율이 항상 함께 스케일된다(따로 놀지 않는다). */}
      <div
        ref={scrollRef}
        onMouseDown={onDragStart}
        onMouseMove={onDragMove}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
        onClickCapture={onClickCapture}
        style={{
          width: '100%', maxHeight: 720, overflow: 'auto', border: `1px solid ${C.line}`,
          borderRadius: 14, background: C.bgDeep, cursor: 'grab', userSelect: 'none',
        }}
      >
        <svg viewBox={`0 0 ${TREE_SIZE} ${TREE_SIZE}`} width={TREE_SIZE} height={TREE_SIZE} style={{ display: 'block' }}>
          {/* 중앙 → 각 계열의 첫 노드 */}
          {UPGRADES.filter((u) => reqIdsOf(u).length === 0).map((u) => {
            const p2 = upgradePos(u);
            const owned = g.upgrades.includes(u.id);
            return (
              <line
                key={`root-${u.id}`}
                x1={TREE_CENTER} y1={TREE_CENTER} x2={p2.x} y2={p2.y}
                stroke={owned ? C.gold : C.line} strokeWidth={owned ? 7 : 4}
              />
            );
          })}
          {/* 노드 간 연결선 (합류 지점은 선이 2개 이상 모임) */}
          {UPGRADES.map((u) =>
            reqIdsOf(u).map((reqId) => {
              const parent = upgradeMap[reqId];
              if (!parent) return null;
              const p1 = upgradePos(parent);
              const p2 = upgradePos(u);
              const owned = g.upgrades.includes(u.id);
              const parentOwned = g.upgrades.includes(parent.id);
              return (
                <line
                  key={`${reqId}-${u.id}`}
                  x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                  stroke={owned ? C.gold : parentOwned ? C.caramelLight : C.line}
                  strokeWidth={owned ? 7 : 4}
                  strokeDasharray={parentOwned || owned ? 'none' : '12 10'}
                />
              );
            })
          )}

          {/* 중앙 본사 노드 */}
          <foreignObject x={TREE_CENTER - 64} y={TREE_CENTER - 64} width={128} height={128}>
            <div
              xmlns="http://www.w3.org/1999/xhtml"
              style={{
                width: 128, height: 128, borderRadius: 999, boxSizing: 'border-box',
                background: `linear-gradient(135deg, ${C.caramel}, ${C.gold})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 46, boxShadow: '0 0 0 8px rgba(234,193,58,0.15)',
              }}
              title="카카오 앤 코 본사"
            >
              🏭
            </div>
          </foreignObject>

          {/* 업그레이드 노드 카드들 */}
          {UPGRADES.map((u) => {
            const { x, y } = upgradePos(u);
            const owned = g.upgrades.includes(u.id);
            const reqIds = reqIdsOf(u);
            const reqMet = reqIds.every((id) => g.upgrades.includes(id));
            const cost = Math.round(u.cost * (1 - discount));
            const info = BRANCH_INFO[u.branch];
            const affordable = g.money >= cost;
            return (
              <foreignObject key={u.id} x={x - CARD_W / 2} y={y - CARD_H / 2} width={CARD_W} height={CARD_H}>
                <div
                  xmlns="http://www.w3.org/1999/xhtml"
                  className="ftc-glass ftc-fade-in"
                  style={{
                    width: CARD_W, height: CARD_H, boxSizing: 'border-box', padding: 12,
                    borderRadius: 14, opacity: reqMet ? 1 : 0.55,
                    border: `${owned ? 2.5 : 1.5}px solid ${owned ? C.gold : info.color}`,
                    boxShadow: owned ? `0 0 18px ${info.color}66` : 'none',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                      <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: C.cream, fontSize: 16, lineHeight: 1.3 }}>{u.name}</div>
                      {owned ? <Check size={18} color={C.gold} style={{ flexShrink: 0 }} /> : !reqMet ? <Lock size={16} color={C.creamDim} style={{ flexShrink: 0 }} /> : null}
                    </div>
                    <div style={{ fontSize: 12.5, color: C.creamDim, marginTop: 6, lineHeight: 1.5 }}>{u.desc}</div>
                  </div>
                  {!owned && (
                    <Btn
                      small
                      variant={reqMet && affordable ? 'primary' : 'ghost'}
                      disabled={!reqMet || !affordable}
                      onClick={() => buyUpgrade(u)}
                      style={{ width: '100%', justifyContent: 'center', fontSize: 13, padding: '7px 8px' }}
                    >
                      {reqMet ? `${fmt(cost)}$` : '선행 필요'}
                    </Btn>
                  )}
                  {owned && <div style={{ fontSize: 12.5, color: C.gold, fontWeight: 600, textAlign: 'center' }}>완료됨</div>}
                </div>
              </foreignObject>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  직원 관리 탭                                                      */
/* ---------------------------------------------------------------- */
function StaffTab({ g, hireStaff, levelUpStaff, staffRevMult, cfg }) {
  const assignedLineOf = (staffId) => g.lines.find((l) => l.staffId === staffId);
  const staffMaxLevel = cfg('staffMaxLevel', STAFF_MAX_LEVEL);
  const revenuePerLevel = cfg('staffRevenueBonusPerLevel', STAFF_REVENUE_PER_LEVEL * 100);
  const revenueCap = cfg('staffRevenueBonusCap', STAFF_REVENUE_CAP * 100);
  const researchDiscountPerStaff = cfg('researchDiscountPerStaff', 4);
  const maxResearchDiscount = cfg('maxResearchDiscount', 30);
  return (
    <div>
      <SectionTitle
        eyebrow="Human Resources"
        title="직원 관리"
        right={
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: C.pistachio }}>
            생산직 판매 보너스 +{Math.round((staffRevMult - 1) * 100)}%
          </span>
        }
      />
      <div style={{ display: 'flex', gap: 10, marginBottom: 22, flexWrap: 'wrap' }}>
        {Object.entries(ROLES).map(([key, role]) => (
          <Panel key={key} className="ftc-fade-in" style={{ padding: 14, flex: '1 1 240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <UserPlus size={16} color={role.color} />
              <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: C.cream }}>{role.label}</span>
            </div>
            <div style={{ fontSize: 12, color: C.creamDim, marginBottom: 12, lineHeight: 1.5 }}>
              {role.desc}
              {key === 'production' && ` 라인에 배정하면 속도뿐 아니라 판매 수익도 레벨당 +${revenuePerLevel}%(최대 +${revenueCap}%) 늘어나요, 라인 속도가 이미 빨라도 계속 쓸모있어요.`}
              {key === 'research' && ` 레벨과 무관하게 인원수에 비례해 업그레이드 비용을 깎아줘요(1인당 -${researchDiscountPerStaff}%, 최대 -${maxResearchDiscount}%).`}
            </div>
            <Btn small variant="ghost" onClick={() => hireStaff(key)} style={{ width: '100%', justifyContent: 'center' }}>
              고용하기 ({fmt(STAFF_COST(g.staff.length))}$)
            </Btn>
          </Panel>
        ))}
      </div>

      <div style={{ fontSize: 11, letterSpacing: 1.5, color: C.creamDim, marginBottom: 10, textTransform: 'uppercase' }}>
        현재 직원 ({g.staff.length}명)
      </div>
      {g.staff.length === 0 && <div style={{ color: C.creamDim, fontSize: 13 }}>아직 고용한 직원이 없어요.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px,1fr))', gap: 10 }}>
        {g.staff.map((s) => {
          const maxed = s.level >= staffMaxLevel;
          const cost = STAFF_LEVEL_COST(s.level);
          const line = s.role === 'production' ? assignedLineOf(s.id) : null;
          const rarity = s.rarity || 'common';
          const rarityColor = RARITY_INFO[rarity].color;
          const trait = STAFF_TRAITS[rarity];
          return (
            <Panel
              key={s.id}
              style={{
                padding: 12,
                borderColor: rarity === 'common' ? C.line : rarityColor,
                boxShadow: (rarity === 'epic' || rarity === 'legendary') ? `0 0 16px ${rarityColor}55` : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div
                  style={{
                    width: 34, height: 34, borderRadius: '50%', background: ROLES[s.role].color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, color: '#1C1108', fontSize: 13, flexShrink: 0,
                    boxShadow: rarity === 'common' ? 'none' : `0 0 0 2px ${C.bgPanel}, 0 0 0 4px ${rarityColor}`,
                  }}
                >
                  {s.name[0]}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: rarity === 'common' ? C.cream : rarityColor, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {rarity === 'legendary' && '✨'}{s.name}
                    {rarity !== 'common' && (
                      <span style={{ fontSize: 9.5, fontWeight: 700, color: rarityColor, border: `1px solid ${rarityColor}`, borderRadius: 6, padding: '1px 5px' }}>
                        {RARITY_INFO[rarity].label}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: C.creamDim }}>{ROLES[s.role].label} · Lv.{s.level}{maxed ? ' (MAX)' : ''}</div>
                </div>
              </div>
              {s.role === 'production' && (
                <div style={{ fontSize: 10.5, color: line ? C.pistachio : C.creamDim, marginBottom: 8 }}>
                  {line ? `라인 배정중 · 속도+${Math.round(s.level * 9 * (s.bonusMult || 1))} · 수익+${Math.round(s.level * STAFF_REVENUE_PER_LEVEL * (s.bonusMult || 1) * 100)}%` : '라인 미배정 (공장 탭에서 배정하세요)'}
                </div>
              )}
              {s.role === 'research' && (
                <div style={{ fontSize: 10.5, color: C.pistachio, marginBottom: 8 }}>업그레이드 비용 할인에 기여중</div>
              )}
              {trait && (
                <div style={{ fontSize: 10, color: rarityColor, background: `${rarityColor}14`, border: `1px solid ${rarityColor}55`, borderRadius: 6, padding: '4px 6px', marginBottom: 8, lineHeight: 1.4 }}>
                  ★ 특성 · {trait.label}: {trait.desc}
                </div>
              )}
              <Btn
                small
                variant={maxed ? 'ghost' : 'primary'}
                disabled={maxed || g.money < cost}
                onClick={() => levelUpStaff(s.id)}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Gauge size={13} /> {maxed ? '최고 레벨' : `레벨업 (${fmt(cost)}$)`}
              </Btn>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  뽑기 탭                                                           */
/* ---------------------------------------------------------------- */
function GachaMachineCard({ title, emoji, desc, cost, coins, lines, onPull }) {
  const affordable = coins >= cost;
  return (
    <Panel style={{ padding: 18 }}>
      <div style={{ fontSize: 30, marginBottom: 6 }}>{emoji}</div>
      <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: C.cream, fontSize: 16, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 11.5, color: C.creamDim, lineHeight: 1.5, marginBottom: 12 }}>{desc}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
        {lines.map(({ key, label, color, pct }) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5 }}>
            <span style={{ color, fontWeight: 600 }}>{label}</span>
            <span style={{ color: C.creamDim }}>{pct}%</span>
          </div>
        ))}
      </div>
      <Btn variant={affordable ? 'gold' : 'ghost'} disabled={!affordable} onClick={onPull} style={{ width: '100%', justifyContent: 'center' }}>
        <Sparkles size={14} /> 1회 뽑기 (🎟️{cost})
      </Btn>
    </Panel>
  );
}

function GachaTab({ g, pullGacha, buyGachaCoin }) {
  const totalWeight = GENERAL_RARITIES.reduce((s, k) => s + RARITY_INFO[k].weight, 0);
  const generalLines = GENERAL_RARITIES.map((k) => ({
    key: k, label: RARITY_INFO[k].label, color: RARITY_INFO[k].color,
    pct: Math.round((RARITY_INFO[k].weight / totalWeight) * 100),
  }));
  const fragTotal = HIDDEN_RECIPES.reduce((s, r) => s + r.fragmentWeight, 0);
  // 히든 레시피는 조각을 얻기 전까진 이름을 공개하지 않는다 — 미확인 A/B/C로만 표시
  const MYSTERY_LABELS = ['미확인 레시피 A', '미확인 레시피 B', '미확인 레시피 C', '미확인 레시피 D', '미확인 레시피 E'];
  const fragmentLines = HIDDEN_RECIPES.map((r, i) => ({
    key: r.id, label: `❓ ${MYSTERY_LABELS[i] || `미확인 레시피 ${i + 1}`}`, color: C.berry,
    pct: Math.round((r.fragmentWeight / fragTotal) * 100),
  }));

  return (
    <div>
      <SectionTitle
        eyebrow="Gacha"
        title="뽑기"
        right={<span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: C.epic }}>🎟️ 보유 코인 {fmt(g.gachaCoins)}개</span>}
      />

      <Panel style={{ padding: 14, marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 11.5, color: C.creamDim, lineHeight: 1.6 }}>
          뽑기 코인은 초콜릿 판매 시 확률로(약 8%), 업적 달성 시(개당 2개), 카지노 잭팟 시(1개) 얻을 수 있어요.
          급하면 돈으로도 교환할 수 있어요.
        </div>
        <Btn small variant="ghost" disabled={g.money < GACHA_COIN_EXCHANGE_RATE} onClick={buyGachaCoin}>
          {fmt(GACHA_COIN_EXCHANGE_RATE)}$ → 🎟️1개
        </Btn>
      </Panel>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: 14 }}>
        <GachaMachineCard
          title="직원 뽑기"
          emoji="👤"
          desc="희귀도가 높을수록 시작 레벨이 높고, 능력치 보너스 배율이 붙는 직원을 얻어요."
          cost={GACHA_COST.staff}
          coins={g.gachaCoins}
          lines={generalLines}
          onPull={() => pullGacha('staff')}
        />
        <GachaMachineCard
          title="레시피 조각 뽑기"
          emoji="🧩"
          desc="업그레이드 트리로는 얻을 수 없는 히든 초콜릿의 조각을 얻어요. 조각을 다 모으면 인벤토리에서 조합할 수 있어요."
          cost={GACHA_COST.fragment}
          coins={g.gachaCoins}
          lines={fragmentLines}
          onPull={() => pullGacha('fragment')}
        />
        <GachaMachineCard
          title="버프 아이템 뽑기"
          emoji="⚡"
          desc="등급마다 정해진 한정 버프 아이템을 얻어요. 인벤토리에서 원할 때 사용할 수 있어요."
          cost={GACHA_COST.buff}
          coins={g.gachaCoins}
          lines={generalLines}
          onPull={() => pullGacha('buff')}
        />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  인벤토리 탭                                                        */
/* ---------------------------------------------------------------- */
function InventoryTab({ g, useBuffItem, assembleRecipe }) {
  const fragments = g.inventory?.fragments || {};
  const buffs = g.inventory?.buffs || {};
  const hasAnyBuff = BUFF_ITEM_LIST.some((b) => (buffs[b.id] || 0) > 0);

  return (
    <div>
      <SectionTitle eyebrow="Inventory" title="인벤토리" />

      <div style={{ fontSize: 11, letterSpacing: 1.5, color: C.creamDim, marginBottom: 10, textTransform: 'uppercase' }}>레시피 조각</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px,1fr))', gap: 10, marginBottom: 26 }}>
        {HIDDEN_RECIPES.map((r) => {
          const have = fragments[r.id] || 0;
          const unlocked = g.unlockedRecipes.includes(r.id);
          const ready = have >= r.needFragments;
          const discovered = have > 0 || unlocked; // 조각을 하나라도 얻기 전까진 정체를 가린다
          return (
            <Panel key={r.id} className="ftc-fade-in" style={{ padding: 14, opacity: unlocked ? 0.7 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>{discovered ? r.emoji : '❓'}</span>
                <div>
                  <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: C.cream, fontSize: 14 }}>{discovered ? r.name : '미확인 레시피'}</div>
                  <div style={{ fontSize: 10.5, color: C.berry, fontWeight: 600 }}>레시피 등급</div>
                </div>
              </div>
              {unlocked ? (
                <div style={{ fontSize: 11.5, color: C.pistachio, fontWeight: 600 }}>✓ 조합 완료 — 상점에서 생산 가능</div>
              ) : (
                <>
                  <ProgressBar pct={(have / r.needFragments) * 100} color={C.berry} />
                  <div style={{ fontSize: 11, color: C.creamDim, margin: '6px 0 10px' }}>조각 {fmt(have)} / {fmt(r.needFragments)}{!discovered && ' · 조각을 얻으면 정체가 드러나요'}</div>
                  <Btn small variant={ready ? 'gold' : 'ghost'} disabled={!ready} onClick={() => assembleRecipe(r.id)} style={{ width: '100%', justifyContent: 'center' }}>
                    {ready ? '조합하기' : '조각 부족'}
                  </Btn>
                </>
              )}
            </Panel>
          );
        })}
      </div>

      <div style={{ fontSize: 11, letterSpacing: 1.5, color: C.creamDim, marginBottom: 10, textTransform: 'uppercase' }}>버프 아이템</div>
      {!hasAnyBuff && <div style={{ color: C.creamDim, fontSize: 13, marginBottom: 10 }}>보유한 버프 아이템이 없어요. 뽑기 탭에서 얻어보세요.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px,1fr))', gap: 10, marginBottom: 10 }}>
        {BUFF_ITEM_LIST.filter((b) => (buffs[b.id] || 0) > 0).map((b) => {
          const rarityKey = Object.keys(BUFF_BY_RARITY).find((k) => BUFF_BY_RARITY[k].id === b.id);
          return (
            <Panel key={b.id} className="ftc-fade-in" style={{ padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>{b.emoji}</span>
                <div>
                  <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: C.cream, fontSize: 14 }}>{b.name}</div>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: RARITY_INFO[rarityKey].color, border: `1px solid ${RARITY_INFO[rarityKey].color}`, borderRadius: 6, padding: '1px 5px' }}>
                    {RARITY_INFO[rarityKey].label}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: 11, color: C.creamDim, marginBottom: 10, lineHeight: 1.5 }}>{b.desc}</div>
              <Btn small variant="primary" onClick={() => useBuffItem(b.id)} style={{ width: '100%', justifyContent: 'center' }}>
                사용하기 (보유 {buffs[b.id]}개)
              </Btn>
            </Panel>
          );
        })}
      </div>

      {g.activeBuffs && g.activeBuffs.length > 0 && (
        <>
          <div style={{ fontSize: 11, letterSpacing: 1.5, color: C.creamDim, margin: '20px 0 10px', textTransform: 'uppercase' }}>적용중인 버프</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {g.activeBuffs.map((b) => (
              <div key={b.id} style={{ fontSize: 11.5, color: C.gold, background: C.bgPanelLight, border: `1px solid ${C.gold}`, borderRadius: 8, padding: '5px 10px' }}>
                ⏳ {b.label} · {Math.max(0, b.expiresAtTick - g.tick)}초 남음
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  대출 & 카지노 탭                                                   */
/* ---------------------------------------------------------------- */
function FinanceTab({ g, takeLoan, repayLoan, resolveCasino, jackpotRate, cfg }) {
  const [customBet, setCustomBet] = useState('');
  const maxDebt = cfg('maxDebt', MAX_DEBT);
  const loanInterestRate = cfg('loanInterestRate', LOAN_INTEREST_RATE);
  const casinoEnabled = cfg('casinoEnabled', true);
  const casinoMaxBet = cfg('casinoMaxBet', 50000);
  const partialPayoutMult = cfg('slotPartialPayoutMult', 0.5);

  // ---- 슬롯머신 스핀 연출 상태 (실제 자금 반영은 resolveCasino에게 위임) ----
  const [spinning, setSpinning] = useState(false);
  const [displayReels, setDisplayReels] = useState(g.casinoLast?.reels || ['❔', '❔', '❔']);
  const [stoppedMask, setStoppedMask] = useState([true, true, true]);
  const [landKey, setLandKey] = useState([0, 0, 0]);
  const [celebrating, setCelebrating] = useState(false);
  const [confetti, setConfetti] = useState([]);
  const stoppedRef = useRef([true, true, true]);
  const timersRef = useRef([]);

  useEffect(() => () => {
    timersRef.current.forEach((t) => (t.interval ? clearInterval(t.id) : clearTimeout(t.id)));
  }, []);

  // 관리자가 설정한 잭팟 확률(%)에 맞춰 릴 가중치를 동적으로 계산한다.
  // (SLOT_WEIGHTS 기본 비율을 유지한 채, 트리플 매치 확률의 합이 jackpotRate/100이 되도록 스케일링)
  const getSlotWeights = useCallback((rate) => {
    const currentTripleProb = SLOT_WEIGHTS.reduce((sum, w) => sum + Math.pow(w / 100, 3), 0);
    const targetRate = rate / 100;
    const scale = Math.pow(targetRate / currentTripleProb, 1 / 3);
    return SLOT_WEIGHTS.map((w) => Math.max(1, Math.round(w * scale)));
  }, []);
  const slotWeights = getSlotWeights(jackpotRate ?? 3);

  const spinOnce = () => {
    const r = Math.random() * 100;
    let acc = 0;
    for (let i = 0; i < SLOT_SYMBOLS.length; i++) {
      acc += slotWeights[i];
      if (r <= acc) return SLOT_SYMBOLS[i];
    }
    return SLOT_SYMBOLS[SLOT_SYMBOLS.length - 1];
  };

  const makeConfetti = () => {
    const colors = [C.gold, C.caramelLight, C.berry, C.pistachio, C.cream];
    return Array.from({ length: 26 }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 110;
      return {
        id: `${Date.now()}-${i}`,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist - 20,
        rot: `${Math.round(Math.random() * 720 - 360)}deg`,
        color: colors[i % colors.length],
        size: 5 + Math.random() * 5,
        delay: Math.random() * 0.12,
      };
    });
  };

  const runSpin = (bet) => {
    if (spinning || g.money < bet || !casinoEnabled || bet > casinoMaxBet) return;
    timersRef.current.forEach((t) => (t.interval ? clearInterval(t.id) : clearTimeout(t.id)));
    timersRef.current = [];

    const reels = [spinOnce(), spinOnce(), spinOnce()];
    let payout = 0;
    let outcome = 'lose';
    if (reels[0] === reels[1] && reels[1] === reels[2]) {
      payout = Math.round(bet * SLOT_PAYOUTS[reels[0]]);
      outcome = 'jackpot';
    } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
      payout = Math.round(bet * partialPayoutMult);
      outcome = 'partial';
    }

    setSpinning(true);
    setCelebrating(false);
    setConfetti([]);
    stoppedRef.current = [false, false, false];
    setStoppedMask([false, false, false]);

    // 왼쪽부터 순서대로 릴을 멈추는 연출 (실제 결과값으로 착지) — 스핀 중엔 CSS로 심볼 띠가 연속 스크롤된다
    [550, 900, 1250].forEach((delay, i) => {
      const tid = setTimeout(() => {
        stoppedRef.current[i] = true;
        setDisplayReels((prev) => {
          const next = [...prev];
          next[i] = reels[i];
          return next;
        });
        setStoppedMask((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
        setLandKey((prev) => {
          const next = [...prev];
          next[i] += 1;
          return next;
        });
        if (i === 2) {
          setSpinning(false);
          resolveCasino({ bet, reels, payout, outcome });
          if (outcome === 'jackpot') {
            setCelebrating(true);
            setConfetti(makeConfetti());
            const cleanupId = setTimeout(() => {
              setCelebrating(false);
              setConfetti([]);
            }, 1900);
            timersRef.current.push({ id: cleanupId, interval: false });
          }
        }
      }, delay);
      timersRef.current.push({ id: tid, interval: false });
    });
  };

  const confirmBet = () => {
    const n = Math.floor(Number(customBet));
    if (!n || n <= 0 || n > g.money || n > casinoMaxBet) return;
    runSpin(n);
    setCustomBet('');
  };

  return (
    <div>
      <SectionTitle
        eyebrow="Bank"
        title="대출"
        right={<span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: g.debt > 0 ? C.berry : C.creamDim }}>대출 잔액 {fmt(g.debt)}$ / 한도 {fmt(maxDebt)}$</span>}
      />
      <Panel style={{ padding: 16, marginBottom: 30 }}>
        <div style={{ fontSize: 12, color: C.creamDim, lineHeight: 1.6, marginBottom: 14 }}>
          대출 잔액에는 매초 {(loanInterestRate * 100).toFixed(2)}%씩 복리 이자가 붙어요. 오래 방치할수록 눈덩이처럼 커지니 여유 자금이 생기면 바로 갚는 게 좋아요.
        </div>
        <div style={{ fontSize: 11, letterSpacing: 1.5, color: C.creamDim, marginBottom: 8, textTransform: 'uppercase' }}>대출 받기</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {LOAN_OPTIONS.map((amt) => (
            <Btn key={amt} variant="ghost" disabled={g.debt + amt > maxDebt} onClick={() => takeLoan(amt)}>
              <Coins size={14} /> {fmt(amt)}$ 대출
            </Btn>
          ))}
        </div>
        <div style={{ fontSize: 11, letterSpacing: 1.5, color: C.creamDim, marginBottom: 8, textTransform: 'uppercase' }}>상환하기</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn variant="primary" disabled={g.debt === 0 || g.money === 0} onClick={() => repayLoan(Math.min(g.money, g.debt))}>
            전액 상환
          </Btn>
          <Btn variant="ghost" disabled={g.debt === 0 || g.money === 0} onClick={() => repayLoan(Math.min(g.money, Math.ceil(g.debt / 2)))}>
            절반 상환
          </Btn>
        </div>
      </Panel>

      <SectionTitle eyebrow="Lucky Belt" title="카지노" />
      {!casinoEnabled ? (
        <Panel style={{ padding: 20, textAlign: 'center', color: C.creamDim, fontSize: 13 }}>
          🔧 카지노가 현재 관리자에 의해 비활성화되어 있어요.
        </Panel>
      ) : (
      <Panel style={{ padding: 20 }}>
        <div
          style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            gap: 14,
            marginBottom: 18,
            paddingTop: celebrating ? 26 : 0,
          }}
        >
          {celebrating && (
            <div
              style={{
                position: 'absolute', left: '50%', top: 4, whiteSpace: 'nowrap',
                fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 22, color: C.gold,
                textShadow: '0 0 14px rgba(234,193,58,0.8)', animation: 'jackpotPop .5s ease-out forwards', zIndex: 3,
              }}
            >
              🎉 JACKPOT! 🎉
            </div>
          )}
          {confetti.map((p) => (
            <div
              key={p.id}
              style={{
                position: 'absolute', left: '50%', top: '55%', width: p.size, height: p.size * 1.6,
                background: p.color, borderRadius: 2, pointerEvents: 'none', zIndex: 2,
                animation: `confettiBurst .9s ease-out ${p.delay}s forwards`,
                '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--rot': p.rot,
              }}
            />
          ))}
          {displayReels.map((s, i) => (
            <div
              key={i}
              style={{
                width: 64, height: 64, borderRadius: 12, background: C.bgPanelLighter,
                border: `1px solid ${celebrating ? C.gold : C.line}`, position: 'relative', overflow: 'hidden',
                animation: celebrating ? 'jackpotGlow 0.7s ease-in-out infinite' : undefined,
              }}
            >
              {!stoppedMask[i] ? (
                <div style={{ display: 'flex', flexDirection: 'column', animation: 'slotScrollStrip .45s linear infinite' }}>
                  {SPIN_STRIP.map((sym, idx) => (
                    <div key={idx} style={{ width: 64, height: 64, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                      {sym}
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  key={landKey[i]}
                  style={{
                    width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
                    animation: landKey[i] > 0 ? 'slotLand .4s ease' : undefined,
                  }}
                >
                  {s}
                </div>
              )}
            </div>
          ))}
        </div>
        {spinning && (
          <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 13, fontWeight: 700, color: C.creamDim }}>
            🎰 스핀 중...
          </div>
        )}
        {!spinning && g.casinoLast && (
          <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 13, fontWeight: 700, color: g.casinoLast.outcome === 'lose' ? C.berry : C.pistachio }}>
            {g.casinoLast.outcome === 'jackpot' && `🎉 트리플 매치! +${fmt(g.casinoLast.payout)}$`}
            {g.casinoLast.outcome === 'partial' && `페어! 베팅 절반(${fmt(g.casinoLast.payout)}$) 회수`}
            {g.casinoLast.outcome === 'lose' && `꽝... -${fmt(g.casinoLast.bet)}$`}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          {CASINO_BETS.filter((bet) => bet <= casinoMaxBet).map((bet) => (
            <Btn key={bet} variant="gold" disabled={g.money < bet || spinning} onClick={() => runSpin(bet)}>
              {fmt(bet)}$ 베팅
            </Btn>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 18 }}>
          <input
            type="number"
            min="1"
            max={casinoMaxBet}
            placeholder={`직접 베팅액 입력 (최대 ${fmt(casinoMaxBet)}$)`}
            value={customBet}
            onChange={(e) => setCustomBet(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && confirmBet()}
            disabled={spinning}
            style={{ width: 160, background: C.bgPanelLighter, color: C.cream, border: `1px solid ${C.line}`, borderRadius: 8, padding: '8px 10px', fontSize: 12.5 }}
          />
          <Btn variant="primary" disabled={spinning || !customBet || Number(customBet) <= 0 || Number(customBet) > g.money || Number(customBet) > casinoMaxBet} onClick={confirmBet}>
            직접 베팅
          </Btn>
        </div>
        <div style={{ fontSize: 11, color: C.creamDim, lineHeight: 1.8 }}>
          <div style={{ marginBottom: 4, fontWeight: 700, color: C.creamDim }}>배당표 (세 심볼 일치 시 베팅액의 N배)</div>
          <div>
            {SLOT_SYMBOLS.map((s) => (
              <span key={s} style={{ marginRight: 12, display: 'inline-block', marginBottom: 4 }}>{s} × {SLOT_PAYOUTS[s]}</span>
            ))}
          </div>
          <div style={{ marginTop: 6 }}>두 심볼만 일치하면 베팅액의 {Math.round(partialPayoutMult * 100)}%를 돌려받고, 아무것도 안 맞으면 베팅액 전액을 잃어요. (최대 베팅액 {fmt(casinoMaxBet)}$)</div>
        </div>
      </Panel>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  대시보드 탭                                                       */
/* ---------------------------------------------------------------- */
function DashboardTab({ g, resetGame, doPrestige }) {
  const whTotal = Object.values(g.warehouse).reduce((a, b) => a + b, 0);
  const prestigeCount = g.prestigeCount || 0;
  const maxedPrestige = prestigeCount >= MAX_PRESTIGE;
  const nextRequirement = prestigeRequirement(prestigeCount);
  const canPrestige = !maxedPrestige && g.money >= nextRequirement;
  return (
    <div>
      <SectionTitle
        eyebrow="Overview"
        title="대시보드"
        right={
          <Btn
            small
            variant="danger"
            onClick={() => {
              if (window.confirm('정말로 게임을 초기화할까요? 저장된 진행 상황이 모두 사라져요.')) resetGame();
            }}
          >
            게임 초기화
          </Btn>
        }
      />

      {/* 환생 패널 */}
      <Panel style={{ padding: 16, marginBottom: 22, borderColor: C.gold }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: C.cream, fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              🌟 환생 {prestigeCount} / {MAX_PRESTIGE}
            </div>
            <div style={{ fontSize: 11.5, color: C.creamDim, marginTop: 4, lineHeight: 1.5 }}>
              공장을 처음부터 다시 시작하는 대신, 모든 판매가에 영구 배율이 붙어요. 뽑기 코인·인벤토리·히든 레시피·업적은 그대로 유지돼요.
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color: C.gold }}>×{prestigeMultOf(prestigeCount).toFixed(2)}</div>
            <div style={{ fontSize: 10, color: C.creamDim }}>현재 판매가 배율</div>
          </div>
        </div>
        {maxedPrestige ? (
          <div style={{ fontSize: 12.5, color: C.gold, fontWeight: 600, textAlign: 'center', padding: '8px 0' }}>🏆 최대 환생 달성! 최종 배율 ×{prestigeMultOf(MAX_PRESTIGE).toFixed(2)}</div>
        ) : (
          <>
            <ProgressBar pct={Math.min(100, (g.money / nextRequirement) * 100)} color={C.gold} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 11, color: C.creamDim }}>
                다음 환생까지 자산 {fmt(g.money)} / {fmt(nextRequirement)}$
              </div>
              <Btn
                small
                variant={canPrestige ? 'gold' : 'ghost'}
                disabled={!canPrestige}
                onClick={() => {
                  if (window.confirm(`환생하면 자산·자원·라인·직원·업그레이드가 모두 초기화돼요. 대신 판매가가 영구히 +${Math.round(PRESTIGE_MULT_PER_LEVEL * 100)}% 늘어나요. 진행할까요?`)) doPrestige();
                }}
              >
                환생하기
              </Btn>
            </div>
          </>
        )}

        {/* 환생 전용 레시피 — 해당 환생 횟수를 채워야만 영구 해금된다 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
          {PRESTIGE_RECIPES.map((r) => {
            const unlocked = prestigeCount >= r.requiresPrestige;
            return (
              <div
                key={r.id}
                style={{
                  fontSize: 11, padding: '5px 10px', borderRadius: 8,
                  border: `1px solid ${unlocked ? C.gold : C.line}`,
                  color: unlocked ? C.gold : C.creamDim,
                  background: unlocked ? 'rgba(234,193,58,0.08)' : 'transparent',
                }}
              >
                {unlocked ? `${r.emoji} ${r.name} 해금됨` : `🔒 환생 ${r.requiresPrestige}회 필요 (${r.emoji} ${r.name})`}
              </div>
            );
          })}
        </div>
      </Panel>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 12, marginBottom: 22 }}>
        {[
          ['💰', '총 자산', `${fmt(g.money)}$`],
          ['📈', '누적 매출', `${fmt(g.totalRevenue)}$`],
          ['📦', '누적 생산량', `${fmt(g.totalProduced)}개`],
          ['👥', '직원 수', `${g.staff.length}명`],
          ['🏭', '생산 라인', `${g.lines.length}개`],
          ['🗃', '창고 재고', `${fmt(whTotal)}개`],
          ['🏦', '대출 잔액', `${fmt(g.debt)}$`],
        ].map(([icon, label, value]) => (
          <Panel key={label} style={{ padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 20 }}>{icon}</div>
            <div style={{ fontSize: 11, color: C.creamDim, margin: '6px 0 2px' }}>{label}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: C.gold, fontSize: 16 }}>{value}</div>
          </Panel>
        ))}
      </div>

      <Panel style={{ padding: 16, marginBottom: 22 }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: C.cream, fontSize: 15, marginBottom: 10 }}>자산 추이</div>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={g.history}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.line} />
              <XAxis dataKey="t" tick={{ fill: C.creamDim, fontSize: 10 }} axisLine={{ stroke: C.line }} tickLine={false} />
              <YAxis tick={{ fill: C.creamDim, fontSize: 10 }} axisLine={{ stroke: C.line }} tickLine={false} width={54} />
              <Tooltip contentStyle={{ background: C.bgPanelLighter, border: `1px solid ${C.line}`, borderRadius: 8, color: C.cream }} labelStyle={{ color: C.creamDim }} />
              <Line type="monotone" dataKey="money" stroke={C.gold} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Award size={20} color={C.gold} />
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: C.cream, fontSize: 15 }}>업적</div>
            <div style={{ fontSize: 11.5, color: C.creamDim }}>{g.achievements.length} / {ACHIEVEMENTS.length}개 달성</div>
          </div>
        </div>
        <span style={{ fontSize: 11.5, color: C.caramelLight }}>자세한 목록은 "도전과제" 탭에서 확인하세요 →</span>
      </Panel>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  도전과제 탭                                                       */
/* ---------------------------------------------------------------- */
function AchievementsTab({ g }) {
  const doneCount = g.achievements.length;
  return (
    <div>
      <SectionTitle
        eyebrow="Milestones"
        title="도전과제"
        right={<span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: C.gold }}>{doneCount} / {ACHIEVEMENTS.length} 달성</span>}
      />
      <Panel style={{ padding: 16, marginBottom: 18 }}>
        <ProgressBar pct={(doneCount / ACHIEVEMENTS.length) * 100} color={C.gold} height={10} />
      </Panel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: 10 }}>
        {ACHIEVEMENTS.map((a) => {
          const done = g.achievements.includes(a.id);
          return (
            <Panel key={a.id} className="ftc-fade-in" style={{ padding: 14, display: 'flex', alignItems: 'flex-start', gap: 10, opacity: done ? 1 : 0.6, borderColor: done ? C.gold : C.line }}>
              <Award size={18} color={done ? C.gold : C.creamDim} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: done ? C.cream : C.creamDim }}>{a.name}</div>
                {a.desc && <div style={{ fontSize: 11, color: C.creamDim, marginTop: 3, lineHeight: 1.4 }}>{a.desc}</div>}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  랭킹(리더보드) 탭                                                  */
/*  - Supabase RPC get_leaderboard()로 전체 플레이어의 최신 저장 데이터   */
/*    중 자산(money) 상위 N명을 집계해서 보여준다.                       */
/*  - security definer 함수라 players/game_saves 테이블에 RLS가 걸려    */
/*    있어도 username과 자산만 안전하게 노출된다(비밀번호 등은 없음).      */
/* ---------------------------------------------------------------- */
const MEDAL = ['🥇', '🥈', '🥉'];

function LeaderboardTab({ currentUsername, currentMoney }) {
  const [rows, setRows] = useState(null); // null = 로딩 전, [] = 로딩됨(결과 없음)
  const [status, setStatus] = useState('idle'); // idle | loading | error
  const [errMsg, setErrMsg] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    setErrMsg('');
    try {
      const data = await supabaseRpc('get_leaderboard', { p_limit: 20 });
      setRows(Array.isArray(data) ? data : []);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setErrMsg(err.message || '랭킹을 $러오지 못했어요');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const myRank = rows ? rows.findIndex((r) => r.username === currentUsername) : -1;

  return (
    <div>
      <SectionTitle
        eyebrow="Hall of Fame"
        title="랭킹"
        right={
          <Btn small variant="ghost" onClick={load} disabled={status === 'loading'}>
            {status === 'loading' ? '$러오는 중...' : '새로고침'}
          </Btn>
        }
      />

      <Panel style={{ padding: 16, marginBottom: 18 }}>
        <div style={{ fontSize: 12, color: C.creamDim, lineHeight: 1.6 }}>
          전체 공장주 중 자산(money) 기준 상위 20명이에요. 자동 저장될 때마다 순위가 갱신돼요.
        </div>
      </Panel>

      {status === 'error' && (
        <Panel style={{ padding: 16, marginBottom: 18, border: `1px solid ${C.berry}` }}>
          <div style={{ color: C.berry, fontSize: 13, fontWeight: 600 }}>⚠ {errMsg}</div>
        </Panel>
      )}

      {rows === null && status !== 'error' && (
        <Panel style={{ padding: 24, textAlign: 'center', color: C.creamDim, fontSize: 13 }}>
          랭킹을 $러오는 중...
        </Panel>
      )}

      {rows !== null && rows.length === 0 && status !== 'error' && (
        <Panel style={{ padding: 24, textAlign: 'center', color: C.creamDim, fontSize: 13 }}>
          아직 랭킹에 표시할 데이터가 없어요.
        </Panel>
      )}

      {rows !== null && rows.length > 0 && (
        <Panel style={{ padding: 0, overflow: 'hidden', marginBottom: 18 }}>
          {rows.map((r, i) => {
            const isMe = r.username === currentUsername;
            return (
              <div
                key={`${r.username}-${i}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  borderBottom: i === rows.length - 1 ? 'none' : `1px solid ${C.line}`,
                  background: isMe ? C.bgPanelLighter : 'transparent',
                }}
              >
                <div style={{ width: 30, textAlign: 'center', fontSize: i < 3 ? 18 : 13, fontWeight: 700, color: i < 3 ? C.gold : C.creamDim, fontFamily: "'JetBrains Mono', monospace" }}>
                  {i < 3 ? MEDAL[i] : `#${i + 1}`}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: isMe ? C.gold : C.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.username}{isMe && ' (나)'}
                  </div>
                  <div style={{ fontSize: 10.5, color: C.creamDim }}>
                    누적 매출 {fmt(Number(r.total_revenue) || 0)}$ · 생산 {fmt(Number(r.total_produced) || 0)}개
                  </div>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: C.gold, fontSize: 14, whiteSpace: 'nowrap' }}>
                  {fmt(Number(r.money) || 0)}$
                </div>
              </div>
            );
          })}
        </Panel>
      )}

      {rows !== null && rows.length > 0 && myRank === -1 && (
        <div style={{ fontSize: 11.5, color: C.creamDim, textAlign: 'center' }}>
          현재 자산 {fmt(currentMoney)}$으로는 상위 20위 안에 들지 못했어요. 저장 후 다시 확인해보세요!
        </div>
      )}
    </div>
  );
}
/* ---------------------------------------------------------------- */
/*  관리자 패널                                                        */
/*  - 조회(플레이어 목록/상세/통계) · 조작(자금 지급/차감, 광고 on-off,    */
/*    초기화/차단, 전역 설정) · 내보내기(전체 데이터 백업) 기능은 그대로  */
/*    유지하되, 인증 방식만 안전하게 바꿨다:                            */
/*                                                                    */
/*    ❌ 이전 방식: 코드에 박힌 고정 비밀번호를 "브라우저에서만" 검사     */
/*       → 개발자도구로 그 검사 자체를 건너뛰고 관리자 RPC를 누구나 직접 */
/*         호출할 수 있었다 (진짜 취약점).                              */
/*    ✅ 지금 방식: 게임 계정(players 테이블)에 admin boolean 컬럼을      */
/*       추가하고, 관리자 로그인 화면에서 입력한 "게임 아이디+비밀번호"를 */
/*       모든 admin_* RPC 호출에 함께 실어 보낸다. 서버(Postgres) 쪽     */
/*       admin_* 함수들이 매 호출마다 그 아이디/비밀번호가 실제로        */
/*       일치하고 admin=true인지 "서버에서" 다시 검증하므로, apikey를    */
/*       알아도(=누구나 알 수 있어도) 진짜 관리자 계정 정보 없이는       */
/*       전부 거부된다. 이 검증 SQL은 아래 ADMIN_SECURITY_MIGRATION_SQL */
/*       상수에 들어있고, 관리자 패널의 "데이터베이스" 탭에서도 그대로   */
/*       보인다. 이 SQL을 Supabase에 적용하기 전까지는 여전히 안전하지   */
/*       않으니, 반드시 먼저 적용한 뒤에 배포하세요.                    */
/* ---------------------------------------------------------------- */

const ADMIN_SECURITY_MIGRATION_SQL = `-- ============================================================================
-- 관리자 패널 보안 마이그레이션 (게임 계정 admin 플래그 방식)
-- Supabase 대시보드 → SQL Editor 에서 이 파일 전체를 실행하세요.
--
-- 지금까지는 admin_get_players / admin_adjust_money / admin_export_all_data 같은
-- 함수들이 "누가 호출했는지"를 전혀 검사하지 않았어요. 그래서 클라이언트의 비밀번호
-- 입력창은 장식일 뿐, 브라우저 개발자도구로 이 함수들을 아무나 직접 호출할 수 있었어요.
--
-- 이 마이그레이션은:
--   1) players 테이블에 admin boolean 컬럼을 추가하고
--   2) "아이디+비밀번호가 맞고 admin=true인지"를 확인하는 admin_login / check_admin
--      함수를 만들고
--   3) 모든 admin_* 함수 맨 앞에서 check_admin을 호출해, 매 요청마다 서버에서
--      직접 재검증하게 만듭니다. 이제 진짜 관리자 계정의 아이디+비밀번호가 없으면,
--      apikey를 알아도 전부 거부됩니다.
-- ============================================================================

-- 1) 관리자 플래그 컬럼 추가
alter table public.players add column if not exists admin boolean not null default false;

-- 2) 관리자 로그인 확인용 함수 — 아이디+비밀번호가 일치하고 admin=true인 계정만 통과
create or replace function admin_login(p_username text, p_password text)
returns json language plpgsql security definer as $$
declare
  rec record;
begin
  select id, username, admin into rec from players
   where username = p_username and password = p_password;

  if rec.id is null or rec.admin is not true then
    raise exception 'not authorized';
  end if;

  return json_build_object('id', rec.id, 'username', rec.username);
end; $$;

-- 3) 공통 인가 체크 헬퍼 — 모든 admin_* 함수가 맨 앞에서 이걸 호출한다.
--    p_admin_id/p_admin_password가 실제 admin=true 계정과 일치하지 않으면 예외를 던진다.
create or replace function public.check_admin(p_admin_id uuid, p_admin_password text)
returns void language plpgsql security definer as $$
begin
  if not exists (
    select 1 from players
     where id = p_admin_id and password = p_admin_password and admin = true
  ) then
    raise exception 'not authorized';
  end if;
end; $$;

-- 4) 본인 계정을 관리자로 등록 (딱 한 번, 실제 게임 아이디로 바꿔서 실행)
-- update public.players set admin = true where username = '여기에-본인-게임-아이디';

-- ============================================================================
-- 5) 기존 admin_* 함수들에 인가 체크 추가
--    (아래는 원본 함수 예시를 기반으로 다시 작성한 버전입니다. 실제 프로젝트의 함수
--     정의와 컬럼명이 다르면 맞춰서 조정하세요. 핵심은 모든 admin_* 함수가
--     p_admin_id/p_admin_password를 추가로 받아서, 맨 앞에서 perform check_admin(...)을
--     호출한다는 점입니다. 클라이언트는 이 두 값을 모든 admin_* 호출에 자동으로
--     함께 실어 보냅니다.)
-- ============================================================================

create or replace function admin_get_players(p_admin_id uuid, p_admin_password text, p_limit int default 100)
returns table (
  id uuid,
  username text,
  money numeric,
  total_revenue numeric,
  total_produced numeric,
  last_saved timestamptz,
  created_at timestamptz
) language plpgsql security definer as $$
begin
  perform public.check_admin(p_admin_id, p_admin_password);

  return query
  select p.id, p.username,
         (gs.data->>'money')::numeric,
         (gs.data->>'totalRevenue')::numeric,
         (gs.data->>'totalProduced')::numeric,
         gs.updated_at,
         p.created_at
  from players p
  left join game_saves gs on gs.player_id = p.id
  order by (gs.data->>'money')::numeric desc nulls last
  limit p_limit;
end; $$;

create or replace function admin_get_stats(p_admin_id uuid, p_admin_password text)
returns json language plpgsql security definer as $$
declare
  result json;
begin
  perform public.check_admin(p_admin_id, p_admin_password);

  select json_build_object(
    'total_players', (select count(*) from players),
    'total_saves', (select count(*) from game_saves),
    'oldest_player', (select min(created_at) from players),
    'newest_player', (select max(created_at) from players)
  ) into result;
  return result;
end; $$;

-- 주의: players 테이블을 통째로(to_jsonb(p)) 내보내면 비밀번호 컬럼까지 함께 노출됩니다.
-- 아래처럼 필요한 컬럼만 명시적으로 골라서 내보내는 걸 강하게 권장해요.
create or replace function admin_get_player_detail(p_admin_id uuid, p_admin_password text, p_player_id uuid)
returns json language plpgsql security definer as $$
declare
  result json;
begin
  perform public.check_admin(p_admin_id, p_admin_password);

  select json_build_object(
    'player', json_build_object(
      'id', p.id,
      'username', p.username,
      'created_at', p.created_at,
      'banned', p.banned
      -- password 컬럼은 절대 포함하지 마세요
    ),
    'save_data', gs.data,
    'save_updated', gs.updated_at
  ) into result
  from players p
  left join game_saves gs on gs.player_id = p.id
  where p.id = p_player_id;
  return result;
end; $$;

create or replace function admin_player_action(p_admin_id uuid, p_admin_password text, p_player_id uuid, p_action text)
returns void language plpgsql security definer as $$
begin
  perform public.check_admin(p_admin_id, p_admin_password);

  if p_action = 'reset' then
    update game_saves set data = '{}'::jsonb, updated_at = now() where player_id = p_player_id;
  elsif p_action = 'ban' then
    update players set banned = true where id = p_player_id;
    delete from game_saves where player_id = p_player_id;
  end if;
end; $$;

-- 여기도 마찬가지로 players 전체 컬럼을 통째로 내보내지 않도록 password 컬럼은 제외했어요.
create or replace function admin_export_all_data(p_admin_id uuid, p_admin_password text)
returns json language plpgsql security definer as $$
declare
  result json;
begin
  perform public.check_admin(p_admin_id, p_admin_password);

  select json_build_object(
    'exported_at', now(),
    'players', (
      select json_agg(json_build_object(
        'id', p.id, 'username', p.username, 'created_at', p.created_at, 'banned', p.banned
      )) from players p
    ),
    'saves', (select json_agg(to_jsonb(gs)) from game_saves gs)
  ) into result;
  return result;
end; $$;

-- admin_adjust_money(p_admin_id, p_admin_password, p_player_id, p_amount)
-- admin_toggle_ads(p_admin_id, p_admin_password, p_player_id, p_enabled)
-- admin_set_jackpot_rate(p_admin_id, p_admin_password, p_rate)
-- admin_set_config(p_admin_id, p_admin_password, p_key, p_value)
-- 위 함수들도 실제 프로젝트에 정의돼 있다면, 파라미터 맨 앞에 p_admin_id uuid, p_admin_password text를
-- 추가하고 본문 맨 첫 줄에 아래 한 줄을 그대로 추가하세요:
--
--   perform public.check_admin(p_admin_id, p_admin_password);
`;

function AdminPage({ onClose }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [admin, setAdmin] = useState(null); // { id, username } — 로그인 성공한 관리자 본인 정보
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerDetail, setPlayerDetail] = useState(null);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('players');
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const pushToast = useCallback((msg, tone = 'gold') => {
    setToast({ msg, tone, key: Date.now() });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  // 관리자 RPC 호출: 모든 admin_* 함수 호출에 "로그인한 관리자 본인"의 아이디+비밀번호를
  // p_admin_id / p_admin_password로 함께 실어 보낸다. 서버의 각 admin_* 함수는 이 값이
  // players 테이블의 admin=true 계정과 정확히 일치하는지 매 호출마다 다시 검증하므로,
  // apikey를 알아도(=누구나 알 수 있어도) 진짜 관리자 계정 정보 없이는 전부 거부된다.
  const supabaseAdminRpc = useCallback(async (fn, body) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ p_admin_id: admin?.id, p_admin_password: password, ...body }),
    });
    let json = null;
    try { json = await res.json(); } catch (e) { /* 본문 없음(void 함수) */ }
    if (!res.ok) {
      const msg = (json && (json.message || json.error_description || json.hint || json.code)) || `HTTP ${res.status}: 요청이 실패했어요`;
      throw new Error(msg);
    }
    return json;
  }, [admin, password]);

  const adjustMoney = async (playerId, amount) => {
    if (!window.confirm(`${amount > 0 ? '지급' : '차감'}하시겠어요? ${Math.abs(amount).toLocaleString('ko-KR')}$`)) return;
    try {
      await supabaseAdminRpc('admin_adjust_money', { p_player_id: playerId, p_amount: amount });
      loadPlayers();
      if (selectedPlayer?.id === playerId) loadPlayerDetail(playerId);
      pushToast(`${amount > 0 ? '지급' : '차감'} 완료: ${Math.abs(amount).toLocaleString('ko-KR')}$`, amount > 0 ? 'pistachio' : 'berry');
    } catch (err) {
      setError(err.message || '자금 조정 실패');
    }
  };

  const toggleAds = async (playerId, enabled) => {
    try {
      await supabaseAdminRpc('admin_toggle_ads', { p_player_id: playerId, p_enabled: enabled });
      if (selectedPlayer?.id === playerId) loadPlayerDetail(playerId);
      pushToast(enabled ? '광고 활성화됨' : '광고 비활성화됨', 'pistachio');
    } catch (err) {
      setError(err.message || '광고 설정 실패');
    }
  };

  const setJackpotRate = async (rate) => {
    try {
      await supabaseAdminRpc('admin_set_jackpot_rate', { p_rate: rate });
      pushToast(`잭팟 확률 ${rate}%로 설정됨`, 'gold');
    } catch (err) {
      setError(err.message || '확률 설정 실패');
    }
  };

  const setGlobalConfig = async (key, value) => {
    try {
      await supabaseAdminRpc('admin_set_config', { p_key: key, p_value: value });
      pushToast(`${key} 설정됨: ${value}`, 'gold');
    } catch (err) {
      setError(err.message || '설정 실패');
    }
  };

  // 게임 계정 아이디+비밀번호로 admin_login RPC를 호출한다. 서버가 players 테이블에서
  // 아이디/비밀번호가 일치하고 admin=true인지 확인한 뒤에만 성공한다 (클라이언트는 그 결과를
  // 신뢰할 뿐, 관리자 여부를 스스로 판단하지 않는다).
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginBusy(true);
    setError('');
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ p_username: username, p_password: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data && (data.message || data.hint)) || '로그인 실패 (관리자 계정이 아니거나 비밀번호가 틀렸어요)');
      setAdmin(data);
    } catch (err) {
      setError(err.message || '로그인 실패');
    } finally {
      setLoginBusy(false);
    }
  };

  useEffect(() => {
    if (admin) {
      loadPlayers();
      loadStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin]);

  const loadPlayers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await supabaseAdminRpc('admin_get_players', { p_limit: 100 });
      setPlayers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || '플레이어 목록을 $러오지 못했어요');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await supabaseAdminRpc('admin_get_stats', {});
      setStats(data);
    } catch (err) {
      console.error('Stats load failed:', err);
    }
  };

  const loadPlayerDetail = async (playerId) => {
    try {
      const data = await supabaseAdminRpc('admin_get_player_detail', { p_player_id: playerId });
      setPlayerDetail(data);
    } catch (err) {
      setError(err.message || '플레이어 상세 정보를 $러오지 못했어요');
    }
  };

  const handlePlayerAction = async (playerId, action) => {
    if (!window.confirm(`정말로 ${action === 'reset' ? '초기화' : '차단'}하시겠어요?`)) return;
    try {
      await supabaseAdminRpc('admin_player_action', { p_player_id: playerId, p_action: action });
      loadPlayers();
      if (selectedPlayer?.id === playerId) {
        setSelectedPlayer(null);
        setPlayerDetail(null);
      }
    } catch (err) {
      setError(err.message || '작업에 실패했어요');
    }
  };

  const exportData = async () => {
    try {
      const data = await supabaseAdminRpc('admin_export_all_data', {});
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chocolate-factory-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || '내보내기 실패');
    }
  };

  if (!admin) {
    return (
      <div style={{ minHeight: 640, background: `radial-gradient(circle at 30% 20%, #3B2716 0%, ${C.bgDeep} 60%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk', sans-serif", padding: 24 }}>
        <style>{FONT_IMPORT}</style>
        <Panel style={{ width: '100%', maxWidth: 380, padding: 28 }}>
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>🛡️</div>
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 22, color: C.cream }}>관리자 로그인</div>
            <div style={{ fontSize: 11, color: C.creamDim, letterSpacing: 1, marginTop: 2 }}>관리자 권한이 있는 게임 계정으로 로그인하세요</div>
          </div>
          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="게임 아이디"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: '100%', background: C.bgPanelLighter, color: C.cream, border: `1px solid ${C.line}`, borderRadius: 9, padding: '10px 12px', fontSize: 14, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 10, outline: 'none' }}
              autoComplete="username"
            />
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', background: C.bgPanelLighter, color: C.cream, border: `1px solid ${C.line}`, borderRadius: 9, padding: '10px 12px', fontSize: 14, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 12, outline: 'none' }}
              autoComplete="current-password"
            />
            {error && <div style={{ color: C.berry, fontSize: 12, margin: '6px 0 10px' }}>⚠ {error}</div>}
            <Btn variant="gold" disabled={!username || !password || loginBusy} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} type="submit">
              {loginBusy ? '로그인 중...' : '로그인'}
            </Btn>
          </form>
          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12.5, color: C.creamDim }}>
            <Btn variant="ghost" small onClick={onClose}><ChevronRight size={14} /> 게임으로 돌아가기</Btn>
          </div>
          <div style={{ marginTop: 18, fontSize: 10, color: C.creamDim, lineHeight: 1.6, borderTop: `1px solid ${C.line}`, paddingTop: 12 }}>
            여기 입력하는 아이디/비밀번호는 게임에 가입할 때 쓴 계정 그대로예요. 다만 players 테이블에서
            admin = true로 표시된 계정만 로그인이 통과돼요 (서버 SQL에서 직접 확인해요).
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div style={{ minHeight: 640, background: C.bgDeep, display: 'flex', justifyContent: 'center', gap: 16, padding: '20px 16px' }}>
      <style>{`
        ${FONT_IMPORT}
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { height: 6px; width: 6px; }
        ::-webkit-scrollbar-thumb { background: ${C.bgPanelLighter}; border-radius: 4px; }
      `}</style>

      <div style={{ width: '100%', maxWidth: 1600, minHeight: 640, background: C.bgDeep, fontFamily: "'Space Grotesk', sans-serif", position: 'relative', paddingBottom: 24 }}>
        {/* 헤더 */}
        <div style={{ padding: '18px 22px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: `linear-gradient(135deg, ${C.berry}, #E39A3A)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🛡️</div>
              <div>
                <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 19, color: C.cream, letterSpacing: 0.3 }}>관리자 패널</div>
                <div style={{ fontSize: 10.5, color: C.creamDim, letterSpacing: 0.6 }}>CHOCOLATE FACTORY TYCOON</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="ghost" small onClick={onClose}><ChevronRight size={14} /> 게임으로</Btn>
              <Btn variant="danger" small onClick={() => { setAdmin(null); setPassword(''); }}><Lock size={14} /> 로그아웃</Btn>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div style={{ padding: '16px 22px 0', display: 'flex', gap: 6, borderBottom: `1px solid ${C.line}`, overflowX: 'auto' }}>
          {[
            { id: 'players', label: '플레이어 관리', icon: Users },
            { id: 'player-controls', label: '플레이어 제어', icon: Wrench },
            { id: 'game-config', label: '게임 설정', icon: Gauge },
            { id: 'stats', label: '통계', icon: Activity },
            { id: 'database', label: '데이터베이스', icon: Database },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: 'none', border: 'none', borderBottom: active ? `2px solid ${C.berry}` : '2px solid transparent', color: active ? C.cream : C.creamDim, cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* 컨텐츠 */}
        <div style={{ padding: '20px 22px 0' }}>
          {activeTab === 'players' && (
            <PlayerManagementTab
              players={players}
              loading={loading}
              error={error}
              selectedPlayer={selectedPlayer}
              playerDetail={playerDetail}
              onSelectPlayer={setSelectedPlayer}
              onLoadDetail={loadPlayerDetail}
              onPlayerAction={handlePlayerAction}
              onRefresh={loadPlayers}
            />
          )}
          {activeTab === 'player-controls' && (
            <PlayerControlsTab
              players={players}
              selectedPlayer={selectedPlayer}
              playerDetail={playerDetail}
              onSelectPlayer={setSelectedPlayer}
              onLoadDetail={loadPlayerDetail}
              onAdjustMoney={adjustMoney}
              onToggleAds={toggleAds}
              onSetJackpotRate={setJackpotRate}
              onSetGlobalConfig={setGlobalConfig}
            />
          )}
          {activeTab === 'game-config' && (
            <GameConfigTab
              onSetJackpotRate={setJackpotRate}
              onSetGlobalConfig={setGlobalConfig}
            />
          )}
          {activeTab === 'stats' && (
            <StatsTab stats={stats} players={players} />
          )}
          {activeTab === 'database' && (
            <DatabaseTab onExport={exportData} loading={loading} supabaseAdminRpc={supabaseAdminRpc} />
          )}
        </div>

        {toast && (
          <div
            key={toast.key}
            style={{
              position: 'fixed', top: 18, left: '50%', transform: 'translateX(-50%)', animation: 'toastIn .25s ease',
              background: C.bgPanelLighter, border: `1px solid ${toast.tone === 'berry' ? C.berry : C.caramelLight}`, color: C.cream,
              padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            {toast.msg}
          </div>
        )}

        {selectedPlayer && playerDetail && (
          <PlayerDetailModal
            player={playerDetail}
            onClose={() => { setSelectedPlayer(null); setPlayerDetail(null); }}
            onAction={(action) => handlePlayerAction(selectedPlayer.id, action)}
            onAdjustMoney={adjustMoney}
            onToggleAds={toggleAds}
          />
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  플레이어 관리 탭                                                   */
/* ---------------------------------------------------------------- */
function PlayerManagementTab({ players, loading, error, selectedPlayer, playerDetail, onSelectPlayer, onLoadDetail, onPlayerAction, onRefresh }) {
  return (
    <div>
      <SectionTitle
        eyebrow="Player Management"
        title="플레이어 목록"
        right={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {loading && <span style={{ fontSize: 12, color: C.caramelLight }}>로딩 중...</span>}
            <Btn variant="ghost" small onClick={onRefresh} disabled={loading}><RotateCcw size={14} /> 새로고침</Btn>
          </div>
        }
      />

      {error && <Panel style={{ padding: 12, marginBottom: 16, border: `1px solid ${C.berry}`, background: '#3B1A1A' }}><div style={{ color: C.berry, fontSize: 13, fontWeight: 600 }}>⚠ {error}</div></Panel>}

      {players.length === 0 && !loading && (
        <Panel style={{ padding: 24, textAlign: 'center', color: C.creamDim, fontSize: 13 }}>등록된 플레이어가 없습니다.</Panel>
      )}

      {players.length > 0 && (
        <Panel style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 120px 100px 100px 100px 120px', gap: 12, padding: '12px 16px', fontSize: 11, fontWeight: 700, color: C.creamDim, background: C.bgPanelLight, borderBottom: `1px solid ${C.line}`, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            <div>#</div>
            <div>사용자명</div>
            <div>자산</div>
            <div>누적매출</div>
            <div>누적생산</div>
            <div>최근접속</div>
            <div>액션</div>
          </div>
          {players.map((p, i) => {
            const isSelected = selectedPlayer?.id === p.id;
            return (
              <div key={p.id} onClick={() => { onSelectPlayer(p); onLoadDetail(p.id); }} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 120px 100px 100px 100px 120px', gap: 12, padding: '10px 16px', alignItems: 'center', borderBottom: `1px solid ${C.line}`, background: isSelected ? C.bgPanelLighter : 'transparent', cursor: 'pointer', transition: 'background .1s' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.creamDim }}>{i + 1}</div>
                <div style={{ fontWeight: 600, color: C.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.username}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", color: C.gold, fontWeight: 700 }}>{fmt(Number(p.money) || 0)}$</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.creamDim }}>{fmt(Number(p.total_revenue) || 0)}$</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.creamDim }}>{fmt(Number(p.total_produced) || 0)}개</div>
                <div style={{ fontSize: 11, color: C.creamDim }}>{p.last_saved ? new Date(p.last_saved).toLocaleDateString('ko-KR') : '없음'}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Btn variant="ghost" small onClick={(e) => { e.stopPropagation(); onPlayerAction(p.id, 'reset'); }}><RotateCcw size={12} /> 초기화</Btn>
                  <Btn variant="danger" small onClick={(e) => { e.stopPropagation(); onPlayerAction(p.id, 'ban'); }}><Ban size={12} /> 차단</Btn>
                </div>
              </div>
            );
          })}
        </Panel>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  플레이어 제어 탭                                                   */
/* ---------------------------------------------------------------- */
function PlayerControlsTab({ players, selectedPlayer, playerDetail, onSelectPlayer, onLoadDetail, onAdjustMoney, onToggleAds, onSetJackpotRate, onSetGlobalConfig }) {
  const [moneyAmount, setMoneyAmount] = useState('');
  const [jackpotRate, setJackpotRateState] = useState(3);
  const [configKey, setConfigKey] = useState('productionSpeedMult');
  const [configValue, setConfigValue] = useState('1.0');

  return (
    <div>
      {selectedPlayer && playerDetail ? (
        <PlayerControlPanel
          player={playerDetail}
          moneyAmount={moneyAmount}
          setMoneyAmount={setMoneyAmount}
          onAdjustMoney={onAdjustMoney}
          onToggleAds={onToggleAds}
          onClose={() => onSelectPlayer(null)}
        />
      ) : (
        <div>
          <SectionTitle eyebrow="Player Controls" title="플레이어 선택" />
          <Panel style={{ padding: 24, textAlign: 'center', color: C.creamDim }}>
            <Users size={48} style={{ marginBottom: 12, color: C.caramelLight }} />
            <div style={{ fontSize: 14 }}>왼쪽 '플레이어 관리' 탭에서 플레이어를 클릭하거나</div>
            <div style={{ fontSize: 14, marginTop: 4 }}>아래 목록에서 선택하세요.</div>
          </Panel>
          <SectionTitle eyebrow="Quick Select" title="플레이어 빠른 선택" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 12 }}>
            {players.map((p, i) => {
              const isSelected = selectedPlayer?.id === p.id;
              const panelStyle = {
                padding: 16,
                cursor: 'pointer',
                border: isSelected ? `2px solid ${C.caramelLight}` : `1px solid ${C.line}`,
                background: isSelected ? C.bgPanelLighter : C.bgPanel,
                transition: 'all .15s',
              };
              return (
                <Panel key={p.id} style={panelStyle} onClick={() => { onSelectPlayer(p); onLoadDetail(p.id); }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, color: C.cream, fontSize: 15 }}>{p.username}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", color: C.gold, fontWeight: 700 }}>{fmt(Number(p.money) || 0)}$</div>
                  </div>
                  <div style={{ fontSize: 11, color: C.creamDim, display: 'flex', gap: 16 }}>
                    <span>매출: {fmt(Number(p.total_revenue) || 0)}$</span>
                    <span>생산: {fmt(Number(p.total_produced) || 0)}개</span>
                  </div>
                </Panel>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ marginTop: 30 }}>
        <SectionTitle eyebrow="Global Settings" title="전역 게임 설정" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 16 }}>
          <Panel style={{ padding: 16 }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: C.cream, fontSize: 15, marginBottom: 12 }}>🎰 카지노 잭팟 확률</div>
            <div style={{ fontSize: 11, color: C.creamDim, marginBottom: 10 }}>현재 기본값: 3% (트리플 매치)</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                value={jackpotRate}
                onChange={(e) => setJackpotRateState(Number(e.target.value))}
                style={{ flex: 1, background: C.bgPanelLighter, color: C.cream, border: `1px solid ${C.line}`, borderRadius: 8, padding: '8px 10px', fontSize: 13 }}
              />
              <Btn variant="gold" onClick={() => onSetJackpotRate(jackpotRate)} style={{ justifyContent: 'center' }}>
                적용
              </Btn>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[0.5, 1, 2, 3, 5, 10, 25, 50].map((r) => (
                <Btn key={r} variant="ghost" small onClick={() => { setJackpotRateState(r); onSetJackpotRate(r); }}>{r}%</Btn>
              ))}
            </div>
          </Panel>

          <Panel style={{ padding: 16 }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: C.cream, fontSize: 15, marginBottom: 12 }}>⚙️ 게임 설정 값 변경</div>
            <div style={{ fontSize: 11, color: C.creamDim, marginBottom: 10 }}>키와 값을 직접 입력 (RPC 함수 admin_set_config 필요)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                type="text"
                placeholder="설정 키 (예: productionSpeedMult, ingredientCostMult, warehouseBaseCap, loanInterestRate)"
                value={configKey}
                onChange={(e) => setConfigKey(e.target.value)}
                style={{ background: C.bgPanelLighter, color: C.cream, border: `1px solid ${C.line}`, borderRadius: 8, padding: '8px 10px', fontSize: 13 }}
              />
              <input
                type="text"
                placeholder="값 (예: 1.5, 0.8, 500, 0.001)"
                value={configValue}
                onChange={(e) => setConfigValue(e.target.value)}
                style={{ background: C.bgPanelLighter, color: C.cream, border: `1px solid ${C.line}`, borderRadius: 8, padding: '8px 10px', fontSize: 13 }}
              />
              <Btn variant="gold" onClick={() => onSetGlobalConfig(configKey, configValue)} style={{ justifyContent: 'center' }}>
                설정 적용
              </Btn>
            </div>
            <div style={{ marginTop: 12, fontSize: 10, color: C.creamDim, lineHeight: 1.6 }}>
              주요 키: productionSpeedMult, ingredientCostMult, warehouseBaseCap, loanInterestRate, slotJackpotBaseRate, autoSaveInterval
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function PlayerControlPanel({ player, moneyAmount, setMoneyAmount, onAdjustMoney, onToggleAds, onClose }) {
  const saveData = player.save_data || {};
  const hasAds = saveData.adsEnabled !== false;

  return (
    <div>
      <SectionTitle
        eyebrow="Player Control"
        title={player.player?.username}
        right={
          <Btn variant="ghost" small onClick={onClose}><RotateCcw size={14} /> 다른 플레이어</Btn>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 16, marginBottom: 20 }}>
        <Panel style={{ padding: 16 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: C.cream, fontSize: 15, marginBottom: 12 }}>💰 자금 조정</div>
          <div style={{ fontSize: 12, color: C.creamDim, marginBottom: 10 }}>현재 자산: <span style={{ color: C.gold, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(Number(saveData.money) || 0)}$</span></div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              type="number"
              placeholder="금액 (음수면 차감)"
              value={moneyAmount}
              onChange={(e) => setMoneyAmount(e.target.value)}
              style={{ flex: 1, background: C.bgPanelLighter, color: C.cream, border: `1px solid ${C.line}`, borderRadius: 8, padding: '8px 10px', fontSize: 13 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[100, 500, 1000, 5000, 10000, 50000].map((amt) => (
              <Btn key={amt} variant="gold" small onClick={() => { setMoneyAmount(amt); onAdjustMoney(player.player.id, amt); }}>{fmt(amt)} 지급</Btn>
            ))}
            {[-100, -500, -1000, -5000].map((amt) => (
              <Btn key={amt} variant="danger" small onClick={() => { setMoneyAmount(amt); onAdjustMoney(player.player.id, amt); }}>{fmt(Math.abs(amt))} 차감</Btn>
            ))}
          </div>
        </Panel>

        <Panel style={{ padding: 16 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: C.cream, fontSize: 15, marginBottom: 12 }}>🖼️ 배너 광고</div>
          <div style={{ fontSize: 12, color: C.creamDim, marginBottom: 10 }}>현재 상태: <span style={{ color: hasAds ? C.pistachio : C.berry, fontWeight: 700 }}>{hasAds ? '활성화됨' : '비활성화됨'}</span></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant={hasAds ? 'ghost' : 'gold'} onClick={() => onToggleAds(player.player.id, true)} disabled={hasAds}>활성화</Btn>
            <Btn variant={hasAds ? 'danger' : 'ghost'} onClick={() => onToggleAds(player.player.id, false)} disabled={!hasAds}>비활성화</Btn>
          </div>
        </Panel>

        <Panel style={{ padding: 16 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: C.cream, fontSize: 15, marginBottom: 12 }}>📊 빠른 정보</div>
          <div style={{ fontSize: 11, color: C.creamDim, lineHeight: 2 }}>
            <div>레벨: {saveData.lines?.reduce((max, l) => Math.max(max, l.level), 1) || 1}</div>
            <div>직원: {saveData.staff?.length || 0}명</div>
            <div>업그레이드: {saveData.upgrades?.length || 0}개</div>
            <div>대출금: {fmt(Number(saveData.debt) || 0)}$</div>
            <div>창고: {fmt(Object.values(saveData.warehouse || {}).reduce((a,b)=>a+b,0))}개</div>
          </div>
        </Panel>
      </div>

      <Panel style={{ padding: 16, border: `1px solid ${C.berry}`, background: '#3B1A1A' }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: C.berry, fontSize: 15, marginBottom: 8 }}>⚠ 위험한 작업</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn variant="danger" small onClick={() => { if(window.confirm('정말로 이 플레이어의 전 자산을 회수하시겠습니까?')) onAdjustMoney(player.player.id, -(Number(saveData.money) || 0)); }}>전 자산 회수</Btn>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  게임 설정 탭                                                       */
/* ---------------------------------------------------------------- */
function GameConfigTab({ onSetJackpotRate, onSetGlobalConfig }) {
  return (
    <div>
      <SectionTitle eyebrow="Game Configuration" title="전역 게임 설정" right={<span style={{ fontSize: 11, color: C.creamDim }}>변경 사항은 서버 RPC(admin_set_config) 필요</span>} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px,1fr))', gap: 16, marginBottom: 24 }}>
        <ConfigPanel title="🎰 카지노 설정" items={[
          { key: 'slotJackpotBaseRate', label: '잭팟 기본 확률 (%)', default: '3', type: 'number', step: 0.1, min: 0.1, max: 100 },
          { key: 'slotPartialPayoutMult', label: '페어 배당 배율', default: '0.5', type: 'number', step: 0.1, min: 0.1, max: 2 },
          { key: 'casinoMaxBet', label: '최대 베팅액', default: '50000', type: 'number', step: 100, min: 100 },
          { key: 'casinoEnabled', label: '카지노 활성화', default: 'true', type: 'boolean' },
        ]} onSetConfig={onSetGlobalConfig} />

        <ConfigPanel title="🏭 생산 설정" items={[
          { key: 'productionSpeedMult', label: '생산 속도 배율', default: '1.0', type: 'number', step: 0.1, min: 0.1, max: 10 },
          { key: 'ingredientCostMult', label: '원재료 비용 배율', default: '1.0', type: 'number', step: 0.1, min: 0.1, max: 5 },
          { key: 'baseProductionSpeed', label: '기본 생산 속도', default: '20', type: 'number', step: 1, min: 1 },
          { key: 'productionPerLevel', label: '레벨당 속도 증가', default: '6', type: 'number', step: 1, min: 1 },
        ]} onSetConfig={onSetGlobalConfig} />

        <ConfigPanel title="📦 창고 & 경제" items={[
          { key: 'warehouseBaseCap', label: '기본 창고 용량', default: '220', type: 'number', step: 10, min: 50 },
          { key: 'warehouseUpgrade1', label: '창고 확장 I 추가량', default: '100', type: 'number', step: 10, min: 10 },
          { key: 'warehouseUpgrade2', label: '창고 확장 II 추가량', default: '250', type: 'number', step: 10, min: 10 },
          { key: 'loanInterestRate', label: '대출 이자율 (초당)', default: '0.0008', type: 'number', step: 0.0001, min: 0, max: 0.01 },
          { key: 'maxDebt', label: '대출 한도', default: '6000', type: 'number', step: 100, min: 100 },
        ]} onSetConfig={onSetGlobalConfig} />

        <ConfigPanel title="👥 직원 & 업그레이드" items={[
          { key: 'staffProductionBoostPerLevel', label: '생산직 레벨당 속도 보너스', default: '9', type: 'number', step: 1, min: 0 },
          { key: 'staffRevenueBonusPerLevel', label: '생산직 레벨당 수익 보너스 (%)', default: '3', type: 'number', step: 1, min: 0 },
          { key: 'staffRevenueBonusCap', label: '수익 보너스 상한 (%)', default: '100', type: 'number', step: 5, min: 10 },
          { key: 'researchDiscountPerStaff', label: '연구직 1인당 할인 (%)', default: '4', type: 'number', step: 1, min: 0 },
          { key: 'maxResearchDiscount', label: '최대 연구 할인 (%)', default: '30', type: 'number', step: 5, min: 0 },
        ]} onSetConfig={onSetGlobalConfig} />

        <ConfigPanel title="📈 레시피 가격 & 해금" items={[
          { key: 'recipePriceMult', label: '전체 판매가 배율', default: '1.0', type: 'number', step: 0.1, min: 0.1, max: 5 },
          { key: 'premiumBrandingBonus', label: '프리미엄 브랜딩 보너스 (%)', default: '25', type: 'number', step: 5, min: 0 },
          { key: 'ingredientSaveBonus', label: '원재료 절감 보너스 (%)', default: '20', type: 'number', step: 5, min: 0 },
        ]} onSetConfig={onSetGlobalConfig} />

        <ConfigPanel title="⏱️ 시스템" items={[
          { key: 'autoSaveInterval', label: '자동 저장 간격 (ms)', default: '20000', type: 'number', step: 1000, min: 5000 },
          { key: 'gameTickInterval', label: '게임 틱 간격 (ms)', default: '1000', type: 'number', step: 100, min: 100 },
          { key: 'maxLines', label: '최대 생산 라인 수', default: '10', type: 'number', step: 1, min: 4, max: 20 },
          { key: 'staffMaxLevel', label: '직원 최대 레벨', default: '10', type: 'number', step: 1, min: 5, max: 50 },
        ]} onSetConfig={onSetGlobalConfig} />
      </div>
    </div>
  );
}

function ConfigPanel({ title, items, onSetConfig }) {
  const [values, setValues] = useState(() => {
    const initial = {};
    items.forEach(item => { initial[item.key] = item.default; });
    return initial;
  });

  const handleChange = (key, value) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const handleApply = (key) => {
    onSetConfig(key, values[key]);
  };

  return (
    <Panel style={{ padding: 16 }}>
      <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: C.cream, fontSize: 14, marginBottom: 12 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item) => (
          <div key={item.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: C.creamDim }}>{item.label}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.caramelLight }}>{item.key}</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {item.type === 'boolean' ? (
                <select value={values[item.key]} onChange={(e) => handleChange(item.key, e.target.value)} style={{ flex: 1, background: C.bgPanelLighter, color: C.cream, border: `1px solid ${C.line}`, borderRadius: 8, padding: '6px 8px', fontSize: 12 }}>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <input
                  type="number"
                  min={item.min}
                  max={item.max}
                  step={item.step}
                  value={values[item.key]}
                  onChange={(e) => handleChange(item.key, e.target.value)}
                  style={{ flex: 1, background: C.bgPanelLighter, color: C.cream, border: `1px solid ${C.line}`, borderRadius: 8, padding: '6px 8px', fontSize: 12 }}
                />
              )}
              <Btn variant="gold" small onClick={() => handleApply(item.key)}>적용</Btn>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ---------------------------------------------------------------- */
/*  통계 탭                                                           */
/* ---------------------------------------------------------------- */
function StatsTab({ stats, players }) {
  const totalPlayers = players.length;
  const totalMoney = players.reduce((sum, p) => sum + (Number(p.money) || 0), 0);
  const totalRevenue = players.reduce((sum, p) => sum + (Number(p.total_revenue) || 0), 0);
  const totalProduced = players.reduce((sum, p) => sum + (Number(p.total_produced) || 0), 0);
  const avgMoney = totalPlayers > 0 ? Math.round(totalMoney / totalPlayers) : 0;

  return (
    <div>
      <SectionTitle eyebrow="Overview" title="게임 통계" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 12, marginBottom: 22 }}>
        {[
          ['👥', '전체 플레이어', totalPlayers],
          ['💰', '전체 자산 합계', `${fmt(totalMoney)}$`],
          ['📈', '전체 누적 매출', `${fmt(totalRevenue)}$`],
          ['📦', '전체 누적 생산', `${fmt(totalProduced)}개`],
          ['📊', '플레이어당 평균 자산', `${fmt(avgMoney)}$`],
          ['🏆', '최고 자산', players.length ? `${fmt(Math.max(...players.map(p => Number(p.money) || 0)))}$` : '0$'],
        ].map(([icon, label, value]) => (
          <Panel key={label} style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 24 }}>{icon}</div>
            <div style={{ fontSize: 11, color: C.creamDim, margin: '6px 0 2px' }}>{label}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: C.gold, fontSize: 18 }}>{value}</div>
          </Panel>
        ))}
      </div>

      <Panel style={{ padding: 16 }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: C.cream, fontSize: 15, marginBottom: 12 }}>플레이어 자산 분포</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: 10 }}>
          {[
            { label: '0 ~ 1,000', count: players.filter(p => (Number(p.money) || 0) < 1000).length },
            { label: '1,000 ~ 10,000', count: players.filter(p => { const m = Number(p.money) || 0; return m >= 1000 && m < 10000; }).length },
            { label: '10,000 ~ 50,000', count: players.filter(p => { const m = Number(p.money) || 0; return m >= 10000 && m < 50000; }).length },
            { label: '50,000 ~ 100,000', count: players.filter(p => { const m = Number(p.money) || 0; return m >= 50000 && m < 100000; }).length },
            { label: '100,000+', count: players.filter(p => (Number(p.money) || 0) >= 100000).length },
          ].map((bucket) => (
            <div key={bucket.label} style={{ background: C.bgPanelLight, borderRadius: 10, padding: 12, textAlign: 'center', border: `1px solid ${C.line}` }}>
              <div style={{ fontSize: 11, color: C.creamDim, marginBottom: 4 }}>{bucket.label}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: C.caramelLight, fontSize: 20 }}>{bucket.count}명</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  데이터베이스 탭                                                    */
/* ---------------------------------------------------------------- */
function DatabaseTab({ onExport, loading, supabaseAdminRpc }) {
  const [testResults, setTestResults] = useState([]);
  const [testLoading, setTestLoading] = useState(false);

  const runTest = async (fn, body = {}) => {
    setTestLoading(true);
    try {
      const result = await supabaseAdminRpc(fn, body);
      setTestResults(prev => [...prev, { fn, body, result, success: true, time: new Date().toLocaleTimeString() }]);
    } catch (err) {
      setTestResults(prev => [...prev, { fn, body, error: err.message, success: false, time: new Date().toLocaleTimeString() }]);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div>
      <SectionTitle eyebrow="Database Tools" title="데이터베이스 관리" />
      <Panel style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: C.creamDim, lineHeight: 1.6, marginBottom: 16 }}>
          전체 플레이어 데이터(JSON)를 백업용으로 내보냅니다. 플레이어 수에 따라 시간이 걸릴 수 있어요.
        </div>
        <Btn variant="gold" onClick={onExport} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
          <Download size={14} /> 전체 데이터 내보내기 (JSON)
        </Btn>
      </Panel>

      <Panel style={{ padding: 16, marginBottom: 16, border: `1px solid ${C.caramelLight}`, background: '#3B2A1A' }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: C.caramelLight, fontSize: 15, marginBottom: 12 }}>🔧 RPC 함수 테스트 (디버그)</div>
        <div style={{ fontSize: 11, color: C.creamDim, marginBottom: 12 }}>Supabase에 관리자 함수가 생성되었는지, 그리고 인가 체크가 잘 걸려있는지 테스트합니다.</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <Btn variant="gold" small onClick={() => runTest('admin_get_players', { p_limit: 5 })} disabled={testLoading}>get_players 테스트</Btn>
          <Btn variant="gold" small onClick={() => runTest('admin_get_stats', {})} disabled={testLoading}>get_stats 테스트</Btn>
          <Btn variant="ghost" small onClick={() => runTest('admin_get_player_detail', { p_player_id: '00000000-0000-0000-0000-000000000000' })} disabled={testLoading}>get_player_detail 테스트</Btn>
          <Btn variant="ghost" small onClick={() => runTest('admin_set_config', { p_key: 'test_key', p_value: 'test_value' })} disabled={testLoading}>set_config 테스트</Btn>
          <Btn variant="ghost" small onClick={() => runTest('admin_set_jackpot_rate', { p_rate: 5 })} disabled={testLoading}>set_jackpot_rate 테스트</Btn>
        </div>
        {testResults.length > 0 && (
          <div style={{ maxHeight: 300, overflow: 'auto', background: C.bgDeep, borderRadius: 8, padding: 12, border: `1px solid ${C.line}` }}>
            {testResults.slice().reverse().map((r, i) => (
              <div key={i} style={{ marginBottom: 8, padding: 8, background: r.success ? '#1A3A1A' : '#3A1A1A', borderRadius: 6, border: `1px solid ${r.success ? C.pistachio : C.berry}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: r.success ? C.pistachio : C.berry, fontWeight: 700 }}>
                    {r.success ? '✓' : '✗'} {r.fn}
                  </span>
                  <span style={{ color: C.creamDim }}>{r.time}</span>
                </div>
                <div style={{ fontSize: 10, color: C.creamDim, fontFamily: "'JetBrains Mono', monospace" }}>
                  {r.success ? JSON.stringify(r.result).slice(0, 500) : r.error}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel style={{ padding: 16, border: `1px solid ${C.berry}`, background: '#3B1A1A' }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: C.cream, fontSize: 15, marginBottom: 8 }}>⚠ 위험 구역</div>
        <div style={{ fontSize: 12, color: C.creamDim, lineHeight: 1.6, marginBottom: 12 }}>
          아래 작업은 되돌릴 수 없습니다. 신중하게 사용하세요.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn variant="danger" small disabled><Trash2 size={12} /> 모든 플레이어 삭제 (미구현)</Btn>
          <Btn variant="danger" small disabled><RotateCcw size={12} /> 전체 게임 리셋 (미구현)</Btn>
        </div>
      </Panel>

      <Panel style={{ padding: 16, marginTop: 16 }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: C.cream, fontSize: 15, marginBottom: 8 }}>🔐 서버 보안 마이그레이션 (필수, 1회)</div>
        <div style={{ fontSize: 11.5, color: C.creamDim, lineHeight: 1.6, marginBottom: 12 }}>
          이 관리자 패널이 실제로 안전해지려면, Supabase 대시보드 → SQL Editor에서 아래 SQL을
          <strong> 딱 한 번</strong> 실행해야 해요. 이게 있어야 서버가 "진짜 관리자인지"를 직접
          검증해요 — 이걸 실행하기 전까지는 여전히 아무나 관리자 함수를 호출할 수 있는 상태예요.
        </div>
        <pre style={{ fontSize: 10, color: C.creamDim, lineHeight: 1.8, fontFamily: "'JetBrains Mono', monospace", background: C.bgPanelLight, borderRadius: 8, padding: 12, border: `1px solid ${C.line}`, overflowX: 'auto', whiteSpace: 'pre', margin: 0 }}>
          {ADMIN_SECURITY_MIGRATION_SQL}
        </pre>
      </Panel>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  플레이어 상세 모달                                                  */
/* ---------------------------------------------------------------- */
function PlayerDetailModal({ player, onClose, onAction, onAdjustMoney, onToggleAds }) {
  const saveData = player.save_data || {};
  const lines = saveData.lines || [];
  const staff = saveData.staff || [];
  const upgrades = saveData.upgrades || [];
  const warehouse = saveData.warehouse || {};
  const hasAds = saveData.adsEnabled !== false;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20, overflow: 'auto' }}>
      <div style={{ width: '100%', maxWidth: 900, background: C.bgPanel, border: `1px solid ${C.line}`, borderRadius: 16, padding: 24, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: `1px solid ${C.line}`, paddingBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 20, color: C.cream }}>{player.player?.username || 'Unknown'}</div>
            <div style={{ fontSize: 11, color: C.creamDim }}>ID: {player.player?.id || 'N/A'}</div>
          </div>
          <Btn variant="ghost" onClick={onClose}><X size={18} /></Btn>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 12, marginBottom: 20 }}>
          {[
            ['💰', '자산', `${fmt(Number(saveData.money) || 0)}$`],
            ['📈', '누적 매출', `${fmt(Number(saveData.totalRevenue) || 0)}$`],
            ['📦', '누적 생산', `${fmt(Number(saveData.totalProduced) || 0)}개`],
            ['🏭', '생산 라인', `${lines.length}개`],
            ['👥', '직원 수', `${staff.length}명`],
            ['✨', '업그레이드', `${upgrades.length}개`],
            ['🏦', '대출금', `${fmt(Number(saveData.debt) || 0)}$`],
            ['🗃', '창고 사용', `${fmt(Object.values(warehouse).reduce((a,b)=>a+b,0))}개`],
            ['🖼️', '배너 광고', hasAds ? '활성화' : '비활성화'],
          ].map(([icon, label, value]) => (
            <Panel key={label} style={{ padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 18 }}>{icon}</div>
              <div style={{ fontSize: 10, color: C.creamDim, marginBottom: 2 }}>{label}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: C.gold, fontSize: 15 }}>{value}</div>
            </Panel>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 16, marginBottom: 20 }}>
          <Panel style={{ padding: 16 }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: C.cream, fontSize: 14, marginBottom: 12 }}>💰 자금 조정</div>
            <div style={{ fontSize: 12, color: C.creamDim, marginBottom: 10 }}>현재 자산: <span style={{ color: C.gold, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(Number(saveData.money) || 0)}$</span></div>
            <QuickMoneyButtons playerId={player.player?.id} onAdjustMoney={onAdjustMoney} />
          </Panel>

          <Panel style={{ padding: 16 }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: C.cream, fontSize: 14, marginBottom: 12 }}>🖼️ 배너 광고</div>
            <div style={{ fontSize: 12, color: C.creamDim, marginBottom: 10 }}>현재 상태: <span style={{ color: hasAds ? C.pistachio : C.berry, fontWeight: 700 }}>{hasAds ? '활성화됨' : '비활성화됨'}</span></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant={hasAds ? 'ghost' : 'gold'} onClick={() => onToggleAds(player.player.id, true)} disabled={hasAds}>활성화</Btn>
              <Btn variant={hasAds ? 'danger' : 'ghost'} onClick={() => onToggleAds(player.player.id, false)} disabled={!hasAds}>비활성화</Btn>
            </div>
          </Panel>
        </div>

        {lines.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: C.cream, fontSize: 15, marginBottom: 10 }}>생산 라인</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 10 }}>
              {lines.map((line, i) => (
                <Panel key={i} style={{ padding: 10 }}>
                  <div style={{ fontWeight: 600, color: C.cream }}>라인 #{i + 1} · Lv.{line.level}</div>
                  <div style={{ fontSize: 11, color: C.creamDim }}>진행률: {Math.floor(line.progress)}% {line.blocked ? '⚠ 차단됨' : ''}</div>
                  <div style={{ fontSize: 11, color: C.creamDim }}>레시피: {line.recipeId}</div>
                  {line.staffId && <div style={{ fontSize: 11, color: C.pistachio }}>직원 배정됨</div>}
                </Panel>
              ))}
            </div>
          </div>
        )}

        {Object.keys(warehouse).length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: C.cream, fontSize: 15, marginBottom: 10 }}>창고 재고</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px,1fr))', gap: 8 }}>
              {Object.entries(warehouse).map(([key, val]) => (
                <Panel key={key} style={{ padding: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 16 }}>{key}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: C.gold }}>{fmt(val)}</div>
                </Panel>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: `1px solid ${C.line}`, paddingTop: 16 }}>
          <Btn variant="ghost" onClick={onClose}>닫기</Btn>
          <Btn variant="danger" onClick={() => onAction('reset')}><RotateCcw size={14} /> 데이터 초기화</Btn>
          <Btn variant="danger" onClick={() => onAction('ban')}><Ban size={14} /> 플레이어 차단</Btn>
        </div>
      </div>
    </div>
  );
}

function QuickMoneyButtons({ playerId, onAdjustMoney }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {[100, 500, 1000, 5000, 10000, 50000, 100000].map((amt) => (
        <Btn key={amt} variant="gold" small onClick={() => onAdjustMoney(playerId, amt)}>{fmt(amt)} 지급</Btn>
      ))}
      {[-100, -500, -1000, -5000, -10000].map((amt) => (
        <Btn key={amt} variant="danger" small onClick={() => onAdjustMoney(playerId, amt)}>{fmt(Math.abs(amt))} 차감</Btn>
      ))}
    </div>
  );
}
