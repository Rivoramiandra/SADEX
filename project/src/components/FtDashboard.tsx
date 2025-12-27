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
  Area,
  LineChart,
  Line
} from 'recharts';
import {
  AlertTriangle,
  Building,
  Calendar,
  MapPin,
  FileText,
  Clock,
  CheckCircle
} from 'lucide-react';

// 1. Area Chart avec zones colorées et lignes très fines (0.5px)
const RendezvousActivityChart = ({ data, filter }: { data: any, filter: string }) => {
  // Préparer les données selon le filtre
  const prepareChartData = () => {
    if (!data) return [];

    if (filter === 'mensuel') {
      // Pour le mensuel, générer les 12 derniers mois
      const monthlyData = data.mensuel || [];
      
      // Générer les 12 derniers mois
      const allMonths = [];
      const today = new Date();
      
      // Créer un mapping des mois abrégés
      const monthMap = {
        'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
        'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
      };
      
      // Pour chaque mois de Jan à Dec
      Object.entries(monthMap).forEach(([monthName, monthNum]) => {
        // Chercher les données pour ce mois
        const existingMonth = monthlyData.find((item: any) => {
          const itemMonth = item.periode.toLowerCase();
          const monthNames = [
            'jan', 'feb', 'mar', 'apr', 'may', 'jun',
            'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
            'janv', 'fév', 'mars', 'avr', 'mai', 'juin',
            'juil', 'août', 'sept', 'oct', 'nov', 'déc'
          ];
          
          const targetMonth = monthName.toLowerCase().substring(0, 3);
          return itemMonth.includes(targetMonth) || 
                 (item.periode_num && parseInt(item.periode_num) === monthNum);
        });
        
        allMonths.push({
          periode: monthName,
          total: existingMonth ? parseInt(existingMonth.total) || 0 : 0,
          en_attente: existingMonth ? parseInt(existingMonth.en_attente) || 0 : 0,
          en_cours: existingMonth ? parseInt(existingMonth.en_cours) || 0 : 0,
          non_comparution: existingMonth ? parseInt(existingMonth.non_comparution) || 0 : 0,
        });
      });
      
      return allMonths;
    } else {
      // Pour l'hebdomadaire, garder la logique existante
      const weeklyData = data.hebdomadaire || [];
      return weeklyData.map((item: any) => ({
        periode: item.periode,
        total: parseInt(item.total) || 0,
        en_attente: parseInt(item.en_attente) || 0,
        en_cours: parseInt(item.en_cours) || 0,
        non_comparution: parseInt(item.non_comparution) || 0,
      }));
    }
  };

  const chartData = prepareChartData();

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-slate-500">Aucune donnée disponible</p>
      </div>
    );
  }

  // Définir les couleurs pour les différentes séries
  const colors = {
    total: '#3b82f6',
    en_attente: '#f59e0b',
    en_cours: '#10b981',
    non_comparution: '#ef4444'
  };

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.total} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={colors.total} stopOpacity={0.05}/>
            </linearGradient>
            <linearGradient id="colorAttente" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.en_attente} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={colors.en_attente} stopOpacity={0.05}/>
            </linearGradient>
            <linearGradient id="colorCours" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.en_cours} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={colors.en_cours} stopOpacity={0.05}/>
            </linearGradient>
            <linearGradient id="colorNonComparution" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.non_comparution} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={colors.non_comparution} stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="periode"
            tick={{ fill: '#64748b', fontSize: filter === 'mensuel' ? 11 : 12 }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
            interval={0}
            angle={filter === 'mensuel' ? -45 : 0}
            textAnchor={filter === 'mensuel' ? 'end' : 'middle'}
            height={filter === 'mensuel' ? 60 : 40}
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
              if (name === 'total') return [`${value}`, 'Total rendez-vous'];
              if (name === 'en_attente') return [`${value}`, 'En attente'];
              if (name === 'en_cours') return [`${value}`, 'En cours'];
              if (name === 'non_comparution') return [`${value}`, 'Non comparution'];
              return [value, name];
            }}
            labelFormatter={(label) => `${filter === 'mensuel' ? 'Mois' : 'Semaine'}: ${label}`}
          />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingBottom: '10px' }}
            formatter={(value) => {
              if (value === 'total') return 'Total rendez-vous';
              if (value === 'en_attente') return 'En attente';
              if (value === 'en_cours') return 'En cours';
              if (value === 'non_comparution') return 'Non comparution';
              return value;
            }}
          />
          
          <Area
            type="monotone"
            dataKey="non_comparution"
            stackId={filter === 'mensuel' ? undefined : "1"}
            stroke={colors.non_comparution}
            strokeWidth={0.5}
            fillOpacity={filter === 'mensuel' ? 0.3 : 1}
            fill={filter === 'mensuel' ? colors.non_comparution : "url(#colorNonComparution)"}
            activeDot={{ r: 4, strokeWidth: 1 }}
            name="Non comparution"
          />
          
          <Area
            type="monotone"
            dataKey="en_cours"
            stackId={filter === 'mensuel' ? undefined : "1"}
            stroke={colors.en_cours}
            strokeWidth={0.5}
            fillOpacity={filter === 'mensuel' ? 0.3 : 1}
            fill={filter === 'mensuel' ? colors.en_cours : "url(#colorCours)"}
            activeDot={{ r: 4, strokeWidth: 1 }}
            name="En cours"
          />
          
          <Area
            type="monotone"
            dataKey="en_attente"
            stackId={filter === 'mensuel' ? undefined : "1"}
            stroke={colors.en_attente}
            strokeWidth={0.5}
            fillOpacity={filter === 'mensuel' ? 0.3 : 1}
            fill={filter === 'mensuel' ? colors.en_attente : "url(#colorAttente)"}
            activeDot={{ r: 4, strokeWidth: 1 }}
            name="En attente"
          />
          
          <Area
            type="monotone"
            dataKey="total"
            stroke={colors.total}
            strokeWidth={0.5}
            fillOpacity={filter === 'mensuel' ? 0.3 : 1}
            fill={filter === 'mensuel' ? colors.total : "url(#colorTotal)"}
            activeDot={{ r: 4, strokeWidth: 1 }}
            name="Total rendez-vous"
          />
          
          {/* Pour mensuel: ajouter aussi des lignes pour mieux voir les tendances */}
          {filter === 'mensuel' && (
            <Line
              type="monotone"
              dataKey="total"
              stroke={colors.total}
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
              activeDot={false}
              name="Total (ligne)"
              legendType="none"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// 2. Pie Chart pour les statistiques FT (complet vs incomplet)
const FTPieChart = ({ ftData, filter }: { ftData: any, filter: string }) => {
  // Préparer les données pour le Pie Chart
  const prepareFTPieData = () => {
    if (!ftData) return [];

    let total = 0;
    let complet = 0;
    let incomplet = 0;

    if (filter === 'mensuel') {
      // Pour le mensuel, calculer les totaux de l'évolution
      const evolutionData = ftData.evolution || [];
      
      evolutionData.forEach((item: any) => {
        total += parseInt(item.total) || 0;
        complet += parseInt(item.complet) || 0;
        incomplet += parseInt(item.incomplet) || 0;
      });
    } else {
      // Pour l'hebdomadaire, utiliser les données actuelles
      const actuelData = ftData.actuel || {};
      total = parseInt(actuelData.total) || 0;
      complet = parseInt(actuelData.complet) || 0;
      incomplet = parseInt(actuelData.incomplet) || 0;
    }

    return [
      { name: 'Complet', value: complet, color: '#10b981' },
      { name: 'Incomplet', value: incomplet, color: '#ef4444' },
    ].filter(item => item.value > 0);
  };

  const pieData = prepareFTPieData();
  const totalValue = pieData.reduce((sum, item) => sum + item.value, 0);

  if (pieData.length === 0 || totalValue === 0) {
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
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
            labelLine={false}
            dataKey="value"
            cornerRadius={5}
          >
            {pieData.map((entry, index) => (
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
              `${value} FT (${((props.payload.percent || 0) * 100).toFixed(1)}%)`,
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
              const item = pieData.find(d => d.name === value);
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
            {totalValue}
          </text>
          <text
            x="50%"
            y="55%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-sm fill-slate-500"
          >
            Total FT
          </text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// 3. Bar Chart pour les statistiques FT mensuelles
const FTMonthlyBarChart = ({ ftMonthlyData, filter }: { ftMonthlyData: any, filter: string }) => {
  // Préparer les données selon le filtre
  const prepareChartData = () => {
    if (!ftMonthlyData || !ftMonthlyData.data) return [];

    if (filter === 'mensuel') {
      // Pour le mensuel, générer les 12 derniers mois
      const monthlyData = ftMonthlyData.data || [];
      
      // Générer les 12 derniers mois
      const allMonths = [];
      
      // Créer un mapping des mois abrégés
      const monthMap = {
        'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
        'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
      };
      
      // Pour chaque mois de Jan à Dec
      Object.entries(monthMap).forEach(([monthName, monthNum]) => {
        // Chercher les données pour ce mois
        const existingMonth = monthlyData.find((item: any) => {
          const itemMonth = item.periode.toLowerCase();
          const monthNames = [
            'jan', 'feb', 'mar', 'apr', 'may', 'jun',
            'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
            'janv', 'fév', 'mars', 'avr', 'mai', 'juin',
            'juil', 'août', 'sept', 'oct', 'nov', 'déc'
          ];
          
          const targetMonth = monthName.toLowerCase().substring(0, 3);
          return itemMonth.includes(targetMonth);
        });
        
        allMonths.push({
          periode: monthName,
          total: existingMonth ? parseInt(existingMonth.total) || 0 : 0,
        });
      });
      
      return allMonths;
    } else {
      // Pour l'hebdomadaire, garder une donnée simple
      return [{ periode: 'Actuel', total: ftMonthlyData.total || 0 }];
    }
  };

  const chartData = prepareChartData();

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-slate-500">Aucune donnée disponible</p>
      </div>
    );
  }

  // Couleur pour les barres
  const barColor = '#3b82f6';

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
            dataKey="periode"
            tick={{ fill: '#64748b', fontSize: filter === 'mensuel' ? 11 : 12 }}
            axisLine={false}
            tickLine={false}
            angle={filter === 'mensuel' ? -45 : 0}
            textAnchor={filter === 'mensuel' ? 'end' : 'middle'}
            height={filter === 'mensuel' ? 60 : 40}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            label={{
              value: 'Nombre de FT',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              fontSize: 12,
              fill: '#64748b'
            }}
          />
          <Tooltip
            formatter={(value) => [`${value} FT`, 'Nombre']}
            labelFormatter={(label) => `${filter === 'mensuel' ? 'Mois' : 'Période'}: ${label}`}
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
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingBottom: '10px' }}
            formatter={() => 'Total FT'}
          />
          <Bar
            dataKey="total"
            name="Total FT"
            fill={barColor}
            radius={[4, 4, 0, 0]}
            stroke="#ffffff"
            strokeWidth={1}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// 4. Liste des FT Récents
const FTRecentList = ({ recentFTData }: { recentFTData: any }) => {
  if (!recentFTData || !recentFTData.data || recentFTData.data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-slate-500">Aucun FT récent disponible</p>
      </div>
    );
  }

  const ftList = recentFTData.data.slice(0, 10); // Limiter à 10 éléments maximum

  // Fonction pour formater la date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  // Fonction pour obtenir la couleur du statut
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'complet':
        return 'bg-emerald-100 text-emerald-800';
      case 'incomplet':
        return 'bg-red-100 text-red-800';
      case 'en cours':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="h-[300px] overflow-y-auto">
      <div className="space-y-3">
        {ftList.map((ft: any, index: number) => (
          <div 
            key={index} 
            className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-shrink-0">
                    <FileText className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">
                      {ft.reference_ft}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(ft.statut_dossier)}`}>
                        {ft.statut_dossier}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(ft.date_affichage)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {ft.statut_dossier.toLowerCase() === 'complet' && (
                <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Composant FtDashboard
export default function FtDashboard() {
  const [rendezvousStats, setRendezvousStats] = useState<any>(null);
  const [ftStats, setFtStats] = useState<any>(null);
  const [ftMonthlyStats, setFtMonthlyStats] = useState<any>(null);
  const [recentFTData, setRecentFTData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingFT, setLoadingFT] = useState(true);
  const [loadingFTMonthly, setLoadingFTMonthly] = useState(true);
  const [loadingRecentFT, setLoadingRecentFT] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorFT, setErrorFT] = useState<string | null>(null);
  const [errorFTMonthly, setErrorFTMonthly] = useState<string | null>(null);
  const [errorRecentFT, setErrorRecentFT] = useState<string | null>(null);
  const [rendezvousFilter, setRendezvousFilter] = useState<'mensuel' | 'hebdomadaire'>('mensuel');
  const [ftFilter, setFtFilter] = useState<'mensuel' | 'hebdomadaire'>('mensuel');
  const [ftMonthlyFilter, setFtMonthlyFilter] = useState<'mensuel' | 'hebdomadaire'>('mensuel');

  // Récupérer les données de l'API pour les rendez-vous
  useEffect(() => {
    const fetchRendezvousStats = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:3000/api/stats/rendezvous');
        const data = await response.json();
        
        if (data.success) {
          setRendezvousStats(data.data);
        } else {
          setError(data.message || 'Erreur lors de la récupération des données');
        }
      } catch (err) {
        setError('Erreur de connexion au serveur');
        console.error('Erreur:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRendezvousStats();
  }, []);

  // Récupérer les données de l'API pour les FT (complet/incomplet)
  useEffect(() => {
    const fetchFTStats = async () => {
      try {
        setLoadingFT(true);
        const response = await fetch('http://localhost:3000/api/stats/rendezvous/ft');
        const data = await response.json();
        
        if (data.success) {
          setFtStats(data.data);
        } else {
          setErrorFT(data.message || 'Erreur lors de la récupération des données FT');
        }
      } catch (err) {
        setErrorFT('Erreur de connexion au serveur pour les données FT');
        console.error('Erreur FT:', err);
      } finally {
        setLoadingFT(false);
      }
    };

    fetchFTStats();
  }, []);

  // Récupérer les données de l'API pour les FT mensuels (bar chart)
  useEffect(() => {
    const fetchFTMonthlyStats = async () => {
      try {
        setLoadingFTMonthly(true);
        const response = await fetch('http://localhost:3000/api/stats/rendezvous/ft/mensuel');
        const data = await response.json();
        
        if (data.success) {
          setFtMonthlyStats(data);
        } else {
          setErrorFTMonthly(data.message || 'Erreur lors de la récupération des données FT mensuelles');
        }
      } catch (err) {
        setErrorFTMonthly('Erreur de connexion au serveur pour les données FT mensuelles');
        console.error('Erreur FT mensuel:', err);
      } finally {
        setLoadingFTMonthly(false);
      }
    };

    fetchFTMonthlyStats();
  }, []);

  // Récupérer les données de l'API pour les FT récents
  useEffect(() => {
    const fetchRecentFTData = async () => {
      try {
        setLoadingRecentFT(true);
        const response = await fetch('http://localhost:3000/api/stats/rendezvous/ft/recent');
        const data = await response.json();
        
        if (data.success) {
          setRecentFTData(data);
        } else {
          setErrorRecentFT(data.message || 'Erreur lors de la récupération des données FT récents');
        }
      } catch (err) {
        setErrorRecentFT('Erreur de connexion au serveur pour les données FT récents');
        console.error('Erreur FT récents:', err);
      } finally {
        setLoadingRecentFT(false);
      }
    };

    fetchRecentFTData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Première paire: 60% Area Chart Rendez-vous + 40% Pie Chart FT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Area Chart Rendez-vous - 60% (col-span-7) */}
        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Statistiques des Rendez-vous
              </h2>
              <p className="text-sm text-slate-500">
                Évolution des rendez-vous par {rendezvousFilter === 'mensuel' ? 'mois' : 'semaine'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200">
                <button
                  className={`px-3 py-1.5 text-sm ${rendezvousFilter === 'mensuel' ? 'bg-blue-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => setRendezvousFilter('mensuel')}
                >
                  Mensuel
                </button>
                <button
                  className={`px-3 py-1.5 text-sm ${rendezvousFilter === 'hebdomadaire' ? 'bg-blue-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => setRendezvousFilter('hebdomadaire')}
                >
                  Hebdomadaire
                </button>
              </div>
              <Calendar className="w-5 h-5 text-slate-400" />
            </div>
          </div>
          
          {loading ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="h-[300px] flex items-center justify-center text-red-600">
              <AlertTriangle className="w-6 h-6 mr-2" />
              {error}
            </div>
          ) : !rendezvousStats ? (
            <div className="h-[300px] flex items-center justify-center text-slate-500">
              Aucune donnée disponible
            </div>
          ) : (
            <RendezvousActivityChart 
              data={rendezvousStats} 
              filter={rendezvousFilter}
            />
          )}
        </div>

        {/* Pie Chart FT - 40% (col-span-5) */}
        <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Statistiques des FT
              </h2>
              <p className="text-sm text-slate-500">
                Répartition FT Complet vs Incomplet ({ftFilter === 'mensuel' ? 'Mensuel' : 'Hebdomadaire'})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200">
                <button
                  className={`px-3 py-1.5 text-sm ${ftFilter === 'mensuel' ? 'bg-blue-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => setFtFilter('mensuel')}
                >
                  Mensuel
                </button>
                <button
                  className={`px-3 py-1.5 text-sm ${ftFilter === 'hebdomadaire' ? 'bg-blue-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => setFtFilter('hebdomadaire')}
                >
                  Hebdo
                </button>
              </div>
              <FileText className="w-5 h-5 text-slate-400" />
            </div>
          </div>
          
          {loadingFT ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : errorFT ? (
            <div className="h-[300px] flex items-center justify-center text-red-600">
              <AlertTriangle className="w-6 h-6 mr-2" />
              {errorFT}
            </div>
          ) : !ftStats ? (
            <div className="h-[300px] flex items-center justify-center text-slate-500">
              Aucune donnée disponible
            </div>
          ) : (
            <FTPieChart 
              ftData={ftStats} 
              filter={ftFilter}
            />
          )}
        </div>
      </div>

      {/* Deuxième paire: 60% Bar Chart FT Mensuel + 40% Liste FT Récents */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Bar Chart FT Mensuel - 60% (col-span-7) */}
        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Évolution Mensuelle des FT
              </h2>
              <p className="text-sm text-slate-500">
                Nombre total de FT par {ftMonthlyFilter === 'mensuel' ? 'mois' : 'période'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200">
                <button
                  className={`px-3 py-1.5 text-sm ${ftMonthlyFilter === 'mensuel' ? 'bg-blue-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => setFtMonthlyFilter('mensuel')}
                >
                  Mensuel
                </button>
                <button
                  className={`px-3 py-1.5 text-sm ${ftMonthlyFilter === 'hebdomadaire' ? 'bg-blue-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => setFtMonthlyFilter('hebdomadaire')}
                >
                  Hebdo
                </button>
              </div>
              <FileText className="w-5 h-5 text-slate-400" />
            </div>
          </div>
          
          {loadingFTMonthly ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : errorFTMonthly ? (
            <div className="h-[300px] flex items-center justify-center text-red-600">
              <AlertTriangle className="w-6 h-6 mr-2" />
              {errorFTMonthly}
            </div>
          ) : !ftMonthlyStats ? (
            <div className="h-[300px] flex items-center justify-center text-slate-500">
              Aucune donnée disponible
            </div>
          ) : (
            <FTMonthlyBarChart 
              ftMonthlyData={ftMonthlyStats} 
              filter={ftMonthlyFilter}
            />
          )}
        </div>

        {/* Liste FT Récents - 40% (col-span-5) */}
        <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                FT Récents
              </h2>
              <p className="text-sm text-slate-500">
                Derniers FT créés ou mis à jour
              </p>
            </div>
            <Clock className="w-5 h-5 text-slate-400" />
          </div>
          
          {loadingRecentFT ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : errorRecentFT ? (
            <div className="h-[300px] flex items-center justify-center text-red-600">
              <AlertTriangle className="w-6 h-6 mr-2" />
              {errorRecentFT}
            </div>
          ) : !recentFTData ? (
            <div className="h-[300px] flex items-center justify-center text-slate-500">
              Aucune donnée disponible
            </div>
          ) : (
            <FTRecentList recentFTData={recentFTData} />
          )}
        </div>
      </div>
    </div>
  );
}