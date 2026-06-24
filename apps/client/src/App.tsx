import React, { useState } from 'react';
import LayerScene from './components/canvas/LayerScene';
import Header from './components/header/Header';
import OriginalViewer from './components/viewer/OriginalViewer';
import HeroCarousel from './components/canvas/HeroCarousel';
import { useLayerStore } from './store/useLayerStore';

export default function App() {
  const { appState, setTargetUrl, startVisualizing } = useLayerStore();
  const [homeInput, setHomeInput] = useState('');

  const handleHomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!homeInput.trim()) return;

    const urlToFetch = homeInput.startsWith('http')
      ? homeInput
      : `https://${homeInput}`;

    setTargetUrl(urlToFetch);
    startVisualizing();
  };

  // =========================
  // HOME SCREEN
  // =========================
  if (appState === 'idle') {
    return (
      <div className="w-screen h-screen flex bg-[#05050a] text-white overflow-hidden">

        {/* LEFT HERO CAROUSEL */}
        <div className="w-1/2 h-full border-r border-white/10">
          <HeroCarousel />
        </div>

        {/* RIGHT SEARCH PANEL */}
        <div className="w-1/2 h-full flex flex-col items-center relative bg-[#05050a]">

          {/* Logo */}
          <div className="absolute top-8 right-12 flex items-center gap-2">
            <span className="text-[#10b981] font-bold text-xl tracking-tight">
              LAYER
            </span>
            <span className="font-bold text-xl tracking-tight">
              EXPLORER
            </span>
          </div>

          {/* CONTENT */}
          <div className="w-full px-12 flex flex-col items-center mt-24">

            <h2 className="text-4xl font-bold mb-4 tracking-tight text-center">
              Explore Website Layers
            </h2>

            <p className="text-gray-400 mb-10 text-center leading-relaxed">
              Enter any URL to visualize its DOM hierarchy,
              <br />
              layout structure, and rendering layers.
            </p>

            {/* SEARCH */}
            <form
              onSubmit={handleHomeSubmit}
              className="w-full max-w-4xl relative"
            >
              <input
                type="text"
                value={homeInput}
                onChange={(e) => setHomeInput(e.target.value)}
                placeholder="https://www.example.com"
                className="
                  w-full
                  bg-[#111111]
                  border border-white/10
                  rounded-2xl
                  px-8
                  py-5
                  pr-40
                  text-lg
                  font-mono
                  text-white
                  placeholder-gray-600
                  focus:outline-none
                  focus:border-[#10b981]/50
                  focus:bg-[#151515]
                  transition-all
                "
              />

              <button
                type="submit"
                className="
                  absolute
                  right-3
                  top-3
                  bottom-3
                  bg-[#10b981]
                  hover:bg-[#059669]
                  text-black
                  font-bold
                  rounded-xl
                  px-8
                  transition-colors
                "
              >
                분석 시작 →
              </button>
            </form>

            {/* PREVIEW */}
            <div className="w-full max-w-5xl mt-10">

              <div
                className="
                  h-[320px]
                  rounded-3xl
                  border
                  border-[#10b981]/20
                  bg-[#0a0a0f]
                  shadow-[0_0_40px_rgba(16,185,129,0.08)]
                  flex
                  items-center
                  justify-center
                "
              >
                <span className="text-gray-600 text-sm">
                  Preview Image Area
                </span>
              </div>

            </div>

          </div>

          <div className="absolute bottom-5 text-gray-600 text-xs font-mono">
            © 2026 Layer Explorer. All rights reserved.
          </div>

        </div>
      </div>
    );
  }

  // =========================
  // WORKSPACE
  // =========================
  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-[#05050a] text-white">

      <Header />

      <div className="flex-1 flex overflow-hidden relative">

        {/* Loading Overlay */}
        {appState === 'loading' && (
          <div className="absolute inset-0 z-50 bg-[#05050a]/80 backdrop-blur-md flex flex-col items-center justify-center">
            <style>
              {`
                @keyframes chop {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(-45deg); }
                }
              `}
            </style>

            <div className="relative flex items-end justify-center mb-6">
              <div className="text-7xl animate-bounce z-10 drop-shadow-2xl">
                🐹
              </div>

              <div
                className="text-6xl absolute right-[-35px] top-[-10px] origin-bottom-left"
                style={{
                  animation:
                    'chop 0.3s ease-in-out infinite alternate',
                }}
              >
                ⛏️
              </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">
              DOM 데이터 채굴 중...
            </h3>

            <p className="text-[#10b981] font-mono text-sm animate-pulse">
              Puppeteer가 웹사이트 구조를 분석하고 있습니다
            </p>
          </div>
        )}

        {/* Original View */}
        <div className="w-2/3 h-full relative border-r border-white/10 bg-[#0a0a0f] flex items-center justify-center">
          <OriginalViewer />
        </div>

        {/* Layer View */}
        <div className="w-1/3 h-full relative overflow-hidden bg-[#05050a]">
          <LayerScene />
        </div>

      </div>
    </div>
  );
}