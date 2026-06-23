import React from 'react';
import { useLayerStore } from '../../store/useLayerStore';

export default function OriginalViewer() {
  const { layers, selectedId, hoveredId, setSelectedId, setHoveredId } = useLayerStore();

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden p-8">
      {/* 가상의 브라우저 스크린 (추후 백엔드에서 넘겨주는 스크린샷 이미지로 대체) */}
      <div 
        className="relative bg-[#111111] rounded-xl border border-white/10 shadow-2xl overflow-hidden"
        style={{ width: '800px', height: '600px' }} // Mock 데이터 비율에 맞춤
      >
        {/* 브라우저 상단 데코레이션 (맥OS 스타일) */}
        <div className="w-full h-10 bg-[#1a1a1a] flex items-center px-4 gap-2 border-b border-white/5">
          <div className="w-3 h-3 rounded-full bg-red-500/30"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/30"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/30"></div>
          <div className="ml-4 flex-1 max-w-sm h-6 bg-white/5 rounded-md flex items-center px-3">
            <span className="text-[10px] text-white/30 font-mono">https://www.naver.com (Mock)</span>
          </div>
        </div>

        {/* 2D 요소 하이라이트 오버레이 */}
        <div className="relative w-full h-[calc(100%-40px)]">
          {layers.map((layer) => {
            // body 등 전체 화면을 덮는 레이어는 2D 뷰에서 하이라이트 제외 (선택적)
            if (layer.tagName === 'body') return null;

            const isSelected = selectedId === layer.id;
            const isHovered = hoveredId === layer.id;
            const isActive = isSelected || isHovered;

            return (
              <div
                key={layer.id}
                onMouseEnter={() => setHoveredId(layer.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => setSelectedId(isSelected ? null : layer.id)}
                className={`absolute transition-all duration-300 cursor-pointer ${
                  isActive 
                    ? 'border-2 border-[#10b981] bg-[#10b981]/20 shadow-[0_0_20px_rgba(16,185,129,0.3)] z-40' 
                    : 'border border-dashed border-white/20 bg-white/5 hover:bg-white/10 z-10'
                }`}
                style={{
                  left: `${layer.rect.x}px`,
                  // 브라우저 탭(40px) 높이만큼 y좌표 보정
                  top: `${layer.rect.y - 40}px`,
                  width: `${layer.rect.width}px`,
                  height: `${layer.rect.height}px`,
                }}
              >
                {isActive && (
                  <div className="absolute -top-6 left-0 bg-[#10b981] text-black text-[10px] px-2 py-0.5 font-mono font-bold rounded-t-md">
                    {layer.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}