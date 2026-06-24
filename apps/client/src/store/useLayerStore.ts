import { create } from 'zustand';

export type LayerScaleSize = 'sm' | 'md' | 'lg';

export interface LayerNode {
  id: string;
  parentId: string | null;
  depth: number;
  label: string;
  tagName: string;
  className: string;
  rect: { x: number; y: number; width: number; height: number };
  zIndex: number;
}

interface LayerStore {
  targetUrl: string;
  appState: 'idle' | 'loading' | 'success' | 'error';
  layers: LayerNode[];
  screenshot: string | null;

  hoveredId: string | null;
  selectedLayerIds: string[];
  layerSpread: number;
  layerScale: LayerScaleSize;
  hiddenLayerTags: string[];

  drillHistory: LayerNode[];

  setTargetUrl: (url: string) => void;
  startVisualizing: () => Promise<void>;
  setMockLayers: (layers: LayerNode[]) => void;
  setHoveredId: (id: string | null) => void;
  toggleLayerSelection: (id: string) => void;
  setLayerSpread: (val: number) => void;
  setLayerScale: (size: LayerScaleSize) => void;
  toggleLayerFilter: (tag: string) => void;
  
  pushDrillDown: (layer: LayerNode) => void;
  popDrillUp: (index: number) => void;
  
  resetApp: () => void;
}

export const useLayerStore = create<LayerStore>((set, get) => ({
  targetUrl: '',
  appState: 'idle',
  layers: [],
  screenshot: null,

  hoveredId: null,
  selectedLayerIds: [], 
  layerSpread: 50,
  layerScale: 'md',
  hiddenLayerTags: [],
  drillHistory: [],

  resetApp: () => set({ 
    appState: 'idle', 
    layers: [], 
    drillHistory: [], 
    targetUrl: '', 
    screenshot: null, 
    selectedLayerIds: [], 
    hoveredId: null,
    hiddenLayerTags: []
  }),

  setTargetUrl: (url) => set({ targetUrl: url }),
  
  startVisualizing: async () => {
    const { targetUrl } = get();
    if (!targetUrl) return;

    set({ appState: 'loading', hoveredId: null, selectedLayerIds: [], hiddenLayerTags: [], drillHistory: [] });

    try {
      const response = await fetch('http://localhost:3001/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      if (!response.ok) throw new Error('데이터를 가져오는데 실패했습니다.');

      const data = await response.json();
      
      const rootLayer = data.layers.find((l: LayerNode) => !l.parentId) || data.layers[0];
      
      set({ 
        layers: data.layers, 
        screenshot: data.screenshot,
        drillHistory: rootLayer ? [rootLayer] : [], 
        appState: 'success' 
      });

    } catch (error) {
      console.error(error);
      set({ appState: 'error' });
    }
  },

  setMockLayers: (layers) => {
    const rootLayer = layers.find((l) => !l.parentId) || layers[0];
    set({ layers, drillHistory: rootLayer ? [rootLayer] : [] });
  },
  
  setHoveredId: (id) => set({ hoveredId: id }),
  
  toggleLayerSelection: (id) => {
    const current = get().selectedLayerIds;
    if (current.includes(id)) {
      set({ selectedLayerIds: current.filter(layerId => layerId !== id) });
    } else {
      set({ selectedLayerIds: [...current, id] });
    }
  },
  
  setLayerSpread: (val) => set({ layerSpread: val }),
  setLayerScale: (size) => set({ layerScale: size }),
  
  toggleLayerFilter: (tag) => {
    const current = get().hiddenLayerTags;
    if (current.includes(tag)) {
      set({ hiddenLayerTags: current.filter(t => t !== tag) });
    } else {
      set({ hiddenLayerTags: [...current, tag] });
    }
  },

  pushDrillDown: (layer) => {
    const current = get().drillHistory;
    // ★ 방어 로직: 이미 현재 위치한 경로를 또 더블클릭하면 무시 (중복 쌓임 방지)
    if (current.length > 0 && current[current.length - 1].id === layer.id) return;
    set({ drillHistory: [...current, layer], selectedLayerIds: [], layerSpread: 50 });
  },
  popDrillUp: (index) => {
    set({ drillHistory: get().drillHistory.slice(0, index + 1), selectedLayerIds: [], layerSpread: 50 });
  }
}));