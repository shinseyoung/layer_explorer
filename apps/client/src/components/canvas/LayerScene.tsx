import React, { useEffect, useState, useRef } from 'react';
import { useLayerStore, LayerNode } from '../../store/useLayerStore';
import { ChevronRight, Home } from 'lucide-react';

const MOCK_LAYERS: Partial<LayerNode>[] = [
  { id: '1', parentId: null, depth: 0, label: 'body', tagName: 'body', className: '', rect: { x: 0, y: 0, width: 1200, height: 800 }, zIndex: 1 },
  { id: '2', parentId: '1', depth: 1, label: 'header', tagName: 'div', className: 'header', rect: { x: 0, y: 0, width: 1200, height: 80 }, zIndex: 2 },
  { id: '3', parentId: '1', depth: 1, label: 'main_banner', tagName: 'div', className: 'main_banner', rect: { x: 60, y: 120, width: 1080, height: 500 }, zIndex: 3 },
  { id: '4', parentId: '2', depth: 2, label: 'search_box', tagName: 'div', className: 'search_box', rect: { x: 240, y: 20, width: 720, height: 40 }, zIndex: 4 },
];

export default function LayerScene() {
  const { layers, hoveredId, selectedLayerIds, setHoveredId, toggleLayerSelection, setMockLayers, layerSpread, layerScale, hiddenLayerTags, appState, screenshot, drillHistory, pushDrillDown, popDrillUp } = useLayerStore();

  const [isMoving, setIsMoving] = useState(false);
  const moveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (layers.length === 0 && appState === 'idle') setMockLayers(MOCK_LAYERS as LayerNode[]);
  }, [layers.length, appState, setMockLayers]);

  useEffect(() => {
    setIsMoving(true);
    if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
    moveTimeoutRef.current = setTimeout(() => setIsMoving(false), 150);
    return () => { if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current); };
  }, [layerSpread, layerScale]);

  const sourceLayers = layers.length > 0 ? layers : (appState === 'idle' ? MOCK_LAYERS as LayerNode[] : []);
  
  const currentRoot = drillHistory[drillHistory.length - 1];
  
  const getVisibleFamily = () => {
    if (!currentRoot) return [];
    const getDescendants = (parentId: string, currentLevel: number): LayerNode[] => {
      if (currentLevel >= 2) return []; 
      const children = sourceLayers.filter(l => l.parentId === parentId && !hiddenLayerTags.includes(l.tagName));
      let descendants = [...children];
      children.forEach(c => { descendants = descendants.concat(getDescendants(c.id, currentLevel + 1)); });
      return descendants;
    };
    return [currentRoot, ...getDescendants(currentRoot.id, 0)];
  };

  const visibleLayers = getVisibleFamily();
  
  // ★ 동적 캔버스 크기: 현재 진입한 폴더(Root)의 실제 크기를 캔버스의 베이스 크기로 삼음
  const rootWidth = currentRoot ? Math.max(currentRoot.rect.width, 100) : 1200;
  const rootHeight = currentRoot ? Math.max(currentRoot.rect.height, 100) : 800;
  const rootX = currentRoot ? currentRoot.rect.x : 0;
  const rootY = currentRoot ? currentRoot.rect.y : 0;
  
  // 깊이 역시 파고든 요소를 0뎁스 기준으로 보정
  const baseDepth = currentRoot ? currentRoot.depth : 0;
  const maxRelativeDepth = Math.max(...visibleLayers.map(l => l.depth - baseDepth), 0);

  // ★ 비율 정규화 (세로로 긴 페이지가 화면 밖으로 뚫고 나가지 않도록 스케일 자동 조절)
  const STANDARD_W = 1200;
  const STANDARD_H = 800;
  const fitScale = Math.min(STANDARD_W / rootWidth, STANDARD_H / rootHeight);

  const getScaleValue = () => {
    switch (layerScale) { case 'sm': return 0.16; case 'lg': return 0.28; case 'md': default: return 0.22; }
  };
  // 사용자가 고른 스케일 * 화면에 맞추는 자동 비율 보정
  const scaleValue = getScaleValue() * fitScale;

  const GOLDEN_SCALE = 0.32;
  const GOLDEN_OFFSET_X = 320;
  const GOLDEN_OFFSET_Y = -1000;
  const GOLDEN_OFFSET_Z = -300;

  // 타겟 위치는 표준 화면(1200x800) 기준으로 고정하여 어느 스케일에서든 우측 상단으로 도달하게 함
  const TARGET_SCREEN_X = (STANDARD_W + GOLDEN_OFFSET_X) * GOLDEN_SCALE; 
  const TARGET_SCREEN_Y = (-STANDARD_H + GOLDEN_OFFSET_Y) * GOLDEN_SCALE; 
  const TARGET_SCREEN_Z = GOLDEN_OFFSET_Z * GOLDEN_SCALE;          

  const MAX_OFFSET_X = (TARGET_SCREEN_X / scaleValue) - rootWidth;
  const MAX_OFFSET_Y = (TARGET_SCREEN_Y / scaleValue) + rootHeight;
  const MAX_OFFSET_Z = TARGET_SCREEN_Z / scaleValue; 

  const getLabelFontSize = () => {
    switch (layerScale) { case 'sm': return 'text-6xl'; case 'lg': return 'text-4xl'; case 'md': default: return 'text-5xl'; }
  };
  const getSubLabelFontSize = () => {
    switch (layerScale) { case 'sm': return 'text-4xl'; case 'lg': return 'text-2xl'; case 'md': default: return 'text-3xl'; }
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#05050a]">
      <div className="absolute top-6 left-6 z-50 flex items-center bg-[#111]/80 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/10 shadow-xl max-w-[80%] overflow-hidden">
        <Home size={14} className="text-[#10b981] mr-2 shrink-0" />
        <div className="flex items-center overflow-x-auto custom-scrollbar whitespace-nowrap">
          {drillHistory.map((node, i) => (
            <React.Fragment key={node.id}>
              <button 
                onClick={() => popDrillUp(i)}
                className={`text-xs font-mono font-bold transition-colors hover:text-[#10b981] ${i === drillHistory.length - 1 ? 'text-white' : 'text-gray-500'}`}
              >
                {node.label}
              </button>
              {i < drillHistory.length - 1 && <ChevronRight size={14} className="text-gray-600 mx-1 shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="absolute" style={{ left: '3%', bottom: '10%', perspective: '7000px' }}>
        <div 
          className="relative transition-transform duration-700 ease-out"
          style={{ width: `${rootWidth}px`, height: `${rootHeight}px`, transformStyle: 'preserve-3d', transformOrigin: 'bottom left', transform: `scale(${scaleValue}) rotateX(-3deg) rotateY(-20deg) rotateZ(0deg)` }}
        >
          {visibleLayers.map((layer) => {
            const isActive = hoveredId === layer.id || selectedLayerIds.includes(layer.id);
            const spreadRatio = Math.min(layerSpread / 100, 1);
            
            // 깊이 역시 파고든 폴더 기준으로 재조정
            const relativeDepth = layer.depth - baseDepth;
            const invDepth = maxRelativeDepth - relativeDepth;
            const depthRatio = maxRelativeDepth > 0 ? invDepth / maxRelativeDepth : 0;
            
            const offsetX = depthRatio * MAX_OFFSET_X * spreadRatio;
            const offsetY = depthRatio * MAX_OFFSET_Y * spreadRatio;
            const baseZ   = depthRatio * MAX_OFFSET_Z * spreadRatio;
            const targetZ = isActive ? baseZ + 50 : baseZ; 

            // ★ 상대 좌표 계산: 파고든 폴더를 (0,0) 원점으로 간주하고 자식들을 배치
            const relativeX = layer.rect.x - rootX;
            const relativeY = layer.rect.y - rootY;

            const leftPct = (relativeX / rootWidth) * 100;
            const topPct = (relativeY / rootHeight) * 100;
            const widthPct = (layer.rect.width / rootWidth) * 100;
            const heightPct = (layer.rect.height / rootHeight) * 100;

            const sMult = GOLDEN_SCALE / scaleValue;
            
            const activeShadow = isMoving ? 'none' : `-${2*sMult}px ${2*sMult}px 0 rgba(16,185,129,0.8), -${4*sMult}px ${4*sMult}px 0 rgba(16,185,129,0.6), -${6*sMult}px ${6*sMult}px 0 rgba(16,185,129,0.4), 0 ${35*sMult}px ${70*sMult}px rgba(16,185,129,0.4)`;
            const defaultShadow = isMoving ? 'none' : `-${2*sMult}px ${2*sMult}px 0 rgba(255,255,255,0.15), -${4*sMult}px ${4*sMult}px 0 rgba(255,255,255,0.1), -${6*sMult}px ${6*sMult}px 0 rgba(255,255,255,0.05), 0 ${20*sMult}px ${50*sMult}px rgba(0,0,0,0.8)`;
            const bgColor = isActive ? (isMoving ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)') : (isMoving ? 'rgba(25, 25, 30, 0.8)' : 'rgba(25, 25, 30, 0.5)');

            return (
              <div
                key={layer.id}
                onMouseEnter={() => setHoveredId(layer.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={(e) => { e.stopPropagation(); toggleLayerSelection(layer.id); }}
                onDoubleClick={(e) => { e.stopPropagation(); pushDrillDown(layer); }}
                className={`absolute w-full h-full rounded-3xl pointer-events-auto cursor-pointer transition-all duration-[600ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isActive ? 'z-50' : 'z-auto'}`}
                style={{
                  left: `${leftPct}%`, top: `${topPct}%`, width: `${widthPct}%`, height: `${heightPct}%`,
                  willChange: 'transform, box-shadow, background-color',
                  transform: `translateZ(${targetZ}px) translateX(${offsetX}px) translateY(${offsetY}px)`,
                  backgroundColor: bgColor,
                  border: isActive ? `${4*sMult}px solid rgba(16, 185, 129, 0.8)` : `${2*sMult}px solid rgba(255, 255, 255, 0.1)`,
                  boxShadow: isActive ? activeShadow : defaultShadow,
                  backdropFilter: isMoving ? 'none' : 'blur(4px)',
                }}
              >
                {/* 스크린샷 맵핑: 파고들더라도 절대 좌표인 rect.x/y를 이용하여 배경을 동일하게 크롭 */}
                {screenshot && (
                  <div 
                    className="absolute top-0 left-0 w-full h-full rounded-[inherit] overflow-hidden opacity-40 pointer-events-none mix-blend-screen"
                    style={{ 
                      backgroundImage: `url(${screenshot})`, 
                      // 스크린샷은 원본 전체 사이트의 크기를 가짐
                      backgroundSize: `${layers[0]?.rect.width || 1200}px ${layers[0]?.rect.height || 800}px`, 
                      backgroundPosition: `-${layer.rect.x}px -${layer.rect.y}px`, 
                      backgroundRepeat: 'no-repeat' 
                    }}
                  />
                )}

                <div className={`absolute top-8 left-8 transition-opacity duration-300 pointer-events-none flex items-center ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                  <div className={`flex items-center gap-4 bg-[#0a0a0f]/90 backdrop-blur-xl px-5 py-4 rounded-2xl border ${isActive ? 'border-[#10b981]/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'border-white/10'} shadow-2xl`}>
                    <div className={`w-3.5 h-3.5 rounded-full ${isActive ? 'bg-[#10b981] shadow-[0_0_12px_#10b981] animate-pulse' : 'bg-gray-500'}`} />
                    <div className="flex flex-col">
                      <span className={`font-mono font-bold tracking-tight leading-none ${getLabelFontSize()} ${isActive ? 'text-[#10b981]' : 'text-white'}`}>{layer.label}</span>
                      <span className={`text-gray-400 font-mono mt-2 leading-none ${getSubLabelFontSize()}`}>{layer.className ? `.${layer.className.split(' ')[0]}` : layer.tagName}</span>
                    </div>
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