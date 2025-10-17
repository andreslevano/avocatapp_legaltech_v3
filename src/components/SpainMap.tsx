'use client';

interface CityData {
  city: string;
  count: number;
  percentage: number;
  x: number; // Percentage from left
  y: number; // Percentage from top
}

interface SpainMapProps {
  cities: CityData[];
  loading: boolean;
}

export default function SpainMap({ cities, loading }: SpainMapProps) {
  const getCityColor = (count: number, maxCount: number) => {
    const intensity = count / maxCount;
    if (intensity > 0.7) return '#dc2626'; // red-600
    if (intensity > 0.5) return '#ea580c'; // orange-600
    if (intensity > 0.3) return '#d97706'; // amber-600
    if (intensity > 0.1) return '#ca8a04'; // yellow-600
    return '#65a30d'; // lime-600
  };

  const maxCount = Math.max(...cities.map(c => c.count));

  return (
    <div className="relative w-full h-96 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 overflow-hidden">
      {/* Spain Map SVG */}
      <svg
        viewBox="0 0 1000 800"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Spain Vector Map - Mainland */}
        <path
          d="M200 300 L250 280 L300 290 L350 280 L400 290 L450 280 L500 290 L550 280 L600 290 L650 280 L700 290 L750 300 L780 320 L800 350 L810 380 L800 410 L780 440 L750 460 L700 470 L650 460 L600 450 L550 440 L500 430 L450 420 L400 410 L350 400 L300 390 L250 380 L200 370 L180 350 L190 320 Z"
          fill="#f8fafc"
          stroke="#cbd5e1"
          strokeWidth="1.5"
          className="transition-all duration-1000"
        />
        
        {/* Balearic Islands */}
        <path
          d="M750 200 L780 190 L800 200 L810 220 L800 240 L780 250 L750 240 L740 220 Z"
          fill="#f8fafc"
          stroke="#cbd5e1"
          strokeWidth="1.5"
          className="transition-all duration-1000"
        />
        
        {/* Canary Islands */}
        <path
          d="M100 500 L120 490 L140 500 L150 520 L140 540 L120 550 L100 540 L90 520 Z"
          fill="#f8fafc"
          stroke="#cbd5e1"
          strokeWidth="1.5"
          className="transition-all duration-1000"
        />
        
        <path
          d="M150 550 L170 540 L190 550 L200 570 L190 590 L170 600 L150 590 L140 570 Z"
          fill="#f8fafc"
          stroke="#cbd5e1"
          strokeWidth="1.5"
          className="transition-all duration-1000"
        />
        
        {/* Portugal */}
        <path
          d="M50 400 L100 380 L150 390 L180 410 L170 450 L150 480 L100 470 L50 460 L30 430 Z"
          fill="#e2e8f0"
          stroke="#94a3b8"
          strokeWidth="1"
          className="transition-all duration-1000"
        />
        
        {/* France */}
        <path
          d="M600 200 L700 180 L800 190 L850 220 L800 250 L700 240 L600 230 Z"
          fill="#e2e8f0"
          stroke="#94a3b8"
          strokeWidth="1"
          className="transition-all duration-1000"
        />
        
        {/* City Markers */}
        {cities.map((city, index) => {
          const color = getCityColor(city.count, maxCount);
          const size = Math.max(12, Math.min(24, (city.count / maxCount) * 24));
          
          // Convert coordinates to new map scale
          const mapX = (city.x / 400) * 1000;
          const mapY = (city.y / 300) * 800;
          
          return (
            <g key={city.city}>
              {/* City Circle */}
              <circle
                cx={mapX}
                cy={mapY}
                r={loading ? 0 : size}
                fill={color}
                stroke="white"
                strokeWidth="3"
                className="transition-all duration-1000 ease-out drop-shadow-lg"
              >
                <animate
                  attributeName="r"
                  values="0;{size}"
                  dur="1000ms"
                  begin={`${index * 200}ms`}
                  fill="freeze"
                />
              </circle>
              
              {/* City Label */}
              <text
                x={mapX}
                y={mapY - size - 8}
                textAnchor="middle"
                className="text-sm font-semibold fill-gray-800"
                style={{ opacity: loading ? 0 : 1 }}
              >
                {city.city}
              </text>
              
              {/* Count Label */}
              <text
                x={mapX}
                y={mapY + 5}
                textAnchor="middle"
                className="text-sm font-bold fill-white"
                style={{ opacity: loading ? 0 : 1 }}
              >
                {city.count}
              </text>
            </g>
          );
        })}
        
        {/* Decorative Elements */}
        <circle cx="500" cy="400" r="5" fill="#3b82f6" opacity="0.2">
          <animate
            attributeName="r"
            values="5;15;5"
            dur="4s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
      
      {/* Map Title */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800">Distribución Geográfica</h3>
        <p className="text-xs text-gray-600">Clientes por Comunidad</p>
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm">
        <div className="text-xs font-medium text-gray-800 mb-2">Número de Clientes</div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-red-600"></div>
            <span className="text-xs text-gray-600">Alto</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-orange-600"></div>
            <span className="text-xs text-gray-600">Medio</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-lime-600"></div>
            <span className="text-xs text-gray-600">Bajo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
