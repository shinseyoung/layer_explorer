import React, { useState } from 'react';
import LayerScene from './components/canvas/LayerScene';
import Header from './components/header/Header';
import OriginalViewer from './components/viewer/OriginalViewer';
import { useLayerStore } from './store/useLayerStore';
import { Search } from 'lucide-react';

export default function App() {
  const { appState, setTargetUrl, startVisualizing } = useLayerStore();
  const [homeInput, setHomeInput] = useState('');

  const handleHomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeInput.trim()) return;
    const urlToFetch = homeInput.startsWith('http') ? homeInput : `https://${homeInput}`;
    setTargetUrl(urlToFetch);
    startVisualizing();
  };

  // 1. 홈 화면 (idle 상태)
  if (appState === 'idle') {
    return (
      <div className="w-screen h-screen flex bg-[#05050a] text-white overflow-hidden">
        {/* 좌측 브랜딩 영역 */}
        <div className="w-1/2 h-full flex flex-col justify-center px-24 bg-gradient-to-br from-[#0a0a0f] via-[#111827] to-[#05050a] border-r border-white/10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none" />
          <h1 className="text-6xl font-bold mb-6 tracking-tight leading-tight z-10">
            Discover the <br/> <span className="text-[#10b981]">Depth</span> of the Web.
          </h1>
          <p className="text-gray-400 text-lg max-w-md leading-relaxed font-mono z-10">
            웹사이트의 평면적인 코드를 넘어,<br/>
            숨겨진 DOM 레이어를 3D로 탐색하고 구조를 완벽하게 디버깅하세요.
          </p>
        </div>

        {/* 우측 검색 영역 */}
        <div className="w-1/2 h-full flex flex-col items-center justify-center relative bg-[#05050a]">
          <div className="absolute top-8 right-12 flex items-center gap-2">
            <span className="text-[#10b981] font-bold text-xl tracking-tight">LAYER</span>
            <span className="font-bold text-xl tracking-tight">EXPLORER</span>
          </div>

          <div className="w-full max-w-lg px-8 flex flex-col items-center">
            <div className="w-16 h-16 bg-[#10b981]/10 rounded-2xl flex items-center justify-center mb-8 border border-[#10b981]/30 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
              <Search size={32} className="text-[#10b981]" />
            </div>
            
            <h2 className="text-2xl font-bold mb-8 tracking-tight">분석할 웹사이트 URL을 입력하세요</h2>
            
            <form onSubmit={handleHomeSubmit} className="w-full relative group">
              <input
                type="text"
                value={homeInput}
                onChange={(e) => setHomeInput(e.target.value)}
                placeholder="https://www.naver.com"
                className="w-full bg-[#111111] border border-white/10 rounded-2xl px-6 py-5 text-lg font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#10b981]/50 focus:bg-[#151515] transition-all shadow-xl"
              />
              <button type="submit" className="absolute right-3 top-3 bottom-3 bg-[#10b981] hover:bg-[#059669] text-black font-bold rounded-xl px-8 transition-colors flex items-center">
                탐색 시작
              </button>
            </form>
          </div>

          <div className="absolute bottom-8 text-gray-600 text-xs font-mono">
            © 2026 Layer Explorer. All rights reserved.
          </div>
        </div>
      </div>
    );
  }

  // 2. 워크스페이스 화면 (loading, success, error 상태)
  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-[#05050a] text-white">
      <Header />

      <div className="flex-1 flex overflow-hidden relative">
        
        {/* ★ 채굴 로딩 애니메이션 오버레이 */}
        {appState === 'loading' && (
          <div className="absolute inset-0 z-50 bg-[#05050a]/80 backdrop-blur-md flex flex-col items-center justify-center">
            <style>
              {`
                @keyframes chop {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(-45deg); }
                }
              `}
            </style>
            <div className="relative flex items-end justify-center mb-6">
              <div className="text-7xl animate-bounce z-10 drop-shadow-2xl">🐹</div>
              <div 
                className="text-6xl absolute right-[-35px] top-[-10px] origin-bottom-left" 
                style={{ animation: 'chop 0.3s ease-in-out infinite alternate' }}
              >
                ⛏️
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">DOM 데이터 채굴 중...</h3>
            <p className="text-[#10b981] font-mono text-sm animate-pulse">Puppeteer가 웹사이트 구조를 분석하고 있습니다</p>
          </div>
        )}

        {/* 좌측: 2D 뷰어 */}
        <div className="w-2/3 h-full relative border-r border-white/10 bg-[#0a0a0f] flex items-center justify-center">
          <OriginalViewer />
        </div>

        {/* 우측: 3D 캔버스 */}
        <div className="w-1/3 h-full relative overflow-hidden bg-[#05050a]">
          <LayerScene />
        </div>
      </div>
    </div>
  );
}