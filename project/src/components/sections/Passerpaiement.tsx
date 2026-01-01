import React, { useState, useMemo, useCallback } from 'react';
import { 
  DollarSign, X, Calendar, CreditCard, FileText, CheckCircle, 
  Clock, MapPin, Divide, AlertCircle, User, Banknote, 
  Wallet, TrendingUp, Phone, Check, Download, Receipt,
  ChevronUp, ChevronDown, Building, Users, Target, Home,
  Briefcase, Eye, AlertTriangle, Save, Printer, ArrowLeft,
  Calculator, Mail as MailIcon, FileCheck
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

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
      contact?: string;
    };
    descente?: {
      x_coord?: string;
      y_coord?: string;
      superficie?: string;
      commune?: string;
      fokontany?: string;
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

// Fonction utilitaire pour formater le montant en lettres
const formatMontantEnLettres = (montant: number): string => {
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
  const specials = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  
  if (montant === 0) return 'zéro';
  
  const millions = Math.floor(montant / 1000000);
  const restant = montant % 1000000;
  const milliers = Math.floor(restant / 1000);
  const centaines = Math.floor((restant % 1000) / 100);
  const dizainesEtUnites = restant % 100;
  
  let result = '';
  
  if (millions > 0) {
    result += `${millions} million${millions > 1 ? 's' : ''} `;
  }
  
  if (milliers > 0) {
    result += `${milliers} mille `;
  }
  
  if (centaines > 0) {
    result += `${centaines} cent${centaines > 1 ? 's' : ''} `;
  }
  
  if (dizainesEtUnites > 0) {
    if (dizainesEtUnites < 10) {
      result += units[dizainesEtUnites];
    } else if (dizainesEtUnites < 20) {
      result += specials[dizainesEtUnites - 10];
    } else {
      const dizaines = Math.floor(dizainesEtUnites / 10);
      const unites = dizainesEtUnites % 10;
      result += tens[dizaines];
      if (unites > 0) {
        if (dizaines === 7 || dizaines === 9) {
          result += `-${specials[unites - 10]}`;
        } else {
          result += unites === 1 ? ' et un' : `-${units[unites]}`;
        }
      }
    }
  }
  
  return result.trim() + ' Ariary';
};

// Fonction pour charger les images en Base64
const getImageAsBase64 = async (imagePath: string): Promise<string> => {
  try {
    const fullUrl = imagePath.startsWith('http')
      ? imagePath
      : `${window.location.origin}${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`;
    
    const response = await fetch(fullUrl);
    
    if (!response.ok) {
      console.warn(`Image non trouvée: ${imagePath}, utilisation d'une image par défaut`);
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idHJhbnNwYXJlbnQiLz48L3N2Zz4=';
    }
    
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Erreur lors du chargement de l'image ${imagePath}:`, error);
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idHJhbnNwYXJlbnQiLz48L3N2Zz4=';
  }
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return '';
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

const formatMontant = (montant: number): string => {
  return new Intl.NumberFormat('fr-FR').format(montant);
};

const formatNumber = (num: string | number): string => {
  if (!num) return '0';
  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(numValue)) return '0';
  return new Intl.NumberFormat('fr-FR').format(numValue);
};

// Composant Toast personnalisé
const customToast = {
  error: (message: string) =>
    toast.error(message, {
      position: "top-right",
      style: { background: "black", color: "white" }
    }),

  success: (message: string) =>
    toast.success(message, {
      position: "top-right",
      style: { background: "black", color: "white" }
    })
};

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

const formatCurrency = (amount: number): string => {
  if (!amount || isNaN(amount)) return '0 Ar';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount) + ' Ar';
};

// ==================== FONCTION GENERATEPDF COMPLETE POUR REÇU DE PAIEMENT ====================
const generatePDF = async (
  avis: any,
  formData: any,
  paymentType: 'complet' | 'tranche',
  nombreTranches: number,
  customToast: any
): Promise<boolean> => {
  // Déclarer pdfContent en dehors du bloc try pour qu'il soit accessible dans le finally
  let pdfContent: HTMLDivElement | null = null;
 
  try {
    // Préparer les données pour le PDF
    const preparePaymentDataForPDF = () => {
      return {
        numReçu: `REC-${avis.num_ap || 'AP'}-${Date.now().toString().slice(-6)}`,
        datePaiement: formatDate(formData.date_paiement),
        dateEmission: formatDate(avis.date_ap),
        nomBeneficiaire: avis.ft?.nom_convoquee || avis.ft?.nom_personne_r || 'Madame RASOLOFONIAINA Baholiarinoro Marie Sylvie',
        commune: avis.ft?.commune || '',
        fokontany: avis.ft?.fokontany || '',
        methodePaiement: formData.methode_paiement,
        referencePaiement: formData.reference_paiement || '',
        notes: formData.notes || '',
        infoTranche: paymentType === 'tranche' 
          ? ` - Tranche 1/${nombreTranches}` 
          : '',
        numAvis: avis.num_ap || 'N/A'
      };
    };
 
    const preparedData = preparePaymentDataForPDF();
    
    // Calculer les montants
    const montantAmende = avis.montant || 0;
    const montantRedevance = Math.floor(montantAmende * 0.5);
    const montantTotal = montantAmende + montantRedevance;
    const montantPaye = formData.montant || 0;
    const montantRestant = montantTotal - montantPaye;
    
    // Formater les montants en lettres
    const montantAmendeLettres = formatMontantEnLettres(montantAmende);
    const montantRedevanceLettres = formatMontantEnLettres(montantRedevance);
    const montantTotalLettres = formatMontantEnLettres(montantTotal);
    const montantPayeLettres = formatMontantEnLettres(montantPaye);
    const montantRestantLettres = formatMontantEnLettres(montantRestant);
    
    // Charger toutes les images en Base64
    const [headerImage, emblemImage, footerImage] = await Promise.all([
      getImageAsBase64('/images/header_vm.png'),
      getImageAsBase64('/images/emblème_vf.png'),
      getImageAsBase64('/images/footer.png')
    ]);
   
    // Créer un élément div temporaire pour le rendu HTML avec DEUX pages séparées
    pdfContent = document.createElement('div');
    pdfContent.style.position = 'fixed';
    pdfContent.style.left = '-9999px';
    pdfContent.style.top = '0';
    pdfContent.style.width = '210mm';
    pdfContent.style.backgroundColor = 'white';
    pdfContent.style.boxSizing = 'border-box';
    pdfContent.style.overflow = 'hidden';
   
    // Créer un conteneur pour chaque page séparément
    const page1 = document.createElement('div');
    page1.className = 'pdf-page pdf-page-1';
    page1.style.width = '210mm';
    page1.style.height = '297mm';
    page1.style.pageBreakAfter = 'always';
    page1.style.backgroundColor = 'white';
    page1.style.position = 'relative';
    page1.style.margin = '0';
    page1.style.padding = '0';
    page1.style.boxSizing = 'border-box';
   
    const page2 = document.createElement('div');
    page2.className = 'pdf-page pdf-page-2';
    page2.style.width = '210mm';
    page2.style.height = '297mm';
    page2.style.pageBreakAfter = 'always';
    page2.style.backgroundColor = 'white';
    page2.style.position = 'relative';
    page2.style.margin = '0';
    page2.style.padding = '0';
    page2.style.boxSizing = 'border-box';
   
    // Appliquer les styles directement
    const styles = `
      @media print {
        @page { margin: 0; size: A4; }
        body { margin: 0; }
        .pdf-page {
          width: 210mm;
          height: 297mm;
          page-break-after: always;
        }
      }
     
      .pdf-header {
        height: 180px;
        width: 100%;
        background-image: url('${headerImage}');
        background-size: cover;
        background-repeat: no-repeat;
        margin-bottom: 20px;
      }
     
      .pdf-emblem {
        height: 90px;
        width: 90%;
        position: relative;
        top: -100px;
        background-image: url('${emblemImage}');
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center center;
        margin: 0 auto;
      }
     
      .pdf-footer {
        height: 250px;
        background-image: url('${footerImage}');
        background-size: cover;
        background-repeat: no-repeat;
        background-position: center center;
        background-color: transparent;
        position: absolute;
        bottom: 0;
        width: 100%;
      }
     
      .pdf-content {
        font-family: 'Times New Roman', serif;
        font-size: 12px;
        line-height: 1.5;
        color: #000;
      }
     
      .pdf-table {
        width: 100%;
        border-collapse: collapse;
        position:relative;
        top:-50px;
      }
     
      .pdf-table td {
        vertical-align: top;
        padding: 2px;
      }
     
      .info-table {
        border: 1px solid black;
        margin: 5mm 0;
        width: 100%;
      }
     
      .info-table td, .info-table th {
        border: 1px solid black;
        padding: 3px;
        text-align: center;
        font-size: 11px;
      }
     
      .info-table th {
        background-color: #f0f0f0;
        font-weight: bold;
      }
     
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .text-left { text-align: left; }
     
      .document-title {
        font-size: 14px;
        font-weight: bold;
        text-decoration: underline;
      }
     
      .content-block1 {
        margin-bottom: 4mm;
        padding: 50px;
      }
     
      .content-block2 {
        padding: 50px;
      }
     
      .signature-section {
        margin-top: 15mm;
        position: relative;
        bottom: 70px;
        width:90%;
      }
      #signature-section-page2{
        text-align: right;
      }
      .reçu-number {
        font-size: 11px;
        text-align: left;
        margin-left: 80px;
        margin-bottom: 10px;
        font-weight: bold;
        color: #000;
        position: relative;
        top: -40px;
      }
     
      .content-text {
        text-align: justify;
        margin-bottom: 8px;
        line-height: 1.6;
      }
     
      .bold-text {
        font-weight: bold;
      }
     
      .underline-text {
        text-decoration: underline;
      }
     
      .montant-section {
        margin: 8mm 0;
        padding: 10px;
        line-height: 1.8;
      }
     
      .montant-important {
        font-weight: bold;
        margin: 5px 0;
      }
    `;
   
    // Contenu de la page 1
    page1.innerHTML = `
      <style>${styles}</style>
      <div class="pdf-header"></div>
      <div class="pdf-emblem"></div>
      <div class="pdf-content">
        <table class="pdf-table">
          <tr>
            <td style="width: 45%; vertical-align: top; text-align: center;">
              <strong>MINISTÈRE DE LA DÉCENTRALISATION<br>ET DE L'AMÉNAGEMENT DU TERRITOIRE<br>
              --------------------<br>
              SECRÉTARIAT GÉNÉRAL<br>
              --------------------<br>
              <em>DIRECTION GÉNÉRALE</em><br>
              <em>DE L'AUTORITÉ POUR LA PROTECTION CONTRE LES INONDATIONS</em><br>
              <em>DE LA PLAINE D'ANTANANARIVO</em><br>
              --------------------</strong>
            </td>
            <td style="width: 10%;"></td>
            <td style="width: 45%; vertical-align: top; text-align: center;">
              Antananarivo, le ${preparedData.datePaiement}<br><br>
              <strong>LE DIRECTEUR GÉNÉRAL</strong><br><br>
              À l'attention de<br><br>
              <strong>${preparedData.nomBeneficiaire}</strong><br>
              ${preparedData.commune ? `Commune: ${preparedData.commune}` : 'Demeurant au Lot IVY 19 Anosipatrana Est'}<br>
              ${preparedData.fokontany ? `Fokontany: ${preparedData.fokontany}` : ''}
            </td>
          </tr>
        </table>

        <div class="reçu-number">
          N°: ${preparedData.numReçu}
        </div>

        <div class="document-title text-center">
          <strong>REÇU DE PAIEMENT${preparedData.infoTranche}</strong>
        </div>
       
        <div class="content-block1">
          <p class="content-text">
            En application des dispositions du <em>décret n°2019-1543 du 11 septembre 2019 portant régulation de l'exécution des travaux de remblaiement dans les zones d'intervention de l'APIPA, en application de la loi n°2015-052 du 03 février 2016 relative à l'Urbanisme et à l'Habitat</em> ;
          </p>
         
          <p class="content-text">
            Vu l'avis de paiement n°${preparedData.numAvis} en date du ${preparedData.dateEmission} ;
          </p>
         
          <p class="content-text">
            Vu le rapport de descente effectué par l'équipe composée des Polices de l'Aménagement du Territoire/Brigade Spéciale ;
          </p>
         
          <p class="content-text">
            Je soussigné(e), <strong>Directeur Général de l'APIPA</strong>, certifie avoir reçu de 
            <strong>${preparedData.nomBeneficiaire}</strong>
            ${preparedData.commune ? `demeurant à ${preparedData.commune}` : ''} 
            ${preparedData.fokontany ? `, Fokontany ${preparedData.fokontany}` : ''}
            la somme correspondant au règlement partiel ou total de l'avis de paiement référencé ci-dessus.
          </p>
         
          <p class="content-text">
            <strong>Méthode de paiement :</strong> ${preparedData.methodePaiement}
            ${preparedData.referencePaiement ? `<br><strong>Référence paiement :</strong> ${preparedData.referencePaiement}` : ''}
          </p>
         
          <p class="content-text">
            Le présent reçu atteste que le paiement a été dûment enregistré dans les systèmes de l'APIPA et que la somme indiquée au verso de ce document a été perçue.
          </p>
         
          <p class="content-text">
            Ce document doit être conservé comme justificatif de paiement et présenté en cas de besoin.
          </p>
        </div>
        
        <table class="signature-section">
          <tr>
            <td style="width: 60%;"></td>
            <td style="width: 40%; text-align: right;">
              <em>Le Directeur Général,</em><br><br><br>
              <strong>_________________________</strong>
            </td>
          </tr>
        </table>
        <div class="pdf-footer"></div>
      </div>
    `;
   
    // Contenu de la page 2 (avec tableau)
    page2.innerHTML = `
      <style>${styles}</style>
      <div class="pdf-header"></div>
      <div class="pdf-content">
        <div class="content-block2">
          <p><strong><u>INFORMATIONS FONCIERES</u> :</strong></p>
         
          <p><strong><u>Référence Avis :</u></strong> n°${preparedData.numAvis}</p>
         
          <p><strong><u>Bénéficiaire :</u></strong> ${preparedData.nomBeneficiaire}</p>
         
          <p><strong><u>Localisation :</u></strong> ${preparedData.commune} ${preparedData.fokontany ? `, Fokontany ${preparedData.fokontany}` : ''}</p>
         
          ${avis.descente?.x_coord && avis.descente?.y_coord ? `
          <p><strong><u>Coordonnées :</u></strong></p>
          <p>X = ${avis.descente.x_coord || 'N/A'}</p>
          <p>Y = ${avis.descente.y_coord || 'N/A'}</p>
          ` : ''}
        </div>
       
        <div style="padding: 50px; position: relative; top: -50px;">
          <p><strong><u>TABLEAU PORTANT DÉTAIL DU RÈGLEMENT</u> :</strong></p>
         
          <table class="info-table">
            <tr>
              <th style="width: 30%;">DÉSIGNATION</th>
              <th style="width: 25%;">MONTANT (Ar)</th>
              <th style="width: 45%;">EN LETTRES</th>
            </tr>
            <tr>
              <td>Amende principale</td>
              <td>${formatMontant(montantAmende)}</td>
              <td>${montantAmendeLettres.toUpperCase()}</td>
            </tr>
            <tr>
              <td>Redevance administrative (50%)</td>
              <td>${formatMontant(montantRedevance)}</td>
              <td>${montantRedevanceLettres.toUpperCase()}</td>
            </tr>
            <tr>
              <td><strong>TOTAL DÙ</strong></td>
              <td><strong>${formatMontant(montantTotal)}</strong></td>
              <td><strong>${montantTotalLettres.toUpperCase()}</strong></td>
            </tr>
            <tr>
              <td><strong>MONTANT PAYÉ${preparedData.infoTranche}</strong></td>
              <td><strong>${formatMontant(montantPaye)}</strong></td>
              <td><strong>${montantPayeLettres.toUpperCase()}</strong></td>
            </tr>
            ${paymentType === 'tranche' ? `
            <tr>
              <td>Montant restant à payer</td>
              <td>${formatMontant(montantRestant)}</td>
              <td>${montantRestantLettres.toUpperCase()}</td>
            </tr>
            <tr>
              <td colspan="3" style="text-align: center; font-style: italic;">
                Paiement échelonné sur ${nombreTranches} tranche(s) - Tranche actuelle: 1/${nombreTranches}
              </td>
            </tr>
            ` : `
            <tr>
              <td colspan="3" style="text-align: center; background-color: #e8f5e9;">
                <strong>SOLDE ACQUITTÉ INTÉGRALEMENT</strong>
              </td>
            </tr>
            `}
          </table>
          
          ${preparedData.notes ? `
          <div style="margin-top: 10px; padding: 5px; border-left: 3px solid #0066cc; background-color: #f5f5f5;">
            <strong>Notes :</strong> ${preparedData.notes}
          </div>
          ` : ''}
        </div>
       
        <table class="signature-section" >
          <tr>
            <td style="width: 50%;">
              <div style="text-align: center;">
                <p><strong>Pour le bénéficiaire</strong></p>
                <br><br><br>
                <p>_________________________</p>
                <p>Signature</p>
              </div>
            </td>
            <td id="signature-section-page2">
              Antananarivo, le ${preparedData.datePaiement}<br><br>
              <em>Le Directeur Général,</em><br><br><br>
              <strong>_________________________</strong><br>
              <em>Signature et cachet</em>
            </td>
          </tr>
        </table>
      </div>
      <div class="pdf-footer"></div>
    `;
   
    // Ajouter les pages au conteneur principal
    pdfContent.appendChild(page1);
    pdfContent.appendChild(page2);
   
    // Ajouter le div au body pour le rendu
    document.body.appendChild(pdfContent);
   
    // Attendre le rendu complet (images chargées)
    await new Promise(resolve => setTimeout(resolve, 2000));
   
    // Créer le PDF avec jsPDF
    const jsPDF = (await import('jspdf')).default;
    let html2canvas;
    if (typeof window !== 'undefined') {
      html2canvas = await import('html2canvas');
    } else {
      throw new Error('html2canvas non disponible');
    }
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
   
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
   
    // Capturer et ajouter la première page
    const canvas1 = await html2canvas.default(page1, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 793, // 210mm en pixels (210 * 3.78)
      height: 1122, // 297mm en pixels (297 * 3.78)
      windowWidth: 793,
      windowHeight: 1122
    });
   
    const imgData1 = canvas1.toDataURL('image/png', 1.0);
    pdf.addImage(imgData1, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
   
    // Ajouter la deuxième page
    pdf.addPage();
   
    // Capturer et ajouter la deuxième page
    const canvas2 = await html2canvas.default(page2, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 793,
      height: 1122,
      windowWidth: 793,
      windowHeight: 1122
    });
   
    const imgData2 = canvas2.toDataURL('image/png', 1.0);
    pdf.addImage(imgData2, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
   
    // Télécharger le PDF
    const fileName = `Reçu_Paiement_${avis.num_ap || avis.id}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
    return true;
   
  } catch (error) {
    console.error('Erreur lors de la génération du reçu de paiement:', error);
    throw new Error(`Erreur lors de la génération du reçu: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  } finally {
    // Nettoyer le div temporaire
    if (pdfContent && pdfContent.parentNode) {
      pdfContent.parentNode.removeChild(pdfContent);
    }
  }
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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const [expandedSections, setExpandedSections] = useState({
    infoAvis: true,
    typePaiement: true,
    detailsPaiement: true
  });
  
  const [formData, setFormData] = useState<Omit<PaymentDetails, 'avis_id' | 'montant_total' | 'montant_reste' | 'numero_tranche' | 'statut'>>({
    date_paiement: new Date().toISOString().split('T')[0],
    methode_paiement: 'Espèce',
    montant: avis.montant || 0,
    reference_paiement: `PAY-${avis.num_ap}-${Date.now().toString().slice(-6)}`,
    notes: '',
    type_paiement: 'complet',
    nombre_tranche: 1,
    montant_tranche: avis.montant || 0,
    contact: avis.ft?.contact || avis.ft?.nom_convoquee || avis.ft?.nom_personne_r || ''
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

  // Fonction pour générer le PDF DE REÇU DE PAIEMENT
  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      await generatePDF(avis, formData, paymentType, nombreTranches, customToast);
      customToast.success('Reçu de paiement généré avec succès');
    } catch (error) {
      console.error('Erreur:', error);
      customToast.error('Erreur lors de la génération du reçu');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Fonction pour générer le PDF APRÈS le paiement réussi
  const generatePDFAfterPayment = async () => {
    try {
      await generatePDF(avis, formData, paymentType, nombreTranches, customToast);
      customToast.success('Paiement enregistré et reçu généré avec succès');
    } catch (error) {
      console.error('Erreur lors de la génération du reçu:', error);
      customToast.error('Paiement enregistré, mais erreur lors de la génération du reçu');
    }
  };

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

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

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
      
      const response = await fetch(`http://localhost:3000/api/avis-de-paiement/${avisId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          statut: nouveauStatut,
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
      customToast.error('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    setSubmitLoading(true);

    try {
      const montantFormate = formData.montant;

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
        statut: paymentType === 'complet' ? 'Payé' : 'Partiel'
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

      // 3. Générer le reçu de paiement APRÈS succès
      await generatePDFAfterPayment();

      // Appeler le callback de succès
      if (onSuccess) {
        onSuccess();
      }

      // Fermer le modal après un court délai
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error: any) {
      console.error('Erreur lors de l\'enregistrement:', error);
      const errorMessage = handleApiError(error);
      setApiError(errorMessage);
      
      // Afficher l'erreur
      customToast.error(errorMessage);
    } finally {
      setSubmitLoading(false);
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
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center z-10">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                <DollarSign className="inline-block w-6 h-6 mr-2 text-emerald-600" />
                Passer au Paiement
              </h2>
              <p className="text-slate-600 mt-1">
                Avis de paiement : <span className="font-semibold">{avis.num_ap}</span> • Montant : <span className="font-bold text-emerald-700">{formatCurrency(avis.montant)}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="p-2 hover:bg-slate-100 rounded-full"
                title="Générer PDF"
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF}
              >
                {isGeneratingPDF ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-600"></div>
                ) : (
                  <Printer className="w-5 h-5 text-slate-600" />
                )}
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-full"
                  disabled={isProcessing}
                >
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
          
          <div className="p-6">
            {/* Section Informations de l'Avis */}
            <div className="mb-6">
              <div
                className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg cursor-pointer"
                onClick={() => toggleSection('infoAvis')}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-slate-800">
                    Informations de l'Avis de Paiement
                  </h3>
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    {avis.num_ap}
                  </span>
                </div>
                {expandedSections.infoAvis ? <ChevronUp className="w-5 h-5 text-slate-600" /> : <ChevronDown className="w-5 h-5 text-slate-600" />}
              </div>
              
              {expandedSections.infoAvis && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">N° Avis:</span>
                          <span className="font-medium text-slate-900">{avis.num_ap}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">Date d'émission:</span>
                          <span className="font-medium">{formatDate(avis.date_ap)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">Montant total:</span>
                          <span className="font-bold text-emerald-700 text-lg">{formatCurrency(avis.montant)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">Bénéficiaire:</span>
                          <span className="font-medium text-slate-900">{avis.ft?.nom_convoquee || avis.ft?.nom_personne_r || 'Non spécifié'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">Type:</span>
                          <span className="font-medium capitalize">{avis.ft?.type_convoquee || 'Non spécifié'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">Localisation:</span>
                          <span className="font-medium">{avis.ft?.commune || ''} {avis.ft?.fokontany ? `- ${avis.ft.fokontany}` : ''}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {avis.montant_lettre && (
                    <div className="mt-6 pt-6 border-t border-slate-200">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Montant en lettres:</span>
                        <span className="font-medium italic text-slate-800">{avis.montant_lettre}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section Type de Paiement */}
            <div className="mb-6">
              <div
                className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg cursor-pointer"
                onClick={() => toggleSection('typePaiement')}
              >
                <div className="flex items-center gap-3">
                  <Divide className="w-6 h-6 text-emerald-600" />
                  <h3 className="text-lg font-semibold text-slate-800">
                    Type de Paiement
                  </h3>
                </div>
                {expandedSections.typePaiement ? <ChevronUp className="w-5 h-5 text-slate-600" /> : <ChevronDown className="w-5 h-5 text-slate-600" />}
              </div>
              
              {expandedSections.typePaiement && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg">
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
                          <p className="text-sm font-medium text-emerald-700 mt-1">
                            {formatCurrency(paymentCalculations.montantTotal)}
                          </p>
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
                          <p className="text-sm font-medium text-blue-700 mt-1">
                            {formatCurrency(paymentCalculations.montantParTranche)} par tranche
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Configuration des tranches */}
                  {paymentType === 'tranche' && (
                    <div className="bg-white p-4 rounded-lg border border-slate-200">
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

                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
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
              )}
            </div>

            {/* Section Détails du Paiement */}
            <div>
              <div
                className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg cursor-pointer"
                onClick={() => toggleSection('detailsPaiement')}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-6 h-6 text-amber-600" />
                  <h3 className="text-lg font-semibold text-slate-800">
                    Détails du Paiement
                  </h3>
                  {Object.keys(errors).length > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs font-medium inline-flex items-center px-2.5 py-0.5 rounded">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {Object.keys(errors).length}
                    </span>
                  )}
                </div>
                {expandedSections.detailsPaiement ? <ChevronUp className="w-5 h-5 text-slate-600" /> : <ChevronDown className="w-5 h-5 text-slate-600" />}
              </div>
              
              {expandedSections.detailsPaiement && (
                <form onSubmit={handleSubmit} className="mt-4 space-y-6">
                  {/* Erreur API */}
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Date de paiement */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        <Calendar className="inline-block w-4 h-4 mr-1" />
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

                    {/* Méthode de paiement */}
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Montant */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        <DollarSign className="inline-block w-4 h-4 mr-1" />
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

                    {/* Contact */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        <Phone className="inline-block w-4 h-4 mr-1" />
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

                  {/* Référence (conditionnelle) */}
                  {(formData.methode_paiement === 'Chèque' || formData.methode_paiement === 'Virement') && (
                    <div className="md:col-span-2">
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

                  {/* Notes */}
                  <div className="md:col-span-2">
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

                  {/* Boutons d'action */}
                  <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={handleGeneratePDF}
                      disabled={isProcessing || isGeneratingPDF}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingPDF ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Génération...
                        </>
                      ) : (
                        <>
                          <Printer className="w-4 h-4" />
                          Générer Reçu PDF
                        </>
                      )}
                    </button>
                    
                    {onClose && (
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Annuler
                      </button>
                    )}
                    
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          {paymentType === 'complet' 
                            ? 'Confirmer le paiement' 
                            : `Confirmer la tranche 1/${nombreTranches}`}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
      <Toaster />
    </>
  );
};

export default PasserPaiement;