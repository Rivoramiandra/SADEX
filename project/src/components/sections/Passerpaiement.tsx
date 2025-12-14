import React, { useState, useMemo, useCallback } from 'react';
import { 
  DollarSign, X, Calendar, CreditCard, FileText, CheckCircle, 
  Clock, MapPin, Divide, AlertCircle, User, Banknote, 
  Wallet, TrendingUp, Phone, Check
} from 'lucide-react';

interface PasserPaiementProps {
  avis: {
    id: number;
    num_ap: string;
    montant: number;
    date_ap?: string;
    montant_lettre?: string;
    statut_paiement?: 'En attente' | 'Payé' | 'Retard' | 'Annulé';
    ft?: {
      reference_ft?: string;
      nom_convoquee?: string;
      nom_personne_r?: string;
      commune?: string;
      fokontany?: string;
      type_convoquee?: string;
    };
  };
  onClose: () => void;
  onSuccess?: () => void;
  loading?: boolean;
}

export interface PaymentDetails {
  avis_id: number;
  date_paiement: string;
  methode_paiement: 'Espèce' | 'Carte bancaire' | 'Virement' | 'Chèque' | 'Mobile Money' | 'Autre';
  montant: number;
  reference_paiement?: string;
  notes?: string;
  type_paiement: 'complet' | 'tranche';
  montant_total: number;
  montant_reste: number;
  nombre_tranche?: number;
  montant_tranche?: number;
  numero_tranche?: number;
  contact?: string;
  statut: 'Payé' | 'Partiellement payé';
}

const PaymentMethodButton: React.FC<{
  method: {
    value: string;
    label: string;
    icon: JSX.Element;
  };
  isSelected: boolean;
  onChange: (value: 'Espèce' | 'Carte bancaire' | 'Virement' | 'Chèque' | 'Mobile Money' | 'Autre') => void;
  disabled?: boolean;
}> = React.memo(({ method, isSelected, onChange, disabled = false }) => {
  const handleClick = () => {
    if (!disabled) {
      onChange(method.value as any);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
        isSelected
          ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
          : 'border-slate-200 hover:border-emerald-300 bg-white'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className="flex items-center space-x-2 w-full">
        <div className={`p-1 rounded ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`}>
          {method.icon}
        </div>
        <span className="text-sm font-medium text-slate-700">{method.label}</span>
      </div>
    </button>
  );
});

PaymentMethodButton.displayName = 'PaymentMethodButton';

const formatMontant = (montant: any): number => {
  if (typeof montant === 'number') {
    return parseFloat(montant.toFixed(2));
  }
  if (typeof montant === 'string') {
    const cleaned = montant.replace(',', '.').replace(/\s/g, '');
    return parseFloat(parseFloat(cleaned || '0').toFixed(2));
  }
  return 0;
};

const PasserPaiement: React.FC<PasserPaiementProps> = ({ 
  avis, 
  onClose, 
  onSuccess,
  loading = false 
}) => {
  const [paymentType, setPaymentType] = useState<'complet' | 'tranche'>('complet');
  const [nombreTranches, setNombreTranches] = useState<number>(1);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Omit<PaymentDetails, 'avis_id' | 'montant_total' | 'montant_reste' | 'numero_tranche' | 'statut'>>({
    date_paiement: new Date().toISOString().split('T')[0],
    methode_paiement: 'Espèce',
    montant: avis.montant || 0,
    reference_paiement: `PAY-${avis.num_ap}-${Date.now().toString().slice(-6)}`,
    notes: '',
    type_paiement: 'complet',
    nombre_tranche: 1,
    montant_tranche: avis.montant || 0,
    contact: avis.ft?.nom_convoquee || avis.ft?.nom_personne_r || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // NOMBRE MAXIMUM DE TRANCHES FIXÉ À 5
  const MAX_TRANCHES = 5;

  // Calculs pour le paiement
  const paymentCalculations = useMemo(() => {
    const montantTotal = avis.montant || 0;
    const montantParTranche = paymentType === 'tranche' ? montantTotal / nombreTranches : 0;
    const montantRestant = paymentType === 'tranche' ? montantTotal - montantParTranche : 0;

    return {
      montantTotal,
      montantParTranche,
      montantRestant
    };
  }, [avis.montant, nombreTranches, paymentType]);

  // Gestionnaires d'événements
  const handlePaymentTypeChange = useCallback((value: 'complet' | 'tranche') => {
    setPaymentType(value);
    const newMontant = value === 'complet' ? (avis.montant || 0) : paymentCalculations.montantParTranche;
    
    setFormData(prev => ({ 
      ...prev, 
      type_paiement: value,
      montant: newMontant,
      montant_tranche: value === 'tranche' ? paymentCalculations.montantParTranche : undefined
    }));
    setApiError(null);
  }, [avis.montant, paymentCalculations.montantParTranche]);

  const handleTranchesChange = useCallback((value: number) => {
    // LIMITER À MAX_TRANCHES (5)
    const nbTranches = Math.max(1, Math.min(value, MAX_TRANCHES));
    setNombreTranches(nbTranches);
    const newMontant = paymentCalculations.montantTotal / nbTranches;
    
    setFormData(prev => ({ 
      ...prev, 
      nombre_tranche: nbTranches,
      montant: newMontant,
      montant_tranche: newMontant
    }));
    setApiError(null);
  }, [paymentCalculations.montantTotal]);

  const handleMethodPaymentChange = useCallback((value: 'Espèce' | 'Carte bancaire' | 'Virement' | 'Chèque' | 'Mobile Money' | 'Autre') => {
    setFormData(prev => ({ ...prev, methode_paiement: value }));
    setApiError(null);
  }, []);

  const handleInputChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    if (name === 'type_paiement') {
      handlePaymentTypeChange(value as 'complet' | 'tranche');
    } else if (name === 'nombre_tranche') {
      handleTranchesChange(parseInt(value) || 1);
    } else if (name === 'methode_paiement') {
      handleMethodPaymentChange(value as any);
    } else if (name === 'montant') {
      const numericValue = parseFloat(value) || 0;
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    setApiError(null);
  }, [errors, handlePaymentTypeChange, handleTranchesChange, handleMethodPaymentChange]);

  // Validation du formulaire
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validation date
    if (!formData.date_paiement) {
      newErrors.date_paiement = 'La date de paiement est requise';
    } else {
      const selectedDate = new Date(formData.date_paiement);
      const today = new Date();
      
      selectedDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate > today) {
        newErrors.date_paiement = 'La date de paiement ne peut pas être dans le futur';
      }
    }

    // Validation montant
    if (!formData.montant || formData.montant <= 0) {
      newErrors.montant = 'Le montant doit être supérieur à 0';
    } else if (formData.montant > paymentCalculations.montantTotal) {
      newErrors.montant = `Le montant ne peut pas dépasser ${formatCurrency(paymentCalculations.montantTotal)}`;
    } else if (paymentType === 'complet' && Math.abs(formData.montant - paymentCalculations.montantTotal) > 0.01) {
      newErrors.montant = `Le montant doit être exactement ${formatCurrency(paymentCalculations.montantTotal)} pour un paiement complet`;
    }

    // Validation tranches (MAXIMUM 5)
    if (paymentType === 'tranche') {
      if (nombreTranches < 1 || nombreTranches > MAX_TRANCHES) {
        newErrors.nombre_tranche = `Le nombre de tranches doit être entre 1 et ${MAX_TRANCHES}`;
      }
      
      const montantAttendu = paymentCalculations.montantParTranche;
      const montantSaisi = formData.montant;
      
      if (Math.abs(montantSaisi - montantAttendu) > 0.01) {
        newErrors.montant = `Le montant de cette tranche doit être ${formatCurrency(montantAttendu)}`;
      }
    }

    // Validation des références
    if ((formData.methode_paiement === 'Chèque' || formData.methode_paiement === 'Virement') && !formData.reference_paiement) {
      newErrors.reference_paiement = `La référence est requise pour les paiements par ${formData.methode_paiement.toLowerCase()}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleApiError = (error: any) => {
    console.error('Erreur API:', error);
    
    if (error.code === '23503') {
      return 'Erreur de référence : L\'avis spécifié n\'existe pas';
    } else if (error.code === '23505') {
      return 'Erreur de duplication : Ce paiement existe déjà';
    } else if (error.message?.includes('network')) {
      return 'Erreur de connexion : Impossible de joindre le serveur';
    } else if (error.status === 400) {
      return `Erreur de validation : ${error.message || 'Données invalides'}`;
    } else if (error.status === 404) {
      return 'Erreur : Ressource non trouvée';
    } else if (error.status === 500) {
      return 'Erreur serveur : Veuillez réessayer plus tard';
    }
    
    return error.message || 'Une erreur inattendue est survenue';
  };

  // Fonction pour mettre à jour le statut de l'avis
  const updateAvisStatus = async (avisId: number): Promise<any> => {
    try {
      const nouveauStatut = paymentType === 'complet' ? 'Payé' : 'En attente';
      
      // Ligne 280 - Modifier PATCH en PUT
const response = await fetch(`http://localhost:3000/api/avis-de-paiement/${avisId}`, {
  method: 'PUT',  // <-- CHANGER ICI
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    statut: nouveauStatut,  // <-- CHANGER "statut_paiement" en "statut"
    date_paiement: formData.date_paiement,
    methode_paiement: formData.methode_paiement,
    reference_paiement: formData.reference_paiement
  }),
});

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    
    if (!validateForm()) {
      return;
    }

    setSubmitLoading(true);

    try {
      const montantFormate = formatMontant(formData.montant);

      // Données de paiement pour l'API
      const paymentData = {
        avis_id: avis.id,
        date_paiement: formData.date_paiement,
        methode_paiement: formData.methode_paiement,
        montant: montantFormate,
        reference_paiement: formData.reference_paiement?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
        type_paiement: paymentType,
        montant_total: paymentCalculations.montantTotal,
        montant_reste: parseFloat(paymentCalculations.montantRestant.toFixed(2)),
        nombre_tranche: paymentType === 'tranche' ? nombreTranches : undefined,
        montant_tranche: paymentType === 'tranche' ? parseFloat(paymentCalculations.montantParTranche.toFixed(2)) : undefined,
        numero_tranche: paymentType === 'tranche' ? 1 : undefined,
        contact: formData.contact?.trim() || undefined,
        statut: paymentType === 'complet' ? 'Payé' : 'Partiellement payé'
      };

      console.log('Envoi du paiement:', paymentData);

      // 1. Enregistrer le paiement
      const response = await fetch(`http://localhost:3000/api/avis-de-paiement/${avis.id}/paiement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw { ...responseData, status: response.status };
      }

      // 2. Mettre à jour le statut de l'avis
      await updateAvisStatus(avis.id);

      // Message de succès
      const message = paymentType === 'complet' 
        ? `✅ Paiement complet enregistré !\n• Avis: ${avis.num_ap}\n• Montant: ${formatCurrency(montantFormate)}\n• Statut: Payé`
        : `✅ Première tranche enregistrée !\n• Avis: ${avis.num_ap}\n• Montant: ${formatCurrency(montantFormate)}\n• Tranche: 1/${nombreTranches}\n• Prochaine échéance: ${getNextPaymentDate()}`;

      alert(message);

      // Appeler le callback de succès
      if (onSuccess) {
        onSuccess();
      }

      // Fermer le modal
      onClose();

    } catch (error: any) {
      console.error('Erreur lors de l\'enregistrement:', error);
      const errorMessage = handleApiError(error);
      setApiError(errorMessage);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Fonction pour calculer la prochaine date de paiement
  const getNextPaymentDate = (): string => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return formatDate(nextMonth.toISOString().split('T')[0]);
  };

  const formatCurrency = (amount: number): string => {
    if (!amount || isNaN(amount)) return '0 Ar';
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' Ar';
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Non spécifiée';
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

  const paymentMethods = useMemo(() => [
    { value: 'Espèce', label: 'Espèce', icon: <Banknote className="w-4 h-4" /> },
    { value: 'Carte bancaire', label: 'Carte bancaire', icon: <CreditCard className="w-4 h-4" /> },
    { value: 'Virement', label: 'Virement bancaire', icon: <TrendingUp className="w-4 h-4" /> },
    { value: 'Chèque', label: 'Chèque', icon: <FileText className="w-4 h-4" /> },
    { value: 'Mobile Money', label: 'Mobile Money', icon: <Phone className="w-4 h-4" /> },
    { value: 'Autre', label: 'Autre', icon: <Wallet className="w-4 h-4" /> }
  ], []);

  const isProcessing = loading || submitLoading;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-hidden">
      <div className="bg-white rounded-xl shadow-2xl w-[90vw] max-w-5xl flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* EN-TÊTE */}
        <div className="p-6 border-b border-slate-200 bg-white flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Passer au Paiement</h3>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-lg font-semibold text-slate-700">Avis : {avis.num_ap}</span>
                  <span className="text-lg font-bold text-emerald-700">{formatCurrency(avis.montant)} Ar</span>
                </div>
              </div>
            </div>
            <button 
              onClick={onClose}
              disabled={isProcessing}
              className="p-2 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6 text-slate-600" />
            </button>
          </div>
        </div>

        {/* CONTENU */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            
            {/* ERREUR API */}
            {apiError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <div>
                    <h4 className="text-sm font-medium text-red-800">Erreur d'enregistrement</h4>
                    <p className="text-sm text-red-700 mt-1">{apiError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* INFORMATIONS DE L'AVIS */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-600" />
                Informations de l'Avis de Paiement
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <span className="text-slate-600 text-sm font-medium">N° Avis:</span>
                    <p className="text-slate-900 font-semibold text-lg">{avis.num_ap}</p>
                  </div>
                  <div>
                    <span className="text-slate-600 text-sm font-medium">Date d'émission:</span>
                    <p className="text-slate-800">{formatDate(avis.date_ap)}</p>
                  </div>
                  <div>
                    <span className="text-slate-600 text-sm font-medium">Montant total:</span>
                    <p className="text-emerald-700 font-bold text-xl">
                      {formatCurrency(avis.montant)}
                    </p>
                  </div>
                  {avis.montant_lettre && (
                    <div>
                      <span className="text-slate-600 text-sm font-medium">Montant en lettres:</span>
                      <p className="text-slate-800 italic">{avis.montant_lettre}</p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  {avis.ft && (
                    <>
                      <div>
                        <span className="text-slate-600 text-sm font-medium">Bénéficiaire:</span>
                        <p className="text-slate-900 font-medium">
                          {avis.ft.nom_convoquee || avis.ft.nom_personne_r || 'Non spécifié'}
                        </p>
                        {avis.ft.type_convoquee && (
                          <p className="text-slate-600 text-sm capitalize">{avis.ft.type_convoquee}</p>
                        )}
                      </div>
                      {(avis.ft.commune || avis.ft.fokontany) && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-slate-400 mt-1" />
                          <div>
                            <span className="text-slate-600 text-sm font-medium">Localisation:</span>
                            <p className="text-slate-800">
                              {avis.ft.commune} {avis.ft.fokontany && `- ${avis.ft.fokontany}`}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {avis.ft?.reference_ft && (
                    <div>
                      <span className="text-slate-600 text-sm font-medium">Référence FT:</span>
                      <p className="text-slate-800">{avis.ft.reference_ft}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION TYPE DE PAIEMENT */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Divide className="w-5 h-5 text-slate-600" />
                Type de Paiement
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button
                  type="button"
                  onClick={() => handlePaymentTypeChange('complet')}
                  disabled={isProcessing}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all text-left ${
                    paymentType === 'complet'
                      ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center space-x-3 w-full">
                    <div className={`p-2 rounded-full ${
                      paymentType === 'complet' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Paiement complet</p>
                      <p className="text-sm text-slate-600">Règlement du montant total en une fois</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handlePaymentTypeChange('tranche')}
                  disabled={isProcessing}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all text-left ${
                    paymentType === 'tranche'
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center space-x-3 w-full">
                    <div className={`p-2 rounded-full ${
                      paymentType === 'tranche' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Divide className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Paiement en tranches</p>
                      <p className="text-sm text-slate-600">Échelonnement sur plusieurs mois (max {MAX_TRANCHES} tranches)</p>
                    </div>
                  </div>
                </button>
              </div>

              {/* CONFIGURATION DES TRANCHES */}
              {paymentType === 'tranche' && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Nombre de tranches *
                      </label>
                      <select
                        name="nombre_tranche"
                        value={nombreTranches}
                        onChange={handleInputChange}
                        disabled={isProcessing}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.nombre_tranche ? 'border-red-300' : 'border-slate-300'
                        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {Array.from({ length: MAX_TRANCHES }, (_, i) => i + 1).map(num => (
                          <option key={num} value={num}>
                            {num} tranche{num > 1 ? 's' : ''}
                          </option>
                        ))}
                      </select>
                      {errors.nombre_tranche && (
                        <p className="text-red-600 text-sm mt-1">{errors.nombre_tranche}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        Maximum: {MAX_TRANCHES} tranches
                      </p>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <p className="text-sm font-medium text-slate-800 mb-2">Récapitulatif des tranches</p>
                      <div className="space-y-1 text-sm text-slate-700">
                        <p className="flex justify-between">
                          <span>Montant par tranche:</span>
                          <strong>{formatCurrency(paymentCalculations.montantParTranche)}</strong>
                        </p>
                        <p className="flex justify-between">
                          <span>Nombre total de tranches:</span>
                          <span>{nombreTranches}</span>
                        </p>
                        <p className="flex justify-between">
                          <span>Tranches restantes:</span>
                          <span>{nombreTranches - 1}</span>
                        </p>
                        <p className="flex justify-between">
                          <span>Montant total:</span>
                          <strong>{formatCurrency(paymentCalculations.montantTotal)}</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION DÉTAILS DU PAIEMENT */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-slate-600" />
                Détails du Paiement
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* COLONNE GAUCHE */}
                <div className="space-y-4">
                  {/* DATE DE PAIEMENT */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-600" />
                      Date du paiement *
                    </label>
                    <input
                      type="date"
                      name="date_paiement"
                      value={formData.date_paiement}
                      onChange={handleInputChange}
                      disabled={isProcessing}
                      max={new Date().toISOString().split('T')[0]}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.date_paiement ? 'border-red-300' : 'border-slate-300'
                      } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                    {errors.date_paiement && (
                      <p className="text-red-600 text-sm mt-1">{errors.date_paiement}</p>
                    )}
                  </div>

                  {/* MÉTHODE DE PAIEMENT */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Méthode de paiement *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {paymentMethods.map((method) => (
                        <PaymentMethodButton
                          key={method.value}
                          method={method}
                          isSelected={formData.methode_paiement === method.value}
                          onChange={handleMethodPaymentChange}
                          disabled={isProcessing}
                        />
                      ))}
                    </div>
                  </div>

                  {/* CONTACT */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Contact (optionnel)
                    </label>
                    <input
                      type="text"
                      name="contact"
                      value={formData.contact || ''}
                      onChange={handleInputChange}
                      disabled={isProcessing}
                      placeholder="Numéro de téléphone"
                      className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* COLONNE DROITE */}
                <div className="space-y-4">
                  {/* MONTANT */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Montant à payer {paymentType === 'tranche' ? '(cette tranche)' : ''} *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input
                        type="number"
                        name="montant"
                        value={formData.montant}
                        onChange={handleInputChange}
                        disabled={isProcessing || paymentType === 'tranche'}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        max={paymentCalculations.montantTotal}
                        className={`w-full px-3 py-2 pl-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.montant ? 'border-red-300' : 'border-slate-300'
                        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                    </div>
                    {errors.montant && (
                      <p className="text-red-600 text-sm mt-1">{errors.montant}</p>
                    )}
                    <div className="space-y-1 mt-2">
                      <p className="text-slate-700 text-sm">
                        <span className="font-medium">Montant saisi:</span> {formatCurrency(formData.montant)}
                      </p>
                      {paymentType === 'tranche' && (
                        <>
                          <p className="text-blue-600 text-sm">
                            <span className="font-medium">Montant restant:</span> {formatCurrency(paymentCalculations.montantRestant)}
                          </p>
                          <p className="text-slate-600 text-xs">
                            Cette tranche couvre {nombreTranches > 0 ? Math.round((formData.montant / paymentCalculations.montantTotal) * 100) : 0}% du montant total
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* RÉFÉRENCE (CONDITIONNELLE) */}
                  {(formData.methode_paiement === 'Chèque' || formData.methode_paiement === 'Virement') && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {formData.methode_paiement === 'Chèque' ? 'Numéro de chèque *' : 'Référence de virement *'}
                      </label>
                      <input
                        type="text"
                        name="reference_paiement"
                        value={formData.reference_paiement || ''}
                        onChange={handleInputChange}
                        disabled={isProcessing}
                        placeholder={
                          formData.methode_paiement === 'Chèque' 
                            ? 'Ex: CHQ-12345' 
                            : 'Ex: VIR-78910'
                        }
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.reference_paiement ? 'border-red-300' : 'border-slate-300'
                        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                      {errors.reference_paiement && (
                        <p className="text-red-600 text-sm mt-1">{errors.reference_paiement}</p>
                      )}
                    </div>
                  )}

                  {/* NOTES */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Notes (optionnel)
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes || ''}
                      onChange={handleInputChange}
                      disabled={isProcessing}
                      placeholder="Informations complémentaires sur ce paiement..."
                      rows={3}
                      className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                        isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* PIED DE PAGE */}
        <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-between items-center flex-shrink-0">
          <div className="text-sm text-slate-600">
            {paymentType === 'tranche' && (
              <p>Plan de paiement : {nombreTranches} tranche{nombreTranches > 1 ? 's' : ''} sur {MAX_TRANCHES} maximum</p>
            )}
          </div>
          
          <div className="flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-6 py-3 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            
            <button 
              type="submit"
              onClick={handleSubmit}
              disabled={isProcessing}
              className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-green-600 rounded-lg hover:from-emerald-700 hover:to-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>
                    {paymentType === 'complet' 
                      ? 'Confirmer le paiement complet' 
                      : `Confirmer la tranche 1/${nombreTranches}`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasserPaiement;