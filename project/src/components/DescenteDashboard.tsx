import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import {
  TrendingUp,
  AlertTriangle,
  Building,
  FileText,
  Download,
  Filter,
  Calendar,
  Users,
  MapPin,
  Shield,
  Clock,
  Target
} from 'lucide-react';

// Composant de carte statistique
const StatCard = ({
  title,
  value,
  change,
  icon: Icon,
  color
}: {
  title: string;
  value: string;
  change?: string;
  icon: React.ElementType;
  color: string;
}) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${color.replace('text-', '')}`} />
      </div>
      {change && (
        <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
          {change}
        </span>
      )}
    </div>
    <h3 className="text-2xl font-bold text-slate-900 mb-1">{value}</h3>
    <p className="text-slate-500 text-sm">{title}</p>
  </div>
);

// 1. Area Chart avec 3 zones: Nombre descentes, PAT, FIFAFI - 60%
const MonthlyActivityChart = ({ data }) => {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            {/* Dégradé pour Descentes (bleu) */}
            <linearGradient id="colorDescentes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
            </linearGradient>
            {/* Dégradé pour PAT (vert) */}
            <linearGradient id="colorPat" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.7}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
            </linearGradient>
            {/* Dégradé pour FIFAFI (violet) */}
            <linearGradient id="colorFifafi" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.7}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              fontSize: '12px'
            }}
            formatter={(value, name) => {
              if (name === 'descentes') return [`${value}`, 'Descentes'];
              if (name === 'pat') return [`${value}`, 'PAT'];
              if (name === 'fifafi') return [`${value}`, 'FIFAFI'];
              return [value, name];
            }}
            labelFormatter={(label) => `Mois: ${label}`}
          />
          {/* Légende visible par défaut */}
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingBottom: '10px' }}
            formatter={(value) => {
              if (value === 'descentes') return 'Nombre Descentes';
              if (value === 'pat') return 'Nombre PAT';
              if (value === 'fifafi') return 'FIFAFI';
              return value;
            }}
          />
          {/* Zone pour Nombre de descentes */}
          <Area
            type="monotone"
            dataKey="descentes"
            stroke="#3b82f6"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorDescentes)"
            activeDot={{ r: 6, strokeWidth: 2 }}
            name="Nombre Descentes"
          />
          {/* Zone pour PAT */}
          <Area
            type="monotone"
            dataKey="pat"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="5 5"
            fillOpacity={0.6}
            fill="url(#colorPat)"
            activeDot={{ r: 5, strokeWidth: 2 }}
            name="Nombre PAT"
          />
          {/* Zone pour FIFAFI */}
          <Area
            type="monotone"
            dataKey="fifafi"
            stroke="#8b5cf6"
            strokeWidth={2}
            strokeDasharray="3 3"
            fillOpacity={0.6}
            fill="url(#colorFifafi)"
            activeDot={{ r: 5, strokeWidth: 2 }}
            name="FIFAFI"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const GlobalActivityChart = ({ data }) => {
  const chartData = [
    { category: 'Descentes', value: parseInt(data.total_descentes_global || 0), color: '#3b82f6' },
    { category: 'PAT', value: parseInt(data.total_pv_pat_global || 0), color: '#10b981' },
    { category: 'FIFAFI', value: parseInt(data.total_fifafi_global || 0), color: '#8b5cf6' },
  ];
  
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          barSize={60}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#f1f5f9"
          />
          <XAxis
            dataKey="category"
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => [`${value}`, 'Nombre']}
            labelFormatter={(label) => `${label}`}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
          />
          {/* Légende visible par défaut */}
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingBottom: '10px' }}
          />
          <Bar
            dataKey="value"
            name="Nombre"
            radius={[4, 4, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                stroke="#ffffff"
                strokeWidth={1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// 2. MODIFIÉ: Pie Chart avec nouvelles infractions - corrigé pour correspondre à l'API
const RadialPieChart = ({
  data,
  title
}: {
  data: { name: string; value: number; color: string }[];
  title: string;
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) {
    return (
      <div className="h-[300px] flex flex-col items-center justify-center">
        <AlertTriangle className="w-12 h-12 text-slate-300 mb-4" />
        <p className="text-slate-500">Aucune infraction enregistrée</p>
      </div>
    );
  }
  
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={2}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
            dataKey="value"
            cornerRadius={5}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                stroke="#ffffff"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name, props) => [
              `${value} cas (${((props.payload.percent || 0) * 100).toFixed(1)}%)`,
              props.payload.name
            ]}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
          />
          {/* Légende visible par défaut */}
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingTop: '10px' }}
            formatter={(value, entry) => {
              const item = data.find(d => d.name === value);
              return <span style={{ color: item?.color || '#000' }}>{value}</span>;
            }}
          />
          <text
            x="50%"
            y="45%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xl font-bold fill-slate-900"
          >
            {total}
          </text>
          <text
            x="50%"
            y="55%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-sm fill-slate-500"
          >
            Total infractions
          </text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// 3. Bar Chart vertical pour nombre de descentes par district - adapté à l'API
const DistrictBarChart = ({ data, filter }) => {
  // Préparation des données pour le bar chart
  const prepareChartData = () => {
    if (!data) return [];
   
    let sourceData;
    if (filter === 'monthly') {
      // Données mensuelles - filtrer les districts avec nombre_descentes > 0
      sourceData = data.mensuelParDistrict
        ? data.mensuelParDistrict
            .filter(item => parseInt(item.nombre_descentes || 0) > 0)
            .map(item => ({
              district: item.district,
              descentes: parseInt(item.nombre_descentes || 0),
              zone: getZoneForDistrict(item.district)
            }))
        : [];
    } else {
      // Données globales - filtrer les districts avec total_global > 0
      sourceData = data.totalParDistrict
        ? data.totalParDistrict
            .filter(item => parseInt(item.total_global || 0) > 0)
            .map(item => ({
              district: item.district,
              descentes: parseInt(item.total_global || 0),
              zone: item.zone
            }))
        : [];
    }
   
    // Trier par nombre de descentes décroissant
    return sourceData.sort((a, b) => b.descentes - a.descentes);
  };
  
  // Fonction pour déterminer la zone d'un district (pour les données mensuelles)
  const getZoneForDistrict = (districtName) => {
    if (!data?.totalParDistrict) return 'CUA';
   
    const districtInfo = data.totalParDistrict.find(item =>
      item.district === districtName
    );
    return districtInfo?.zone || 'CUA';
  };
  
  // Fonction pour obtenir la couleur basée sur la zone
  const getColorForZone = (zone) => {
    return zone === 'CUA' ? '#3b82f6' : '#10b981';
  };
  
  const chartData = prepareChartData();
  
  // Si pas de données, afficher un message
  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-slate-500">Aucune donnée disponible</p>
      </div>
    );
  }
  
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          barSize={40}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#f1f5f9"
          />
          <XAxis
            dataKey="district"
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            label={{
              value: 'Nombre de descentes',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              fontSize: 12,
              fill: '#64748b'
            }}
          />
          <Tooltip
            formatter={(value, name, props) => {
              if (name === 'descentes') {
                return [`${value} descentes`, 'Nombre'];
              }
              return [value, name];
            }}
            labelFormatter={(label) => `District: ${label}`}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
          />
          {/* Légende visible par défaut */}
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingBottom: '10px' }}
            formatter={(value) => {
              if (value === 'CUA') return 'CUA';
              if (value === 'Périphérie') return 'Périphérie';
              return value;
            }}
          />
          <Bar
            dataKey="descentes"
            name="Nombre de descentes"
            radius={[4, 4, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getColorForZone(entry.zone)}
                stroke="#ffffff"
                strokeWidth={1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// 4. Pie Chart CUA vs Périphérique avec données dynamiques de l'API et légende
const CUAPeripheriquePieChart = ({ data, filter }) => {
  // Préparation des données pour le pie chart
  const chartData = [
    {
      name: 'CUA',
      value: filter === 'monthly'
        ? parseInt(data?.mensuel?.[0]?.total_cua || 0)
        : parseInt(data?.global?.cua_global || 0),
      color: '#3b82f6'
    },
    {
      name: 'Périphérique',
      value: filter === 'monthly'
        ? parseInt(data?.mensuel?.[0]?.total_peripherie || 0)
        : parseInt(data?.global?.peripherie_global || 0),
      color: '#10b981'
    },
  ];
  
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
 
  // Si pas de données, afficher un message
  if (total === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-slate-500">Aucune donnée disponible</p>
      </div>
    );
  }
  
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            outerRadius={80}
            paddingAngle={0}
            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
            labelLine={false}
            dataKey="value"
            cornerRadius={0}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                stroke="#ffffff"
                strokeWidth={3}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name, props) => [
              `${value} descentes (${((props.payload.percent || 0) * 100).toFixed(1)}%)`,
              props.payload.name
            ]}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
          />
          {/* Légende visible par défaut */}
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingTop: '10px' }}
            formatter={(value, entry) => {
              const item = chartData.find(d => d.name === value);
              return <span style={{ color: item?.color || '#000' }}>{value}</span>;
            }}
          />
          {/* Affichage du total au centre */}
          <text
            x="50%"
            y="45%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xl font-bold fill-slate-900"
          >
            {total}
          </text>
          <text
            x="50%"
            y="55%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-sm fill-slate-500"
          >
            Total descentes
          </text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default function DescenteDashboard() {
  const [monthlyData, setMonthlyData] = useState([
    { month: 'Jan', descentes: 0, pat: 0, fifafi: 0 },
    { month: 'Feb', descentes: 0, pat: 0, fifafi: 0 },
    { month: 'Mar', descentes: 0, pat: 0, fifafi: 0 },
    { month: 'Apr', descentes: 0, pat: 0, fifafi: 0 },
    { month: 'May', descentes: 0, pat: 0, fifafi: 0 },
    { month: 'Jun', descentes: 0, pat: 0, fifafi: 0 },
    { month: 'Jul', descentes: 0, pat: 0, fifafi: 0 },
    { month: 'Aug', descentes: 0, pat: 0, fifafi: 0 },
    { month: 'Sep', descentes: 0, pat: 0, fifafi: 0 },
    { month: 'Oct', descentes: 0, pat: 0, fifafi: 0 },
    { month: 'Nov', descentes: 0, pat: 0, fifafi: 0 },
    { month: 'Dec', descentes: 0, pat: 0, fifafi: 0 },
  ]);
  
  const [globalData, setGlobalData] = useState({});
  const [activityFilter, setActivityFilter] = useState('monthly');
 
  // État pour les données zones CUA/Périphérique
  const [zonesData, setZonesData] = useState(null);
  const [zonesFilter, setZonesFilter] = useState('monthly');
 
  // État pour les données districts
  const [districtsData, setDistrictsData] = useState(null);
  const [districtsFilter, setDistrictsFilter] = useState('monthly');
 
  const [infractionsRawData, setInfractionsRawData] = useState(null);
  const [infractionsFilter, setInfractionsFilter] = useState('all');
  
  // Récupération des données mensuelles et globales
  useEffect(() => {
    fetch('http://localhost:3000/api/stats/monthly')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const data = months.map((month) => ({
            month,
            descentes: 0,
            pat: 0,
            fifafi: 0
          }));
          
          (json.data.mensuel || []).forEach(item => {
            const index = parseInt(item.month_num) - 1;
            if (index >= 0 && index < 12) {
              data[index] = {
                month: months[index],
                descentes: parseInt(item.total_descentes || 0),
                pat: parseInt(item.nb_de_pv_pat || 0),
                fifafi: parseInt(item.nb_de_fifafi || 0)
              };
            }
          });
          
          setMonthlyData(data);
          setGlobalData(json.data.global || {});
        }
      })
      .catch(err => console.error('Error fetching monthly stats:', err));
  }, []);
  
  // Récupération des données zones
  useEffect(() => {
    fetch('http://localhost:3000/api/stats/zones')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setZonesData(json.data);
        }
      })
      .catch(err => console.error('Error fetching zones stats:', err));
  }, []);
  
  // Récupération des données districts
  useEffect(() => {
    fetch('http://localhost:3000/api/stats/districts')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setDistrictsData(json.data);
        }
      })
      .catch(err => console.error('Error fetching districts stats:', err));
  }, []);
  
  // Récupération des données infractions
  useEffect(() => {
    fetch('http://localhost:3000/api/stats/infractions')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setInfractionsRawData(json.data);
        }
      })
      .catch(err => console.error('Error fetching infractions stats:', err));
  }, []);
  
  // Fonction pour préparer les données d'infractions
  const getInfractionsData = () => {
    if (!infractionsRawData) return [];
   
    if (infractionsFilter === 'monthly' && infractionsRawData.par_mois && infractionsRawData.par_mois.length > 0) {
      // Pour les données mensuelles
      const monthlyData = infractionsRawData.par_mois[0];
      return [
        { name: 'Remblai Illicite', value: parseInt(monthlyData.remblai_illicite || 0), color: '#ef4444' },
        { name: 'Construction sur Remblai', value: parseInt(monthlyData.construction_sur_remblai || 0), color: '#f97316' },
        { name: 'Remblai Récent', value: parseInt(monthlyData.remblai_recent || 0), color: '#3b82f6' },
        { name: 'Cellage', value: parseInt(monthlyData.cellage || 0), color: '#8b5cf6' },
      ].filter(item => item.value > 0);
    } else {
      // Pour les données cumulées (all)
      const cumulativeData = infractionsRawData.cumul_general;
      return [
        { name: 'Remblai Illicite', value: parseInt(cumulativeData.total_remblai || 0), color: '#ef4444' },
        { name: 'Construction sur Remblai', value: parseInt(cumulativeData.total_construction || 0), color: '#f97316' },
        { name: 'Remblai Récent', value: parseInt(cumulativeData.total_recent || 0), color: '#3b82f6' },
        { name: 'Cellage', value: parseInt(cumulativeData.total_cellage || 0), color: '#8b5cf6' },
      ].filter(item => item.value > 0);
    }
  };
  
  const infractionsData = getInfractionsData();
  
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Première paire: 60% Activity Chart + 40% Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Activity Chart - 60% (col-span-7) */}
        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Activité Mensuelle
              </h2>
              <p className="text-sm text-slate-500">
                Nombre de descentes, PAT, et FIFAFI
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200">
                <button
                  className={`px-3 py-1.5 text-sm ${activityFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => setActivityFilter('all')}
                >
                  Tous
                </button>
                <button
                  className={`px-3 py-1.5 text-sm ${activityFilter === 'monthly' ? 'bg-blue-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => setActivityFilter('monthly')}
                >
                  Mensuel
                </button>
              </div>
              <Calendar className="w-5 h-5 text-slate-400" />
            </div>
          </div>
          {activityFilter === 'monthly' ? (
            <MonthlyActivityChart data={monthlyData} />
          ) : (
            <GlobalActivityChart data={globalData} />
          )}
        </div>
        
        {/* Pie Chart - 40% (col-span-5) */}
        <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Types d'Infractions
              </h2>
              <p className="text-sm text-slate-500">
                Répartition des principales infractions
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200">
                <button
                  className={`px-3 py-1.5 text-sm ${infractionsFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => setInfractionsFilter('all')}
                >
                  Tous
                </button>
                <button
                  className={`px-3 py-1.5 text-sm ${infractionsFilter === 'monthly' ? 'bg-blue-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => setInfractionsFilter('monthly')}
                >
                  Mensuel
                </button>
              </div>
              <AlertTriangle className="w-5 h-5 text-slate-400" />
            </div>
          </div>
          <RadialPieChart
            data={infractionsData}
            title="Infractions"
          />
        </div>
      </div>
      
      {/* Deuxième paire: 40% Pie Chart CUA vs Périphérique + 60% Bar Chart District */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Pie Chart CUA vs Périphérique - 40% (col-span-5) */}
        <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Répartition CUA vs Périphérique
              </h2>
              <p className="text-sm text-slate-500">
                Nombre de descentes en CUA et en périphérique
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200">
                <button
                  className={`px-3 py-1.5 text-sm ${zonesFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => setZonesFilter('all')}
                >
                  Tous
                </button>
                <button
                  className={`px-3 py-1.5 text-sm ${zonesFilter === 'monthly' ? 'bg-blue-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => setZonesFilter('monthly')}
                >
                  Mensuel
                </button>
              </div>
              <Building className="w-5 h-5 text-slate-400" />
            </div>
          </div>
          <CUAPeripheriquePieChart
            data={zonesData}
            filter={zonesFilter}
          />
        </div>
        
        {/* Bar Chart District - 60% (col-span-7) */}
        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Descentes par District
              </h2>
              <p className="text-sm text-slate-500">
                Répartition du nombre de descentes par district
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200">
                <button
                  className={`px-3 py-1.5 text-sm ${districtsFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => setDistrictsFilter('all')}
                >
                  Tous
                </button>
                <button
                  className={`px-3 py-1.5 text-sm ${districtsFilter === 'monthly' ? 'bg-blue-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => setDistrictsFilter('monthly')}
                >
                  Mensuel
                </button>
              </div>
              <MapPin className="w-5 h-5 text-slate-400" />
            </div>
          </div>
          <DistrictBarChart
            data={districtsData}
            filter={districtsFilter}
          />
        </div>
      </div>
    </div>
  );
}