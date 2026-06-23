import React from 'react';
import LayerScene from './components/canvas/LayerScene';
import Header from './components/header/Header';
import OriginalViewer from './components/viewer/OriginalViewer';

export default function App() {
  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-[#05050a] text-white">
      {/* 헤더 (우측에 레이어 컨트롤 추가됨) */}
      <Header />

      <div className="flex-1 flex overflow-hidden relative">
        {/* 좌측: 2D 뷰어 */}
        <div className="w-2/3 h-full relative border-r border-white/10 bg-[#0a0a0f] flex items-center justify-center">
          <OriginalViewer />
        </div>

        {/* 우측: 3D 캔버스 (단독 렌더링, 인스펙터 패널 제거) */}
        <div className="w-1/3 h-full relative overflow-hidden bg-[#05050a]">
          <LayerScene />
        </div>
      </div>
    </div>
  );
}