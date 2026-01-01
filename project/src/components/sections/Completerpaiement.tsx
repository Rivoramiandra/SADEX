import React, { useState, useEffect } from 'react';
import {
  DollarSign, CreditCard, Banknote, Phone, TrendingUp,
  CheckCircle, X, Loader, AlertCircle, Calendar,
  User, Receipt, Building, Hash, PieChart, Layers,
  Plus, Minus, Printer
} from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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

// ==================== FONCTION GENERATEPDF COMPLETE POUR REÇU DE PAIEMENT ====================
const generatePDF = async (
  paiement: any,
  formData: any,
  infoTranche: string,
  customToast: any
): Promise<boolean> => {
  // Déclarer pdfContent en dehors du bloc try pour qu'il soit accessible dans le finally
  let pdfContent: HTMLDivElement | null = null;
  try {
    // Préparer les données pour le PDF (adapté pour Completerpaiement)
    const preparePaymentDataForPDF = () => {
      return {
        numReçu: `REC-${paiement.num_ap || 'AP'}-${Date.now().toString().slice(-6)}`,
        datePaiement: formatDate(formData.date_paiement),
        dateEmission: formatDate(paiement.date_ap), // Assumer que paiement a date_ap si disponible
        nomBeneficiaire: paiement.nom_convoquee || paiement.nom_personne_r || 'Madame RASOLOFONIAINA Baholiarinoro Marie Sylvie',
        commune: paiement.commune || '',
        fokontany: paiement.fokontany || '',
        methodePaiement: formData.mode_paiement,
        referencePaiement: formData.reference || '',
        notes: '', // Removed notes
        infoTranche: infoTranche,
        numAvis: paiement.num_ap || 'N/A'
      };
    };
    const preparedData = preparePaymentDataForPDF();
   
    // Calculer les montants (adapté)
    const montantAmende = paiement.montant_total || 0; // Utiliser montant_total comme base
    const montantRedevance = Math.floor(montantAmende * 0.5);
    const montantTotal = montantAmende + montantRedevance;
    const montantPaye = formData.montant_paye || 0;
    let montantRestant = Math.max(0, montantTotal - (paiement.montant + montantPaye)); // paiement.montant est le déjà payé

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
        margin-left: 50px;
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
  
    // Contenu de la page 1 (adapté)
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
  
    // Contenu de la page 2 (avec tableau, adapté)
    page2.innerHTML = `
      <style>${styles}</style>
      <div class="pdf-header"></div>
      <div class="pdf-content">
        <div class="content-block2">
          <p><strong><u>INFORMATIONS FONCIERES</u> :</strong></p>
        
          <p><strong><u>Référence Avis :</u></strong> n°${preparedData.numAvis}</p>
        
          <p><strong><u>Bénéficiaire :</u></strong> ${preparedData.nomBeneficiaire}</p>
        
          <p><strong><u>Localisation :</u></strong> ${preparedData.commune} ${preparedData.fokontany ? `, Fokontany ${preparedData.fokontany}` : ''}</p>
        
          ${paiement.x_coord && paiement.y_coord ? `
          <p><strong><u>Coordonnées :</u></strong></p>
          <p>X = ${paiement.x_coord || 'N/A'}</p>
          <p>Y = ${paiement.y_coord || 'N/A'}</p>
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
              <td><strong>TOTAL DÙ</strong></td>
              <td><strong>${formatMontant(montantTotal)}</strong></td>
              <td><strong>${montantTotalLettres.toUpperCase()}</strong></td>
            </tr>
            <tr>
              <td><strong>MONTANT PAYÉ${preparedData.infoTranche}</strong></td>
              <td><strong>${formatMontant(montantPaye)}</strong></td>
              <td><strong>${montantPayeLettres.toUpperCase()}</strong></td>
            </tr>
            <tr>
              <td>Montant restant à payer</td>
              <td>${formatMontant(montantRestant)}</td>
              <td>${montantRestantLettres.toUpperCase()}</td>
            </tr>
            <tr>
              <td colspan="3" style="text-align: center; font-style: italic;">
                Paiement échelonné sur ${paiement.nombre_tranche} tranche(s) - Tranche actuelle: ${paiement.numero_tranche + 1}/${paiement.nombre_tranche}
              </td>
            </tr>
            ${montantRestant === 0 ? `
            <tr>
              <td colspan="3" style="text-align: center; background-color: #e8f5e9;">
                <strong>SOLDE ACQUITTÉ INTÉGRALEMENT</strong>
              </td>
            </tr>
            ` : ''}
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
    const fileName = `Reçu_Paiement_${paiement.num_ap || paiement.idpaiement}_${new Date().toISOString().split('T')[0]}.pdf`;
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

function Completerpaiement({ paiement, onClose }) {
  const [formData, setFormData] = useState({
    mode_paiement: paiement.mode_paiement || 'Espèce',
    montant_paye: 0,
    montant_total: paiement.montant_total || paiement.montant,
    date_paiement: new Date().toISOString().split('T')[0],
    reference: '',
    contact: paiement.contact || '',
    est_nouvelle_tranche: false,
    nombre_tranche_total: paiement.nombre_tranche || 1,
    numero_tranche_actuelle: paiement.numero_tranche || 1,
    numero_carte: '',
    nom_carte: '',
    date_expiration: '',
    cvv: '',
    banque: '',
    iban: '',
    nom_titulaire: '',
    operateur_mobile: '',
    numero_transaction: '',
    nom_deposant: '',
    prenom_deposant: '',
    piece_identite: '',
    numero_piece: ''
  });
  const [loading, setLoading] = useState(false);
  const [paiementInfo, setPaiementInfo] = useState(null);
  const [montantParTranche, setMontantParTranche] = useState(0);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  // Configuration personnalisée des toasts
  const toastConfig = {
    position: "top-right" as const,
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "dark",
    style: {
      backgroundColor: '#000000',
      color: '#ffffff',
      border: '1px solid #333333'
    }
  };
  const showToast = {
    success: (message: string) => toast.success(message, toastConfig),
    error: (message: string) => toast.error(message, toastConfig),
    info: (message: string) => toast.info(message, toastConfig),
    warning: (message: string) => toast.warning(message, toastConfig)
  };
  // Mettre à jour les informations quand le paiement change
  useEffect(() => {
    if (paiement) {
      console.log('📋 Paiement reçu:', paiement);
     
      const montantPayeActuel = parseFloat(paiement.montant) || 0;
      const montantRestant = parseFloat(paiement.montant_reste) || 0;
      const montantTotal = parseFloat(paiement.montant_total) ||
                         (montantPayeActuel + montantRestant);
     
      const nombreTotalTranches = paiement.nombre_tranche || 1;
      const numeroTrancheActuelle = paiement.numero_tranche || 1;
     
      const tranchesDejaPayees = numeroTrancheActuelle;
      const tranchesRestant = nombreTotalTranches - tranchesDejaPayees;
     
      let montantParTrancheCalcule = 0;
      if (tranchesRestant > 0) {
        montantParTrancheCalcule = Math.floor(montantRestant / tranchesRestant);
        const reste = montantRestant - (montantParTrancheCalcule * tranchesRestant);
       
        if (tranchesRestant === 1) {
          montantParTrancheCalcule = montantRestant;
        }
      }
     
      setMontantParTranche(montantParTrancheCalcule);
     
      const prochaineTranche = numeroTrancheActuelle + 1;
     
      setFormData(prev => ({
        ...prev,
        montant_paye: montantParTrancheCalcule || 0,
        montant_total: montantTotal,
        mode_paiement: paiement.mode_paiement || 'Espèce',
        contact: paiement.contact || '',
        nombre_tranche_total: nombreTotalTranches,
        numero_tranche_actuelle: prochaineTranche,
        est_nouvelle_tranche: montantRestant > 0
      }));
     
      const info = calculerInformationsPaiement(paiement);
      setPaiementInfo(info);
    }
  }, [paiement]);

  const API_BASE_URL = 'http://localhost:3000/api';

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleMontantChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    const maxMontant = paiement.montant_reste || 0;
   
    if (value > maxMontant) {
      showToast.error(`Le montant ne peut pas dépasser ${formatMontant(maxMontant)} Ar`);
    }
   
    setFormData(prev => ({
      ...prev,
      montant_paye: value
    }));
  };

  const calculerInformationsPaiement = (paiementData) => {
    const montantPayeActuel = parseFloat(paiementData.montant) || 0;
    const montantRestant = parseFloat(paiementData.montant_reste) || 0;
    const montantTotal = parseFloat(paiementData.montant_total) ||
                        (montantPayeActuel + montantRestant);
   
    const nombreTranche = paiementData.nombre_tranche || 1;
    const numeroTranche = paiementData.numero_tranche || 1;
   
    const prochaineTranche = numeroTranche + 1;
    const estDerniereTranche = prochaineTranche === nombreTranche;
    const estTrancheFinale = (formData.montant_paye >= montantRestant) || estDerniereTranche;
   
    const pourcentagePayeActuel = montantTotal > 0 ?
      Math.round((montantPayeActuel / montantTotal) * 100) : 0;
   
    const nouveauPourcentagePaye = montantTotal > 0 ?
      Math.round(((montantPayeActuel + (formData.montant_paye || 0)) / montantTotal) * 100) : 0;
   
    const nouveauMontantRestant = Math.max(0, montantRestant - (formData.montant_paye || 0));
   
    return {
      montantPayeActuel,
      montantRestant,
      montantTotal,
      nombreTranche,
      numeroTranche,
      prochaineTranche,
      estDerniereTranche: estTrancheFinale,
      pourcentagePayeActuel,
      nouveauPourcentagePaye,
      montantTotalPaye: montantPayeActuel + (formData.montant_paye || 0),
      nouveauMontantRestant,
      montantParTrancheSuggest: montantParTranche
    };
  };

  const validerFormulaire = () => {
    const montantPaye = parseFloat(formData.montant_paye);
    const montantRestant = paiement.montant_reste;
    if (!montantPaye || montantPaye <= 0) {
      showToast.error('Le montant payé doit être supérieur à 0');
      return false;
    }
    if (montantPaye > montantRestant) {
      showToast.error(`Le montant payé (${formatMontant(montantPaye)} Ar) ne peut pas dépasser le montant restant (${formatMontant(montantRestant)} Ar)`);
      return false;
    }
    switch (formData.mode_paiement) {
      case 'Carte bancaire':
        if (!formData.numero_carte || formData.numero_carte.length < 16) {
          showToast.error('Le numéro de carte doit contenir 16 chiffres');
          return false;
        }
        if (!formData.nom_carte) {
          showToast.error('Le nom sur la carte est requis');
          return false;
        }
        if (!formData.date_expiration) {
          showToast.error('La date d\'expiration est requise');
          return false;
        }
        if (!formData.cvv || formData.cvv.length < 3) {
          showToast.error('Le code CVV doit contenir 3 chiffres');
          return false;
        }
        break;
      case 'Virement':
        if (!formData.banque) {
          showToast.error('Le nom de la banque est requis');
          return false;
        }
        if (!formData.iban || formData.iban.length < 16) {
          showToast.error('L\'IBAN est requis et doit être valide');
          return false;
        }
        if (!formData.nom_titulaire) {
          showToast.error('Le nom du titulaire du compte est requis');
          return false;
        }
        break;
      case 'Mobile Money':
        if (!formData.operateur_mobile) {
          showToast.error('L\'opérateur mobile est requis');
          return false;
        }
        if (!formData.contact || formData.contact.length < 10) {
          showToast.error('Le numéro de téléphone est requis');
          return false;
        }
        if (!formData.numero_transaction) {
          showToast.error('Le numéro de transaction est requis');
          return false;
        }
        break;
      case 'Espèce':
        if (!formData.nom_deposant) {
          showToast.error('Le nom du déposant est requis');
          return false;
        }
        if (!formData.piece_identite) {
          showToast.error('Le type de pièce d\'identité est requis');
          return false;
        }
        if (!formData.numero_piece) {
          showToast.error('Le numéro de la pièce d\'identité est requis');
          return false;
        }
        break;
    }
    return true;
  };

  // Fonction pour générer le PDF APRÈS le paiement réussi
  const generatePDFAfterPayment = async () => {
    try {
      const infoTranche = ` - Tranche ${formData.numero_tranche_actuelle}/${formData.nombre_tranche_total}`;
      await generatePDF(paiement, formData, infoTranche, showToast);
      showToast.success('Paiement enregistré et reçu généré avec succès');
    } catch (error) {
      console.error('Erreur lors de la génération du reçu:', error);
      showToast.error('Paiement enregistré, mais erreur lors de la génération du reçu');
    }
  };

  // Fonction pour générer le PDF manuellement
  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const infoTranche = ` - Tranche ${formData.numero_tranche_actuelle}/${formData.nombre_tranche_total}`;
      await generatePDF(paiement, formData, infoTranche, showToast);
      showToast.success('Reçu de paiement généré avec succès');
    } catch (error) {
      console.error('Erreur:', error);
      showToast.error('Erreur lors de la génération du reçu');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validerFormulaire()) {
      return;
    }
    setLoading(true);
    showToast.info('Traitement du paiement en cours...');
    try {
      const montantPaye = parseFloat(formData.montant_paye);
      const montantRestant = parseFloat(paiement.montant_reste) || 0;
      const nouveauMontantRestant = Math.max(0, montantRestant - montantPaye);
     
      const nombreTrancheTotal = paiement.nombre_tranche || 1;
      const numeroTrancheActuelle = paiement.numero_tranche || 1;
     
      const nouveauNumeroTranche = numeroTrancheActuelle + 1;
      const estDerniereTranche = nouveauNumeroTranche === nombreTrancheTotal || nouveauMontantRestant <= 0;
     
      const nouveauStatut = estDerniereTranche ? 'Payé' : 'Partiel';
      const paiementData = {
        montant: montantPaye,
        mode_paiement: formData.mode_paiement,
        date_paiement: formData.date_paiement,
        reference: formData.reference || `PAY-${Date.now()}`,
        contact: formData.contact,
        montant_reste: nouveauMontantRestant,
        numero_tranche: nouveauNumeroTranche,
        statut: nouveauStatut
      };
      console.log('📤 Données envoyées pour mise à jour paiement:', paiementData);
      const response = await fetch(`${API_BASE_URL}/paiements/${paiement.idpaiement}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paiementData)
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de la mise à jour du paiement');
      }
      if (result.success) {
        showToast.success('Paiement mis à jour avec succès !');
       
        // Générer le PDF après succès
        await generatePDFAfterPayment();
       
        setTimeout(() => {
          onClose(true);
        }, 1500);
      } else {
        throw new Error(result.message || 'Erreur lors de la mise à jour');
      }
    } catch (err) {
      console.error('❌ Erreur:', err);
      showToast.error(err.message || 'Une erreur est survenue lors du paiement');
    } finally {
      setLoading(false);
    }
  };

  const renderChampsSpecifiques = () => {
    switch (formData.mode_paiement) {
      case 'Carte bancaire':
        return (
          <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Informations de la carte
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Numéro de carte *
                </label>
                <input
                  type="text"
                  name="numero_carte"
                  value={formData.numero_carte}
                  onChange={handleInputChange}
                  placeholder="1234 5678 9012 3456"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength="19"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nom sur la carte *
                </label>
                <input
                  type="text"
                  name="nom_carte"
                  value={formData.nom_carte}
                  onChange={handleInputChange}
                  placeholder="JOHN DOE"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date d'expiration *
                </label>
                <input
                  type="month"
                  name="date_expiration"
                  value={formData.date_expiration}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Code CVV *
                </label>
                <input
                  type="password"
                  name="cvv"
                  value={formData.cvv}
                  onChange={handleInputChange}
                  placeholder="123"
                  maxLength="3"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        );
      case 'Virement':
        return (
          <div className="space-y-4 bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-green-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Informations de virement
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Banque *
                </label>
                <select
                  name="banque"
                  value={formData.banque}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner une banque</option>
                  <option value="BOA">Bank of Africa</option>
                  <option value="BFV">BFV-Société Générale</option>
                  <option value="BNI">BNI Madagascar</option>
                  <option value="BMOI">BMOI</option>
                  <option value="Access Bank">Access Bank</option>
                  <option value="MCB">MCB Madagascar</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  IBAN / Numéro de compte *
                </label>
                <input
                  type="text"
                  name="iban"
                  value={formData.iban}
                  onChange={handleInputChange}
                  placeholder="MG46 0000 5010 0123 4567 8910 123"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nom du titulaire du compte *
                </label>
                <input
                  type="text"
                  name="nom_titulaire"
                  value={formData.nom_titulaire}
                  onChange={handleInputChange}
                  placeholder="Nom du bénéficiaire"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        );
      case 'Mobile Money':
        return (
          <div className="space-y-4 bg-purple-50 p-4 rounded-lg">
            <h4 className="font-semibold text-purple-800 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Informations Mobile Money
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Opérateur *
                </label>
                <select
                  name="operateur_mobile"
                  value={formData.operateur_mobile}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner un opérateur</option>
                  <option value="Airtel Money">Airtel Money</option>
                  <option value="Orange Money">Orange Money</option>
                  <option value="MVola">MVola</option>
                  <option value="Zep">Zep</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Numéro de téléphone *
                </label>
                <input
                  type="tel"
                  name="contact"
                  value={formData.contact}
                  onChange={handleInputChange}
                  placeholder="034 12 345 67"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Numéro de transaction *
                </label>
                <input
                  type="text"
                  name="numero_transaction"
                  value={formData.numero_transaction}
                  onChange={handleInputChange}
                  placeholder="TRX123456789"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        );
      case 'Espèce':
        return (
          <div className="space-y-4 bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-semibold text-yellow-800 flex items-center gap-2">
              <Banknote className="w-4 h-4" />
              Informations du déposant
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nom du déposant *
                </label>
                <input
                  type="text"
                  name="nom_deposant"
                  value={formData.nom_deposant}
                  onChange={handleInputChange}
                  placeholder="Nom"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Prénom du déposant
                </label>
                <input
                  type="text"
                  name="prenom_deposant"
                  value={formData.prenom_deposant}
                  onChange={handleInputChange}
                  placeholder="Prénom"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Type de pièce *
                </label>
                <select
                  name="piece_identite"
                  value={formData.piece_identite}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner</option>
                  <option value="CIN">Carte d'identité nationale</option>
                  <option value="Passeport">Passeport</option>
                  <option value="Permis">Permis de conduire</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Numéro de pièce *
                </label>
                <input
                  type="text"
                  name="numero_piece"
                  value={formData.numero_piece}
                  onChange={handleInputChange}
                  placeholder="N° de la pièce"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'Espèce':
        return <Banknote className="w-5 h-5" />;
      case 'Virement':
        return <TrendingUp className="w-5 h-5" />;
      case 'Mobile Money':
        return <Phone className="w-5 h-5" />;
      case 'Carte bancaire':
        return <CreditCard className="w-5 h-5" />;
      default:
        return <DollarSign className="w-5 h-5" />;
    }
  };

  const info = paiementInfo || calculerInformationsPaiement(paiement);

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        style={{
          top: '1rem',
          right: '1rem',
          zIndex: 9999
        }}
        toastStyle={{
          backgroundColor: '#000000',
          color: '#ffffff',
          border: '1px solid #333333',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}
        progressStyle={{
          background: 'linear-gradient(to right, #4f46e5, #8b5cf6)'
        }}
      />
     
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* En-tête avec informations */}
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                Ajouter une nouvelle tranche de paiement
              </h3>
              <div className="text-sm text-slate-600 mt-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Building className="w-3 h-3" />
                  <span>Paiement #{paiement.idpaiement}</span>
                </div>
                {paiement.num_ap && (
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3" />
                    <span>Avis: {paiement.num_ap}</span>
                  </div>
                )}
              </div>
            </div>
           
            <div className="text-right">
              <div className="text-lg font-bold text-slate-900">
                {formatMontant(info.montantTotal)} Ar
              </div>
              <div className="text-sm text-slate-600">
                Montant total à payer
              </div>
            </div>
          </div>
        </div>
        {/* Informations sur les tranches */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5" />
            Progression du paiement
          </h4>
         
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-white rounded-lg border border-blue-100">
              <div className="text-2xl font-bold text-blue-600 flex items-center justify-center gap-2">
                <Hash className="w-5 h-5" />
                {info.numeroTranche}/{info.nombreTranche}
              </div>
              <div className="text-sm text-slate-600 mt-1">Dernière tranche payée</div>
            </div>
           
            <div className="text-center p-3 bg-white rounded-lg border border-blue-100">
              <div className="text-2xl font-bold text-blue-600">
                {info.pourcentagePayeActuel}%
              </div>
              <div className="text-sm text-slate-600 mt-1">Payé actuellement</div>
              <div className="text-xs text-slate-500">
                {formatMontant(info.montantPayeActuel)} Ar
              </div>
            </div>
           
            <div className="text-center p-3 bg-white rounded-lg border border-blue-100">
              <div className="text-2xl font-bold text-blue-600">
                {formatMontant(info.montantRestant)} Ar
              </div>
              <div className="text-sm text-slate-600 mt-1">Reste à payer</div>
            </div>
          </div>
         
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600">Progression actuelle</span>
              <span className="text-slate-600">{info.pourcentagePayeActuel}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${info.pourcentagePayeActuel}%` }}
              ></div>
            </div>
          </div>
        </div>
        {/* Informations de base */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-800 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Montants pour la prochaine tranche
            </h4>
           
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Prochaine tranche :</span>
                <span className="font-bold text-blue-700">
                  Tranche {formData.numero_tranche_actuelle}/{info.nombreTranche}
                </span>
              </div>
             
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Montant à payer pour cette tranche *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="montant_paye"
                    value={formData.montant_paye}
                    onChange={handleMontantChange}
                    min="1"
                    max={info.montantRestant}
                    step="1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500">
                    Ar
                  </span>
                </div>
              </div>
             
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-slate-600">Après paiement :</span>
                <div className="text-right">
                  <div className={`font-bold ${info.nouveauMontantRestant > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {formatMontant(info.nouveauMontantRestant)} Ar restant
                  </div>
                  <div className="text-xs text-slate-500">
                    {info.nouveauPourcentagePaye}% du total payé
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Informations de paiement
            </h4>
           
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Mode de paiement *
                </label>
                <select
                  name="mode_paiement"
                  value={formData.mode_paiement}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Espèce">Espèce</option>
                  <option value="Virement">Virement bancaire</option>
                  <option value="Mobile Money">Mobile Money</option>
                  <option value="Carte bancaire">Carte bancaire</option>
                </select>
              </div>
             
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date du paiement *
                </label>
                <input
                  type="date"
                  name="date_paiement"
                  value={formData.date_paiement}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
             
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Référence du paiement
                </label>
                <input
                  type="text"
                  name="reference"
                  value={formData.reference}
                  onChange={handleInputChange}
                  placeholder="Réf. paiement (facultatif)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
        {/* Champs spécifiques selon le mode */}
        {renderChampsSpecifiques()}
        {/* Résumé */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <h4 className="font-semibold text-emerald-800 mb-3">Résumé de la transaction</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {getModeIcon(formData.mode_paiement)}
                <span className="font-medium text-slate-900">{formData.mode_paiement}</span>
              </div>
              <div className="text-sm text-slate-600 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(formData.date_paiement).toLocaleDateString('fr-FR')}
              </div>
            </div>
           
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-slate-600" />
                <span className="font-medium text-slate-900">
                  Tranche {formData.numero_tranche_actuelle}/{info.nombreTranche}
                </span>
              </div>
              <div className="text-sm text-slate-600">
                {formData.numero_tranche_actuelle === info.nombreTranche ?
                  'Dernière tranche' :
                  `Prochaine tranche`}
              </div>
            </div>
           
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-600">
                {formatMontant(formData.montant_paye)} Ar
              </div>
              <div className="text-sm text-slate-600">
                Montant de cette tranche
              </div>
              <div className={`text-sm mt-1 ${info.nouveauMontantRestant > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {info.nouveauMontantRestant > 0 ?
                  `Reste: ${formatMontant(info.nouveauMontantRestant)} Ar` :
                  '✓ Paiement complété'}
              </div>
            </div>
          </div>
         
          {/* Nouvelle progression */}
          <div className="mt-4 pt-4 border-t border-emerald-200">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600">Nouvelle progression après paiement</span>
              <span className="text-slate-600">{info.nouveauPourcentagePaye}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${info.nouveauPourcentagePaye}%` }}
              ></div>
            </div>
            <div className="text-xs text-slate-500 mt-1 text-center">
              {formatMontant(info.montantTotalPaye)} Ar payés sur {formatMontant(info.montantTotal)} Ar
            </div>
          </div>
        </div>
        {/* Boutons d'action */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={handleGeneratePDF}
            disabled={loading || isGeneratingPDF}
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
          <button
            type="button"
            onClick={() => onClose(false)}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
            disabled={loading}
          >
            <X className="w-4 h-4" />
            Annuler
          </button>
         
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Traitement en cours...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                {info.nouveauMontantRestant <= 0 ?
                  'Finaliser le paiement' :
                  `Payer la tranche ${formData.numero_tranche_actuelle}`}
              </>
            )}
          </button>
        </div>
      </form>
    </>
  );
}

export default Completerpaiement;