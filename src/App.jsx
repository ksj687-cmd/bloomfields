import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, Search, Gift, User, Bell, MapPin, Star, TrendingUp, 
  Package, BarChart3, Calendar, ChevronRight, Store, Clock,
  Loader2, CheckCircle2, X, Sparkles, Truck, Check,
  Filter, AlertCircle, Plus, Minus, ToggleRight, ToggleLeft, RefreshCw, Wand2
} from 'lucide-react';

// Pretendard 폰트 및 커스텀 스크롤바 숨김 스타일
const globalStyles = `
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
  * {
    font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;
  }
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
  .animate-slide-up {
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
`;

// --- Gemini API Helper ---
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ""; // API Key is injected by the environment

const fetchGeminiWithRetry = async (prompt, isJson = false, retries = 5) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  if (isJson) {
    payload.generationConfig = {
      responseMimeType: "application/json",
    };
  }

  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  };

  const delay = (ms) => new Promise(res => setTimeout(res, ms));
  let attempt = 0;
  const backoffDelays = [1000, 2000, 4000, 8000, 16000];

  while (attempt < retries) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) throw new Error("No text in response");

      if (isJson) {
        try {
          return JSON.parse(text);
        } catch (e) {
          // Fallback parsing if JSON is wrapped in markdown
          const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
          if (jsonMatch) return JSON.parse(jsonMatch[1]);
          throw e;
        }
      }
      return text;
    } catch (error) {
      attempt++;
      if (attempt >= retries) throw error;
      await delay(backoffDelays[attempt - 1]);
    }
  }
};

export default function BloomfieldsApp() {
  const [userMode, setUserMode] = useState('b2c'); // 'b2c' | 'partner'
  const [activeTab, setActiveTab] = useState('home');

  // AI Curation State (B2C)
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiStep, setAiStep] = useState(0);
  const [selectedTarget, setSelectedTarget] = useState('부모님');
  const [budget, setBudget] = useState(15);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState('');

  // Partner Dashboard State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderStatus, setOrderStatus] = useState({ id1: '제작중', id2: '대기중' });

  // Handle AI Curation Request (B2C)
  const handleGenerateCuration = async () => {
    setAiStep(1); // Loading state
    setAiError('');

    // --- Mock for Demo Version if API Key is not set ---
    if (!apiKey) {
      setTimeout(() => {
        setAiResult({
          packageTitle: "프리미엄 감사 패키지 (호접란+망고)",
          flowerItem: "에이프릴 시그니처 화이트 호접란",
          partnerItem: "최상급 애플망고 데코 바구니",
          partnerName: "소담과일 본점",
          estimatedPrice: "165,000",
          explanation: "우아한 기품의 화이트 호접란과 당도 높은 최고급 망고가 만났습니다. 변치 않는 존경과 감사의 마음을 완벽하게 전할 수 있는 특별한 구성입니다."
        });
        setAiStep(2);
      }, 2500);
      return;
    }
    
    const prompt = `
      당신은 프리미엄 라이프스타일 선물 큐레이션 플랫폼 '블룸필즈(Bloomfields)'의 수석 큐레이터입니다.
      고객이 다음 조건으로 선물을 찾고 있습니다.
      - 선물 대상: ${selectedTarget}
      - 총 예산: 약 ${budget}만원 내외

      이 조건에 맞춰서, 블룸필즈 본점의 '꽃/식물' 상품 1개와 제휴 파트너사의 '프리미엄 디저트 또는 과일' 상품 1개를 결합한 완벽한 선물 패키지를 기획해주세요.
      결과는 반드시 아래 JSON 스키마 구조로만 반환하세요.
      {
        "packageTitle": "패키지 이름 (예: 상견례 프리미엄 세트)",
        "flowerItem": "꽃/식물 상품명 (예: 시그니처 호접란 L)",
        "partnerItem": "제휴사 상품명 (예: 소담과일 제철 프리미엄 바구니)",
        "partnerName": "제휴사 이름 (예: 소담과일)",
        "estimatedPrice": "예상 가격 (숫자와 콤마만, 예: 185,000)",
        "explanation": "이 패키지를 추천하는 감성적인 이유 2문장."
      }
    `;

    try {
      const result = await fetchGeminiWithRetry(prompt, true);
      setAiResult(result);
      setAiStep(2); // Result state
    } catch (err) {
      console.error(err);
      setAiError("AI 추천을 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.");
      setAiStep(0); // Go back on error
    }
  };

  const renderB2CContent = () => {
    switch(activeTab) {
      case 'home': return <B2CHome onOpenAi={() => { setShowAiModal(true); setAiStep(0); setAiError(''); }} />;
      case 'search': return <PlaceholderView title="탐색 페이지" desc="다양한 상황/가격대별 상품 검색 기능이 들어갈 예정입니다." />;
      case 'curation': return <PlaceholderView title="AI 큐레이션 보관함" desc="과거 AI가 추천했던 히스토리와 찜한 상품을 봅니다." />;
      case 'my': return <PlaceholderView title="마이페이지" desc="기념일 캘린더 및 B2B 정기구독 관리 메뉴입니다." />;
      default: return <B2CHome />;
    }
  };

  const renderPartnerContent = () => {
    switch(activeTab) {
      case 'home': return <PartnerDashboard orderStatus={orderStatus} onSelectOrder={setSelectedOrder} />;
      case 'orders': return <PartnerOrdersView />;
      case 'products': return <PartnerProductsView />;
      case 'b2b': return <PlaceholderView title="B2B 정기납품 일정" desc="기업 고객의 반복 주문 스케줄러입니다." />;
      default: return <PartnerDashboard orderStatus={orderStatus} onSelectOrder={setSelectedOrder} />;
    }
  };

  return (
    <>
      <style>{globalStyles}</style>
      <div className="flex justify-center items-center min-h-screen bg-slate-200 py-10 w-full font-sans">
        <div className="w-full max-w-[400px] h-[850px] bg-slate-50 relative shadow-2xl overflow-hidden sm:rounded-[2.5rem] sm:border-[8px] border-slate-900 flex flex-col">
          
          <header className="px-5 pt-12 pb-4 bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-slate-100 flex justify-between items-center transition-colors duration-300">
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Bloomfields April</h1>
              <p className="text-[10px] text-slate-500 font-medium">프리미엄 라이프스타일 플랫폼</p>
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-full border border-slate-200 shadow-inner">
              <button 
                onClick={() => { setUserMode('b2c'); setActiveTab('home'); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-300 ${userMode === 'b2c' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                고객용
              </button>
              <button 
                onClick={() => { setUserMode('partner'); setActiveTab('home'); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-300 ${userMode === 'partner' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500'}`}
              >
                파트너용
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto hide-scrollbar bg-slate-50 relative pb-24">
            {userMode === 'b2c' ? renderB2CContent() : renderPartnerContent()}
          </main>

          <nav className="absolute bottom-0 w-full bg-white border-t border-slate-100 px-6 py-4 flex justify-between items-center pb-8 z-20">
            {userMode === 'b2c' ? (
              <>
                <NavItem icon={<Home size={24} />} label="홈" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
                <NavItem icon={<Search size={24} />} label="탐색" active={activeTab === 'search'} onClick={() => setActiveTab('search')} />
                <NavItem icon={<Gift size={24} />} label="AI추천" active={activeTab === 'curation'} onClick={() => setActiveTab('curation')} />
                <NavItem icon={<User size={24} />} label="마이" active={activeTab === 'my'} onClick={() => setActiveTab('my')} />
              </>
            ) : (
              <>
                <NavItem icon={<BarChart3 size={24} />} label="홈" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
                <NavItem icon={<Package size={24} />} label="주문관리" active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
                <NavItem icon={<Store size={24} />} label="재고/상품" active={activeTab === 'products'} onClick={() => setActiveTab('products')} />
                <NavItem icon={<Calendar size={24} />} label="B2B일정" active={activeTab === 'b2b'} onClick={() => setActiveTab('b2b')} />
              </>
            )}
          </nav>

          {/* AI Modal (B2C) */}
          {showAiModal && (
            <div className="absolute inset-0 z-50 bg-white flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-300">
              <header className="px-5 pt-12 pb-4 flex justify-between items-center border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900 flex items-center">
                  <Sparkles size={18} className="text-indigo-600 mr-2" /> ✨ AI 맞춤 큐레이션
                </h2>
                <button onClick={() => setShowAiModal(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200">
                  <X size={20} />
                </button>
              </header>
              <div className="flex-1 overflow-y-auto px-5 py-6">
                {aiStep === 0 && (
                  <div className="space-y-6 animate-in fade-in duration-500">
                    <p className="text-slate-600 text-sm">받으시는 분과 상황을 알려주시면,<br/>가장 완벽한 프리미엄 패키지를 구성해 드립니다.</p>
                    
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-900">선물 받으시는 분</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['부모님', '연인/배우자', '직장동료', '상사/VIP', '친구', '나를위한'].map(tag => (
                          <button 
                            key={tag} 
                            onClick={() => setSelectedTarget(tag)}
                            className={`border rounded-xl py-2.5 text-sm font-medium transition-colors ${selectedTarget === tag ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300'}`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-900 flex justify-between">
                        <span>총 예산 (꽃+결합상품)</span>
                        <span className="text-indigo-700">{budget}만원 내외</span>
                      </label>
                      <input 
                        type="range" min="5" max="50" step="1" 
                        value={budget} 
                        onChange={(e) => setBudget(e.target.value)}
                        className="w-full accent-indigo-600" 
                      />
                      <div className="flex justify-between text-xs text-slate-500 font-medium">
                        <span>5만원</span>
                        <span>50만원+</span>
                      </div>
                    </div>

                    {aiError && (
                      <div className="p-3 bg-rose-50 text-rose-600 text-xs rounded-xl border border-rose-100 flex items-center">
                        <AlertCircle size={14} className="mr-1.5" /> {aiError}
                      </div>
                    )}

                    <button 
                      onClick={handleGenerateCuration}
                      className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl mt-4 shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-transform flex justify-center items-center"
                    >
                      <Sparkles size={18} className="mr-2 text-yellow-300" /> AI 매칭 시작하기
                    </button>
                  </div>
                )}

                {aiStep === 1 && (
                  <div className="flex flex-col items-center justify-center h-full space-y-6 animate-in fade-in duration-300">
                    <Loader2 size={48} className="text-indigo-600 animate-spin" />
                    <div className="text-center">
                      <h3 className="text-lg font-bold text-slate-900 mb-2">✨ 최적의 조합을 찾고 있어요</h3>
                      <p className="text-sm text-slate-500">에이프릴 본점의 꽃과<br/>가장 잘 어울리는 제휴 상품을 탐색 중...</p>
                    </div>
                  </div>
                )}

                {aiStep === 2 && aiResult && (
                  <div className="animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4 mx-auto text-indigo-600">
                      <CheckCircle2 size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 text-center mb-6">고객님을 위한 완벽한 매칭!</h3>
                    
                    <div className="bg-white border-2 border-indigo-100 rounded-3xl p-5 shadow-xl shadow-indigo-100/50 mb-6 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="inline-block px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-md mb-2">✨ AI 맞춤 제안</span>
                          <h4 className="font-bold text-slate-900 text-lg">{aiResult.packageTitle}</h4>
                        </div>
                      </div>
                      
                      <div className="space-y-3 mb-5">
                        <div className="flex items-center p-3 bg-slate-50 rounded-xl">
                          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mr-3 text-emerald-600"><Gift size={20}/></div>
                          <div>
                            <p className="text-[10px] text-slate-500 font-medium">블룸필즈 에이프릴</p>
                            <p className="text-sm font-bold text-slate-900">{aiResult.flowerItem}</p>
                          </div>
                        </div>
                        <div className="flex items-center p-3 bg-slate-50 rounded-xl">
                          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mr-3 text-amber-600"><Gift size={20}/></div>
                          <div>
                            <p className="text-[10px] text-slate-500 font-medium">제휴 파트너: {aiResult.partnerName}</p>
                            <p className="text-sm font-bold text-slate-900">{aiResult.partnerItem}</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-indigo-50/50 rounded-xl mb-4 border border-indigo-100/50">
                        <p className="text-xs text-indigo-800 leading-relaxed font-medium">
                          "{aiResult.explanation}"
                        </p>
                      </div>
                      
                      <div className="flex justify-between items-end border-t border-slate-100 pt-4">
                        <span className="text-xs text-slate-500">예상 소요시간: 내일 오전 도착</span>
                        <span className="text-xl font-black text-slate-900">{aiResult.estimatedPrice}원</span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button 
                        onClick={() => setAiStep(0)}
                        className="w-1/3 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl shadow-sm hover:bg-slate-200 active:scale-[0.98] transition-all"
                      >
                        다시하기
                      </button>
                      <button 
                        onClick={() => setShowAiModal(false)}
                        className="w-2/3 bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-[0.98] transition-all flex justify-center items-center"
                      >
                        이 패키지로 주문 <ChevronRight size={18} className="ml-1" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom Sheet for Action (Dashboard specific) */}
          {selectedOrder && (
            <>
              <div className="absolute inset-0 z-40 bg-slate-900/40 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedOrder(null)}></div>
              <div className="absolute bottom-0 left-0 w-full bg-white z-50 rounded-t-3xl shadow-2xl animate-slide-up pb-8">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3"></div>
                <div className="px-6 py-4">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="inline-block px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md mb-2">{selectedOrder.status}</span>
                      <h3 className="text-lg font-bold text-slate-900">{selectedOrder.title}</h3>
                      <p className="text-sm text-slate-500 mt-1">주문번호: #ORD-{Math.floor(Math.random() * 10000)}</p>
                    </div>
                    <button onClick={() => setSelectedOrder(null)} className="p-1 bg-slate-100 rounded-full"><X size={18}/></button>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl mb-6 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">결합 유형</span>
                      <span className="font-bold text-slate-900">{selectedOrder.type}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">픽업 기사 배정</span>
                      <span className="font-bold text-indigo-600 flex items-center">
                        <Truck size={14} className="mr-1"/> 자동 스케줄링 대기
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">요청 납기일시</span>
                      <span className="font-bold text-rose-600">{selectedOrder.time}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setOrderStatus(prev => ({...prev, [selectedOrder.id]: '제작중'}));
                      setSelectedOrder(null);
                    }}
                    className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center hover:bg-slate-800 active:scale-[0.98] transition-transform"
                  >
                    <Check size={18} className="mr-2" /> 발주 승인 및 SCM 연동 시작
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ============================================================================
// PARTNER VIEWS (B2B SaaS / SCM)
// ============================================================================

function PartnerDashboard({ orderStatus, onSelectOrder }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 px-5 pt-4">
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900">블룸필즈 에이프릴 님</h2>
          <p className="text-xs text-slate-500 flex items-center mt-1">
            <MapPin size={10} className="mr-1" /> 서울 본점 (마스터 SCM 권한)
          </p>
        </div>
        <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center relative shadow-md">
          <Store size={18} className="text-white" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8">
        <StatCard title="금일 신규 발주" value="12건" icon={<Bell size={18} className="text-indigo-600"/>} trend="+3건" />
        <StatCard title="이번 주 누적 매출" value="2.4M" icon={<TrendingUp size={18} className="text-emerald-600"/>} trend="+15%" />
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-900">통합 SCM 발주 현황</h3>
          <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-bold animate-pulse">API 연동중</span>
        </div>
        
        <div className="bg-white rounded-2xl p-2 border border-slate-100 shadow-sm space-y-1">
          <OrderRow 
            id="id1"
            time="오늘 14:00 픽업" 
            title="에이프릴 시그니처 꽃다발" 
            type="패키지 결합 (케이크 합배송)"
            status={orderStatus['id1']} 
            onClick={() => {}}
          />
          <div className="h-[1px] w-[90%] mx-auto bg-slate-100"></div>
          <OrderRow 
            id="id2"
            time="내일 09:00 배송" 
            title="승진 축하 프리미엄 동양란" 
            type="B2B 정기 계약"
            status={orderStatus['id2']} 
            onClick={() => onSelectOrder({
              id: 'id2', title: "승진 축하 프리미엄 동양란", type: "B2B 정기 계약", time: "내일 09:00 배송", status: orderStatus['id2']
            })}
          />
        </div>
      </div>

      {orderStatus['id2'] === '대기중' && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-start animate-in fade-in">
          <div className="bg-rose-100 p-2 rounded-xl mr-3 text-rose-600 flex-shrink-0">
            <Clock size={18} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">신규 결합 주문 대기중</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              위 '승진 축하 동양란' 주문을 클릭하여 제작을 승인해주세요. 승인 시 제휴사(케이크)로 픽업 스케줄이 자동 전송됩니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function PartnerOrdersView() {
  const [filter, setFilter] = useState('전체');
  const filters = ['전체', '신규발주', '제작중', '배송준비'];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-slate-50 min-h-full">
      <div className="sticky top-0 bg-slate-50/90 backdrop-blur-md pt-4 pb-2 px-5 z-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-900">전체 주문 관리</h2>
          <button className="flex items-center text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
            <Filter size={14} className="mr-1" /> 최신순
          </button>
        </div>
        
        <div className="flex space-x-2 overflow-x-auto hide-scrollbar pb-2">
          {filters.map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all ${filter === f ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 space-y-4 pb-8">
        <DetailedOrderCard 
          orderNo="#ORD-8932"
          customer="김*훈 고객님"
          items={["프리미엄 호접란 (L)", "소담과일 바구니 (제휴)"]}
          time="오늘 17:00 픽업 예정"
          status="제작중"
          isCombined={true}
        />
        <DetailedOrderCard 
          orderNo="#ORD-8933"
          customer="이*영 고객님"
          items={["어버이날 카네이션 화분 세트"]}
          time="내일 10:00 픽업 예정"
          status="신규발주"
          isCombined={false}
        />
        <DetailedOrderCard 
          orderNo="#ORD-8921"
          customer="박*진 고객님"
          items={["시그니처 로즈 꽃다발", "수제 레터링 케이크 (제휴)"]}
          time="오늘 12:00 배송 출발"
          status="배송준비"
          isCombined={true}
        />
      </div>
    </div>
  );
}

// ✨ Partner Products View with AI Copywriter Feature ✨
function PartnerProductsView() {
  const [showAiCopy, setShowAiCopy] = useState(false);
  const [keywords, setKeywords] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiGeneratedCopy, setAiGeneratedCopy] = useState(null);

  const handleGenerateCopy = async () => {
    if (!keywords.trim()) return;
    setIsGenerating(true);
    setAiGeneratedCopy(null);

    // --- Mock for Demo Version if API Key is not set ---
    if (!apiKey) {
      setTimeout(() => {
        setAiGeneratedCopy({
          description: "계절의 정취를 가득 담은 화사한 꽃과 파트너사의 달콤한 디저트가 만나 특별한 순간을 완성합니다. 눈과 입이 모두 즐거운 완벽한 선물을 준비했습니다.",
          tags: ["#프리미엄기프트", "#센스있는선물", "#블룸필즈추천"]
        });
        setIsGenerating(false);
      }, 2000);
      return;
    }

    const prompt = `
      당신은 프리미엄 화훼/선물 브랜드의 수석 카피라이터입니다.
      입력된 키워드: [${keywords}]
      이 키워드를 바탕으로 고객의 구매 욕구를 자극하는 고급스럽고 감성적인 상품 설명(2~3문장)과, 마케팅 해시태그 3개를 생성해주세요.
      결과는 반드시 아래 JSON 스키마 구조로만 반환하세요.
      {
        "description": "고급스러운 상품 설명",
        "tags": ["#태그1", "#태그2", "#태그3"]
      }
    `;

    try {
      const result = await fetchGeminiWithRetry(prompt, true);
      setAiGeneratedCopy(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-slate-50 min-h-full">
      <div className="px-5 pt-4 pb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900">재고 연동 SCM</h2>
          <div className="flex items-center text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
            <RefreshCw size={10} className="mr-1 animate-spin" /> 전체 동기화 됨
          </div>
        </div>

        {/* AI Copywriter Add Button */}
        <button 
          onClick={() => setShowAiCopy(!showAiCopy)}
          className="w-full bg-slate-900 text-white rounded-2xl p-4 mb-6 flex justify-between items-center shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mr-3 text-yellow-300">
              <Sparkles size={16} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold">✨ AI 신상품 등록 및 카피 생성</p>
              <p className="text-[10px] text-slate-300 mt-0.5">키워드만 입력하면 프리미엄 설명 자동 작성</p>
            </div>
          </div>
          <ChevronRight size={20} className={`transition-transform ${showAiCopy ? 'rotate-90' : ''}`}/>
        </button>

        {/* AI Copywriter Panel */}
        {showAiCopy && (
          <div className="bg-white border-2 border-indigo-100 rounded-2xl p-4 mb-6 shadow-md animate-in slide-in-from-top-2">
            <label className="text-xs font-bold text-slate-700 mb-2 block">어떤 상품을 등록하시나요?</label>
            <input 
              type="text" 
              placeholder="예: 다알리아, 복숭아 케이크, 여름시즌" 
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm mb-3 focus:outline-none focus:border-indigo-500"
            />
            
            <button 
              onClick={handleGenerateCopy}
              disabled={isGenerating || !keywords}
              className="w-full bg-indigo-50 text-indigo-700 font-bold py-2.5 rounded-xl border border-indigo-200 flex justify-center items-center hover:bg-indigo-100 transition-colors disabled:opacity-50"
            >
              {isGenerating ? <Loader2 size={16} className="animate-spin mr-2" /> : <Wand2 size={16} className="mr-2" />}
              {isGenerating ? "카피 작성 중..." : "✨ AI 프리미엄 카피 생성"}
            </button>

            {aiGeneratedCopy && (
              <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 animate-in fade-in">
                <p className="text-xs text-slate-800 leading-relaxed font-medium mb-3">"{aiGeneratedCopy.description}"</p>
                <div className="flex flex-wrap gap-1.5">
                  {aiGeneratedCopy.tags?.map((tag, idx) => (
                    <span key={idx} className="text-[10px] font-bold text-indigo-600 bg-indigo-100/50 px-2 py-0.5 rounded-md">{tag}</span>
                  ))}
                </div>
                <button className="w-full mt-3 bg-slate-900 text-white text-xs font-bold py-2 rounded-lg">
                  이 내용으로 상품 등록
                </button>
              </div>
            )}
          </div>
        )}

        {/* Inventory Alert */}
        <div className="bg-white border-l-4 border-amber-400 p-4 rounded-xl shadow-sm mb-6 flex items-start">
          <AlertCircle size={18} className="text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-slate-900">시즌 상품 재고 부족 알림</h4>
            <p className="text-xs text-slate-500 mt-1">
              '어버이날 시그니처 카네이션'의 본점 재고가 3개 남았습니다. 발주를 제한하시겠습니까?
            </p>
          </div>
        </div>

        {/* Product List */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center">
            본점 보유 상품 <span className="ml-2 px-1.5 py-0.5 bg-slate-200 text-slate-600 text-[10px] rounded">24개</span>
          </h3>
          
          <InventoryItem 
            name="어버이날 시그니처 카네이션 화분"
            sku="SKU-FL-001"
            price="45,000"
            stock={3}
            isActive={true}
          />
          <InventoryItem 
            name="프리미엄 호접란 (L)"
            sku="SKU-FL-042"
            price="120,000"
            stock={12}
            isActive={true}
          />

          <h3 className="text-sm font-bold text-slate-900 mt-8 mb-4 flex items-center border-t border-slate-200 pt-6">
            제휴사 연동 상품 <span className="ml-2 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] rounded">API 연결됨</span>
          </h3>

          <PartnerInventoryItem 
            partner="소담과일 (서초구)"
            name="제철 프리미엄 과일바구니"
            stock="여유"
          />
          <PartnerInventoryItem 
            partner="아뜰리에 플로라"
            name="수제 앙금 레터링 케이크"
            stock="마감임박 (일일 2건 남음)"
            warning={true}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// B2C VIEW
// ============================================================================

function B2CHome({ onOpenAi }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-5 py-3">
        <div className="flex items-center bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-100">
          <Search size={18} className="text-slate-400 mr-2" />
          <input type="text" placeholder="어떤 순간을 축하하고 싶나요?" readOnly className="bg-transparent border-none outline-none w-full text-sm text-slate-800 placeholder-slate-400 cursor-pointer" />
        </div>
      </div>

      <div className="px-5 mt-2 cursor-pointer transition-transform active:scale-[0.98]" onClick={onOpenAi}>
        <div className="bg-gradient-to-br from-indigo-900 to-slate-800 rounded-3xl p-6 text-white relative overflow-hidden shadow-lg border border-indigo-800/50">
          <div className="relative z-10">
            <span className="inline-flex items-center px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-lg text-[10px] font-bold mb-3 border border-white/10 shadow-sm">
              <Sparkles size={12} className="mr-1 text-yellow-300" /> ✨ AI 맞춤 제안
            </span>
            <h2 className="text-xl font-bold leading-tight mb-2">다가오는 가정의 달,<br/>완벽한 선물을 추천받으세요</h2>
            <p className="text-indigo-200 text-xs mb-4">예산과 대상을 입력하면 즉시 매칭</p>
            <button className="bg-white text-indigo-900 text-xs font-bold px-4 py-2.5 rounded-xl shadow-md hover:bg-slate-50 transition-all flex items-center pointer-events-none">
              AI 큐레이션 시작하기 <ChevronRight size={14} className="ml-1" />
            </button>
          </div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-40"></div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-400 rounded-full blur-2xl opacity-30"></div>
        </div>
      </div>

      <div className="px-5 mt-8">
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-lg font-bold text-slate-900">상황별 프리미엄 컬렉션</h3>
          <span className="text-xs text-slate-500 font-medium flex items-center">전체보기 <ChevronRight size={14}/></span>
        </div>
        <div className="flex space-x-3 overflow-x-auto hide-scrollbar pb-2">
          {['승진/영전', '환갑/칠순', '기념일', '출산/백일'].map((tag, i) => (
            <button key={i} className="whitespace-nowrap px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 shadow-sm hover:border-indigo-400 hover:text-indigo-600 transition-colors">
              # {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 mt-8 mb-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">블룸필즈 추천 패키지</h3>
        <div className="space-y-4">
          <ProductCard 
            title="에이프릴 시그니처 로즈 & 수제 케이크"
            shop="블룸필즈 에이프릴 본점 외 1"
            price="125,000"
            rating="4.9"
            tags={['#연인', '#성공적']}
            imageUrl="https://images.unsplash.com/photo-1591886960571-74d112e4f0dc?auto=format&fit=crop&w=400&q=80"
          />
          <ProductCard 
            title="프리미엄 호접란 & 제철 과일바구니"
            shop="블룸필즈 에이프릴 & 소담 과일"
            price="180,000"
            rating="5.0"
            tags={['#상견례', '#격식있는']}
            imageUrl="https://images.unsplash.com/photo-1563241527-3004b77bd3bf?auto=format&fit=crop&w=400&q=80"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// REUSABLE COMPONENTS
// ============================================================================

function PlaceholderView({ title, desc }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center animate-in fade-in duration-300 pt-20">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
        <Sparkles size={24} />
      </div>
      <h2 className="text-lg font-bold text-slate-900 mb-2">{title}</h2>
      <p className="text-sm text-slate-500">{desc}</p>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-16 transition-all duration-300 ${active ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
      <div className={`mb-1 transition-transform duration-300 ${active ? '-translate-y-1' : ''}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-semibold transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-80'}`}>{label}</span>
      {active && <div className="absolute bottom-2 w-1.5 h-1.5 bg-slate-900 rounded-full animate-in zoom-in"></div>}
    </button>
  );
}

function ProductCard({ title, shop, price, rating, tags, imageUrl }) {
  return (
    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex gap-4 transition-transform hover:scale-[1.02] cursor-pointer">
      <div className={`w-24 h-24 bg-slate-100 rounded-xl flex-shrink-0 flex items-center justify-center relative overflow-hidden`}>
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <Gift size={32} className="text-black/10" />
        )}
      </div>
      <div className="flex flex-col justify-center py-1 w-full">
        <div className="flex justify-between items-start mb-1">
          <h4 className="font-bold text-slate-900 text-sm leading-tight pr-4">{title}</h4>
        </div>
        <p className="text-xs text-slate-500 mb-2 flex items-center">
          {shop} <Star size={10} fill="currentColor" className="text-amber-400 ml-1 mr-0.5" /> {rating}
        </p>
        <div className="flex space-x-1.5 mb-2">
          {tags.map((t, i) => <span key={i} className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md font-semibold">{t}</span>)}
        </div>
        <p className="font-bold text-slate-900 text-sm text-right mt-auto">₩ {price}</p>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend }) {
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex justify-between items-start mb-3">
        <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">{trend}</span>
      </div>
      <p className="text-xs font-medium text-slate-500 mb-1">{title}</p>
      <p className="text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function OrderRow({ time, title, type, status, onClick }) {
  const isPending = status === '대기중';
  return (
    <div 
      onClick={onClick}
      className={\`flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer \${isPending ? 'hover:bg-slate-50 active:bg-slate-100' : ''}\`}
    >
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-100 w-12 h-12 rounded-xl text-center">
          <span className="text-[9px] text-slate-400 font-bold leading-none mb-1">픽업</span>
          <span className="text-xs text-slate-800 font-black tracking-tighter">{time.split(' ')[1]}</span>
        </div>
        <div>
          <h5 className="text-sm font-bold text-slate-900 mb-0.5 flex items-center">
            {title} {isPending && <span className="w-1.5 h-1.5 bg-rose-500 rounded-full ml-1 animate-pulse"></span>}
          </h5>
          <p className="text-[10px] text-slate-500 font-medium">{type}</p>
        </div>
      </div>
      <div className={\`px-3 py-1 rounded-full text-[10px] font-bold transition-colors \${isPending ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200' : 'bg-emerald-100 text-emerald-700'}\`}>
        {status}
      </div>
    </div>
  );
}

function DetailedOrderCard({ orderNo, customer, items, time, status, isCombined }) {
  const statusColors = {
    '신규발주': 'bg-rose-100 text-rose-700 border-rose-200',
    '제작중': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    '배송준비': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-900">{orderNo}</span>
          <span className="text-[10px] text-slate-500">{customer}</span>
        </div>
        <span className={\`text-[10px] font-bold px-2 py-1 rounded-md border \${statusColors[status]}\`}>
          {status}
        </span>
      </div>
      
      <div className="mb-4">
        {items.map((item, idx) => (
          <div key={idx} className="text-sm font-bold text-slate-800 mb-1 flex items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mr-2"></span>
            {item}
          </div>
        ))}
        {isCombined && (
           <div className="inline-block mt-2 px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] font-bold rounded flex-wrap">
             다중 픽업 결합 주문 (SCM 라우팅)
           </div>
        )}
      </div>

      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
        <span className="text-xs font-semibold text-slate-600 flex items-center">
          <Clock size={12} className="mr-1"/> {time}
        </span>
        <button className="text-xs font-bold text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-50">
          상세 관리
        </button>
      </div>
    </div>
  );
}

function InventoryItem({ name, sku, price, stock, isActive }) {
  const isLowStock = stock > 0 && stock <= 3;
  const isOutOfStock = stock === 0;

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-3">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="text-sm font-bold text-slate-900">{name}</h4>
          <p className="text-[10px] text-slate-400 mt-0.5">{sku} · ₩{price}</p>
        </div>
        {isActive ? (
          <ToggleRight size={24} className="text-indigo-600 cursor-pointer" />
        ) : (
          <ToggleLeft size={24} className="text-slate-300 cursor-pointer" />
        )}
      </div>
      
      <div className="flex justify-between items-center mt-4">
        <div className="flex items-center">
          <span className="text-xs font-bold text-slate-500 mr-3">현재 재고</span>
          <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200">
            <button className="p-1 text-slate-400 hover:text-slate-700"><Minus size={14}/></button>
            <span className={\`w-8 text-center text-sm font-bold \${isOutOfStock ? 'text-rose-500' : 'text-slate-900'}\`}>{stock}</span>
            <button className="p-1 text-slate-400 hover:text-slate-700"><Plus size={14}/></button>
          </div>
        </div>
        {isLowStock && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">품절 임박</span>}
        {isOutOfStock && <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded">품절 (판매중지)</span>}
      </div>
    </div>
  );
}

function PartnerInventoryItem({ partner, name, stock, warning }) {
  return (
    <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 mb-3 flex items-center justify-between">
      <div>
        <span className="text-[10px] font-bold text-indigo-500 mb-1 block">{partner}</span>
        <h4 className="text-sm font-bold text-slate-800">{name}</h4>
      </div>
      <div className={\`text-xs font-bold px-3 py-1.5 rounded-lg \${warning ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}\`}>
        {stock}
      </div>
    </div>
  );
}
