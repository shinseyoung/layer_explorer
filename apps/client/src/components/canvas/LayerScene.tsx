import React, { useState } from 'react';

// 임시 Mock 데이터 (추후 useLayerStore에서 연동)
const MOCK_LAYERS = [
  { id: '1', depth: 1, label: '<body>', color: 'rgba(30, 41, 59, 0.8)', rect: { x: 0, y: 0, width: 800, height: 600 } },
  { id: '2', depth: 2, label: '<header.header>', color: 'rgba(16, 185, 129, 0.3)', rect: { x: 0, y: 0, width: 800, height: 80 } },
  { id: '3', depth: 3, label: '<div.search_box>', color: 'rgba(59, 130, 246, 0.6)', rect: { x: 200, y: 20, width: 400, height: 40 } },
  { id: '4', depth: 2, label: '<main.main_banner>', color: 'rgba(139, 92, 246, 0.3)', rect: { x: 0, y: 80, width: 800, height: 520 } },
];

export default function LayerScene() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="w-full h-screen bg-[#05050a] flex flex-col items-center justify-center overflow-hidden select-none">
      <div className="text-white mb-12 font-mono opacity-50 tracking-widest text-sm">
        PURE CSS 3D LAYER VISUALIZER
      </div>
      
      {/* 3D 원근감을 형성하는 최상위 뷰포트 컨테이너 */}
      <div 
        className="relative flex items-center justify-center"
        style={{ 
          perspective: '2000px', 
          width: '800px', 
          height: '600px' 
        }}
      >
        {/* 모든 레이어에 일괄적으로 기울임(Tilt)을 적용하는 씬(Scene) 래퍼 */}
        <div 
          className="relative w-full h-full transition-transform duration-700 ease-out"
          style={{
            transformStyle: 'preserve-3d',
            transform: 'rotateX(60deg) rotateZ(-30deg)'
          }}
        >
          {MOCK_LAYERS.map((layer) => {
            const isHovered = hoveredId === layer.id;
            const isSelected = selectedId === layer.id;
            const isActive = isHovered || isSelected;
            
            // 핵심 로직: Z축(깊이) 계산
            const baseZ = layer.depth * 50; 
            const targetZ = isActive ? baseZ + 40 : baseZ; // 호버/클릭 시 위로 튀어나옴
            const scale = isActive ? 1.02 : 1;

            return (
              <div
                key={layer.id}
                onMouseEnter={() => setHoveredId(layer.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => setSelectedId(layer.id === selectedId ? null : layer.id)}
                className="absolute rounded-xl cursor-pointer transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{
                  backgroundColor: layer.color,
                  width: `${layer.rect.width}px`,
                  height: `${layer.rect.height}px`,
                  left: `${layer.rect.x}px`,
                  top: `${layer.rect.y}px`,
                  // 성능 최적화를 위한 하드웨어 가속 힌트
                  willChange: 'transform, border-color, box-shadow',
                  // 순수 CSS 3D Transform 적용
                  transform: `translateZ(${targetZ}px) scale(${scale})`,
                  border: isActive ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: isActive 
                    ? '0 20px 40px rgba(0,0,0,0.5), inset 0 0 20px rgba(255,255,255,0.1)' 
                    : '0 4px 6px rgba(0,0,0,0.3)',
                  zIndex: layer.depth,
                  backdropFilter: 'blur(4px)',
                }}
              >
                {/* 레이어 식별 라벨 (좌측 상단 고정) */}
                <div 
                  className={`absolute -top-3 -left-3 px-2 py-1 rounded-md text-xs font-bold font-mono transition-colors duration-200 pointer-events-none shadow-lg ${
                    isActive 
                      ? 'bg-[#10b981] text-black border border-[#10b981]' 
                      : 'bg-[#111] text-[#10b981] border border-[#10b981]/30'
                  }`}
                  style={{
                    // 텍스트가 눕혀진 상태에서도 잘 보이게 하려면 여기에 역회전을 줄 수도 있지만, 
                    // 현재는 눕혀진 뷰 자체를 유지하는 것이 목적이므로 생략합니다.
                  }}
                >
                  {layer.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="text-white mt-12 font-mono opacity-40 text-xs">
        * 레이어를 마우스 오버하거나 클릭해보세요.
      </div>
    </div>
  );
}