import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText, Plus, Filter, Download, Search,
  ChevronLeft, ChevronRight, MoreVertical,
  Eye, Edit, Trash2, FileSignature,
  CheckCircle, XCircle, AlertCircle,
  FileWarning, FolderOpen, FolderCheck,
  Check, Save, Clock, Archive, FileCheck,
  User, Calendar, MapPin, FileArchive,
  Building, Home, Clock as ClockIcon,
  Percent, Download as DownloadIcon,
  Printer, Mail, Share2, Copy,
  ExternalLink, FileBarChart, X,
  RefreshCw, Phone
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface FT {
  id: number;
  reference_ft: string;
  date_ft: string;
  heure_ft: string;
  type_convoquee: string;
  nom_convoquee: string;
  statut: string;
  statut_dossier: string;
  conclusion: string;
  iddescente: number;
  idrendezvous: number;
  created_at: string;
  nom_personne_r?: string;
  commune?: string;
  fokontany?: string;
  dossier?: {
    dossiers_fournis: string[];
    dossier_a_fournir: string[];
    statut_dossier: string;
    conclusion: string;
    delai_complement: number;
  };
  dossiers_fournis?: string[];
  dossier_a_fournir?: string[];
  delai_complement?: number;
  dossiers_fournis_json?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
}
interface DossierManquant {
  nom: string;
  checked: boolean;
}
interface ExportFormat {
  id: string;
  name: string;
  icon: React.ReactNode;
  format: string;
}
export default function FicheContent() {
  // États principaux
  const [fts, setFts] = useState<FT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'tous' | 'complet' | 'incomplet' | 'aucun'>('tous');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedFt, setSelectedFt] = useState<FT | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
 
  // États pour les modals et actions
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedFtForCompletion, setSelectedFtForCompletion] = useState<FT | null>(null);
  const [checkedDossiers, setCheckedDossiers] = useState<DossierManquant[]>([]);
  const [updatingFtId, setUpdatingFtId] = useState<number | null>(null);
 
  // États pour les fonctionnalités avancées
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'}>({
    key: 'created_at',
    direction: 'desc'
  });

  // États pour modal de confirmation
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  // Formats d'export disponibles
  const exportFormats: ExportFormat[] = [
    { id: 'csv', name: 'CSV', icon: <FileText className="w-4 h-4" />, format: 'csv' },
    { id: 'excel', name: 'Excel', icon: <FileBarChart className="w-4 h-4" />, format: 'xlsx' },
    { id: 'pdf', name: 'PDF', icon: <FileText className="w-4 h-4" />, format: 'pdf' },
    { id: 'print', name: 'Imprimer', icon: <Printer className="w-4 h-4" />, format: 'print' },
  ];
  // Récupérer les FT depuis l'API
  const fetchFTs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
     
      const offset = (page - 1) * pageSize;
      const params = new URLSearchParams({
        offset: offset.toString(),
        limit: pageSize.toString(),
        sort: sortConfig.key,
        order: sortConfig.direction
      });
     
      if (activeTab !== 'tous') {
        switch(activeTab) {
          case 'complet':
            params.append('statut_dossier', 'Complet');
            break;
          case 'incomplet':
            params.append('statut_dossier', 'Incomplet');
            break;
          case 'aucun':
            params.append('statut_dossier', 'Aucun dossier requis');
            break;
        }
      }
     
      const url = `http://localhost:3000/api/ft?${params.toString()}`;
     
      console.log('Fetching from:', url);
     
      const response = await fetch(url);
     
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
     
      if (result.success) {
        const ftsData = result.data || [];
       
        // Traiter les données pour extraire les informations des dossiers
        const processedFts = ftsData.map((ft: any) => {
          let dossierObj = ft.dossier;
          if (typeof ft.dossier === 'string') {
            try {
              dossierObj = JSON.parse(ft.dossier);
            } catch (e) {
              dossierObj = {};
            }
          }
         
          return {
            ...ft,
            statut_dossier: ft.statut_dossier || (dossierObj?.statut_dossier || 'Non défini'),
            dossiers_fournis: ft.dossiers_fournis || (dossierObj?.dossiers_fournis || []),
            dossier_a_fournir: ft.dossier_a_fournir || (dossierObj?.dossier_a_fournir || []),
            delai_complement: ft.delai_complement || (dossierObj?.delai_complement || 0),
            telephone: ft.telephone || '',
            email: ft.email || '',
            adresse: ft.adresse || ''
          };
        });
       
        setFts(processedFts);
       
        if (result.total !== undefined) {
          setTotalCount(result.total);
          setTotalPages(Math.ceil(result.total / pageSize));
        } else if (result.count !== undefined) {
          setTotalCount(result.count);
          setTotalPages(Math.ceil(result.count / pageSize));
        } else {
          setTotalCount(result.data.length);
          setTotalPages(Math.ceil(result.data.length / pageSize));
        }
      } else {
        throw new Error(result.message || 'Erreur lors de la récupération des données');
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement des FT:', err);
      setError(err.message);
      setFts([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, activeTab, sortConfig]);
  // Initial fetch
  useEffect(() => {
    fetchFTs();
  }, [fetchFTs]);
  // Gérer le délai de recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== '') {
        setPage(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  // Calculer les statistiques
  const stats = useMemo(() => {
    const total = fts.length;
    const complet = fts.filter(ft => ft.statut_dossier === 'Complet').length;
    const incomplet = fts.filter(ft => ft.statut_dossier === 'Incomplet').length;
    const aucun = fts.filter(ft => ft.statut_dossier === 'Aucun dossier requis').length;
   
    const tauxComplet = total > 0 ? Math.round((complet / total) * 100) : 0;
    const tauxIncomplet = total > 0 ? Math.round((incomplet / total) * 100) : 0;
   
    return { total, complet, incomplet, aucun, tauxComplet, tauxIncomplet };
  }, [fts]);
  // Filtrer et trier les FT
  const filteredFts = useMemo(() => {
    let filtered = fts.filter(ft => {
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase().trim();
        const matchesSearch = (
          ft.reference_ft?.toLowerCase().includes(searchLower) ||
          ft.nom_convoquee?.toLowerCase().includes(searchLower) ||
          ft.nom_personne_r?.toLowerCase().includes(searchLower) ||
          ft.conclusion?.toLowerCase().includes(searchLower) ||
          ft.commune?.toLowerCase().includes(searchLower) ||
          ft.fokontany?.toLowerCase().includes(searchLower) ||
          ft.type_convoquee?.toLowerCase().includes(searchLower) ||
          ft.telephone?.toLowerCase().includes(searchLower) ||
          ft.email?.toLowerCase().includes(searchLower)
        );
        if (!matchesSearch) return false;
      }
      if (activeTab !== 'tous') {
        switch(activeTab) {
          case 'complet':
            return ft.statut_dossier === 'Complet';
          case 'incomplet':
            return ft.statut_dossier === 'Incomplet';
          case 'aucun':
            return ft.statut_dossier === 'Aucun dossier requis';
          default:
            return true;
        }
      }
      return true;
    });
    // Trier les résultats
    filtered.sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof FT];
      let bValue: any = b[sortConfig.key as keyof FT];
      if (sortConfig.key === 'date_ft') {
        aValue = new Date(a.date_ft).getTime();
        bValue = new Date(b.date_ft).getTime();
      } else if (sortConfig.key === 'created_at') {
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
      }
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return filtered;
  }, [fts, searchTerm, activeTab, sortConfig]);
  // Calculer les dossiers manquants pour un FT
  const getDossiersManquants = (ft: FT): string[] => {
    if (ft.statut_dossier !== 'Incomplet' || !ft.dossier_a_fournir || !Array.isArray(ft.dossier_a_fournir)) {
      return [];
    }
   
    const dossiersRequis = ft.dossier_a_fournir;
    const dossiersFournis = ft.dossiers_fournis || [];
   
    return dossiersRequis
      .filter((dossier: string) => !dossiersFournis.includes(dossier));
  };
  // Calculer le pourcentage de complétion d'un dossier
  const getCompletionPercentage = (ft: FT): number => {
    if (ft.statut_dossier === 'Aucun dossier requis') return 100;
    if (!ft.dossier_a_fournir || ft.dossier_a_fournir.length === 0) return 0;
   
    const dossiersFournis = ft.dossiers_fournis || [];
    return Math.round((dossiersFournis.length / ft.dossier_a_fournir.length) * 100);
  };
  // Gestion de la sélection multiple
  const toggleRowSelection = (id: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };
  const selectAllRows = () => {
    if (selectedRows.size === filteredFts.length) {
      setSelectedRows(new Set());
    } else {
      const allIds = filteredFts.map(ft => ft.id);
      setSelectedRows(new Set(allIds));
    }
  };
  // Ouvrir le modal de complétion
  const handleOpenCompleteModal = (ft: FT) => {
    const manquants = getDossiersManquants(ft);
    setSelectedFtForCompletion(ft);
    setCheckedDossiers(manquants.map(dossier => ({
      nom: dossier,
      checked: false
    })));
    setShowCompleteModal(true);
  };
  // Gérer le changement de case à cocher dans le modal
  const handleCheckboxChangeModal = (dossierIndex: number) => {
    setCheckedDossiers(prev =>
      prev.map((dossier, idx) =>
        idx === dossierIndex ? { ...dossier, checked: !dossier.checked } : dossier
      )
    );
  };
  // Valider les dossiers cochés
  const handleValidateDossiers = async () => {
    if (!selectedFtForCompletion) return;
    const dossiersCoches = checkedDossiers
      .filter(dossier => dossier.checked)
      .map(dossier => dossier.nom);
    if (dossiersCoches.length === 0) {
      toast.error('Veuillez cocher au moins un dossier fourni');
      return;
    }
    setUpdatingFtId(selectedFtForCompletion.id);
   
    try {
      const ft = selectedFtForCompletion;
     
      // Mettre à jour les dossiers fournis
      const currentDossiersFournis = ft.dossiers_fournis || [];
      const updatedDossiersFournis = [...currentDossiersFournis, ...dossiersCoches];
     
      // Calculer le nouveau statut du dossier
      const dossiersRequis = ft.dossier_a_fournir || [];
     
      const tousDossiersFournis = dossiersRequis.every((dossier: string) =>
        updatedDossiersFournis.includes(dossier)
      );
     
      const nouveauStatutDossier = tousDossiersFournis ? 'Complet' : 'Incomplet';
      const response = await fetch(`http://localhost:3000/api/ft/${ft.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statut_dossier: nouveauStatutDossier,
          dossiers_fournis: updatedDossiersFournis
        })
      });
     
      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour');
      }
      const result = await response.json();
     
      if (result.success) {
        // Mettre à jour localement
        setFts(prev => prev.map(f =>
          f.id === ft.id ? { ...f, dossiers_fournis: updatedDossiersFournis, statut_dossier: nouveauStatutDossier } : f
        ));
       
        // Fermer le modal et réinitialiser
        setShowCompleteModal(false);
        setSelectedFtForCompletion(null);
        setCheckedDossiers([]);
       
        toast.success(`Dossiers validés avec succès ! ${dossiersCoches.length} dossier(s) ajouté(s). Statut mis à jour: ${nouveauStatutDossier}`);
      } else {
        throw new Error(result.message || 'Erreur lors de la mise à jour');
      }
    } catch (err: any) {
      console.error('Erreur:', err);
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setUpdatingFtId(null);
    }
  };
  // Fonctions de tri
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  // Fonctions d'export
  const handleExport = (format: string) => {
    const dataToExport = selectedRows.size > 0
      ? filteredFts.filter(ft => selectedRows.has(ft.id))
      : filteredFts;
    if (dataToExport.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }
    switch(format) {
      case 'csv':
        exportToCSV(dataToExport);
        break;
      case 'xlsx':
        exportToExcel(dataToExport);
        break;
      case 'pdf':
        exportToPDF(dataToExport);
        break;
      case 'print':
        printData(dataToExport);
        break;
    }
    setShowExportMenu(false);
  };
  const exportToCSV = (data: FT[]) => {
    const headers = ['Référence', 'Date', 'Heure', 'Personne convoquée', 'Type', 'Commune', 'Fokontany', 'Statut', 'Statut Dossier', 'Pourcentage Complétion', 'Téléphone', 'Email'];
    const csvRows = [
      headers.join(','),
      ...data.map(ft => [
        ft.reference_ft,
        formatDate(ft.date_ft),
        formatTime(ft.heure_ft),
        ft.nom_convoquee || ft.nom_personne_r || '',
        ft.type_convoquee || '',
        ft.commune || '',
        ft.fokontany || '',
        ft.statut || '',
        ft.statut_dossier || '',
        getCompletionPercentage(ft) + '%',
        ft.telephone || '',
        ft.email || ''
      ].map(field => `"${field}"`).join(','))
    ];
   
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `fts_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const exportToExcel = (data: FT[]) => {
    // Implémentation basique - à améliorer avec une bibliothèque Excel
    toast.info('Export Excel - À implémenter avec une bibliothèque comme xlsx');
  };
  const exportToPDF = (data: FT[]) => {
    toast.info('Export PDF - À implémenter avec une bibliothèque PDF');
  };
  const printData = (data: FT[]) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Liste des Procès-verbaux</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f4f4f4; }
              .header { text-align: center; margin-bottom: 30px; }
              .footer { margin-top: 30px; font-size: 12px; color: #666; }
              @media print {
                body { margin: 0; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Liste des Procès-verbaux de Fin de Traitement</h1>
              <p>Date d'export: ${new Date().toLocaleDateString('fr-FR')}</p>
              <p>Total: ${data.length} enregistrement(s)</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Date</th>
                  <th>Personne</th>
                  <th>Localisation</th>
                  <th>Statut Dossier</th>
                  <th>Complétion</th>
                </tr>
              </thead>
              <tbody>
                ${data.map(ft => `
                  <tr>
                    <td>${ft.reference_ft}</td>
                    <td>${formatDate(ft.date_ft)}</td>
                    <td>${ft.nom_convoquee || ft.nom_personne_r || ''}</td>
                    <td>${ft.commune || ''} ${ft.fokontany ? `- ${ft.fokontany}` : ''}</td>
                    <td>${ft.statut_dossier}</td>
                    <td>${getCompletionPercentage(ft)}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="footer">
              <p>Export généré le ${new Date().toLocaleString('fr-FR')}</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };
  // Fonctions utilitaires
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Etabli':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'En attente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Fini':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Annulé':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };
  const getDossierStatusColor = (status: string) => {
    switch (status) {
      case 'Complet':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Incomplet':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Aucun dossier requis':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };
  const getDossierStatusIcon = (status: string) => {
    switch (status) {
      case 'Complet':
        return <CheckCircle className="w-4 h-4 mr-1" />;
      case 'Incomplet':
        return <XCircle className="w-4 h-4 mr-1" />;
      case 'Aucun dossier requis':
        return <FileWarning className="w-4 h-4 mr-1" />;
      default:
        return <AlertCircle className="w-4 h-4 mr-1" />;
    }
  };
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };
  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  };
  const formatDateTime = (dateString: string, timeString: string) => {
    return `${formatDate(dateString)} ${timeString ? `à ${formatTime(timeString)}` : ''}`;
  };
  const handleViewDetails = (ft: FT) => {
    setSelectedFt(ft);
    setShowDetailsModal(true);
  };
  const showConfirmation = (title: string, message: string, action: () => void) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setShowConfirmModal(true);
  };
  const handleDelete = async (id: number) => {
    showConfirmation(
      'Confirmation de suppression',
      'Êtes-vous sûr de vouloir supprimer ce procès-verbal ? Cette action est irréversible.',
      async () => {
        try {
          const response = await fetch(`http://localhost:3000/api/ft/${id}`, {
            method: 'DELETE',
          });
          if (response.ok) {
            // Supprimer de la liste locale
            setFts(prev => prev.filter(ft => ft.id !== id));
            // Désélectionner si nécessaire
            setSelectedRows(prev => {
              const newSet = new Set(prev);
              newSet.delete(id);
              return newSet;
            });
            toast.success('Procès-verbal supprimé avec succès');
          } else {
            const result = await response.json();
            throw new Error(result.message || 'Erreur lors de la suppression');
          }
        } catch (err: any) {
          toast.error(`Erreur: ${err.message}`);
        }
      }
    );
  };
  const handleDeleteMultiple = async () => {
    if (selectedRows.size === 0) {
      toast.error('Veuillez sélectionner au moins un procès-verbal à supprimer');
      return;
    }
    showConfirmation(
      'Confirmation de suppression multiple',
      `Êtes-vous sûr de vouloir supprimer ${selectedRows.size} procès-verbal(s) ? Cette action est irréversible.`,
      async () => {
        try {
          const deletePromises = Array.from(selectedRows).map(id =>
            fetch(`http://localhost:3000/api/ft/${id}`, { method: 'DELETE' })
          );
          const results = await Promise.allSettled(deletePromises);
          // Vérifier les résultats
          const failedDeletes = results.filter((result, index) =>
            result.status === 'rejected' || !result.value?.ok
          );
          if (failedDeletes.length === 0) {
            // Mettre à jour la liste locale
            setFts(prev => prev.filter(ft => !selectedRows.has(ft.id)));
            setSelectedRows(new Set());
            toast.success(`${selectedRows.size} procès-verbal(s) supprimé(s) avec succès`);
          } else {
            toast.error(`${failedDeletes.length} suppression(s) ont échoué. Veuillez réessayer.`);
          }
        } catch (err: any) {
          toast.error(`Erreur: ${err.message}`);
        }
      }
    );
  };
  const handleDuplicate = async (ft: FT) => {
    showConfirmation(
      'Confirmation de duplication',
      'Voulez-vous dupliquer ce procès-verbal ?',
      async () => {
        try {
          const duplicateData = {
            ...ft,
            reference_ft: `${ft.reference_ft}-COPIE`,
            date_ft: new Date().toISOString().split('T')[0],
            heure_ft: new Date().toTimeString().slice(0, 5)
          };
          const response = await fetch('http://localhost:3000/api/ft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(duplicateData)
          });
          if (response.ok) {
            toast.success('Procès-verbal dupliqué avec succès');
            fetchFTs(); // Rafraîchir la liste
          } else {
            throw new Error('Erreur lors de la duplication');
          }
        } catch (err: any) {
          toast.error(`Erreur: ${err.message}`);
        }
      }
    );
  };
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };
  // Calculer les indices affichés
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredFts.length);
  // Calculer les FT à afficher sur la page courante
  const displayedFts = useMemo(() => {
    return filteredFts.slice(startIndex, endIndex);
  }, [filteredFts, startIndex, endIndex]);
  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      {/* En-tête principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Procès-verbaux de Fin de Traitement</h1>
          <p className="text-slate-600">Gestion et suivi des procès-verbaux établis</p>
        </div>
       
        <div className="flex items-center gap-3">
          {selectedRows.size > 0 && (
            <div className="flex items-center gap-2 mr-4">
              <span className="text-sm font-medium text-blue-600">
                {selectedRows.size} sélectionné(s)
              </span>
              <button
                onClick={handleDeleteMultiple}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Supprimer
              </button>
            </div>
          )}
         
        </div>
      </div>
      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-sm border border-blue-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total des FT</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-xs text-slate-500 mt-1">Procès-verbaux enregistrés</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-white to-emerald-50 rounded-xl shadow-sm border border-emerald-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center">
                <p className="text-sm text-slate-600">Dossiers Complets</p>
                <Percent className="w-3 h-3 ml-2 text-emerald-600" />
              </div>
              <div className="flex items-baseline">
                <p className="text-2xl font-bold text-emerald-700">{stats.complet}</p>
                <span className="text-xs text-emerald-600 ml-2">({stats.tauxComplet}%)</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Tous dossiers fournis</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-white to-amber-50 rounded-xl shadow-sm border border-amber-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center">
                <p className="text-sm text-slate-600">Dossiers Incomplets</p>
                <AlertCircle className="w-3 h-3 ml-2 text-amber-600" />
              </div>
              <div className="flex items-baseline">
                <p className="text-2xl font-bold text-amber-700">{stats.incomplet}</p>
                <span className="text-xs text-amber-600 ml-2">({stats.tauxIncomplet}%)</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Dossiers manquants</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-full">
              <XCircle className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Aucun dossier requis</p>
              <p className="text-2xl font-bold text-slate-700">{stats.aucun}</p>
              <p className="text-xs text-slate-500 mt-1">Aucun document requis</p>
            </div>
            <div className="p-3 bg-slate-100 rounded-full">
              <FileWarning className="w-6 h-6 text-slate-600" />
            </div>
          </div>
        </div>
      </div>
      {/* Conteneur principal */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {/* Barre de contrôle supérieure */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Onglets de filtrage */}
            <div className="flex border-b border-slate-200 overflow-x-auto">
              <button
                onClick={() => setActiveTab('tous')}
                className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'tous'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'}`}
              >
                Tous ({stats.total})
              </button>
              <button
                onClick={() => setActiveTab('complet')}
                className={`px-4 py-2 font-medium transition-colors flex items-center whitespace-nowrap ${activeTab === 'complet'
                  ? 'border-b-2 border-emerald-500 text-emerald-600'
                  : 'text-slate-600 hover:text-slate-900'}`}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Complets ({stats.complet})
              </button>
              <button
                onClick={() => setActiveTab('incomplet')}
                className={`px-4 py-2 font-medium transition-colors flex items-center whitespace-nowrap ${activeTab === 'incomplet'
                  ? 'border-b-2 border-amber-500 text-amber-600'
                  : 'text-slate-600 hover:text-slate-900'}`}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Incomplets ({stats.incomplet})
              </button>
              <button
                onClick={() => setActiveTab('aucun')}
                className={`px-4 py-2 font-medium transition-colors flex items-center whitespace-nowrap ${activeTab === 'aucun'
                  ? 'border-b-2 border-slate-500 text-slate-600'
                  : 'text-slate-600 hover:text-slate-900'}`}
              >
                <FileWarning className="w-4 h-4 mr-2" />
                Aucun requis ({stats.aucun})
              </button>
            </div>
            {/* Barre de recherche */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par référence, nom, téléphone, email..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {/* Contrôles supplémentaires */}
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                  disabled={filteredFts.length === 0 && selectedRows.size === 0}
                >
                  <DownloadIcon className="w-4 h-4" />
                  Exporter
                  <ChevronLeft className={`w-4 h-4 transform transition-transform ${showExportMenu ? '-rotate-90' : '-rotate-180'}`} />
                </button>
               
                {showExportMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowExportMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-50 overflow-hidden">
                      <div className="py-1">
                        {exportFormats.map((format) => (
                          <button
                            key={format.id}
                            onClick={() => handleExport(format.format)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                          >
                            {format.icon}
                            <span>{format.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <select
                className="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              >
                <option value="5">5 par page</option>
                <option value="10">10 par page</option>
                <option value="20">20 par page</option>
                <option value="50">50 par page</option>
              </select>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg transition-colors ${showFilters
                  ? 'border-blue-500 bg-blue-50 text-blue-600'
                  : 'border-slate-300 hover:bg-slate-50'}`}
              >
                <Filter className="w-4 h-4" />
                Filtres
              </button>
            </div>
          </div>
          {/* Panneau de filtres avancés */}
          {showFilters && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Trier par
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={sortConfig.key}
                    onChange={(e) => handleSort(e.target.value)}
                  >
                    <option value="created_at">Date de création</option>
                    <option value="date_ft">Date du FT</option>
                    <option value="reference_ft">Référence</option>
                    <option value="nom_convoquee">Nom</option>
                    <option value="commune">Commune</option>
                    <option value="statut_dossier">Statut dossier</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Ordre
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={sortConfig.direction}
                    onChange={(e) => setSortConfig(prev => ({ ...prev, direction: e.target.value as 'asc' | 'desc' }))}
                  >
                    <option value="desc">Décroissant</option>
                    <option value="asc">Croissant</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Date de création
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Du"
                    />
                    <input
                      type="date"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Au"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Tableau des FT */}
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="mt-4 text-slate-600">Chargement des procès-verbaux...</p>
              <p className="text-sm text-slate-400 mt-2">Veuillez patienter</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-red-700 mb-2">Erreur de chargement</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchFTs}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Réessayer
                </div>
              </button>
            </div>
          ) : filteredFts.length === 0 ? (
            <div className="text-center p-12">
              {activeTab === 'incomplet' ? (
                <FolderCheck className="w-20 h-20 text-emerald-300 mx-auto mb-4" />
              ) : activeTab === 'complet' ? (
                <CheckCircle className="w-20 h-20 text-emerald-300 mx-auto mb-4" />
              ) : (
                <FileText className="w-20 h-20 text-slate-300 mx-auto mb-4" />
              )}
              <h3 className="text-xl font-semibold text-slate-700 mb-2">
                {searchTerm
                  ? 'Aucun procès-verbal trouvé'
                  : activeTab === 'complet'
                  ? 'Aucun dossier complet'
                  : activeTab === 'incomplet'
                  ? 'Aucun dossier incomplet'
                  : activeTab === 'aucun'
                  ? 'Aucun dossier sans requisition'
                  : 'Aucun procès-verbal enregistré'}
              </h3>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">
                {searchTerm
                  ? 'Aucun procès-verbal ne correspond à vos critères de recherche. Essayez avec d\'autres termes.'
                  : 'Commencez par créer votre premier procès-verbal pour gérer vos dossiers.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => window.location.href = '/ft/nouveau'}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg shadow-sm transition-all duration-200 hover:shadow-md inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Créer le premier procès-verbal
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Résumé rapide */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mr-3">
                      <FileSignature className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {filteredFts.length} procès-verbaux trouvés
                        {searchTerm && (
                          <span className="text-blue-600 ml-2">
                            pour "{searchTerm}"
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600">
                        Page {page} sur {totalPages} • {selectedRows.size > 0 && `${selectedRows.size} sélectionné(s)`}
                      </div>
                    </div>
                  </div>
                 
                  <div className="flex items-center gap-3">
                    {selectedRows.size > 0 && (
                      <button
                        onClick={handleDeleteMultiple}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Supprimer la sélection
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {/* Tableau */}
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 w-12">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                          checked={selectedRows.size === filteredFts.length && filteredFts.length > 0}
                          onChange={selectAllRows}
                          title="Sélectionner tout"
                        />
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort('reference_ft')}
                      >
                        <div className="flex items-center">
                          <FileSignature className="w-4 h-4 mr-2" />
                          Informations
                          {sortConfig.key === 'reference_ft' && (
                            <ChevronLeft className={`w-4 h-4 ml-1 transform ${sortConfig.direction === 'asc' ? '-rotate-90' : '-rotate-180'}`} />
                          )}
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort('nom_convoquee')}
                      >
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2" />
                          Personne
                          {sortConfig.key === 'nom_convoquee' && (
                            <ChevronLeft className={`w-4 h-4 ml-1 transform ${sortConfig.direction === 'asc' ? '-rotate-90' : '-rotate-180'}`} />
                          )}
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2" />
                          Localisation
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort('statut_dossier')}
                      >
                        <div className="flex items-center">
                          <FileArchive className="w-4 h-4 mr-2" />
                          État du dossier
                          {sortConfig.key === 'statut_dossier' && (
                            <ChevronLeft className={`w-4 h-4 ml-1 transform ${sortConfig.direction === 'asc' ? '-rotate-90' : '-rotate-180'}`} />
                          )}
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        <div className="flex items-center">
                          <ClockIcon className="w-4 h-4 mr-2" />
                          Complétion
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {displayedFts.map((ft) => {
                      const dossiersManquants = getDossiersManquants(ft);
                      const hasDossiersManquants = dossiersManquants.length > 0;
                      const completionPercentage = getCompletionPercentage(ft);
                      const isSelected = selectedRows.has(ft.id);
                     
                      return (
                        <tr
                          key={ft.id}
                          className={`transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                        >
                          {/* Sélection */}
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                              checked={isSelected}
                              onChange={() => toggleRowSelection(ft.id)}
                            />
                          </td>
                          {/* Informations principales */}
                          <td className="px-6 py-4">
                            <div className="space-y-2">
                              <div className="flex items-center">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${isSelected ? 'bg-blue-100' : 'bg-gradient-to-br from-blue-500 to-violet-600'}`}>
                                  <FileSignature className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-white'}`} />
                                </div>
                                <div className="flex-1">
                                  <div className={`text-sm font-semibold transition-colors ${isSelected ? 'text-blue-700' : 'text-slate-900 group-hover:text-blue-600'}`}>
                                    {ft.reference_ft}
                                  </div>
                                  <div className="flex items-center text-xs text-slate-500 mt-1">
                                    <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                                    <span>{formatDateTime(ft.date_ft, ft.heure_ft)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(ft.statut)}`}>
                                  {ft.statut}
                                </div>
                                <div className="text-xs text-slate-500 capitalize truncate">
                                  {ft.type_convoquee}
                                </div>
                              </div>
                            </div>
                          </td>
                          {/* Personne */}
                          <td className="px-6 py-4">
                            <div className="space-y-2">
                              <div className="text-sm font-medium text-slate-900 truncate">
                                {ft.nom_convoquee || ft.nom_personne_r || 'Non spécifié'}
                              </div>
                              {(ft.telephone || ft.email) && (
                                <div className="text-xs text-slate-600 space-y-1">
                                  {ft.telephone && (
                                    <div className="flex items-center">
                                      <Phone className="w-3 h-3 mr-1" />
                                      {ft.telephone}
                                    </div>
                                  )}
                                  {ft.email && (
                                    <div className="flex items-center">
                                      <Mail className="w-3 h-3 mr-1" />
                                      <span className="truncate">{ft.email}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          {/* Localisation */}
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              {ft.commune ? (
                                <div className="flex items-center text-sm text-slate-900">
                                  <Building className="w-3 h-3 mr-1 flex-shrink-0" />
                                  <span className="truncate">{ft.commune}</span>
                                </div>
                              ) : null}
                              {ft.fokontany ? (
                                <div className="flex items-center text-xs text-slate-600">
                                  <Home className="w-3 h-3 mr-1 flex-shrink-0" />
                                  <span className="truncate">{ft.fokontany}</span>
                                </div>
                              ) : null}
                              {!ft.commune && !ft.fokontany && (
                                <span className="text-xs text-slate-400">Non spécifié</span>
                              )}
                            </div>
                          </td>
                          {/* État du dossier */}
                          <td className="px-6 py-4">
                            <div className="space-y-2">
                              <div className="flex items-center">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getDossierStatusColor(ft.statut_dossier)} flex items-center`}>
                                  {getDossierStatusIcon(ft.statut_dossier)}
                                  {ft.statut_dossier}
                                </span>
                              </div>
                              {ft.dossier_a_fournir && ft.dossier_a_fournir.length > 0 && (
                                <div className="text-xs text-slate-600">
                                  {ft.dossiers_fournis?.length || 0}/{ft.dossier_a_fournir.length} dossiers
                                </div>
                              )}
                              {hasDossiersManquants && (
                                <button
                                  onClick={() => handleOpenCompleteModal(ft)}
                                  className="text-xs text-amber-700 hover:text-amber-900 font-medium flex items-center transition-colors"
                                >
                                  <FileCheck className="w-3 h-3 mr-1" />
                                  {dossiersManquants.length} manquant(s)
                                </button>
                              )}
                            </div>
                          </td>
                          {/* Barre de progression */}
                          <td className="px-6 py-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-600">Complétion</span>
                                <span className={`font-medium ${completionPercentage === 100 ? 'text-emerald-600' : completionPercentage >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                  {completionPercentage}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full transition-all duration-300 ${completionPercentage === 100 ? 'bg-emerald-500' : completionPercentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${completionPercentage}%` }}
                                ></div>
                              </div>
                              {ft.delai_complement && ft.delai_complement > 0 && (
                                <div className="text-xs text-amber-600 flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Délai: {ft.delai_complement} jours
                                </div>
                              )}
                            </div>
                          </td>
                          {/* Actions */}
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleViewDetails(ft)}
                                className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Voir détails"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => window.location.href = `/ft/editer/${ft.id}`}
                                className="p-1.5 text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded transition-colors"
                                title="Modifier"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {hasDossiersManquants && (
                                <button
                                  onClick={() => handleOpenCompleteModal(ft)}
                                  className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded transition-colors"
                                  title="Compléter le dossier"
                                >
                                  <FileCheck className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(ft.id)}
                                className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Pagination améliorée */}
              <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
                <div className="text-sm text-slate-600">
                  Affichage de <span className="font-medium">{startIndex + 1}</span> à <span className="font-medium">{endIndex}</span> sur <span className="font-medium">{filteredFts.length}</span> résultat(s)
                </div>
               
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                    title="Page précédente"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                 
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                     
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`min-w-[40px] h-10 rounded-lg border transition-colors ${page === pageNum
                            ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                            : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                 
                  <button
                    onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                    title="Page suivante"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      {/* Modal de complétion de dossier */}
      {showCompleteModal && selectedFtForCompletion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            {/* En-tête du modal */}
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 rounded-t-xl text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Compléter le dossier</h2>
                    <p className="text-amber-100 opacity-90">
                      {selectedFtForCompletion.reference_ft} - {selectedFtForCompletion.nom_convoquee}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCompleteModal(false);
                    setSelectedFtForCompletion(null);
                    setCheckedDossiers([]);
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            {/* Contenu du modal */}
            <div className="p-6">
              <div className="mb-6">
                <div className="text-sm text-slate-600 mb-2">Statut actuel :</div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${getDossierStatusColor(selectedFtForCompletion.statut_dossier)} flex items-center gap-2`}>
                    {getDossierStatusIcon(selectedFtForCompletion.statut_dossier)}
                    {selectedFtForCompletion.statut_dossier}
                  </span>
                  <div className="text-sm text-slate-600">
                    {selectedFtForCompletion.dossiers_fournis?.length || 0}/{selectedFtForCompletion.dossier_a_fournir?.length || 0} dossiers fournis
                  </div>
                </div>
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Dossiers manquants à compléter
                </h3>
                {checkedDossiers.length > 0 ? (
                  <div className="space-y-3">
                    {checkedDossiers.map((dossier, index) => (
                      <div key={index} className="flex items-center p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <input
                          type="checkbox"
                          id={`dossier-${index}`}
                          checked={dossier.checked}
                          onChange={() => handleCheckboxChangeModal(index)}
                          className="h-5 w-5 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                        />
                        <label
                          htmlFor={`dossier-${index}`}
                          className={`ml-3 flex-1 cursor-pointer ${dossier.checked ? 'text-amber-800 font-medium' : 'text-slate-700'}`}
                        >
                          {dossier.nom}
                        </label>
                        {dossier.checked && (
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8 bg-emerald-50 rounded-lg border border-emerald-200">
                    <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                    <p className="text-emerald-700 font-medium">Tous les dossiers sont déjà fournis !</p>
                    <p className="text-emerald-600 text-sm mt-1">Ce dossier est maintenant complet.</p>
                  </div>
                )}
              </div>
              {selectedFtForCompletion.delai_complement && selectedFtForCompletion.delai_complement > 0 && (
                <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2 text-amber-800">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">Délai de complément : {selectedFtForCompletion.delai_complement} jours restants</span>
                  </div>
                </div>
              )}
            </div>
            {/* Pied du modal */}
            <div className="border-t border-slate-200 p-6">
              <div className="flex justify-between items-center">
                <div className="text-sm text-slate-600">
                  {checkedDossiers.filter(d => d.checked).length} sur {checkedDossiers.length} dossier(s) sélectionné(s)
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowCompleteModal(false);
                      setSelectedFtForCompletion(null);
                      setCheckedDossiers([]);
                    }}
                    className="px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleValidateDossiers}
                    disabled={checkedDossiers.filter(d => d.checked).length === 0 || updatingFtId === selectedFtForCompletion.id}
                    className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {updatingFtId === selectedFtForCompletion.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Valider les dossiers sélectionnés
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal de visualisation détaillée */}
      {showDetailsModal && selectedFt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
  <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
    {/* En-tête du modal */}
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <FileSignature className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{selectedFt.reference_ft}</h2>
            <p className="text-blue-100 opacity-90">
              {selectedFt.nom_convoquee || selectedFt.nom_personne_r || 'Non spécifié'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowDetailsModal(false)}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
    </div>
    {/* Contenu du modal avec scroll */}
    <div className="overflow-y-auto max-h-[calc(85vh-140px)]">
      <div className="p-6">
        {/* Première ligne : 2 sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Section 1: Informations principales */}
          <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Informations principales
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Référence</label>
                  <p className="text-lg font-bold text-blue-700">{selectedFt.reference_ft}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Date</label>
                  <p className="font-medium">{formatDate(selectedFt.date_ft)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Heure</label>
                  <p className="font-medium">{formatTime(selectedFt.heure_ft)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Type</label>
                  <p className="font-medium capitalize">{selectedFt.type_convoquee}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Statut général</label>
                <div className="mt-1">
                  <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-semibold ${getStatusColor(selectedFt.statut)}`}>
                    {selectedFt.statut}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* Section 2: Personne concernée */}
          <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Personne concernée
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Nom complet</label>
                <p className="text-lg font-medium text-slate-900">
                  {selectedFt.nom_convoquee || selectedFt.nom_personne_r || 'Non spécifié'}
                </p>
              </div>
             
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedFt.telephone && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">Téléphone</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="w-4 h-4 text-slate-500" />
                      <p className="font-medium">{selectedFt.telephone}</p>
                    </div>
                  </div>
                )}
               
                {selectedFt.email && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">Email</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="w-4 h-4 text-slate-500" />
                      <p className="font-medium truncate">{selectedFt.email}</p>
                    </div>
                  </div>
                )}
              </div>
             
              {selectedFt.adresse && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Adresse</label>
                  <p className="font-medium mt-1">{selectedFt.adresse}</p>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Deuxième ligne : 2 sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Section 3: Localisation */}
          <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Localisation
            </h3>
            <div className="space-y-4">
              {selectedFt.commune && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Commune</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Building className="w-4 h-4 text-slate-500" />
                    <p className="font-medium">{selectedFt.commune}</p>
                  </div>
                </div>
              )}
             
              {selectedFt.fokontany && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Fokontany</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Home className="w-4 h-4 text-slate-500" />
                    <p className="font-medium">{selectedFt.fokontany}</p>
                  </div>
                </div>
              )}
             
              {!selectedFt.commune && !selectedFt.fokontany && (
                <div className="text-center py-4">
                  <p className="text-slate-500">Aucune information de localisation</p>
                </div>
              )}
            </div>
          </div>
          {/* Section 4: État du dossier */}
          <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FileArchive className="w-5 h-5 text-blue-600" />
              État du dossier
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${getDossierStatusColor(selectedFt.statut_dossier)} flex items-center gap-2`}>
                    {getDossierStatusIcon(selectedFt.statut_dossier)}
                    {selectedFt.statut_dossier}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-600">Complétion</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {getCompletionPercentage(selectedFt)}%
                  </div>
                </div>
              </div>
              {/* Barre de progression */}
              <div>
                <div className="w-full bg-slate-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      getCompletionPercentage(selectedFt) === 100 ? 'bg-emerald-500' :
                      getCompletionPercentage(selectedFt) >= 50 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${getCompletionPercentage(selectedFt)}%` }}
                  ></div>
                </div>
              </div>
              {selectedFt.delai_complement && selectedFt.delai_complement > 0 && (
                <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">Délai de complément : {selectedFt.delai_complement} jours</span>
                </div>
              )}
              {selectedFt.dossier_a_fournir && selectedFt.dossier_a_fournir.length > 0 && (
                <div className="mt-2">
                  <div className="text-sm font-medium text-slate-700 mb-2">
                    {selectedFt.dossiers_fournis?.length || 0}/{selectedFt.dossier_a_fournir.length} dossiers fournis
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Troisième ligne : 1 section pleine largeur */}
        {selectedFt.dossier_a_fournir && selectedFt.dossier_a_fournir.length > 0 && (
          <div className="mb-6">
            <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-blue-600" />
                Dossiers requis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedFt.dossier_a_fournir.map((dossier, index) => {
                  const estFourni = selectedFt.dossiers_fournis?.includes(dossier) || false;
                  return (
                    <div
                      key={index}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        estFourni ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
                      }`}
                    >
                      {estFourni ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-medium ${
                          estFourni ? 'text-emerald-800' : 'text-amber-800'
                        }`}>
                          {dossier}
                        </span>
                      </div>
                      {estFourni && (
                        <span className="text-xs text-emerald-600 font-medium px-2 py-1 bg-emerald-100 rounded">
                          ✓ Fourni
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {/* Quatrième ligne : Conclusion et Métadonnées côte à côte */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section Conclusion */}
          {selectedFt.conclusion && (
            <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Conclusion
              </h3>
              <div className="p-3 bg-white rounded border border-slate-200 text-slate-700 min-h-[100px]">
                {selectedFt.conclusion}
              </div>
            </div>
          )}
          {/* Section Métadonnées */}
         
        </div>
      </div>
    </div>
    {/* Pied du modal */}
    <div className="border-t border-slate-200 p-4 bg-slate-50">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Clock className="w-4 h-4" />
          <span>Dernière mise à jour: {formatDate(selectedFt.created_at)}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setShowDetailsModal(false);
              window.location.href = `/ft/editer/${selectedFt.id}`;
            }}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2 text-sm"
          >
            <Edit className="w-4 h-4" />
            Modifier
          </button>
          {getCompletionPercentage(selectedFt) < 100 && selectedFt.statut_dossier === 'Incomplet' && (
            <button
              onClick={() => {
                setShowDetailsModal(false);
                handleOpenCompleteModal(selectedFt);
              }}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg transition-all flex items-center gap-2 text-sm shadow-sm"
            >
              <FileCheck className="w-4 h-4" />
              Compléter le dossier
            </button>
          )}
          <button
            onClick={() => setShowDetailsModal(false)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg transition-colors text-sm"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
      )}
      {/* Modal de confirmation */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-4 rounded-t-xl text-white">
              <h2 className="text-xl font-bold">{confirmTitle}</h2>
            </div>
            <div className="p-6">
              <p className="text-slate-700">{confirmMessage}</p>
            </div>
            <div className="border-t border-slate-200 p-4 flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  confirmAction?.();
                  setShowConfirmModal(false);
                }}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}