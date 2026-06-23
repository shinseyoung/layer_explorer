import React, { useState } from 'react';
import { Search, Loader2, List, X } from 'lucide-react';
import { useLayerStore } from '../../store/useLayerStore';

export default function Header() {
  const [inputValue, setInputValue] = useState('');
  const { 
    setTargetUrl, startVisualizing, appState, 
    layers, layerSpread, setLayerSpread, 
    selectedId, setSelectedId, setHoveredId 
  } = useLayerStore();
  const [isListOpen, setIsListOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const urlToFetch = inputValue.startsWith('http') ? inputValue : `https://${inputValue}`;
    setTargetUrl(urlToFetch);
    startVisualizing();
  };

  const isLoading = appState === 'loading';

  return (
    <header className="w-full h-16 flex border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-md z-50">
      
      {/* 1. 좌측 영역 (전체 화면의 2/3 차지) - px-8로 하단 2D 뷰어와 여백을 완벽히 일치시킴 */}
      <div className="w-2/3 h-full flex items-center justify-between px-8 border-r border-white/10">
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
            <span className="text-[#10b981]">LAYER</span>
            <span>EXPLORER</span>
          </h1>
          <span className="text-[10px] uppercase font-mono bg-white/10 px-2 py-0.5 rounded-full text-gray-400">Beta</span>
        </div>

        {/* 검색바를 우측 끝에 배치 (2D 뷰어 우측 끝과 정렬됨) */}
        <form 
          onSubmit={handleSubmit}
          className="w-[440px] flex items-center bg-[#111] rounded-xl border border-white/10 overflow-hidden focus-within:border-[#10b981]/50 transition-colors"
        >
          <div className="flex-1 flex items-center px-4">
            <Search size={16} className="text-gray-400 mr-2" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="https://www.naver.com"
              className="w-full bg-transparent text-sm text-white placeholder-gray-500 py-2.5 outline-none font-mono"
              disabled={isLoading}
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="bg-[#10b981] hover:bg-[#059669] text-white px-5 py-2.5 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
          </button>
        </form>
      </div>

      {/* 2. 우측 영역 (전체 화면의 1/3 차지) */}
      <div className="w-1/3 h-full flex items-center justify-between px-6">
        
        {/* 텍스트 좌측 정렬 교정 (글자 시작 위치 칼정렬) */}
        <div className="text-left">
          <p className="text-sm font-bold tracking-tight text-white leading-none mb-1.5">레이어 구조</p>
          <p className="text-[10px] text-gray-400 font-mono leading-none">총 {layers.length}개의 레이어</p>
        </div>

        <div className="flex items-center gap-3 relative">
          <div className="flex items-center gap-3 bg-[#111] px-3 py-1.5 rounded-xl border border-white/10">
            <span className="text-[10px] text-gray-500 font-mono">SPREAD</span>
            <input
              type="range"
              min="0"
              max="100"
              value={layerSpread}
              onChange={(e) => setLayerSpread(Number(e.target.value))}
              className="w-20 accent-[#10b981] cursor-pointer"
            />
          </div>

          <button 
            onClick={() => setIsListOpen(!isListOpen)}
            className={`p-2 rounded-xl transition-colors ${isListOpen ? 'bg-[#10b981] text-black' : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'}`}
          >
            {isListOpen ? <X size={18} /> : <List size={18} />}
          </button>

          {isListOpen && (
            <div className="absolute top-full right-0 mt-3 w-64 max-h-[60vh] overflow-y-auto bg-[#111111]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl z-50 custom-scrollbar">
              {layers.map((layer) => {
                const isSelected = selectedId === layer.id;
                return (
                  <div
                    key={layer.id}
                    onClick={() => setSelectedId(layer.id)}
                    onMouseEnter={() => setHoveredId(layer.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#10b981]/15 border border-[#10b981]/30' : 'hover:bg-white/5 border border-transparent'
                    }`}
                    style={{ paddingLeft: `${8 + layer.depth * 12}px` }}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[#10b981]' : 'bg-gray-600'}`} />
                    <div className="flex flex-col">
                      <span className={`font-mono text-sm font-semibold tracking-tight ${isSelected ? 'text-[#10b981]' : 'text-gray-200'}`}>
                        {layer.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
    </header>
  );
}