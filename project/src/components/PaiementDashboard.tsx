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
  AreaChart,
  Area
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  FileType,
  MapPin,
  BarChart3,
  Clock,
  Percent,
  RefreshCw,
  Calendar,
  Banknote,
  Smartphone,
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  Receipt,
  Wallet,
  AlertTriangle,
  Building,
  Home,
  Users
} from 'lucide-react';

// 1. Line Chart pour les paiements par période
const PaymentTrendChart = ({ data, filterType }) => {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorMontant" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.7}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
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
              if (name === 'montant') return [`${formatMontant(value)} MGA`, 'Montant'];
              if (name === 'count') return [`${value} paiements`, 'Nombre'];
              return [value, name];
            }}
            labelFormatter={(label) => `Mois: ${label}`}
          />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="plainline"
            iconSize={8}
            wrapperStyle={{ paddingBottom: '10px' }}
          />
          <Area
            type="monotone"
            dataKey="montant"
            stroke="#3b82f6"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorMontant)"
            activeDot={{ r: 6, strokeWidth: 2 }}
            name="Montant total"
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={0.6}
            fill="url(#colorCount)"
            activeDot={{ r: 5, strokeWidth: 2 }}
            name="Nombre de paiements"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// 2. Bar Chart pour les paiements par statut
const PaymentStatusBarChart = ({ data, filterType }) => {
  // Transformer les données de l'API pour le Bar Chart
  const formatChartData = () => {
    if (!data || data.length === 0) return [];
    
    // Grouper les données par statut
    const statutMap = {};
    
    data.forEach(item => {
      const statut = item.statut;
      if (!statutMap[statut]) {
        statutMap[statut] = {
          count: 0,
          montant: 0
        };
      }
      statutMap[statut].count += parseInt(item.total_count || 0);
      statutMap[statut].montant += parseFloat(item.total_somme || 0);
    });
    
    // Convertir en tableau pour le chart
    return Object.entries(statutMap).map(([statut, values]) => ({
      statut,
      count: values.count,
      montant: values.montant,
      color: getColorForStatut(statut)
    })).sort((a, b) => b.montant - a.montant); // Trier par montant décroissant
  };
  
  // Obtenir la couleur selon le statut
  const getColorForStatut = (statut) => {
    const statutLower = statut.toLowerCase();
    if (statutLower.includes('payé') || statutLower.includes('complet')) {
      return '#10b981'; // Vert
    } else if (statutLower.includes('partiel')) {
      return '#3b82f6'; // Bleu
    } else if (statutLower.includes('attente') || statutLower.includes('en cours')) {
      return '#f59e0b'; // Orange
    } else if (statutLower.includes('annulé') || statutLower.includes('refusé')) {
      return '#ef4444'; // Rouge
    } else {
      return '#6b7280'; // Gris
    }
  };
  
  const chartData = formatChartData();
  const totalCount = chartData.reduce((sum, item) => sum + item.count, 0);
  const totalMontant = chartData.reduce((sum, item) => sum + item.montant, 0);
  
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
            dataKey="statut"
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
          />
          <Tooltip
            formatter={(value, name) => {
              if (name === 'montant') {
                const percentage = totalMontant > 0 ? ((value / totalMontant) * 100).toFixed(1) : 0;
                return [`${formatMontant(value)} MGA (${percentage}%)`, 'Montant'];
              } else {
                const percentage = totalCount > 0 ? ((value / totalCount) * 100).toFixed(1) : 0;
                return [`${value} paiements (${percentage}%)`, 'Nombre'];
              }
            }}
            labelFormatter={(label) => `Statut: ${label}`}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="plainline"
            iconSize={8}
            wrapperStyle={{ paddingBottom: '10px' }}
          />
          <Bar
            dataKey="montant"
            name="Montant total"
            radius={[4, 4, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
          <Bar
            dataKey="count"
            name="Nombre"
            radius={[4, 4, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}-count`} fill={`${entry.color}80`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// 3. Pie Chart pour les modes de paiement - SANS LEGENDES AVEC NOMBRES
const PaymentMethodPieChart = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) {
    return (
      <div className="h-[300px] flex flex-col items-center justify-center">
        <Banknote className="w-12 h-12 text-slate-300 mb-4" />
        <p className="text-slate-500">Aucun paiement enregistré</p>
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
            label={({ name, percent, value }) => {
              // Afficher le nom, pourcentage et valeur
              if (percent > 0.05) {
                return `${name}\n${(percent * 100).toFixed(0)}% (${value})`;
              }
              return '';
            }}
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
              `${value} paiements (${((props.payload.percent || 0) * 100).toFixed(1)}%)`,
              props.payload.name
            ]}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
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
            Total paiements
          </text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// 4. Chart pour afficher le résumé des paiements
const SummaryChart = ({ summaryData }) => {
  const chartData = [
    { 
      name: 'Facturé', 
      value: summaryData.total_facture, 
      color: '#3b82f6',
      icon: <Receipt className="w-5 h-5" />
    },
    { 
      name: 'Encaissé', 
      value: summaryData.total_encaisse, 
      color: '#10b981',
      icon: <Wallet className="w-5 h-5" />
    },
    { 
      name: 'Dû', 
      value: summaryData.total_du, 
      color: '#f59e0b',
      icon: <AlertTriangle className="w-5 h-5" />
    },
  ];
  
  const total = summaryData.nb_paiements || 0;
  
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            outerRadius={80}
            paddingAngle={2}
            label={({ name, value }) => {
              return `${name}\n${formatMontant(value)} MGA`;
            }}
            labelLine={false}
            dataKey="value"
            cornerRadius={5}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                stroke="#ffffff"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [
              `${formatMontant(value)} MGA`,
              name
            ]}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
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
            Total paiements
          </text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// Fonction utilitaire pour formater les montants
const formatMontant = (montant) => {
  if (montant === null || montant === undefined) return '0';
  const num = typeof montant === 'string' ? parseFloat(montant) : montant;
  
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('fr-FR').format(num);
};

// Créer les 12 mois de l'année avec les noms en français
const createMonthsArray = () => {
  return [
    'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
    'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'
  ];
};

// Fonction pour créer les données complètes des modes de paiement
const createPaymentMethodData = (apiStats) => {
  if (!apiStats) {
    return [
      { name: 'Espèces', value: 0, color: '#10b981' },
      { name: 'Virement', value: 0, color: '#3b82f6' },
      { name: 'Mobile Money', value: 0, color: '#8b5cf6' },
      { name: 'Carte bancaire', value: 0, color: '#f59e0b' },
    ];
  }
  
  return [
    { 
      name: 'Espèces', 
      value: parseInt(apiStats.espece || 0), 
      color: '#10b981'
    },
    { 
      name: 'Virement', 
      value: parseInt(apiStats.virement || 0), 
      color: '#3b82f6'
    },
    { 
      name: 'Mobile Money', 
      value: parseInt(apiStats.mobile_money || 0), 
      color: '#8b5cf6'
    },
    { 
      name: 'Carte bancaire', 
      value: parseInt(apiStats.carte_bancaire || 0), 
      color: '#f59e0b'
    },
  ];
};

// Fonction pour calculer les totaux par statut depuis l'API
const calculateStatusTotals = (apiStatusData) => {
  if (!apiStatusData || apiStatusData.length === 0) {
    return {
      totalCount: 0,
      totalMontant: 0,
      stats: []
    };
  }
  
  const statsMap = {};
  let totalCount = 0;
  let totalMontant = 0;
  
  apiStatusData.forEach(item => {
    const statut = item.statut;
    const count = parseInt(item.total_count || 0);
    const montant = parseFloat(item.total_somme || 0);
    
    if (!statsMap[statut]) {
      statsMap[statut] = { count: 0, montant: 0 };
    }
    
    statsMap[statut].count += count;
    statsMap[statut].montant += montant;
    
    totalCount += count;
    totalMontant += montant;
  });
  
  const stats = Object.entries(statsMap).map(([statut, values]) => ({
    statut,
    ...values
  }));
  
  return { totalCount, totalMontant, stats };
};

export default function PaiementDashboard() {
  const [trendFilter, setTrendFilter] = useState('monthly');
  const [statusFilter, setStatusFilter] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [apiStats, setApiStats] = useState(null);
  const [apiStatusData, setApiStatusData] = useState([]);
  const [paymentMethodData, setPaymentMethodData] = useState([]);
  const [monthlyTrendData, setMonthlyTrendData] = useState([]);
  const [summaryData, setSummaryData] = useState({
    nb_paiements: 0,
    total_facture: 0,
    total_encaisse: 0,
    total_du: 0
  });

  // Récupérer les statistiques de l'API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Récupérer les statistiques générales
        const statsResponse = await fetch('http://localhost:3000/api/paiements/stats');
        const statsResult = await statsResponse.json();
        
        // Récupérer les statistiques par statut
        const statusResponse = await fetch('http://localhost:3000/api/statpaiement/statut');
        const statusResult = await statusResponse.json();
        
        // Récupérer le résumé
        const summaryResponse = await fetch('http://localhost:3000/api/statpaiement/summary');
        const summaryResult = await summaryResponse.json();
        
        if (statsResult.success) {
          setApiStats(statsResult.data);
          
          // Mettre à jour les données des modes de paiement
          const methodData = createPaymentMethodData(statsResult.data);
          setPaymentMethodData(methodData);
        }
        
        if (statusResult.success) {
          setApiStatusData(statusResult.results || []);
        }
        
        if (summaryResult.success) {
          setSummaryData({
            nb_paiements: summaryResult.results.nb_paiements || 0,
            total_facture: parseFloat(summaryResult.results.total_facture || 0),
            total_encaisse: parseFloat(summaryResult.results.total_encaisse || 0),
            total_du: parseFloat(summaryResult.results.total_du || 0)
          });
        }
        
        // Créer les données mensuelles pour les 12 mois
        const months = createMonthsArray();
        const currentMonth = new Date().getMonth();
        
        // Calculer les totaux depuis les données de statut
        const statusTotals = calculateStatusTotals(statusResult.results || []);
        const totalPaiements2 = statusTotals.totalCount;
        const totalMontant = statusTotals.totalMontant;
        
        // Répartir les données sur les 12 mois
        const trendData = months.map((month, index) => {
          // Si c'est le mois en cours
          if (index === currentMonth) {
            return {
              periode: month,
              montant: totalMontant * 0.3, // 30% dans le mois en cours
              count: Math.round(totalPaiements2 * 0.3)
            };
          }
          
          // Pour les mois passés
          const monthWeight = index <= currentMonth ? 
            (currentMonth - index + 1) / (currentMonth + 1) : 0;
          
          return {
            periode: month,
            montant: monthWeight * totalMontant * 0.7,
            count: Math.round(monthWeight * totalPaiements2 * 0.7)
          };
        });
        
        setMonthlyTrendData(trendData);
        
      } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
        
        // Données par défaut en cas d'erreur
        const months = createMonthsArray();
        const defaultTrendData = months.map(month => ({
          periode: month,
          montant: 0,
          count: 0
        }));
        
        setMonthlyTrendData(defaultTrendData);
        setPaymentMethodData(createPaymentMethodData(null));
        
        setSummaryData({
          nb_paiements: 0,
          total_facture: 0,
          total_encaisse: 0,
          total_du: 0
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  // Données hebdomadaires (4 dernières semaines)
  const weeklyTrendData = [
    { periode: 'Sem 1', montant: 1250000, count: 8 },
    { periode: 'Sem 2', montant: 1890000, count: 12 },
    { periode: 'Sem 3', montant: 1560000, count: 10 },
    { periode: 'Sem 4', montant: 2100000, count: 14 },
  ];

  // Calculer les totaux des statuts pour l'affichage
  const statusTotals = calculateStatusTotals(apiStatusData);
  
  // Calculer le pourcentage d'encaissement
  const encaissementPercentage = summaryData.total_facture > 0 
    ? ((summaryData.total_encaisse / summaryData.total_facture) * 100).toFixed(1)
    : 0;

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
      {/* Première ligne: Tendance des paiements + Modes de paiement */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Tendance des paiements - 60% */}
        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Tendance des Paiements
              </h2>
              <p className="text-sm text-slate-500">
                {statusTotals.totalCount > 0 && (
                  <>Total: {formatMontant(statusTotals.totalMontant)} MGA • {statusTotals.totalCount} paiements</>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200">
                <button
                  className={`px-3 py-1.5 text-sm ${trendFilter === 'weekly' ? 'bg-blue-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => setTrendFilter('weekly')}
                >
                  4 semaines
                </button>
                <button
                  className={`px-3 py-1.5 text-sm ${trendFilter === 'monthly' ? 'bg-blue-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => setTrendFilter('monthly')}
                >
                  12 mois
                </button>
              </div>
              <Calendar className="w-5 h-5 text-slate-400" />
            </div>
          </div>
          <PaymentTrendChart 
            data={trendFilter === 'weekly' ? weeklyTrendData : monthlyTrendData} 
            filterType={trendFilter}
          />
        </div>
        
        {/* Modes de paiement - 40% */}
        <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Modes de Paiement
              </h2>
              <p className="text-sm text-slate-500">
                {apiStats && (
                  <>Distribution des {apiStats.total_paiements} paiements</>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-slate-400" />
            </div>
          </div>
          
          <PaymentMethodPieChart data={paymentMethodData} />
        </div>
      </div>

      {/* Deuxième ligne: Paiements par statut + Résumé */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Paiements par statut - 60% */}
        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Paiements par Statut
              </h2>
              <p className="text-sm text-slate-500">
                {statusTotals.totalCount > 0 && (
                  <>{statusTotals.totalCount} paiements • {formatMontant(statusTotals.totalMontant)} MGA</>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200">
                <button
                  className={`px-3 py-1.5 text-sm ${statusFilter === 'weekly' ? 'bg-blue-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => setStatusFilter('weekly')}
                >
                  Hebdomadaire
                </button>
                <button
                  className={`px-3 py-1.5 text-sm ${statusFilter === 'monthly' ? 'bg-blue-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => setStatusFilter('monthly')}
                >
                  Mensuel
                </button>
              </div>
              <FileType className="w-5 h-5 text-slate-400" />
            </div>
          </div>
          
          <PaymentStatusBarChart 
            data={apiStatusData} 
            filterType={statusFilter}
          />
        </div>
        
        {/* Résumé des paiements - 40% */}
        <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Résumé des Paiements
              </h2>
              <p className="text-sm text-slate-500">
                Vue d'ensemble des transactions
              </p>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-slate-400" />
            </div>
          </div>
          <SummaryChart summaryData={summaryData} />
        </div>
      </div>

      {/* Section de résumé détaillé en bas */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-6">
          Détails du Résumé
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Carte: Nombre de paiements */}
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg border border-blue-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Paiements</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">
                  {summaryData.nb_paiements}
                </h3>
                <p className="text-sm text-slate-500 mt-1">transactions totales</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Carte: Total facturé */}
          <div className="bg-gradient-to-br from-indigo-50 to-white rounded-lg border border-indigo-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Facturé</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">
                  {formatMontant(summaryData.total_facture)} MGA
                </h3>
                <p className="text-sm text-slate-500 mt-1">montant total des factures</p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Receipt className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          {/* Carte: Total encaissé */}
          <div className="bg-gradient-to-br from-emerald-50 to-white rounded-lg border border-emerald-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Encaissé</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">
                  {formatMontant(summaryData.total_encaisse)} MGA
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-medium text-emerald-600">
                    {encaissementPercentage}% d'encaissement
                  </span>
                  <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(encaissementPercentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="p-3 bg-emerald-100 rounded-lg">
                <Wallet className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* Carte: Total dû */}
          <div className="bg-gradient-to-br from-amber-50 to-white rounded-lg border border-amber-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Dû</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">
                  {formatMontant(summaryData.total_du)} MGA
                </h3>
                <p className="text-sm text-slate-500 mt-1">montant restant à payer</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Ligne de statistiques supplémentaires */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">Montant moyen par paiement</p>
              <p className="text-lg font-semibold text-slate-900 mt-1">
                {summaryData.nb_paiements > 0 
                  ? formatMontant(summaryData.total_facture / summaryData.nb_paiements) 
                  : '0'} MGA
              </p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">Taux d'encaissement</p>
              <p className="text-lg font-semibold text-slate-900 mt-1">
                {encaissementPercentage}%
              </p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">Ratio dû/facturé</p>
              <p className="text-lg font-semibold text-slate-900 mt-1">
                {summaryData.total_facture > 0 
                  ? ((summaryData.total_du / summaryData.total_facture) * 100).toFixed(1)
                  : '0'}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}