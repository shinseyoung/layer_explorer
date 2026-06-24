import React, { useState } from 'react';
import { Search, Loader2, FolderTree, X } from 'lucide-react';
import { useLayerStore, LayerScaleSize } from '../../store/useLayerStore';

export default function Header() {
  const [inputValue, setInputValue] = useState('');
  const { 
    setTargetUrl, startVisualizing, appState, 
    layers, layerSpread, setLayerSpread, 
    selectedLayerIds, toggleLayerSelection, setHoveredId,
    layerScale, setLayerScale,
    drillHistory, pushDrillDown
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
  const currentRoot = drillHistory[drillHistory.length - 1];

  // 현재 뷰어에서 보이는 직계 자식들만 트리에 표시
  const treeLayers = currentRoot 
    ? layers.filter(l => l.parentId === currentRoot.id) 
    : [];

  return (
    <header className="w-full h-16 flex border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-md z-50 min-w-max">
      
      <div className="w-2/3 h-full flex items-center justify-between px-8 border-r border-white/10">
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
            <span className="text-[#10b981]">LAYER</span>
            <span>EXPLORER</span>
          </h1>
          <span className="text-[10px] uppercase font-mono bg-white/10 px-2 py-0.5 rounded-full text-gray-400">Beta</span>
        </div>

        <form onSubmit={handleSubmit} className="w-[440px] flex items-center bg-[#111] rounded-xl border border-white/10 overflow-hidden focus-within:border-[#10b981]/50 transition-colors">
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
          <button type="submit" disabled={isLoading} className="bg-[#10b981] hover:bg-[#059669] text-white px-5 py-2.5 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
          </button>
        </form>
      </div>

      <div className="w-1/3 h-full flex items-center justify-between px-6">
        
        <div className="text-left whitespace-nowrap">
          <p className="text-sm font-bold tracking-tight text-white leading-none mb-1.5">현재 계층</p>
          <p className="text-[10px] text-gray-400 font-mono leading-none">{currentRoot?.label || '대기 중'}</p>
        </div>

        <div className="flex items-center gap-2 relative">
          
          <div className="flex bg-[#111] rounded-xl border border-white/10 p-1 mr-1">
            {(['sm', 'md', 'lg'] as LayerScaleSize[]).map((size) => (
              <button
                key={size}
                onClick={() => setLayerScale(size)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-colors ${layerScale === size ? 'bg-[#10b981] text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                {size.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-[#111] px-4 py-2.5 rounded-xl border border-white/10">
            <input
              type="range"
              min="0"
              max="100"
              title="Spread 레이어 간격 조절"
              value={layerSpread}
              onChange={(e) => setLayerSpread(Number(e.target.value))}
              className="w-20 accent-[#10b981] cursor-pointer"
            />
          </div>

          {/* 쓸모없는 필터 대신 트리 뷰어 강화 */}
          <div className="relative">
            <button 
              onClick={() => setIsListOpen(!isListOpen)}
              title="현재 계층 트리 보기"
              className={`p-2 rounded-xl transition-colors ${isListOpen ? 'bg-[#10b981] text-black' : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'}`}
            >
              {isListOpen ? <X size={18} /> : <FolderTree size={18} />}
            </button>

            {isListOpen && (
              <div className="absolute top-full right-0 mt-3 w-72 max-h-[60vh] overflow-y-auto bg-[#111111]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl z-50 custom-scrollbar">
                <div className="px-3 py-2 border-b border-white/10 mb-2">
                  <span className="text-xs text-gray-400 font-bold">내부 요소 ({treeLayers.length})</span>
                  <p className="text-[10px] text-gray-500 mt-1">더블클릭하여 파고들기</p>
                </div>
                {treeLayers.map((layer) => {
                  const isSelected = selectedLayerIds.includes(layer.id);
                  return (
                    <div
                      key={layer.id}
                      onClick={() => toggleLayerSelection(layer.id)}
                      onDoubleClick={() => pushDrillDown(layer)}
                      onMouseEnter={() => setHoveredId(layer.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#10b981]/15 border border-[#10b981]/30' : 'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`w-1.5 h-1.5 shrink-0 rounded-full ${isSelected ? 'bg-[#10b981]' : 'bg-gray-600'}`} />
                        <span className={`font-mono text-sm font-semibold truncate ${isSelected ? 'text-[#10b981]' : 'text-gray-200'}`}>
                          {layer.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono shrink-0 ml-2 border border-white/10 px-1.5 py-0.5 rounded">
                        {layer.tagName}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}