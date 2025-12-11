import { Map, MapPin, Layers, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export default function CartographieContent() {
  const layers = [
    { name: 'Zones inondables', active: true, color: 'blue' },
    { name: 'Permis de construction', active: true, color: 'green' },
    { name: 'Points de descente', active: false, color: 'orange' },
    { name: 'Infrastructure critique', active: true, color: 'red' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Cartographie</h1>
        <p className="text-slate-600">Visualisation géospatiale des zones et interventions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="relative h-[600px] bg-gradient-to-br from-slate-100 to-slate-200">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Map className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 font-medium">Zone cartographique interactive</p>
                  <p className="text-sm text-slate-500 mt-2">Intégration de carte prévue ici</p>
                </div>
              </div>

              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <button className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-slate-50 transition-colors">
                  <ZoomIn className="w-5 h-5 text-slate-700" />
                </button>
                <button className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-slate-50 transition-colors">
                  <ZoomOut className="w-5 h-5 text-slate-700" />
                </button>
                <button className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-slate-50 transition-colors">
                  <Maximize2 className="w-5 h-5 text-slate-700" />
                </button>
              </div>

              <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-slate-900">Antananarivo</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Coordonnées: -18.8792° S, 47.5079° E
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-slate-700" />
              <h2 className="text-lg font-bold text-slate-900">Couches</h2>
            </div>
            <div className="space-y-3">
              {layers.map((layer, index) => (
                <label key={index} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    defaultChecked={layer.active}
                    className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <div className={`w-3 h-3 rounded-full bg-${layer.color}-500`} />
                    <span className="text-sm text-slate-700 group-hover:text-slate-900">{layer.name}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-4">Statistiques</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Zones marquées</span>
                <span className="font-semibold text-slate-900">48</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Points d'intérêt</span>
                <span className="font-semibold text-slate-900">156</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Surface couverte</span>
                <span className="font-semibold text-slate-900">342 km²</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
