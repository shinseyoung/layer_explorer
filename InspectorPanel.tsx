import React, { useState } from 'react';
import { useLayerStore } from '../../store/useLayerStore';
import { List, X } from 'lucide-react';

export default function InspectorPanel() {
  const { layers, selectedId, setHoveredId, setSelectedId, layerSpread, setLayerSpread } = useLayerStore();
  const [isListOpen, setIsListOpen] = useState(false);

  return (
    // 공간을 차지하지 않는 절대 좌표(Absolute) 플로팅 컨테이너
    <div className="absolute top-6 left-6 right-6 z-50 pointer-events-none flex flex-col items-end gap-3">
      
      {/* 상단 컨트롤 바 (토글 및 슬라이더) */}
      <div className="w-full flex justify-between items-start pointer-events-auto">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white shadow-black drop-shadow-md">레이어 구조</h2>
          <p className="text-xs text-gray-400 font-mono shadow-black drop-shadow-md">총 {layers.length}개의 레이어</p>
        </div>
        
        <div className="flex items-center gap-4 bg-[#111111]/80 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-white/10 shadow-2xl">
          <button className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-mono font-bold transition-colors">
            2D
          </button>
          
          <div className="w-[1px] h-4 bg-white/20" />
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-mono">SPREAD</span>
            <input
              type="range"
              min="0"
              max="100"
              value={layerSpread}
              onChange={(e) => setLayerSpread(Number(e.target.value))}
              className="w-24 accent-[#10b981] cursor-pointer"
            />
          </div>

          <div className="w-[1px] h-4 bg-white/20" />

          {/* 목록 열기/닫기 토글 버튼 */}
          <button 
            onClick={() => setIsListOpen(!isListOpen)}
            className={`p-1.5 rounded-lg transition-colors ${isListOpen ? 'bg-[#10b981] text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
          >
            {isListOpen ? <X size={16} /> : <List size={16} />}
          </button>
        </div>
      </div>

      {/* 트리 구조 드롭다운 리스트 (토글 시에만 등장) */}
      {isListOpen && (
        <div className="w-64 max-h-[60vh] overflow-y-auto bg-[#111111]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl pointer-events-auto custom-scrollbar">
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
  );
}
