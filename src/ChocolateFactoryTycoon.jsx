import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Factory, Warehouse, ShoppingCart, TrendingUp, Users, LayoutDashboard,
  Lock, Check, Plus, ChevronRight, Sparkles, Coins, Package, Wrench,
  UserPlus, Gauge, Award, ArrowUpCircle, X
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
  line: '#4A331D',
};

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap');`;

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
};

// 원재료(RESOURCE_META) 또는 완제품(RECIPES) 어느 쪽이든 재료 아이콘/이름을 찾아주는 헬퍼
const getIngredientMeta = (key) => {
  if (RESOURCE_META[key]) return RESOURCE_META[key];
  const r = RECIPES.find((rc) => rc.id === key);
  return r ? { name: r.name, emoji: r.emoji } : { name: key, emoji: '❔' };
};

// tier 1: 원재료로 바로 만드는 기본 초콜릿 3종
// tier 2: 기본 초콜릿(창고 재고)을 "재료"로 소모해 만드는 상위 테크 2종
const RECIPES = [
  { id: 'dark', name: '다크 초콜릿', emoji: '🍫', tier: 1, ing: { cacao: 3, sugar: 1 }, price: 20 },
  { id: 'milk', name: '밀크 초콜릿', emoji: '🍬', tier: 1, ing: { cacao: 2, sugar: 1, freshMilk: 2 }, price: 22 },
  { id: 'white', name: '화이트 초콜릿', emoji: '🤍', tier: 1, ing: { sugar: 2, freshMilk: 3 }, price: 18 },
  { id: 'strawberry', name: '딸기 초콜릿', emoji: '🍓', tier: 2, ing: { milk: 1, strawberry: 2 }, price: 50 },
  { id: 'blueberry', name: '블루베리 초콜릿', emoji: '🫐', tier: 2, ing: { white: 1, blueberry: 2 }, price: 46 },
];

const UPGRADES = [
  { id: 'u1', tier: 1, req: null, name: '로스터 개선', desc: '모든 생산 라인 속도 +15%', cost: 220, effect: { speed: 0.15 } },
  { id: 'u2', tier: 1, req: null, name: '창고 확장 I', desc: '창고 용량 +100', cost: 170, effect: { warehouse: 100 } },
  { id: 'u3', tier: 2, req: 'u1', name: '컨칭 자동화', desc: '모든 생산 라인 속도 +20%', cost: 480, effect: { speed: 0.20 } },
  { id: 'u4', tier: 2, req: 'u2', name: '딸기 조달 계약', desc: '딸기 초콜릿(2단계 테크)을 생산할 수 있습니다. 밀크 초콜릿 재고를 재료로 소모해요.', cost: 400, effect: { unlock: 'strawberry' } },
  { id: 'u5', tier: 3, req: 'u4', name: '블루베리 조달 계약', desc: '블루베리 초콜릿(2단계 테크)을 생산할 수 있습니다. 화이트 초콜릿 재고를 재료로 소모해요.', cost: 760, effect: { unlock: 'blueberry' } },
  { id: 'u6', tier: 3, req: 'u3', name: '창고 확장 II', desc: '창고 용량 +250', cost: 620, effect: { warehouse: 250 } },
  { id: 'u7', tier: 4, req: 'u5', name: '프리미엄 브랜딩', desc: '모든 판매가 +25%', cost: 1300, effect: { priceMult: 0.25 } },
  { id: 'u8', tier: 4, req: 'u6', name: '원재료 절감 공정', desc: '원재료 소모량 -20% (기본 초콜릿 3종에만 적용)', cost: 1050, effect: { ingSave: 0.20 } },
];

const STAFF_FIRST = ['민준', '서연', '도윤', '하은', '시우', '지아', '예준', '수아', '주원', '다은', '이안', '해나'];
const ROLES = {
  production: { label: '생산직', desc: '배정된 라인의 속도를 올려요', color: C.caramelLight },
  research: { label: '연구직', desc: '업그레이드 비용을 낮춰요', color: C.pistachio },
};

const ACHIEVEMENTS = [
  { id: 'a1', name: '첫 생산', cond: (g) => g.totalProduced >= 1 },
  { id: 'a2', name: '첫 매출', cond: (g) => g.totalRevenue >= 1 },
  { id: 'a3', name: '자산 1,000냥', cond: (g) => g.money >= 1000 },
  { id: 'a4', name: '자산 5,000냥', cond: (g) => g.money >= 5000 },
  { id: 'a5', name: '생산 라인 3개', cond: (g) => g.lines.length >= 3 },
  { id: 'a6', name: '직원 3명 고용', cond: (g) => g.staff.length >= 3 },
  { id: 'a7', name: '업그레이드 4개', cond: (g) => g.upgrades.length >= 4 },
  { id: 'a8', name: '누적 생산 100개', cond: (g) => g.totalProduced >= 100 },
];

const LINE_COST = (n) => 260 + n * 320;
const LEVEL_COST = (lvl) => 80 + lvl * 80;
const STAFF_COST = (n) => 120 + n * 90;

// 대출 시스템
const LOAN_INTEREST_RATE = 0.0008; // 초당 복리 이자율
const MAX_DEBT = 6000;
const LOAN_OPTIONS = [300, 1000, 3000];

// 카지노 시스템 (슬롯머신)
const SLOT_SYMBOLS = ['🍫', '🍬', '🤍', '🍓', '🫐', '💎'];
const SLOT_WEIGHTS = [30, 25, 20, 12, 10, 3]; // 합계 100, 희귀할수록 배당 높음
const SLOT_PAYOUTS = { '🍫': 2, '🍬': 2.5, '🤍': 3, '🍓': 5, '🫐': 6, '💎': 20 };
const CASINO_BETS = [50, 200, 500];

// 생산 라인 슬롯 확장
const MAX_LINE_CAP = 10;
const LINE_SLOT_COST = (maxLines) => 600 + (maxLines - 4) * 500;

const fmt = (n) => Math.floor(n).toLocaleString('ko-KR');

/* ---------------------------------------------------------------- */
/*  초기 상태                                                         */
/* ---------------------------------------------------------------- */
const initialGame = () => ({
  started: false,
  money: 500,
  resources: { cacao: 100, sugar: 100, freshMilk: 80, strawberry: 0, blueberry: 0 },
  prices: { cacao: 4, sugar: 2, freshMilk: 3, strawberry: 6, blueberry: 6 },
  warehouse: {},
  warehouseCap: 220,
  debt: 0,
  casinoLast: null,
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
  toast: null,
});

/* ---------------------------------------------------------------- */
/*  작은 유틸 컴포넌트                                                 */
/* ---------------------------------------------------------------- */
function Panel({ children, style, ...rest }) {
  return (
    <div
      style={{
        background: C.bgPanel,
        border: `1px solid ${C.line}`,
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.bgPanelLight, border: `1px solid ${C.line}`, borderRadius: 10, padding: '7px 12px' }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: C.creamDim, letterSpacing: 0.4 }}>{label}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: accent || C.cream }}>{value}</span>
      </div>
    </div>
  );
}

function ProgressBar({ pct, color, height = 8 }) {
  return (
    <div style={{ width: '100%', height, background: '#1C1108', borderRadius: 99, overflow: 'hidden', border: `1px solid ${C.line}` }}>
      <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: color || C.caramel, transition: 'width .25s linear' }} />
    </div>
  );
}

function Btn({ children, onClick, disabled, variant = 'primary', style, small }) {
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
    transition: 'transform .12s ease, filter .12s ease',
  };
  const variants = {
    primary: { background: C.caramel, color: '#1C1108' },
    gold: { background: C.gold, color: '#1C1108' },
    ghost: { background: C.bgPanelLighter, color: C.cream, border: `1px solid ${C.line}` },
    danger: { background: C.berry, color: C.cream },
  };
  return (
    <button
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
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
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
export default function ChocolateFactoryTycoon() {
  const [g, setG] = useState(initialGame());
  const [tab, setTab] = useState('factory');
  const toastTimer = useRef(null);

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
    setPlayer({ id, username, password });
    // 서버에 저장된 세이브가 있으면 불러오고, 없으면(신규 가입) 기본값 유지
    if (data && Object.keys(data).length > 0) {
      setG((prev) => ({ ...initialGame(), ...data, toast: null }));
    }
    pushToast(`${username}님, 환영해요!`, 'pistachio');
  }, [pushToast]);

  const saveNow = useCallback(async () => {
    if (!player) return;
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
    await saveNow();
    setPlayer(null);
    setG(initialGame());
  }, [saveNow]);

  const resetGame = useCallback(() => {
    const fresh = initialGame();
    setG(fresh);
    if (player) {
      const { toast, ...saveable } = fresh;
      supabaseRpc('save_game', { p_player_id: player.id, p_password: player.password, p_data: saveable })
        .then(() => { setSaveStatus('saved'); setLastSaved(new Date()); })
        .catch((err) => { setSaveStatus('error'); pushToast(`저장 실패: ${err.message}`, 'berry'); });
    }
  }, [player, pushToast]);

  // 20초마다 자동 저장 (로그인 + 게임 시작 상태일 때만)
  useEffect(() => {
    if (!player || !g.started) return;
    const iv = setInterval(saveNow, 20000);
    return () => clearInterval(iv);
  }, [player, g.started, saveNow]);

  /* ---------------- 게임 틱 ---------------- */
  useEffect(() => {
    if (!g.started) return;
    const iv = setInterval(() => {
      setG((prev) => {
        const speedBonus = prev.upgrades.reduce((s, id) => s + (UPGRADES.find((u) => u.id === id)?.effect.speed || 0), 0);
        const ingSave = prev.upgrades.reduce((s, id) => s + (UPGRADES.find((u) => u.id === id)?.effect.ingSave || 0), 0);
        const priceMult = 1 + prev.upgrades.reduce((s, id) => s + (UPGRADES.find((u) => u.id === id)?.effect.priceMult || 0), 0);

        let resources = { ...prev.resources };
        let warehouse = { ...prev.warehouse };
        let money = prev.money;
        let totalProduced = prev.totalProduced;
        let totalRevenue = prev.totalRevenue;
        let debt = prev.debt > 0 ? prev.debt * (1 + LOAN_INTEREST_RATE) : prev.debt;

        const lines = prev.lines.map((line) => {
          const recipe = RECIPES.find((r) => r.id === line.recipeId);
          if (!recipe) return line;
          const staffMember = prev.staff.find((s) => s.id === line.staffId);
          const staffBoost = staffMember ? staffMember.level * 9 : 0;
          const speed = (20 + line.level * 6) * (1 + speedBonus) + staffBoost;
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
              const available = isProductIngredient ? (warehouse[k] || 0) : resources[k];
              if (available < amt) canProduce = false;
            });
            // 자동판매가 꺼져 있으면, 창고에 넣을 자리가 있는지도 미리 확인해서
            // 재료만 소모되고 완성품이 증발하는 일이 없도록 한다
            const whTotal = Object.values(warehouse).reduce((a, b) => a + b, 0);
            const hasSpace = prev.autoSell || whTotal < prev.warehouseCap;
            if (canProduce && hasSpace) {
              Object.entries(needed).forEach(([k, { amt, isProductIngredient }]) => {
                if (isProductIngredient) warehouse[k] = (warehouse[k] || 0) - amt;
                else resources[k] -= amt;
              });
              progress = 0;
              totalProduced += 1;
              if (prev.autoSell) {
                const sellPrice = recipe.price * priceMult;
                money += sellPrice;
                totalRevenue += sellPrice;
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
        }

        return { ...prev, resources, warehouse, money, lines, history, totalProduced, totalRevenue, achievements, debt };
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [g.started]);

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
      const cost = prev.prices[key] * amount;
      if (prev.money < cost) { pushToast('자금이 부족해요', 'berry'); return prev; }
      return { ...prev, money: prev.money - cost, resources: { ...prev.resources, [key]: prev.resources[key] + amount } };
    });
  };

  const sellProduct = (recipeId, amount) => {
    setG((prev) => {
      const have = prev.warehouse[recipeId] || 0;
      const sellAmt = Math.min(have, amount);
      if (sellAmt <= 0) return prev;
      const recipe = RECIPES.find((r) => r.id === recipeId);
      const priceMult = 1 + prev.upgrades.reduce((s, id) => s + (UPGRADES.find((u) => u.id === id)?.effect.priceMult || 0), 0);
      const revenue = recipe.price * priceMult * sellAmt;
      return {
        ...prev,
        money: prev.money + revenue,
        totalRevenue: prev.totalRevenue + revenue,
        warehouse: { ...prev.warehouse, [recipeId]: have - sellAmt },
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
      if (prev.maxLines >= MAX_LINE_CAP) { pushToast('더 이상 확장할 수 없어요 (최대치 도달)', 'berry'); return prev; }
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

  const buyUpgrade = (up) => {
    setG((prev) => {
      const researchers = prev.staff.filter((s) => s.role === 'research').length;
      const discount = Math.min(0.3, researchers * 0.04);
      const cost = Math.round(up.cost * (1 - discount));
      if (prev.upgrades.includes(up.id)) return prev;
      if (up.req && !prev.upgrades.includes(up.req)) { pushToast('선행 업그레이드가 필요해요', 'berry'); return prev; }
      if (prev.money < cost) { pushToast('자금이 부족해요', 'berry'); return prev; }
      let next = { ...prev, money: prev.money - cost, upgrades: [...prev.upgrades, up.id] };
      if (up.effect.warehouse) next.warehouseCap += up.effect.warehouse;
      if (up.effect.unlock) next.unlockedRecipes = [...prev.unlockedRecipes, up.effect.unlock];
      return next;
    });
    pushToast(`✨ ${up.name} 완료`, 'gold');
  };

  const takeLoan = (amount) => {
    setG((prev) => {
      if (prev.debt + amount > MAX_DEBT) { pushToast('대출 한도를 초과했어요', 'berry'); return prev; }
      return { ...prev, money: prev.money + amount, debt: prev.debt + amount };
    });
    pushToast(`🏦 ${fmt(amount)}냥 대출 받았어요`, 'gold');
  };

  const repayLoan = (amount) => {
    setG((prev) => {
      const pay = Math.min(prev.money, prev.debt, amount);
      if (pay <= 0) return prev;
      return { ...prev, money: prev.money - pay, debt: prev.debt - pay };
    });
  };

  const playCasino = (bet) => {
    if (g.money < bet) { pushToast('자금이 부족해요', 'berry'); return; }
    const spin = () => {
      const r = Math.random() * 100;
      let acc = 0;
      for (let i = 0; i < SLOT_SYMBOLS.length; i++) {
        acc += SLOT_WEIGHTS[i];
        if (r <= acc) return SLOT_SYMBOLS[i];
      }
      return SLOT_SYMBOLS[SLOT_SYMBOLS.length - 1];
    };
    const reels = [spin(), spin(), spin()];
    let payout = 0;
    let outcome = 'lose';
    if (reels[0] === reels[1] && reels[1] === reels[2]) {
      payout = Math.round(bet * SLOT_PAYOUTS[reels[0]]);
      outcome = 'jackpot';
    } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
      payout = Math.round(bet * 0.5);
      outcome = 'partial';
    }
    setG((prev) => ({ ...prev, money: prev.money - bet + payout, casinoLast: { reels, payout, bet, outcome, key: Date.now() } }));
    if (outcome === 'jackpot') pushToast(`🎰 트리플 매치! +${fmt(payout)}냥`, 'gold');
    else if (outcome === 'partial') pushToast('🎰 페어 — 베팅 절반 회수', 'pistachio');
    else pushToast(`🎰 꽝... -${fmt(bet)}냥`, 'berry');
  };

  /* ---------------- 렌더 ---------------- */
  if (!player) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  if (!g.started) {
    return <WelcomeScreen onStart={() => setG((p) => ({ ...p, started: true }))} />;
  }

  const researchers = g.staff.filter((s) => s.role === 'research').length;
  const discount = Math.min(0.3, researchers * 0.04);
  const priceMult = 1 + g.upgrades.reduce((s, id) => s + (UPGRADES.find((u) => u.id === id)?.effect.priceMult || 0), 0);

  const TABS = [
    { id: 'factory', label: '공장 & 창고', icon: Factory },
    { id: 'shop', label: '상점 & 거래', icon: ShoppingCart },
    { id: 'upgrade', label: '업그레이드', icon: ArrowUpCircle },
    { id: 'staff', label: '직원 관리', icon: Users },
    { id: 'finance', label: '대출 & 카지노', icon: Coins },
    { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
  ];

  return (
    <div style={{ minHeight: 640, background: C.bgDeep, fontFamily: "'Space Grotesk', sans-serif", position: 'relative', paddingBottom: 24 }}>
      <style>{`
        ${FONT_IMPORT}
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { height: 6px; width: 6px; }
        ::-webkit-scrollbar-thumb { background: ${C.bgPanelLighter}; border-radius: 4px; }
        @keyframes beltMove { from { background-position: 0 0; } to { background-position: -48px 0; } }
        @keyframes toastIn { from { opacity: 0; transform: translate(-50%, -8px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes pulseGlow { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
        select { font-family: 'Space Grotesk', sans-serif; }
      `}</style>

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
            <StatChip icon="💰" label="자산" value={`${fmt(g.money)}냥`} accent={C.gold} />
            {g.debt > 0 && <StatChip icon="🏦" label="대출금" value={`${fmt(g.debt)}냥`} accent={C.berry} />}
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
            {saveStatus === 'saving' && '저장 중...'}
            {saveStatus === 'saved' && lastSaved && `마지막 저장 ${lastSaved.toLocaleTimeString('ko-KR')}`}
            {saveStatus === 'error' && <span style={{ color: C.berry }}>저장 실패</span>}
            {saveStatus === 'idle' && '자동 저장 대기중 (20초마다)'}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn small variant="ghost" onClick={saveNow}>지금 저장</Btn>
            <Btn small variant="ghost" onClick={logout}>로그아웃</Btn>
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
                onClick={() => setTab(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: 'none', border: 'none',
                  borderBottom: active ? `2px solid ${C.caramelLight}` : '2px solid transparent',
                  color: active ? C.cream : C.creamDim, cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap',
                }}
              >
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 컨텐츠 */}
      <div style={{ padding: '20px 22px 0' }}>
        {tab === 'factory' && (
          <FactoryTab g={g} priceMult={priceMult} buyLine={buyLine} expandLineSlot={expandLineSlot} setLineRecipe={setLineRecipe} upgradeLine={upgradeLine} assignStaff={assignStaff} setAutoSell={(v) => setG((p) => ({ ...p, autoSell: v }))} />
        )}
        {tab === 'shop' && <ShopTab g={g} priceMult={priceMult} buyResource={buyResource} sellProduct={sellProduct} />}
        {tab === 'upgrade' && <UpgradeTab g={g} discount={discount} buyUpgrade={buyUpgrade} />}
        {tab === 'staff' && <StaffTab g={g} hireStaff={hireStaff} />}
        {tab === 'finance' && <FinanceTab g={g} takeLoan={takeLoan} repayLoan={repayLoan} playCasino={playCasino} />}
        {tab === 'dashboard' && <DashboardTab g={g} resetGame={resetGame} />}
      </div>

      {/* 토스트 */}
      {g.toast && (
        <div
          key={g.toast.key}
          style={{
            position: 'fixed', top: 18, left: '50%', animation: 'toastIn .25s ease',
            background: C.bgPanelLighter, border: `1px solid ${C.caramelLight}`, color: C.cream,
            padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          {g.toast.msg}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  로그인 / 회원가입 화면                                             */
/* ---------------------------------------------------------------- */
function AuthScreen({ onAuth }) {
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
      <style>{FONT_IMPORT}</style>
      <Panel style={{ width: '100%', maxWidth: 380, padding: 28 }}>
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
      <style>{`${FONT_IMPORT}
        @keyframes floatBar { 0%,100% { transform: translateY(0) rotate(-6deg);} 50% { transform: translateY(-10px) rotate(6deg);} }
        @keyframes shimmer { 0% { background-position: -200px 0;} 100% { background-position: 200px 0;} }
      `}</style>
      <div style={{ maxWidth: 620, width: '100%', textAlign: 'center' }}>
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
          창고를 채운 초콜릿을 시장에 팔아 자산을 불려나가세요.
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
function FactoryTab({ g, priceMult, buyLine, expandLineSlot, setLineRecipe, upgradeLine, assignStaff, setAutoSell }) {
  const whTotal = Object.values(g.warehouse).reduce((a, b) => a + b, 0);
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
              <Plus size={14} /> 라인 추가 ({fmt(LINE_COST(g.lines.length))}냥)
            </Btn>
            <Btn variant="ghost" onClick={expandLineSlot} disabled={g.maxLines >= MAX_LINE_CAP}>
              <ArrowUpCircle size={14} /> 슬롯 확장 {g.maxLines >= MAX_LINE_CAP ? '(최대)' : `(${fmt(LINE_SLOT_COST(g.maxLines))}냥)`}
            </Btn>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, marginBottom: 30 }}>
        {g.lines.map((line) => {
          const recipe = RECIPES.find((r) => r.id === line.recipeId);
          const staffMember = g.staff.find((s) => s.id === line.staffId);
          const prodStaff = g.staff.filter((s) => s.role === 'production');
          return (
            <Panel key={line.id} style={{ padding: 16 }}>
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
                재료: {Object.entries(recipe.ing).map(([k, v]) => `${getIngredientMeta(k).emoji}${v}`).join(' ')} → 판매가 {fmt(recipe.price * priceMult)}냥
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
                <Wrench size={13} /> 설비 업그레이드 ({fmt(LEVEL_COST(line.level))}냥)
              </Btn>
            </Panel>
          );
        })}
      </div>

      <SectionTitle
        eyebrow="Warehouse"
        title="창고"
        right={<span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: C.creamDim }}>{fmt(whTotal)} / {fmt(g.warehouseCap)} 칸 사용중</span>}
      />
      <Panel style={{ padding: 16, marginBottom: 10 }}>
        <ProgressBar pct={(whTotal / g.warehouseCap) * 100} color={C.caramelLight} height={10} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: 10, marginTop: 16 }}>
          {RECIPES.filter((r) => g.unlockedRecipes.includes(r.id)).map((r) => (
            <div key={r.id} style={{ background: C.bgPanelLight, borderRadius: 10, padding: 10, textAlign: 'center', border: `1px solid ${C.line}` }}>
              <div style={{ fontSize: 22 }}>{r.emoji}</div>
              <div style={{ fontSize: 11.5, color: C.creamDim, margin: '4px 0' }}>{r.name}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: C.gold, fontSize: 16 }}>{fmt(g.warehouse[r.id] || 0)}</div>
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
        {Object.entries(RESOURCE_META).map(([key, meta]) => (
          <Panel key={key} style={{ padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 22 }}>{meta.emoji}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: C.gold, fontWeight: 700, fontSize: 13 }}>{g.prices[key]}냥/개</span>
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
        {RECIPES.filter((r) => g.unlockedRecipes.includes(r.id)).map((r) => {
          const qty = g.warehouse[r.id] || 0;
          return (
            <Panel key={r.id} style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>{r.emoji}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: C.pistachio, fontWeight: 700, fontSize: 13 }}>{fmt(r.price * priceMult)}냥/개</span>
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
  const tiers = [1, 2, 3, 4];
  return (
    <div>
      <SectionTitle
        eyebrow="R&D Tree"
        title="업그레이드"
        right={discount > 0 ? <span style={{ fontSize: 12, color: C.pistachio }}>연구직 할인 -{Math.round(discount * 100)}%</span> : null}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        {tiers.map((tier) => (
          <div key={tier}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, color: C.creamDim, marginBottom: 10, textTransform: 'uppercase' }}>Tier {tier}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px,1fr))', gap: 12 }}>
              {UPGRADES.filter((u) => u.tier === tier).map((u) => {
                const owned = g.upgrades.includes(u.id);
                const reqMet = !u.req || g.upgrades.includes(u.req);
                const cost = Math.round(u.cost * (1 - discount));
                return (
                  <Panel key={u.id} style={{ padding: 14, opacity: reqMet ? 1 : 0.55, borderColor: owned ? C.pistachio : C.line }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: C.cream, fontSize: 15 }}>{u.name}</div>
                      {owned ? <Check size={17} color={C.pistachio} /> : !reqMet ? <Lock size={15} color={C.creamDim} /> : null}
                    </div>
                    <div style={{ fontSize: 12, color: C.creamDim, margin: '6px 0 12px', lineHeight: 1.5 }}>{u.desc}</div>
                    {!owned && (
                      <Btn small variant={reqMet ? 'primary' : 'ghost'} disabled={!reqMet || g.money < cost} onClick={() => buyUpgrade(u)} style={{ width: '100%', justifyContent: 'center' }}>
                        {reqMet ? `${fmt(cost)}냥에 연구` : '선행 조건 필요'}
                      </Btn>
                    )}
                    {owned && <div style={{ fontSize: 11.5, color: C.pistachio, fontWeight: 600 }}>완료됨</div>}
                  </Panel>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  직원 관리 탭                                                      */
/* ---------------------------------------------------------------- */
function StaffTab({ g, hireStaff }) {
  return (
    <div>
      <SectionTitle eyebrow="Human Resources" title="직원 관리" />
      <div style={{ display: 'flex', gap: 10, marginBottom: 22, flexWrap: 'wrap' }}>
        {Object.entries(ROLES).map(([key, role]) => (
          <Panel key={key} style={{ padding: 14, flex: '1 1 240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <UserPlus size={16} color={role.color} />
              <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: C.cream }}>{role.label}</span>
            </div>
            <div style={{ fontSize: 12, color: C.creamDim, marginBottom: 12 }}>{role.desc}</div>
            <Btn small variant="ghost" onClick={() => hireStaff(key)} style={{ width: '100%', justifyContent: 'center' }}>
              고용하기 ({fmt(STAFF_COST(g.staff.length))}냥)
            </Btn>
          </Panel>
        ))}
      </div>

      <div style={{ fontSize: 11, letterSpacing: 1.5, color: C.creamDim, marginBottom: 10, textTransform: 'uppercase' }}>
        현재 직원 ({g.staff.length}명)
      </div>
      {g.staff.length === 0 && <div style={{ color: C.creamDim, fontSize: 13 }}>아직 고용한 직원이 없어요.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 10 }}>
        {g.staff.map((s) => (
          <Panel key={s.id} style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: ROLES[s.role].color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#1C1108', fontSize: 13 }}>
              {s.name[0]}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.cream }}>{s.name}</div>
              <div style={{ fontSize: 11, color: C.creamDim }}>{ROLES[s.role].label} · Lv.{s.level}</div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  대출 & 카지노 탭                                                   */
/* ---------------------------------------------------------------- */
function FinanceTab({ g, takeLoan, repayLoan, playCasino }) {
  const [customBet, setCustomBet] = useState('');
  const confirmBet = () => {
    const n = Math.floor(Number(customBet));
    if (!n || n <= 0 || n > g.money) return;
    playCasino(n);
    setCustomBet('');
  };
  return (
    <div>
      <SectionTitle
        eyebrow="Bank"
        title="대출"
        right={<span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: g.debt > 0 ? C.berry : C.creamDim }}>대출 잔액 {fmt(g.debt)}냥 / 한도 {fmt(MAX_DEBT)}냥</span>}
      />
      <Panel style={{ padding: 16, marginBottom: 30 }}>
        <div style={{ fontSize: 12, color: C.creamDim, lineHeight: 1.6, marginBottom: 14 }}>
          대출 잔액에는 매초 {(LOAN_INTEREST_RATE * 100).toFixed(2)}%씩 복리 이자가 붙어요. 오래 방치할수록 눈덩이처럼 불어나니 여유 자금이 생기면 바로 갚는 게 좋아요.
        </div>
        <div style={{ fontSize: 11, letterSpacing: 1.5, color: C.creamDim, marginBottom: 8, textTransform: 'uppercase' }}>대출 받기</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {LOAN_OPTIONS.map((amt) => (
            <Btn key={amt} variant="ghost" disabled={g.debt + amt > MAX_DEBT} onClick={() => takeLoan(amt)}>
              <Coins size={14} /> {fmt(amt)}냥 대출
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
      <Panel style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 18 }}>
          {(g.casinoLast?.reels || ['❔', '❔', '❔']).map((s, i) => (
            <div key={i} style={{ width: 64, height: 64, borderRadius: 12, background: C.bgPanelLighter, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
              {s}
            </div>
          ))}
        </div>
        {g.casinoLast && (
          <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 13, fontWeight: 700, color: g.casinoLast.outcome === 'lose' ? C.berry : C.pistachio }}>
            {g.casinoLast.outcome === 'jackpot' && `🎉 트리플 매치! +${fmt(g.casinoLast.payout)}냥`}
            {g.casinoLast.outcome === 'partial' && `페어! 베팅 절반(${fmt(g.casinoLast.payout)}냥) 회수`}
            {g.casinoLast.outcome === 'lose' && `꽝... -${fmt(g.casinoLast.bet)}냥`}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          {CASINO_BETS.map((bet) => (
            <Btn key={bet} variant="gold" disabled={g.money < bet} onClick={() => playCasino(bet)}>
              {fmt(bet)}냥 베팅
            </Btn>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 18 }}>
          <input
            type="number"
            min="1"
            placeholder="직접 베팅액 입력"
            value={customBet}
            onChange={(e) => setCustomBet(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && confirmBet()}
            style={{ width: 160, background: C.bgPanelLighter, color: C.cream, border: `1px solid ${C.line}`, borderRadius: 8, padding: '8px 10px', fontSize: 12.5 }}
          />
          <Btn variant="primary" disabled={!customBet || Number(customBet) <= 0 || Number(customBet) > g.money} onClick={confirmBet}>
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
          <div style={{ marginTop: 6 }}>두 심볼만 일치하면 베팅액의 절반을 돌려받고, 아무것도 안 맞으면 베팅액 전액을 잃어요.</div>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  대시보드 탭                                                       */
/* ---------------------------------------------------------------- */
function DashboardTab({ g, resetGame }) {
  const whTotal = Object.values(g.warehouse).reduce((a, b) => a + b, 0);
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 12, marginBottom: 22 }}>
        {[
          ['💰', '총 자산', `${fmt(g.money)}냥`],
          ['📈', '누적 매출', `${fmt(g.totalRevenue)}냥`],
          ['📦', '누적 생산량', `${fmt(g.totalProduced)}개`],
          ['👥', '직원 수', `${g.staff.length}명`],
          ['🏭', '생산 라인', `${g.lines.length}개`],
          ['🗃', '창고 재고', `${fmt(whTotal)}개`],
          ['🏦', '대출 잔액', `${fmt(g.debt)}냥`],
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

      <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: C.cream, fontSize: 15, marginBottom: 10 }}>업적</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 10 }}>
        {ACHIEVEMENTS.map((a) => {
          const done = g.achievements.includes(a.id);
          return (
            <Panel key={a.id} style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 8, opacity: done ? 1 : 0.5 }}>
              <Award size={16} color={done ? C.gold : C.creamDim} />
              <span style={{ fontSize: 12.5, color: C.cream }}>{a.name}</span>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
