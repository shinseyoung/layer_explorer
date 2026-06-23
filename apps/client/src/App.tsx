import React from 'react';
import LayerScene from './components/canvas/LayerScene';
import InspectorPanel from './components/inspector/InspectorPanel';
import Header from './components/header/Header';
import OriginalViewer from './components/viewer/OriginalViewer';

export default function App() {
  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-[#05050a] text-white">
      {/* 상단: 헤더 (검색바 등) */}
      <Header />

      {/* 메인 콘텐츠 영역 (하단) */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* 좌측: 2D 원본 뷰어 영역 (전체의 2/3) */}
        <div className="w-2/3 h-full relative border-r border-white/10 bg-[#0a0a0f] flex items-center justify-center">
          
          {/* 2D 원본 웹사이트 및 하이라이트 뷰어 */}
          <OriginalViewer />

          {/* 좌측 화면 위로 떠오르는 플로팅 인스펙터 팝업 */}
          <InspectorPanel />
        </div>

        {/* 우측: 3D 캔버스 (전체의 1/3) */}
        <div className="w-1/3 h-full relative overflow-hidden bg-[#05050a]">
          {/* 축소된 공간에 맞춰 LayerScene이 자동으로 렌더링됨 */}
          <LayerScene />
        </div>
        
      </div>
    </div>
  );
}