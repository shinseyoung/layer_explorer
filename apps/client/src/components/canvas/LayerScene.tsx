import React, { useEffect } from 'react';
import { useLayerStore, LayerNode } from '../../store/useLayerStore';

// 와이드(1200x800) 기준으로 더 넓게 보이도록 Mock 데이터 수정
const MOCK_LAYERS: Partial<LayerNode>[] = [
  { id: '1', depth: 0, label: 'body', tagName: 'body', className: '', rect: { x: 0, y: 0, width: 1200, height: 800 }, zIndex: 1 },
  { id: '2', depth: 1, label: 'header', tagName: 'div', className: 'header', rect: { x: 0, y: 0, width: 1200, height: 80 }, zIndex: 2 },
  { id: '3', depth: 2, label: 'main_banner', tagName: 'div', className: 'main_banner', rect: { x: 60, y: 120, width: 1080, height: 500 }, zIndex: 3 },
  { id: '4', depth: 3, label: 'search_box', tagName: 'div', className: 'search_box', rect: { x: 240, y: 20, width: 720, height: 40 }, zIndex: 4 },
];

export default function LayerScene() {
  const { layers, hoveredId, selectedId, setHoveredId, setSelectedId, setMockLayers, layerSpread } = useLayerStore();

  useEffect(() => {
    if (layers.length === 0) setMockLayers(MOCK_LAYERS as LayerNode[]);
  }, [layers.length, setMockLayers]);

  const renderLayers = layers.length > 0 ? layers : (MOCK_LAYERS as LayerNode[]);
  const maxDepth = Math.max(...renderLayers.map(l => l.depth), 0);

  const viewWidth = 1200;
  const viewHeight = 800;

  return (
    // 드래그/줌 모두 제거하고 절대 위치에 앵커 고정
    <div className="w-full h-full relative overflow-hidden bg-[#05050a]">
      {/* 씬의 시작점: 좌측 대각선 하단 */}
      <div 
        className="absolute" 
        style={{ 
          left: '3%', 
          bottom: '10%', 
          perspective: '7000px' 
        }}
      >
        <div 
          className="relative transition-transform duration-700 ease-out"
          style={{
            width: `${viewWidth}px`, 
            height: `${viewHeight}px`, 
            transformStyle: 'preserve-3d',
            transformOrigin: 'bottom left',
            // 작게 축소한 뒤 사용자가 지정한 시선 앵글 적용
            transform: 'scale(0.32) rotateX(-3deg) rotateY(-20deg) rotateZ(0deg)'
          }}
        >
          {renderLayers.map((layer) => {
            const isActive = hoveredId === layer.id || selectedId === layer.id;
            const spreadRatio = Math.min(layerSpread / 100, 1);
            
            // 맨 앞 레이어(가장 큰 depth)를 기준점 0으로 고정
            const invDepth = maxDepth - layer.depth;
            
            // spread가 늘어날수록 뒤 레이어들이 위(-Y), 우측(+X), 뒤쪽(-Z)으로 밀림
            const offsetX = invDepth * 115 * spreadRatio;
            const maxVerticalSpread = 700;

            const stepY =
              maxDepth > 0
                ? maxVerticalSpread / maxDepth
                : 0;

            const offsetY =
              invDepth *
              -stepY *
              spreadRatio;
              
            const baseZ   = invDepth * -90 * spreadRatio;
            
            const targetZ = isActive ? baseZ + 50 : baseZ; 

            // 요소의 절대 크기를 비율(%)로 변환
            const leftPct = (layer.rect.x / viewWidth) * 100;
            const topPct = (layer.rect.y / viewHeight) * 100;
            const widthPct = (layer.rect.width / viewWidth) * 100;
            const heightPct = (layer.rect.height / viewHeight) * 100;

            const thicknessShadow = isActive
              ? `-1px 1px 0 rgba(16,185,129,0.8), -2px 2px 0 rgba(16,185,129,0.6), -3px 3px 0 rgba(16,185,129,0.4), 0 35px 70px rgba(16,185,129,0.4)`
              : `-1px 1px 0 rgba(255,255,255,0.15), -2px 2px 0 rgba(255,255,255,0.1), -3px 3px 0 rgba(255,255,255,0.05), 0 20px 50px rgba(0,0,0,0.8)`;

            return (
              <div
                key={layer.id}
                onMouseEnter={() => setHoveredId(layer.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => setSelectedId(layer.id === selectedId ? null : layer.id)}
                className={`absolute top-0 left-0 w-full h-full rounded-3xl pointer-events-auto cursor-pointer transition-all duration-[600ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isActive ? 'z-50' : 'z-auto'}`}
                style={{
                  willChange: 'transform, box-shadow, background-color',
                  transform: `translateZ(${targetZ}px) translateX(${offsetX}px) translateY(${offsetY}px)`,
                  backgroundColor: isActive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(25, 25, 30, 0.5)',
                  border: isActive ? '2px solid rgba(16, 185, 129, 0.8)' : '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: thicknessShadow,
                  backdropFilter: 'blur(4px)',
                }}
              >
                <div
                  className={`absolute rounded-md transition-all duration-[600ms] ${isActive ? 'border-4 border-[#10b981] bg-[#10b981]/30 shadow-[0_0_40px_rgba(16,185,129,0.8)]' : 'border-2 border-white/20 bg-white/5'}`}
                  style={{ 
                    left: `${leftPct}%`, 
                    top: `${topPct}%`, 
                    width: `${widthPct}%`, 
                    height: `${heightPct}%` 
                  }}
                />

                <div 
                  className={`absolute top-1/2 -translate-y-1/2 transition-opacity duration-300 pointer-events-none whitespace-nowrap flex items-center ${isActive ? 'opacity-100' : 'opacity-40'}`}
                  style={{ right: '-320px', transform: 'rotateY(20deg) rotateX(20deg)' }}
                >
                  <div className="w-16 h-[2px] bg-white/30 mr-6"></div>
                  <div>
                    <p className={`font-mono text-2xl font-bold tracking-tight ${isActive ? 'text-[#10b981]' : 'text-white'}`}>{layer.label}</p>
                    <p className="text-gray-500 text-lg font-mono">{layer.className ? `.${layer.className.split(' ')[0]}` : layer.tagName}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}