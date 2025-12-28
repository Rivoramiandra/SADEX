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
  Line
} from 'recharts';
import {
  Filter,
  CalendarDays,
  DollarSign,
  CheckCircle,
  XCircle,
  FileText,
  Download,
  RefreshCw,
  MapPin,
  FileType
} from 'lucide-react';

// 1. MODIFIÉ: Line Chart pour le nombre d'avis (hebdomadaire/mensuel)
const PaymentCountChart = ({ data, filterType }) => {
  // Formater les données pour le Line Chart
  const formatChartData = () => {
    if (!data) return [];
   
    // Créer un tableau de 12 mois par défaut
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
   
    if (filterType === 'monthly') {
      // Pour les données mensuelles, initialiser tous les mois à 0
      const defaultData = months.map(month => ({
        periode: month,
        count: 0,
        montant: 0
      }));
     
      // Remplir avec les données de l'API
      if (data.monthly) {
        data.monthly.forEach(item => {
          const date = new Date(item.periode);
          const monthIndex = date.getMonth(); // 0-11
          const monthName = months[monthIndex];
         
          // Trouver l'entrée correspondante et la mettre à jour
          const entry = defaultData.find(d => d.periode === monthName);
          if (entry) {
            entry.count = parseInt(item.total_count || 0);
            entry.montant = parseFloat(item.total_somme || 0);
          }
        });
      }
     
      return defaultData;
    } else {
      // Pour les données hebdomadaires
      if (data.weekly) {
        return data.weekly.map(item => ({
          periode: `Sem ${getWeekNumber(new Date(item.periode))}`,
          count: parseInt(item.total_count || 0),
          montant: parseFloat(item.total_somme || 0)
        }));
      }
      return [];
    }
  };
  const chartData = formatChartData();
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            {/* Dégradé pour la ligne */}
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="periode"
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
              if (name === 'count') return [`${value} avis`, 'Nombre'];
              if (name === 'montant') return [`${(value / 1000).toFixed(0)}K MGA`, 'Montant'];
              return [value, name];
            }}
            labelFormatter={(label) => `Période: ${label}`}
          />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingBottom: '10px' }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#3b82f6"
            strokeWidth={3}
            activeDot={{ r: 6, strokeWidth: 2 }}
            name="Nombre d'avis"
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// 2. MODIFIÉ: Bar Chart horizontal pour les factures par statut (avec filtre hebdo/mensuel)
const FactureStatusChart = ({ data, filterType }) => {
  // Formater les données pour le Bar Chart groupé par statut
  const formatChartData = () => {
    if (!data) return [];
    
    // Sélectionner les données selon le filtre
    const sourceData = filterType === 'weekly' 
      ? (data.hebdomadaire || []) 
      : (data.mensuel || []);
    
    // Grouper par statut
    const statusMap = {};
    
    sourceData.forEach(item => {
      const statut = item.statut;
      if (!statusMap[statut]) {
        statusMap[statut] = 0;
      }
      statusMap[statut] += item.nb_ap || 0;
    });
    
    // Convertir en tableau et trier par ordre décroissant
    const chartData = Object.entries(statusMap)
      .map(([name, value]) => ({
        name,
        value,
        color: getColorForStatus(name)
      }))
      .sort((a, b) => b.value - a.value);
    
    return chartData;
  };
  
  // Fonction pour obtenir la couleur selon le statut
  const getColorForStatus = (status) => {
    const colors = {
      'Avis de paiement émis': '#10b981', // vert
      'Etabli': '#3b82f6', // bleu
      'En attente': '#f59e0b', // orange
      'Validé': '#8b5cf6', // violet
      'Rejeté': '#ef4444', // rouge
      'En cours': '#6366f1', // indigo
      'Terminé': '#06b6d4', // cyan
      'Brouillon': '#6b7280', // gris
      'Envoyé': '#f97316', // orange foncé
      'Payé': '#22c55e', // vert clair
    };
    return colors[status] || '#6b7280'; // gris par défaut
  };
  
  const chartData = formatChartData();
  
  // Obtenir la période active pour l'affichage
  const getActivePeriodData = () => {
    if (!data) return [];
    return filterType === 'weekly' 
      ? (data.hebdomadaire || [])
      : (data.mensuel || []);
  };
  
  const activeData = getActivePeriodData();
  const totalFactures = activeData.reduce((sum, item) => sum + (item.nb_ap || 0), 0);
  
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical" // CHANGÉ: Garder le layout vertical (horizontal bars)
          margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
          barSize={20}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke="#f1f5f9"
          />
          <XAxis
            type="number"
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={95}
          />
          <Tooltip
            formatter={(value, name) => {
              const percentage = totalFactures > 0 ? ((value / totalFactures) * 100).toFixed(1) : 0;
              return [`${value} factures (${percentage}%)`, 'Nombre'];
            }}
            labelFormatter={(label) => `Statut: ${label}`}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              fontSize: '12px'
            }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingBottom: '10px' }}
          />
          <Bar
            dataKey="value"
            name="Nombre de factures"
            radius={[0, 4, 4, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// 3. Graphique circulaire des statuts de paiement
const PaymentStatusPieChart = ({ data }) => {
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
            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
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
              `${value} avis (${((props.payload.percent || 0) * 100).toFixed(1)}%)`,
              props.payload.name
            ]}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
          />
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
            {data.reduce((sum, item) => sum + item.value, 0)}
          </text>
          <text
            x="50%"
            y="55%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-sm fill-slate-500"
          >
            Total avis
          </text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// 4. Graphique des destinations
const DestinationChart = ({ data }) => {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            paddingAngle={0}
            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
            labelLine={false}
            dataKey="value"
            cornerRadius={0}
          >
            {data.map((entry, index) => (
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
              `${value} avis (${((props.payload.percent || 0) * 100).toFixed(1)}%)`,
              props.payload.name
            ]}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
          />
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
            {data.reduce((sum, item) => sum + item.value, 0)}
          </text>
          <text
            x="50%"
            y="55%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-sm fill-slate-500"
          >
            Total avis
          </text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// Helper function pour obtenir le numéro de semaine
const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

// Fonction pour créer les données par défaut pour 12 mois
const createDefaultMonthlyData = () => {
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  return months.map(month => ({
    periode: month,
    count: 0,
    montant: 0
  }));
};

export default function AvisPaiementDashboard() {
  const [apiData, setApiData] = useState(null);
  const [factureStatusData, setFactureStatusData] = useState(null);
  const [countFilter, setCountFilter] = useState('monthly');
  const [factureFilter, setFactureFilter] = useState('monthly');
  
  const [paymentStatusData, setPaymentStatusData] = useState([]);
  const [destinationData, setDestinationData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthlyStats, setMonthlyStats] = useState(createDefaultMonthlyData());
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const [response, zoneResponse, destinationResponse, factureResponse] = await Promise.all([
        fetch('http://localhost:3000/api/stats/ap'),
        fetch('http://localhost:3000/api/stats/ap/zone'),
        fetch('http://localhost:3000/api/stats/ap/destination'),
        fetch('http://localhost:3000/api/stats/ft/statut') // Nouvelle API pour les statuts de factures
      ]);
      
      const result = await response.json();
      const zoneResult = await zoneResponse.json();
      const destinationResult = await destinationResponse.json();
      const factureResult = await factureResponse.json();
     
      if (result.success) {
        // Réorganiser les données pour faciliter l'accès
        setApiData({
          weekly: result.data.lebdomadaire || result.data.hebdomadaire,
          monthly: result.data.mensuel
        });
       
        // Mettre à jour les statistiques mensuelles
        updateMonthlyStats(result.data.mensuel);
      }
      
      if (factureResult.success) {
        setFactureStatusData(factureResult.data);
      }
      
      if (zoneResult.success) {
        const zonesMap = zoneResult.data.reduce((acc, item) => {
          const key = item.zone_geo || 'Inconnu';
          acc[key] = (acc[key] || 0) + item.nombre_ap;
          return acc;
        }, {});
        const colors = ['#10b981', '#ef4444', '#f59e0b', '#6b7280', '#3b82f6', '#8b5cf6'];
        const formatted = Object.entries(zonesMap).map(([name, value], index) => ({
          name,
          value,
          color: colors[index % colors.length]
        }));
        setPaymentStatusData(formatted);
      }
      
      if (destinationResult.success) {
        const destinationsMap = destinationResult.data.reduce((acc, item) => {
          const key = item.destination || 'Inconnu';
          acc[key] = (acc[key] || 0) + item.nombre_ap;
          return acc;
        }, {});
        if (!destinationsMap['COMMERCIAL']) {
          destinationsMap['COMMERCIAL'] = 0;
        }
        const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6b7280'];
        const formatted = Object.entries(destinationsMap).map(([name, value], index) => ({
          name,
          value,
          color: colors[index % colors.length]
        }));
        setDestinationData(formatted);
      }
    } catch (error) {
      console.error('Error fetching payment stats:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Mettre à jour les statistiques mensuelles avec les données de l'API
  const updateMonthlyStats = (monthlyData) => {
    if (!monthlyData) return;
   
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const updatedStats = createDefaultMonthlyData();
   
    monthlyData.forEach(item => {
      const date = new Date(item.periode);
      const monthIndex = date.getMonth();
      if (monthIndex >= 0 && monthIndex < 12) {
        updatedStats[monthIndex] = {
          periode: months[monthIndex],
          count: parseInt(item.total_count || 0),
          montant: parseFloat(item.total_somme || 0)
        };
      }
    });
   
    setMonthlyStats(updatedStats);
  };
  
  // Calculer les totaux pour l'affichage
  const calculateTotals = () => {
    if (!apiData) return { totalCount: 0, totalAmount: 0 };
   
    let totalCount = 0;
    let totalAmount = 0;
   
    // Total hebdomadaire
    if (apiData.weekly) {
      apiData.weekly.forEach(item => {
        totalCount += parseInt(item.total_count || 0);
        totalAmount += parseFloat(item.total_somme || 0);
      });
    }
   
    // Total mensuel
    if (apiData.monthly) {
      apiData.monthly.forEach(item => {
        totalCount += parseInt(item.total_count || 0);
        totalAmount += parseFloat(item.total_somme || 0);
      });
    }
   
    return { totalCount, totalAmount };
  };
  
  // Calculer le total des factures pour l'affichage
  const calculateFactureTotals = () => {
    if (!factureStatusData) return { hebdomadaire: 0, mensuel: 0 };
    
    const hebdoTotal = (factureStatusData.hebdomadaire || []).reduce((sum, item) => sum + (item.nb_ap || 0), 0);
    const mensuelTotal = (factureStatusData.mensuel || []).reduce((sum, item) => sum + (item.nb_ap || 0), 0);
    
    return { hebdomadaire: hebdoTotal, mensuel: mensuelTotal };
  };
  
  const { totalCount, totalAmount } = calculateTotals();
  const factureTotals = calculateFactureTotals();
  const currentFactureTotal = factureFilter === 'weekly' ? factureTotals.hebdomadaire : factureTotals.mensuel;
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Chargement des données...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* En-tête avec titre et filtres */}
      
      
      {/* Première ligne: Line Chart (nombre) + Pie chart statuts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Line Chart pour le nombre d'avis - 60% */}
        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Nombre d'avis de paiement
              </h2>
              <p className="text-sm text-slate-500">
                Évolution du nombre d'avis par période
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200">
                <button
                  className={`px-3 py-1.5 text-sm ${countFilter === 'weekly' ? 'bg-blue-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => setCountFilter('weekly')}
                >
                  Hebdomadaire
                </button>
                <button
                  className={`px-3 py-1.5 text-sm ${countFilter === 'monthly' ? 'bg-blue-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => setCountFilter('monthly')}
                >
                  Mensuel
                </button>
              </div>
              <CalendarDays className="w-5 h-5 text-slate-400" />
            </div>
          </div>
          <PaymentCountChart data={apiData} filterType={countFilter} />
        </div>
        
        {/* Pie chart des statuts - 40% */}
        <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Avis par zone
              </h2>
              <p className="text-sm text-slate-500">
                Répartition par zone
              </p>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-slate-400" />
            </div>
          </div>
          <PaymentStatusPieChart data={paymentStatusData} />
        </div>
      </div>
      
      {/* Deuxième ligne: Bar Chart (statuts factures) + Pie chart méthodes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bar Chart horizontal pour les statuts de factures - 60% */}
        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Factures par statut
              </h2>
              <p className="text-sm text-slate-500">
                {currentFactureTotal} factures - {factureFilter === 'weekly' ? 'Hebdomadaire' : 'Mensuel'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200">
                <button
                  className={`px-3 py-1.5 text-sm ${factureFilter === 'weekly' ? 'bg-blue-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => setFactureFilter('weekly')}
                >
                  Hebdomadaire
                </button>
                <button
                  className={`px-3 py-1.5 text-sm ${factureFilter === 'monthly' ? 'bg-blue-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => setFactureFilter('monthly')}
                >
                  Mensuel
                </button>
              </div>
              <FileType className="w-5 h-5 text-slate-400" />
            </div>
          </div>
          <FactureStatusChart data={factureStatusData} filterType={factureFilter} />
        </div>
        
        {/* Pie chart des destinations - 40% */}
        <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Avis par destination
              </h2>
              <p className="text-sm text-slate-500">
                Répartition par destination
              </p>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-slate-400" />
            </div>
          </div>
          <DestinationChart data={destinationData} />
        </div>
      </div>
    </div>
  );
}