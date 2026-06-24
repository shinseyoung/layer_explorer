import React, { useState } from 'react';
import { useLayerStore } from '../../store/useLayerStore';
import { X, ChevronRight, Image as ImageIcon } from 'lucide-react';

export default function OriginalViewer() {
  const { layers, selectedLayerIds, hiddenLayerTags, screenshot, targetUrl, drillHistory } = useLayerStore();
  const [popupNodeId, setPopupNodeId] = useState<string | null>(null);

  const handleLayerClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (selectedLayerIds.includes(id)) {
      setPopupNodeId(id);
    }
  };

  const currentRoot = drillHistory[drillHistory.length - 1] || layers[0];
  const rootWidth = currentRoot ? Math.max(currentRoot.rect.width, 10) : 1200;
  const rootHeight = currentRoot ? Math.max(currentRoot.rect.height, 10) : 800;
  const rootX = currentRoot ? currentRoot.rect.x : 0;
  const rootY = currentRoot ? currentRoot.rect.y : 0;

  const visibleLayers = layers.filter(layer => !hiddenLayerTags.includes(layer.tagName));

  return (
    <div className="w-full h-full flex flex-col items-center justify-center overflow-hidden p-8" onClick={() => setPopupNodeId(null)}>
      {/* 2D 뷰어 역시 파고든 폴더의 비율에 맞춰 동적으로 늘어나거나 줄어듦 */}
      <div 
        className="relative bg-[#111111] max-w-full max-h-full rounded-xl border border-white/10 shadow-2xl flex flex-col transition-all duration-300"
        style={{ aspectRatio: `${rootWidth} / ${rootHeight}`, width: '100%', height: 'auto' }} 
      >
        <div className="w-full min-h-[40px] bg-[#1a1a1a] flex items-center px-4 gap-2 border-b border-white/5 rounded-t-xl z-20">
          <div className="w-3 h-3 rounded-full bg-red-500/30"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/30"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/30"></div>
          <div className="ml-4 flex-1 max-w-sm h-6 bg-white/5 rounded-md flex items-center px-3 truncate">
            <span className="text-[10px] text-white/50 font-mono truncate">{targetUrl || 'https://mock.website.com'}</span>
          </div>
        </div>

        <div className="relative flex-1 w-full rounded-b-xl overflow-hidden bg-black/50">
          
          {screenshot ? (
            <div 
              className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none transition-all duration-500"
              style={{
                backgroundImage: `url(${screenshot})`,
                // 파고들기 시 원본 스크린샷도 비율에 맞게 크롭(Crop)되어 포커싱됨
                backgroundSize: `${(layers[0]?.rect.width / rootWidth) * 100}% ${(layers[0]?.rect.height / rootHeight) * 100}%`,
                backgroundPosition: `${(rootX / (layers[0]?.rect.width - rootWidth || 1)) * -100}% ${(rootY / (layers[0]?.rect.height - rootHeight || 1)) * -100}%`,
                backgroundRepeat: 'no-repeat'
              }}
            />
          ) : (
            <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center opacity-10 pointer-events-none">
              <ImageIcon size={64} className="mb-4" />
              <p className="font-mono text-xl">No Screenshot</p>
            </div>
          )}

          {visibleLayers.map((layer) => {
            // 현재 파고든 루트 내부에 속하는 자식들만 필터링하여 2D 하이라이트
            if (layer.tagName === 'body' || layer.rect.x < rootX || layer.rect.y < rootY || 
                layer.rect.x + layer.rect.width > rootX + rootWidth || layer.rect.y + layer.rect.height > rootY + rootHeight) return null;

            const isSelected = selectedLayerIds.includes(layer.id);
            const isPopupOpen = popupNodeId === layer.id;

            const relativeX = layer.rect.x - rootX;
            const relativeY = layer.rect.y - rootY;
            const leftPct = (relativeX / rootWidth) * 100;
            const topPct = (relativeY / rootHeight) * 100;
            const widthPct = (layer.rect.width / rootWidth) * 100;
            const heightPct = (layer.rect.height / rootHeight) * 100;

            return (
              <React.Fragment key={layer.id}>
                <div
                  onClick={(e) => handleLayerClick(layer.id, e)}
                  className={`absolute transition-all duration-300 ${
                    isSelected ? 'border-2 border-[#10b981] bg-[#10b981]/20 shadow-[0_0_20px_rgba(16,185,129,0.3)] z-40 cursor-pointer hover:bg-[#10b981]/30' 
                               : 'border border-dashed border-white/10 bg-transparent z-10 pointer-events-none'
                  }`}
                  style={{ left: `${leftPct}%`, top: `${topPct}%`, width: `${widthPct}%`, height: `${heightPct}%` }}
                >
                  {isSelected && (
                    <div className="absolute -top-6 left-0 bg-[#10b981] text-black text-[10px] px-2 py-0.5 font-mono font-bold rounded-t-md whitespace-nowrap">
                      {layer.label}
                    </div>
                  )}
                </div>

                {isPopupOpen && isSelected && (
                  <div
                    className="absolute z-50 w-64 bg-[#111111]/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.8)] text-white overflow-hidden"
                    style={{ left: `${Math.min(leftPct + widthPct + 2, 70)}%`, top: `${Math.min(topPct, 60)}%` }}
                    onClick={(e) => e.stopPropagation()} 
                  >
                    <div className="flex items-center justify-between p-3 border-b border-white/5 bg-white/[0.02]">
                      <h3 className="text-[#10b981] font-mono font-bold text-sm truncate pr-2">{layer.label}</h3>
                      <button onClick={() => setPopupNodeId(null)} className="text-gray-500 hover:text-white transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="p-3 flex flex-col gap-3 text-xs">
                      <div className="flex justify-between"><span className="text-gray-400">요소 타입</span><span className="font-mono">{`<${layer.tagName.toLowerCase()}>`}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">클래스</span><span className="font-mono truncate max-w-[120px]">{layer.className || '-'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">크기</span><span className="font-mono">{layer.rect.width} × {layer.rect.height}</span></div>
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