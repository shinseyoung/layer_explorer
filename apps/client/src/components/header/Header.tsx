import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useLayerStore } from '../../store/useLayerStore';

export default function Header() {
  const [inputValue, setInputValue] = useState('');
  const { setTargetUrl, startVisualizing, appState } = useLayerStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    // 단순 URL 유효성 검사 (실제 서비스에서는 더 엄격하게 처리)
    const urlToFetch = inputValue.startsWith('http') ? inputValue : `https://${inputValue}`;
    
    setTargetUrl(urlToFetch);
    startVisualizing();
  };

  const isLoading = appState === 'loading';

  return (
    <header className="w-full h-16 px-6 flex items-center justify-between border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-md z-50">
      <div className="flex items-center gap-3">
        <h1 className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
          <span className="text-[#10b981]">LAYER</span>
          <span>EXPLORER</span>
        </h1>
        <span className="text-[10px] uppercase font-mono bg-white/10 px-2 py-0.5 rounded-full text-gray-400">Beta</span>
      </div>

      <form 
        onSubmit={handleSubmit}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg flex items-center bg-[#111] rounded-xl border border-white/10 overflow-hidden focus-within:border-[#10b981]/50 transition-colors"
      >
        <div className="flex-1 flex items-center px-4">
          <Search size={16} className="text-gray-400 mr-2" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="https://www.naver.com"
            className="w-full bg-transparent text-sm text-white placeholder-gray-500 py-2.5 outline-none font-mono"
            disabled={isLoading}
          />
        </div>
        <button 
          type="submit" 
          disabled={isLoading}
          className="bg-[#10b981] hover:bg-[#059669] text-white px-5 py-2.5 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
        </button>
      </form>

      <div className="w-[120px]">
        {/* 우측 여백 맞춤용 빈 공간 (추후 설정 버튼 등 추가 가능) */}
      </div>
    </header>
  );
}