import React from 'react';
import { X, ChevronRight } from 'lucide-react';

// 임시 Mock 데이터 (추후 useLayerStore에서 선택된 노드 정보를 가져옴)
const MOCK_SELECTED_NODE = {
  id: '3',
  label: 'div.search_box',
  tagName: '<div>',
  className: 'search_box',
  rect: { width: 640, height: 56, x: 320, y: 24 },
  zIndex: 20,
};

export default function InspectorPanel() {
  // 실제 연동 시 선택된 노드가 없으면 null 반환하여 숨김 처리
  const node = MOCK_SELECTED_NODE;

  if (!node) return null;

  return (
    <div className="absolute right-8 top-1/2 -translate-y-1/2 w-[320px] bg-[#111111]/80 backdrop-blur-xl rounded-2xl border border-white/10 text-white shadow-2xl overflow-hidden select-none z-50">
      {/* 헤더 영역 */}
      <div className="flex items-center justify-between p-5 border-b border-white/5">
        <h3 className="text-[#10b981] font-mono font-bold text-lg tracking-tight">
          {node.label}
        </h3>
        <button className="text-gray-400 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* 속성 리스트 영역 */}
      <div className="p-5 flex flex-col gap-4">
        <PropertyRow label="요소 타입" value={node.tagName} />
        <PropertyRow label="클래스" value={node.className} />
        <PropertyRow label="크기" value={`${node.rect.width} × ${node.rect.height}`} />
        <PropertyRow label="위치" value={`${node.rect.x}, ${node.rect.y}`} />
        <PropertyRow label="z-index" value={node.zIndex.toString()} />
      </div>

      {/* 하단 자세히 보기 버튼 */}
      <div className="p-3">
        <button className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group">
          <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
            자세히 보기
          </span>
          <ChevronRight size={16} className="text-gray-400 group-hover:text-white transition-colors" />
        </button>
      </div>
    </div>
  );
}

// 재사용을 위한 속성 Row 컴포넌트
function PropertyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-400 font-medium">{label}</span>
      <span className="text-gray-100 font-mono tracking-wide">{value}</span>
    </div>
  );
}