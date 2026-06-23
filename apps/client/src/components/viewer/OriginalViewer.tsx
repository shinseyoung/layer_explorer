import React, { useState } from 'react';
import { useLayerStore } from '../../store/useLayerStore';
import { X, ChevronRight } from 'lucide-react';

export default function OriginalViewer() {
  const { layers, selectedId, hoveredId, setSelectedId, setHoveredId } = useLayerStore();
  const [showPopup, setShowPopup] = useState(false);

  const handleLayerClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    setSelectedId(id);
    setShowPopup(true);
  };

  const handleBgClick = () => {
    setSelectedId(null);
    setShowPopup(false);
  };

  // 뷰어 비율을 와이드(1200x800)로 가정하여 화면을 꽉 채우도록 설정
  const bodyLayer = layers.find(l => l.tagName === 'body');
  const viewWidth = bodyLayer ? bodyLayer.rect.width : 1200;
  const viewHeight = bodyLayer ? bodyLayer.rect.height : 800;

  return (
    // 상단 검색바의 px-8과 정확히 일치하는 좌우 여백 적용
    <div className="w-full h-full flex flex-col items-center justify-center overflow-hidden p-8" onClick={handleBgClick}>
      <div 
        className="relative bg-[#111111] w-full max-h-full rounded-xl border border-white/10 shadow-2xl flex flex-col transition-all duration-300"
        style={{ aspectRatio: `${viewWidth} / ${viewHeight}` }} 
      >
        {/* 상단 브라우저 탭 */}
        <div className="w-full min-h-[40px] bg-[#1a1a1a] flex items-center px-4 gap-2 border-b border-white/5 rounded-t-xl z-20">
          <div className="w-3 h-3 rounded-full bg-red-500/30"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/30"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/30"></div>
          <div className="ml-4 flex-1 max-w-sm h-6 bg-white/5 rounded-md flex items-center px-3">
            <span className="text-[10px] text-white/30 font-mono">https://www.naver.com (Mock)</span>
          </div>
        </div>

        {/* 2D 요소 렌더링 컨테이너 (반응형 % 비율 사용) */}
        <div className="relative flex-1 w-full rounded-b-xl overflow-hidden">
          {layers.map((layer) => {
            if (layer.tagName === 'body') return null;

            const isSelected = selectedId === layer.id;
            const isHovered = hoveredId === layer.id;
            const isActive = isSelected || isHovered;

            // 절대 크기를 비율(%)로 변환하여 창 크기에 맞춰 꽉 차게 렌더링
            const leftPct = (layer.rect.x / viewWidth) * 100;
            const topPct = (layer.rect.y / viewHeight) * 100;
            const widthPct = (layer.rect.width / viewWidth) * 100;
            const heightPct = (layer.rect.height / viewHeight) * 100;

            return (
              <React.Fragment key={layer.id}>
                <div
                  onMouseEnter={() => setHoveredId(layer.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={(e) => handleLayerClick(layer.id, e)}
                  className={`absolute transition-all duration-300 cursor-pointer ${
                    isActive 
                      ? 'border-2 border-[#10b981] bg-[#10b981]/20 shadow-[0_0_20px_rgba(16,185,129,0.3)] z-40' 
                      : 'border border-dashed border-white/20 bg-white/5 hover:bg-white/10 z-10'
                  }`}
                  style={{
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    width: `${widthPct}%`,
                    height: `${heightPct}%`,
                  }}
                >
                  {isActive && (
                    <div className="absolute -top-6 left-0 bg-[#10b981] text-black text-[10px] px-2 py-0.5 font-mono font-bold rounded-t-md whitespace-nowrap">
                      {layer.label}
                    </div>
                  )}
                </div>

                {/* 2D 뷰어 팝업 복구 (선택한 영역 근처에 생성됨) */}
                {showPopup && isSelected && (
                  <div
                    className="absolute z-50 w-64 bg-[#111111]/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.8)] text-white overflow-hidden"
                    style={{
                      // 화면 우측을 벗어나지 않도록 % 위치 조정
                      left: `${Math.min(leftPct + widthPct + 2, 70)}%`,
                      top: `${Math.min(topPct, 60)}%`,
                    }}
                    onClick={(e) => e.stopPropagation()} 
                  >
                    <div className="flex items-center justify-between p-3 border-b border-white/5 bg-white/[0.02]">
                      <h3 className="text-[#10b981] font-mono font-bold text-sm truncate pr-2">{layer.label}</h3>
                      <button onClick={() => setShowPopup(false)} className="text-gray-500 hover:text-white transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="p-3 flex flex-col gap-3 text-xs">
                      <div className="flex justify-between"><span className="text-gray-400">요소 타입</span><span className="font-mono">{`<${layer.tagName.toLowerCase()}>`}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">클래스</span><span className="font-mono truncate max-w-[120px]">{layer.className || '-'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">크기</span><span className="font-mono">{layer.rect.width} × {layer.rect.height}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">z-index</span><span className="font-mono">{layer.zIndex || 'auto'}</span></div>
                      
                      <div className="pt-2 border-t border-white/5 mt-1">
                        <button className="w-full flex items-center justify-between px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors group">
                          <span className="font-medium text-gray-300 group-hover:text-white">자세히 보기</span>
                          <ChevronRight size={14} className="text-gray-500 group-hover:text-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}