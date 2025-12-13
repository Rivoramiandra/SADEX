import React, { useState } from 'react';
import { DollarSign, Check, X, Calendar, CreditCard, Banknote, Wallet, TrendingUp, Phone } from 'lucide-react';

interface PasserPaiementProps {
  avis: {
    id: number;
    num_ap: string;
    montant: number;
    ft?: {
      nom_convoquee: string;
      nom_personne_r?: string;
    };
  };
  onClose: () => void;
  onSuccess: () => void;
}

function PasserPaiement({ avis, onClose, onSuccess }: PasserPaiementProps) {
  const [formPaiement, setFormPaiement] = useState({
    methode_paiement: 'Espèce',
    date_paiement: new Date().toISOString().split('T')[0],
    reference_paiement: `PAY-${avis.num_ap}-${Date.now()}`,
    notes: ''
  });

  const handleSubmit = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/avis-de-paiement/${avis.id}/paiement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          statut_paiement: 'Payé',
          methode_paiement: formPaiement.methode_paiement,
          date_paiement: formPaiement.date_paiement,
          reference_paiement: formPaiement.reference_paiement,
          notes: formPaiement.notes
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert('Paiement enregistré avec succès!');
          onSuccess();
        } else {
          throw new Error(result.message);
        }
      } else {
        throw new Error('Erreur lors de l\'enregistrement du paiement');
      }
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    }
  };

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR').format(montant);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center">
              <DollarSign className="w-6 h-6 mr-2 text-emerald-600" />
              Passer au Paiement
            </h2>
            <p className="text-slate-600 mt-1">
              {avis.num_ap} • {formatMontant(avis.montant)} Ar
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full"
          >
            <span className="sr-only">Fermer</span>
            <span className="text-2xl">×</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Résumé de l'avis */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-emerald-800">Avis #{avis.num_ap}</span>
              <span className="font-bold text-lg text-emerald-900">
                {formatMontant(avis.montant)} Ar
              </span>
            </div>
            <p className="text-sm text-emerald-700">
              {avis.ft?.nom_convoquee || avis.ft?.nom_personne_r || 'Non spécifié'}
            </p>
          </div>

          {/* Formulaire de paiement */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Méthode de paiement *
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formPaiement.methode_paiement}
                onChange={(e) => setFormPaiement({...formPaiement, methode_paiement: e.target.value})}
              >
                <option value="Espèce">Espèce</option>
                <option value="Carte bancaire">Carte bancaire</option>
                <option value="Virement">Virement bancaire</option>
                <option value="Chèque">Chèque</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Date du paiement *
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formPaiement.date_paiement}
                onChange={(e) => setFormPaiement({...formPaiement, date_paiement: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Référence du paiement
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: CHQ-12345, VIR-78910..."
                value={formPaiement.reference_paiement}
                onChange={(e) => setFormPaiement({...formPaiement, reference_paiement: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notes (optionnel)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Informations complémentaires..."
                value={formPaiement.notes}
                onChange={(e) => setFormPaiement({...formPaiement, notes: e.target.value})}
              />
            </div>
          </div>

          {/* Validation */}
          <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-lg">
            <Check className="w-5 h-5 text-emerald-600" />
            <span className="text-sm text-slate-700">
              Le statut de l'avis sera automatiquement mis à jour à "Payé"
            </span>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Confirmer le Paiement
          </button>
        </div>
      </div>
    </div>
  );
}

export default PasserPaiement;