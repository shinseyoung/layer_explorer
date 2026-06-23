import React from 'react';
import { X, ChevronRight } from 'lucide-react';
import { useLayerStore } from '../../store/useLayerStore';

export default function InspectorPanel() {
  const { layers, selectedId, setSelectedId } = useLayerStore();

  const node = layers.find(l => l.id === selectedId);

  // 플로팅 팝업이므로, 선택된 노드가 없을 때는 아예 화면에 렌더링하지 않음
  if (!node) return null;

  // 동적 라벨 생성 (예: div.search_box)
  const displayLabel = `${node.tagName.toLowerCase()}${node.className ? `.${node.className.split(' ')[0]}` : ''}`;

  return (
    // 목업처럼 좌측 2D 화면 중앙(또는 클릭 위치)에 플로팅 되도록 absolute 및 z-50 적용
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[320px] bg-[#111111]/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden text-white transition-all z-50">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/[0.02]">
        <h3 className="text-[#10b981] font-mono font-bold text-base tracking-tight truncate pr-4">
          {displayLabel}
        </h3>
        <button 
          onClick={() => setSelectedId(null)}
          className="text-gray-500 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* 속성 리스트 영역 */}
      <div className="p-4 flex flex-col gap-3">
        <PropertyRow label="요소 타입" value={`<${node.tagName.toLowerCase()}>`} />
        <PropertyRow label="클래스" value={node.className || '-'} />
        <PropertyRow label="크기" value={`${node.rect.width} × ${node.rect.height}`} />
        <PropertyRow label="위치" value={`${node.rect.x}, ${node.rect.y}`} />
        <PropertyRow label="z-index" value={node.zIndex?.toString() || 'auto'} />
      </div>

      {/* 하단 자세히 보기 버튼 */}
      <div className="p-2 border-t border-white/5">
        <button className="w-full flex items-center justify-between px-3 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group">
          <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
            자세히 보기
          </span>
          <ChevronRight size={16} className="text-gray-500 group-hover:text-white transition-colors" />
        </button>
      </div>
    </div>
  );
}

// 재사용을 위한 속성 Row 컴포넌트
function PropertyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-400 font-medium whitespace-nowrap">{label}</span>
      <span className="text-gray-100 font-mono tracking-wide truncate max-w-[180px] text-right">
        {value}
      </span>
    </div>
  );
}