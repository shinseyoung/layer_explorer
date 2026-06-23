import React, { useEffect } from 'react';
import { useLayerStore, LayerNode } from '../../store/useLayerStore';

// 목업 데이터 (디자인 확인용 임시 데이터)
const MOCK_LAYERS: Partial<LayerNode>[] = [
  { id: '1', depth: 0, label: 'body', tagName: 'body', className: '', rect: { x: 0, y: 0, width: 800, height: 600 }, zIndex: 1 },
  { id: '2', depth: 1, label: 'header', tagName: 'div', className: 'header', rect: { x: 0, y: 0, width: 800, height: 80 }, zIndex: 2 },
  { id: '3', depth: 2, label: 'main_banner', tagName: 'div', className: 'main_banner', rect: { x: 40, y: 100, width: 720, height: 460 }, zIndex: 3 },
  { id: '4', depth: 3, label: 'search_box', tagName: 'div', className: 'search_box', rect: { x: 160, y: 20, width: 480, height: 40 }, zIndex: 4 },
];

export default function LayerScene() {
  const { layers, hoveredId, selectedId, setHoveredId, setSelectedId, setMockLayers } = useLayerStore();

  useEffect(() => {
    if (layers.length === 0) {
      setMockLayers(MOCK_LAYERS as LayerNode[]);
    }
  }, [layers.length, setMockLayers]);

  const renderLayers = layers.length > 0 ? layers : (MOCK_LAYERS as LayerNode[]);

  // 3D 뷰포트를 화면에 맞게 축소하기 위한 스케일
  const viewScale = 0.5;

  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
      {/* 3D 원근감을 형성하는 뷰포트 */}
      <div 
        className="relative flex items-center justify-center"
        style={{ perspective: '2000px', transform: `scale(${viewScale})` }}
      >
        {/* 씬(Scene) 래퍼: 전체 기울임 적용 */}
        <div 
          className="relative transition-transform duration-700 ease-out"
          style={{
            width: '800px', // 전체 웹사이트 기준 너비
            height: '600px', // 전체 웹사이트 기준 높이
            transformStyle: 'preserve-3d',
            transform: 'rotateX(60deg) rotateZ(-30deg) rotateY(0deg)'
          }}
        >
          {renderLayers.map((layer) => {
            const isHovered = hoveredId === layer.id;
            const isSelected = selectedId === layer.id;
            const isActive = isHovered || isSelected;
            
            // 핵심 로직: Z축(깊이) 계산
            const baseZ = layer.depth * 100; // 층간 간격
            const targetZ = isActive ? baseZ + 40 : baseZ; 
            
            return (
              <div
                key={layer.id}
                onMouseEnter={() => setHoveredId(layer.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => setSelectedId(layer.id === selectedId ? null : layer.id)}
                // 전체 화면 크기의 반투명 레이어 패널 (Glassmorphism)
                className="absolute top-0 left-0 w-full h-full rounded-xl cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{
                  willChange: 'transform, border-color, box-shadow',
                  transform: `translateZ(${targetZ}px)`,
                  backgroundColor: isActive ? 'rgba(16, 185, 129, 0.02)' : 'rgba(255, 255, 255, 0.01)',
                  border: isActive ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(255, 255, 255, 0.05)',
                  boxShadow: isActive ? '0 0 40px rgba(16, 185, 129, 0.15)' : 'none',
                  zIndex: layer.zIndex || layer.depth,
                  backdropFilter: 'blur(2px)',
                }}
              >
                {/* 패널 우측 라벨 (목업 이미지 우측 텍스트처럼) */}
                <div 
                  className={`absolute -right-32 top-1/2 -translate-y-1/2 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-40'}`}
                  style={{ transform: 'rotateZ(30deg) rotateX(-60deg)' }} // 텍스트는 정면을 보게 역회전 보정
                >
                  <p className={`font-mono text-lg font-bold ${isActive ? 'text-[#10b981]' : 'text-white'}`}>
                    {layer.label}
                  </p>
                  <p className="text-gray-500 text-sm font-mono">
                    {layer.className ? `.${layer.className}` : layer.tagName}
                  </p>
                </div>

                {/* 해당 레이어에 속한 특정 요소(Element)만 불투명/하이라이트 렌더링 */}
                <div
                  className={`absolute rounded transition-all duration-300 ${
                    isActive 
                      ? 'border-2 border-[#10b981] bg-[#10b981]/20 shadow-[0_0_30px_rgba(16,185,129,0.4)]' 
                      : 'border border-white/20 bg-white/10'
                  }`}
                  style={{
                    left: `${layer.rect.x}px`,
                    top: `${layer.rect.y}px`,
                    width: `${layer.rect.width}px`,
                    height: `${layer.rect.height}px`,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}