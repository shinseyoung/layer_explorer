import { create } from 'zustand';

// 백엔드에서 넘어올 레이어 노드 데이터 타입 정의
export interface LayerNode {
  id: string;
  depth: number;
  label: string;
  tagName: string;
  className: string;
  htmlSnippet: string;
  cssRules: Record<string, string>;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  zIndex: number;
  color?: string; // CSS 3D 시각화를 위한 임시 배경색
}

interface LayerStoreState {
  // 앱 전체 상태 (초기 홈 화면 -> 로딩 -> 3D 뷰어)
  appState: 'home' | 'loading' | 'view';
  targetUrl: string;
  
  // 파싱된 전체 데이터
  layers: LayerNode[];
  screenshot: string | null;
  viewport: { width: number; height: number } | null;
  
  // 마우스 인터랙션 상태
  hoveredId: string | null;
  selectedId: string | null;

  // Actions
  setTargetUrl: (url: string) => void;
  startVisualizing: () => Promise<void>;
  resetToHome: () => void;
  setHoveredId: (id: string | null) => void;
  setSelectedId: (id: string | null) => void;
  
  // (테스트용) 임시 데이터 주입
  setMockLayers: (layers: LayerNode[]) => void;
}

export const useLayerStore = create<LayerStoreState>((set, get) => ({
  appState: 'home',
  targetUrl: '',
  layers: [],
  screenshot: null,
  viewport: null,
  hoveredId: null,
  selectedId: null,

  setTargetUrl: (url) => set({ targetUrl: url }),
  
  startVisualizing: async () => {
    set({ appState: 'loading' });
    
    try {
      /* // [실제 백엔드 API 연동 시 주석 해제]
      const response = await fetch('http://localhost:3001/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: get().targetUrl })
      });
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);
      
      set({ 
        layers: data.layers, 
        screenshot: data.screenshot, 
        viewport: data.viewport, 
        appState: 'view' 
      });
      */

      // 현재는 API가 없으므로 1.5초 후 View 화면으로 전환되는 임시 처리
      setTimeout(() => {
        set({ appState: 'view' });
      }, 1500);

    } catch (error) {
      console.error(error);
      alert('웹페이지 파싱 중 오류가 발생했습니다.');
      set({ appState: 'home' });
    }
  },
  
  resetToHome: () => set({ 
    appState: 'home', 
    targetUrl: '', 
    layers: [], 
    screenshot: null, 
    viewport: null, 
    selectedId: null, 
    hoveredId: null 
  }),

  setHoveredId: (id) => set({ hoveredId: id }),
  
  // 이미 선택된 레이어를 다시 클릭하면 선택 해제(Toggle)
  setSelectedId: (id) => set({ selectedId: get().selectedId === id ? null : id }),
  
  setMockLayers: (layers) => set({ layers }),
}));