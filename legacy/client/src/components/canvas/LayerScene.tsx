import React, { useEffect, useState, useRef } from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { useLayerStore, LayerNode } from '../../store/useLayerStore';

const MOCK_LAYERS: Partial<LayerNode>[] = [
  { id: '1', parentId: null, depth: 0, label: 'body', tagName: 'body', className: '', rect: { x: 0, y: 0, width: 1200, height: 800 }, zIndex: 1 },
  { id: '2', parentId: '1', depth: 1, label: 'header', tagName: 'div', className: 'header', rect: { x: 0, y: 0, width: 1200, height: 80 }, zIndex: 2 },
  { id: '3', parentId: '1', depth: 1, label: 'main_banner', tagName: 'div', className: 'main_banner', rect: { x: 60, y: 120, width: 1080, height: 500 }, zIndex: 3 },
  { id: '4', parentId: '2', depth: 2, label: 'search_box', tagName: 'div', className: 'search_box', rect: { x: 240, y: 20, width: 720, height: 40 }, zIndex: 4 },
];

export default function LayerScene() {
  const {
    layers, hoveredId, selectedLayerIds, setHoveredId, toggleLayerSelection,
    setMockLayers, layerSpread, setLayerSpread, hiddenLayerTags, appState, screenshot,
    drillHistory, pushDrillDown, popDrillUp,
  } = useLayerStore();

  const [isMoving, setIsMoving] = useState(false);
  const moveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 289, height: 665 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setViewport({ width, height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (layers.length === 0 && appState === 'idle') setMockLayers(MOCK_LAYERS as LayerNode[]);
  }, [layers.length, appState, setMockLayers]);

  useEffect(() => {
    setIsMoving(true);
    if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
    moveTimeoutRef.current = setTimeout(() => setIsMoving(false), 150);
    return () => { if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current); };
  }, [layerSpread, drillHistory]);

  const handleWheel = (e: React.WheelEvent) => {
    // 마우스 휠 감도를 대폭 향상시켜 시원하게 조절되도록 수정
    const sensitivity = 0.3; 
    const delta = -(e.deltaY * sensitivity);
    setLayerSpread(Math.max(0, Math.min(100, layerSpread + delta)));
  };

  const sourceLayers = layers.length > 0 ? layers : appState === 'idle' ? (MOCK_LAYERS as LayerNode[]) : [];
  const currentRoot = drillHistory[drillHistory.length - 1];

  const getVisibleFamily = () => {
    if (!currentRoot) return [];
    const getDescendants = (parentId: string, currentLevel: number): LayerNode[] => {
      if (currentLevel >= 2) return [];
      const children = sourceLayers.filter(l => l.parentId === parentId && !hiddenLayerTags.includes(l.tagName));
      let descendants: LayerNode[] = [...children];
      children.forEach(c => { descendants = descendants.concat(getDescendants(c.id, currentLevel + 1)); });
      return descendants;
    };
    return [currentRoot, ...getDescendants(currentRoot.id, 0)];
  };

  const visibleLayers = getVisibleFamily();
  const baseDepth = currentRoot ? currentRoot.depth : 0;
  
  const maxVisibleDepth = visibleLayers.length > 0 ? Math.max(...visibleLayers.map(l => l.depth)) : baseDepth;
  const totalLevels = maxVisibleDepth - baseDepth;

  const rootWidth = currentRoot ? currentRoot.rect.width || 1 : 1200;
  const rootHeight = currentRoot ? currentRoot.rect.height || 1 : 800;
  const rootX = currentRoot ? currentRoot.rect.x : 0;
  const rootY = currentRoot ? currentRoot.rect.y : 0;

  const spreadBase = Math.max(rootWidth, rootHeight, 800); 
  const TARGET_X = spreadBase * 0.4;   
  const TARGET_Y = -spreadBase * 0.4; 
  const MAX_OFFSET_Z = -600; 

  const totalBoxWidth = rootWidth + TARGET_X;
  const totalBoxHeight = rootHeight + Math.abs(TARGET_Y);

  const paddingX = viewport.width * 0.15;
  const paddingY = viewport.height * 0.15;
  const availableWidth = Math.max(viewport.width - paddingX, 50);
  const availableHeight = Math.max(viewport.height - paddingY, 50);

  const scaleX = availableWidth / totalBoxWidth;
  const scaleY = availableHeight / totalBoxHeight;
  const scaleValue = Math.max(Math.min(scaleX, scaleY, 0.4), 0.02);

  const renderedBoxWidth = totalBoxWidth * scaleValue;
  const renderedBoxHeight = totalBoxHeight * scaleValue;
  
  const leftOffset = Math.max((viewport.width - renderedBoxWidth) / 2, 20);
  const bottomOffset = Math.max((viewport.height - renderedBoxHeight) / 2, 20);

  const GOLDEN_SCALE = 0.22;
  const sMult = Math.min(Math.max(GOLDEN_SCALE / scaleValue, 1), 4);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative overflow-hidden bg-[#05050a]"
      onWheel={handleWheel}
    >
      {/* breadcrumb */}
      <div className="absolute top-6 left-6 z-50 flex items-center bg-[#111]/80 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/10 shadow-xl max-w-[80%] overflow-hidden pointer-events-auto">
        <Home size={14} className="text-[#10b981] mr-2 shrink-0" />
        <div className="flex items-center overflow-x-auto custom-scrollbar whitespace-nowrap">
          {drillHistory.map((node, i) => (
            <React.Fragment key={node.id}>
              <button
                onClick={() => popDrillUp(i)}
                className={`text-xs font-mono font-bold transition-colors hover:text-[#10b981] ${
                  i === drillHistory.length - 1 ? 'text-white' : 'text-gray-500'
                }`}
              >
                {node.label}
              </button>
              {i < drillHistory.length - 1 && <ChevronRight size={14} className="text-gray-600 mx-1 shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* scene */}
      <div className="absolute w-full h-full" style={{ perspective: '20000px' }}>
        <div
          className="absolute transition-transform duration-700 ease-out"
          style={{
            left: `${leftOffset}px`, 
            bottom: `${bottomOffset}px`, 
            width: `${rootWidth}px`,
            height: `${rootHeight}px`,
            transformStyle: 'preserve-3d',
            transformOrigin: 'bottom left',
            transform: `scale(${scaleValue}) rotateX(-20deg) rotateY(-20deg) rotateZ(0deg)`
          }}
        >
          {visibleLayers.map((layer) => {
            const isActive = hoveredId === layer.id || selectedLayerIds.includes(layer.id);
            
            const invertedDepth = maxVisibleDepth - layer.depth;
            const depthRatio = totalLevels === 0 ? 0 : invertedDepth / totalLevels;
            const spreadRatio = Math.min(layerSpread / 100, 1);

            const offsetX = depthRatio * TARGET_X * spreadRatio;
            const offsetY = depthRatio * TARGET_Y * spreadRatio;
            const baseZ = depthRatio * MAX_OFFSET_Z * spreadRatio;
            
            const targetZ = isActive ? baseZ + 50 : baseZ;

            const relativeX = layer.rect.x - rootX;
            const relativeY = layer.rect.y - rootY;

            const leftPct = (relativeX / rootWidth) * 100;
            const topPct = (relativeY / rootHeight) * 100;
            const widthPct = (layer.rect.width / rootWidth) * 100;
            const heightPct = (layer.rect.height / rootHeight) * 100;

            const activeShadow = isMoving
              ? 'none'
              : `-${2 * sMult}px ${2 * sMult}px 0 rgba(16,185,129,0.8),
                 -${4 * sMult}px ${4 * sMult}px 0 rgba(16,185,129,0.6),
                 -${6 * sMult}px ${6 * sMult}px 0 rgba(16,185,129,0.4),
                 0 ${35 * sMult}px ${70 * sMult}px rgba(16,185,129,0.4)`;

            const defaultShadow = isMoving
              ? 'none'
              : `-${2 * sMult}px ${2 * sMult}px 0 rgba(255,255,255,0.15),
                 -${4 * sMult}px ${4 * sMult}px 0 rgba(255,255,255,0.1),
                 -${6 * sMult}px ${6 * sMult}px 0 rgba(255,255,255,0.05),
                 0 ${20 * sMult}px ${50 * sMult}px rgba(0,0,0,0.8)`;

            const bgColor = isActive
              ? isMoving ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)'
              : isMoving ? 'rgba(25, 25, 30, 0.8)' : 'rgba(25, 25, 30, 0.5)';

            return (
              <div
                key={layer.id}
                onMouseEnter={() => setHoveredId(layer.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={(e) => { e.stopPropagation(); toggleLayerSelection(layer.id); }}
                onDoubleClick={(e) => { e.stopPropagation(); pushDrillDown(layer); }}
                className={`absolute w-full h-full rounded-[inherit] pointer-events-auto cursor-pointer transition-all duration-[600ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                  isActive ? 'z-50' : 'z-auto'
                }`}
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                  willChange: 'transform, box-shadow, background-color',
                  transform: `translateZ(${targetZ}px) translateX(${offsetX}px) translateY(${offsetY}px)`,
                  backgroundColor: bgColor,
                  border: isActive
                    ? `${4 * sMult}px solid rgba(16, 185, 129, 0.8)`
                    : `${2 * sMult}px solid rgba(255, 255, 255, 0.1)`,
                  boxShadow: isActive ? activeShadow : defaultShadow,
                  backdropFilter: isMoving ? 'none' : 'blur(4px)',
                  borderRadius: `${24 * sMult}px`,
                }}
              >
                {screenshot && (
                  <div 
                    className="absolute top-0 left-0 w-full h-full rounded-[inherit] overflow-hidden opacity-40 pointer-events-none mix-blend-screen"
                    style={{ 
                      backgroundImage: `url(${screenshot})`, 
                      backgroundSize: `${layers[0]?.rect.width || 1200}px ${layers[0]?.rect.height || 800}px`,
                      backgroundPosition: `-${layer.rect.x}px -${layer.rect.y}px`,
                      backgroundRepeat: 'no-repeat' 
                    }}
                  />
                )}

                <div
                  className={`absolute transition-opacity duration-300 pointer-events-none flex items-center ${
                    isActive ? 'opacity-100' : 'opacity-40'
                  }`}
                  style={{ top: `${32 * sMult}px`, left: `${32 * sMult}px` }}
                >
                  <div
                    className={`flex items-center bg-[#0a0a0f]/90 backdrop-blur-xl border ${
                      isActive ? 'border-[#10b981]/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'border-white/10'
                    } shadow-2xl`}
                    style={{
                      padding: `${16 * sMult}px ${24 * sMult}px`,
                      gap: `${16 * sMult}px`,
                      borderRadius: `${16 * sMult}px`,
                    }}
                  >
                    <div
                      className={`rounded-full ${
                        isActive ? 'bg-[#10b981] shadow-[0_0_12px_#10b981] animate-pulse' : 'bg-gray-500'
                      }`}
                      style={{ width: `${14 * sMult}px`, height: `${14 * sMult}px` }}
                    />
                    <div className="flex flex-col">
                      <span
                        className={`font-mono font-bold tracking-tight leading-none ${
                          isActive ? 'text-[#10b981]' : 'text-white'
                        }`}
                        style={{ fontSize: `${40 * sMult}px` }}
                      >
                        {layer.label}
                      </span>
                      <span
                        className="text-gray-400 font-mono leading-none"
                        style={{ fontSize: `${20 * sMult}px`, marginTop: `${8 * sMult}px` }}
                      >
                        {layer.className ? `.${layer.className.split(' ')[0]}` : layer.tagName}
                      </span>
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