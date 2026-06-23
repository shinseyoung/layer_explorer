import React from 'react';
import LayerScene from './components/canvas/LayerScene';
import InspectorPanel from './components/inspector/InspectorPanel';

export default function App() {
  return (
    <div className="w-screen h-screen flex overflow-hidden">
      {/* 좌측: 3D 캔버스 (전체의 2/3) */}
      <div className="w-2/3 h-full relative">
        <LayerScene />
      </div>
      
      {/* 우측: 인스펙터 패널 (전체의 1/3) */}
      <div className="w-1/3 h-full relative border-l border-white/10 bg-[#0a0a0f]">
        <InspectorPanel />
      </div>
    </div>
  );
}