// paiement-content.tsx
import { useState, useEffect, useCallback } from 'react';
import { 
  Receipt, DollarSign, Calendar, CheckCircle, Clock, XCircle,
  CreditCard, Banknote, Wallet, Check, X, Search,
  ChevronLeft, ChevronRight, MoreVertical, Filter,
  Eye, Download, Printer, Mail, AlertCircle,
  TrendingUp, TrendingDown, RefreshCw, FileText,
  User, MapPin, Building, Phone, Mail as MailIcon,
  Download as DownloadIcon, Send, Shield, Lock,
  ArrowRight, ArrowLeft, ExternalLink
} from 'lucide-react';
import PasserPaiement from './Passerpaiement';

interface AvisPaiement {
  id: number;
  num_ap: string;
  date_ap: string;
  montant: number;
  montant_lettre: string;
  statut: 'Payé' | 'En attente' | 'En cours' | 'Retard' | 'Annulé' | 'Partiellement payé' | 'En retard';
  methode_paiement?: string;
  description?: string;
  idft: number;
  iddescente: number;
  date_paiement?: string;
  reference_paiement?: string;
  created_at: string;
  updated_at: string;
  superficie_remblai?: number;
  zone_geo?: string;
  pu?: string;
  destination?: string;
  fin_premier_paiement?: string;
  contact?: string;
  ft?: {
    reference_ft: string;
    nom_convoquee: string;
    type_convoquee: string;
    commune?: string;
    fokontany?: string;
    nom_personne_r?: string;
  };
}

interface PaiementStats {
  totalEnAttente: number;
  totalEnCours: number;
  totalPaye: number;
  totalRetard: number;
  totalAnnule: number;
  totalMontantEnAttente: number;
  totalMontantEnCours: number;
  totalMontantPaye: number;
  totalMontantRetard: number;
}

interface MiseEnDemeure {
  id: number;
  avis_id: number;
  date_envoi: string;
  nouvelle_date_paiement: string;
  nouvelle_heure_paiement?: string;
  statut: 'envoyée' | 'relancée' | 'annulée';
  created_at: string;
  updated_at: string;
  avis?: AvisPaiement;
}

const API_BASE_URL = 'http://localhost:3000/api/avis-de-paiement';
const API_MISE_EN_DEMEURE_URL = 'http://localhost:3000/api/mise-en-demeure';

// Fonction pour charger une image en Base64
const getImageAsBase64 = async (imagePath: string): Promise<string> => {
  try {
    const response = await fetch(imagePath);
    if (!response.ok) {
      throw new Error(`Failed to load image: ${imagePath}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading image:', error);
    return '';
  }
};

// Fonction pour formater la date
const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    // Format: "2 mai 2024"
    const day = date.getDate();
    const monthNames = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day} ${month} ${year}`;
  } catch {
    return dateString;
  }
};

// Fonction pour formater le montant avec séparateurs
const formatMontant = (montant: number): string => {
  return new Intl.NumberFormat('fr-FR').format(montant);
};

// Fonction pour formater les montants en lettres (version simplifiée)
const formatMontantEnLettres = (montant: number): string => {
  if (montant === 0) return "ZÉRO";
  
  const unites = ["", "UN", "DEUX", "TROIS", "QUATRE", "CINQ", "SIX", "SEPT", "HUIT", "NEUF"];
  const dizaines = ["", "DIX", "VINGT", "TRENTE", "QUARANTE", "CINQUANTE", "SOIXANTE", "SOIXANTE-DIX", "QUATRE-VINGT", "QUATRE-VINGT-DIX"];
  
  const millions = Math.floor(montant / 1000000);
  const milliers = Math.floor((montant % 1000000) / 1000);
  const reste = montant % 1000;
  
  let result = "";
  
  // Millions
  if (millions > 0) {
    if (millions === 1) {
      result += "UN MILLION ";
    } else {
      // Simplifié : on utilise les unités pour les millions
      result += `${formatNombreSimple(millions)} MILLIONS `;
    }
  }
  
  // Milliers
  if (milliers > 0) {
    if (milliers === 1) {
      result += "MILLE ";
    } else {
      result += `${formatNombreSimple(milliers)} MILLE `;
    }
  }
  
  // Centaines
  if (reste > 0) {
    const c = Math.floor(reste / 100);
    const d = Math.floor((reste % 100) / 10);
    const u = reste % 10;
    
    if (c > 0) {
      if (c === 1) {
        result += "CENT ";
      } else {
        result += `${unites[c]} CENTS `;
      }
    }
    
    if (d > 0) {
      result += `${dizaines[d]} `;
    }
    
    if (u > 0) {
      result += `${unites[u]} `;
    }
  }
  
  return result.trim();
};

// Fonction auxiliaire pour formater les nombres simples
const formatNombreSimple = (n: number): string => {
  if (n < 10) return ["", "UN", "DEUX", "TROIS", "QUATRE", "CINQ", "SIX", "SEPT", "HUIT", "NEUF"][n];
  if (n < 100) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    if (u === 0) return ["", "DIX", "VINGT", "TRENTE", "QUARANTE", "CINQUANTE", "SOIXANTE", "SOIXANTE-DIX", "QUATRE-VINGT", "QUATRE-VINGT-DIX"][d];
    if (d === 1) return ["DIX", "ONZE", "DOUZE", "TREIZE", "QUATORZE", "QUINZE", "SEIZE", "DIX-SEPT", "DIX-HUIT", "DIX-NEUF"][u];
    return ["", "DIX", "VINGT", "TRENTE", "QUARANTE", "CINQUANTE", "SOIXANTE", "SOIXANTE-DIX", "QUATRE-VINGT", "QUATRE-VINGT-DIX"][d] + "-" + ["", "UN", "DEUX", "TROIS", "QUATRE", "CINQ", "SIX", "SEPT", "HUIT", "NEUF"][u];
  }
  return n.toString();
};

// Fonction pour formater l'heure
const formatTime = (timeString: string): string => {
  if (!timeString) return '';
  // Supprime les secondes si présentes
  return timeString.split(':').slice(0, 2).join(':');
};

// Fonction pour générer le PDF de mise en demeure pour paiement
const generateMiseEnDemeurePaiementPDF = async (
  avis: AvisPaiement, 
  nouvelleDate?: string, 
  nouvelleHeure?: string
): Promise<boolean> => {
  try {
    // Charger jsPDF dynamiquement
    const jsPDF = (await import('jspdf')).default;
    
    // Attendre que html2canvas soit disponible globalement
    let html2canvas;
    if (typeof window !== 'undefined') {
      html2canvas = await import('html2canvas');
    } else {
      throw new Error('html2canvas non disponible');
    }

    // Charger les images en Base64
    const [headerImage, emblemImage, footerImage] = await Promise.all([
      getImageAsBase64('/images/header_vm.png'),
      getImageAsBase64('/images/emblème_vf.png'),
      getImageAsBase64('/images/footer.png')
    ]);
    
    // Créer un élément div temporaire pour le rendu HTML
    const pdfContent = document.createElement('div');
    pdfContent.style.position = 'fixed';
    pdfContent.style.left = '-9999px';
    pdfContent.style.top = '0';
    pdfContent.style.width = '210mm';
    pdfContent.style.backgroundColor = 'white';
    pdfContent.style.boxSizing = 'border-box';
    pdfContent.style.overflow = 'hidden';
    
    // Créer un conteneur pour la page unique
    const page1 = document.createElement('div');
    page1.className = 'pdf-page pdf-page-1';
    page1.style.width = '210mm';
    page1.style.height = '297mm';
    page1.style.backgroundColor = 'white';
    page1.style.position = 'relative';
    page1.style.margin = '0';
    page1.style.padding = '0';
    page1.style.boxSizing = 'border-box';
    
    // Préparer les informations
    const dateMiseEnDemeure = nouvelleDate ? formatDate(nouvelleDate) : formatDate(new Date().toISOString());
    const heureRendezVous = nouvelleHeure || '09:00';
    
    // Extraire les montants de l'avis
    const montantAmende = avis.montant || 0;
    const montantRedevance = Math.floor(montantAmende * 0.5); // La redevance est 50% de l'amende
    const montantTotal = montantAmende + montantRedevance;
    
    // Formater les montants en lettres
    const montantAmendeLettres = formatMontantEnLettres(montantAmende);
    const montantRedevanceLettres = formatMontantEnLettres(montantRedevance);
    const montantTotalLettres = formatMontantEnLettres(montantTotal);
    
    // Appliquer les styles directement
    const styles = `
      @media print {
        @page { margin: 0; size: A4; }
        body { margin: 0; }
        .pdf-page { 
          width: 210mm; 
          height: 297mm;
        }
      }
      
      .pdf-header {
        height: 200px;
        width: 100%;
        background-image: url('${headerImage}');
        background-size: cover;
        background-repeat: no-repeat;
        margin-bottom: 20px;
      }
      
      .pdf-emblem {
        height: 100px;
        width: 90%;
        position: relative;
        top: -160px;
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
        position:relative;
        bottom: 0;
        width: 100%;
      }
      
      .pdf-content {
        font-family: 'Times New Roman', serif;
        font-size: 12px;
        line-height: 1.4;
        color: #000;
        position: relative;
        top: -120px;
      }
      
      .pdf-table {
        width: 100%;
        border-collapse: collapse;
      }
      
      .pdf-table td {
        vertical-align: top;
        padding: 2px;
      }
      
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .text-left { text-align: left; }
      
      .document-title {
        font-size: 13px;
        font-weight: bold;
        margin: 8mm 0;
        text-decoration: underline;
      }
      
      .reference {
        font-size: 11px;
        margin: 10mm 0 5mm 0;
        text-align: right;
        font-weight: bold;
      }
      
      .content-block {
        margin-bottom: 4mm;
        padding: 20px 50px;
      }
      
      .content-text {
        text-align: justify;
        margin-bottom: 10px;
        line-height: 1.6;
      }
      
      .signature-section {
        margin-top: 10mm;
        padding: 0 50px;
        width: 100%;
        width: 90%;
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
      
      .bold-text {
        font-weight: bold;
      }
      
      .underline-text {
        text-decoration: underline;
      }
      
      .mb-3 {
        margin-bottom: 12px;
      }
      
      .mt-4 {
        margin-top: 16px;
      }
    `;
    
    // Contenu de la page 1 (Mise en demeure pour paiement)
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
              Antananarivo, le ${dateMiseEnDemeure}<br><br>
              <strong>LE DIRECTEUR GÉNÉRAL</strong><br><br>
              À l'attention de<br><br>
              <strong>${avis.ft?.nom_convoquee || avis.ft?.nom_personne_r || 'Madame RASOLOFONIAINA Baholiarinoro Marie Sylvie'}</strong><br>
              ${avis.ft?.commune ? `Commune: ${avis.ft.commune}` : 'Demeurant au Lot IVY 19 Anosipatrana Est'}<br>
              ${avis.ft?.fokontany ? `Fokontany: ${avis.ft.fokontany}` : ''}
            </td>
          </tr>
        </table>

       

        <div class="document-title text-center">
         <strong>CONVOCATION ET MISE EN DEMEURE POUR PAIEMENT</strong>

        </div>
        <div class="content-block">
          
          
          <p class="content-text">
            Faisant suite à l'avis de paiement cité en référence, vous êtes contrainte au paiement d'une amende d'un montant de 
            <span class="bold-text"> ${montantAmendeLettres.toUpperCase()} ARIARY (${formatMontant(montantAmende)} Ar)</span>, 
            et de la redevance d'un montant de 
            <span class="bold-text"> ${montantRedevanceLettres.toUpperCase()} ARIARY (${formatMontant(montantRedevance)} Ar)</span>. 
            Nous vous rappelons que ces montants restent à ce jour impayés.
          </p>
          
          <p class="content-text">
            <strong>En conséquence, la présente convocation vous est adressée pour vous mettre en demeure de vous présenter dans les locaux de l'APIPA le 
            ${nouvelleDate ? formatDate(nouvelleDate) : '__________'} à ${nouvelleHeure || '__________'} 
            afin de régulariser votre situation dans les quinze jours.</strong>
          </p>
          
          <p class="content-text">
            En l'absence de règlement ou de justification de votre part à l'échéance mentionnée, des poursuites seront engagées à votre encontre et ce, dans le respect des dispositions légales et réglementaires en vigueur.
          </p>
          
          <p class="content-text">
            Nous vous remercions de l'attention que vous portez à ce rappel et des obligations dues à cet effet pour consolider l'importance de régulariser votre situation dans les délais impartis.
          </p>
          
          
          <p class="content-text">
            <strong>Pièces Jointes :</strong> Avis de paiement n°${avis.num_ap || '077/24'} et n°${avis.num_ap || '078/24'} en date du ${formatDate(avis.date_ap || '2024-10-14')}
          </p>
        </div>

        <table class="signature-section">
          <tr>
            <td style="width: 60%;"></td>
            <td style="width: 40%; text-align: right;">
              <em>Le Directeur Général,</em><br><br><br><br>
              <strong>_________________________</strong><br>
              <em>Signature et cachet</em>
            </td>
          </tr>
        </table>
        
        <div class="pdf-footer"></div>
      </div>
    `;
    
    // Ajouter la page au conteneur principal
    pdfContent.appendChild(page1);
    
    // Ajouter le div au body pour le rendu
    document.body.appendChild(pdfContent);
    
    // Attendre le rendu complet (images chargées)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Créer le PDF avec jsPDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Capturer et ajouter la page
    const canvas1 = await html2canvas.default(page1, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 793,
      height: 1122,
      windowWidth: 793,
      windowHeight: 1122
    });
    
    const imgData1 = canvas1.toDataURL('image/png', 1.0);
    pdf.addImage(imgData1, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    
    // Télécharger le PDF
    const fileName = `Mise_en_Demeure_Paiement_${avis.num_ap || avis.id}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
    
    // Nettoyer le div temporaire
    if (pdfContent.parentNode) {
      pdfContent.parentNode.removeChild(pdfContent);
    }
    
    return true;
    
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    throw new Error('Erreur lors de la génération du PDF');
  }
};

export default function PaiementContent() {
  const [avisList, setAvisList] = useState<AvisPaiement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedAvis, setSelectedAvis] = useState<AvisPaiement | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPasserPaiementModal, setShowPasserPaiementModal] = useState(false);
  const [selectedAvisForPasserPaiement, setSelectedAvisForPasserPaiement] = useState<AvisPaiement | null>(null);
  const [filtreStatut, setFiltreStatut] = useState<'tous' | 'En attente' | 'En cours' | 'Payé' | 'Retard' | 'Annulé' | 'Partiellement payé'>('tous');
  const [stats, setStats] = useState<PaiementStats>({
    totalEnAttente: 0,
    totalEnCours: 0,
    totalPaye: 0,
    totalRetard: 0,
    totalAnnule: 0,
    totalMontantEnAttente: 0,
    totalMontantEnCours: 0,
    totalMontantPaye: 0,
    totalMontantRetard: 0
  });
  const [showMiseEnDemeureModal, setShowMiseEnDemeureModal] = useState(false);
  const [selectedAvisForMED, setSelectedAvisForMED] = useState<AvisPaiement | null>(null);
  const [newPaymentDate, setNewPaymentDate] = useState('');
  const [newPaymentTime, setNewPaymentTime] = useState('');
  const [retardPaiements, setRetardPaiements] = useState<AvisPaiement[]>([]);
  const [miseEnDemeureList, setMiseEnDemeureList] = useState<MiseEnDemeure[]>([]);
  const [loadingMED, setLoadingMED] = useState(false);

  // Fonction pour vérifier si un avis peut être payé
  const canBePaid = (avis: AvisPaiement) => {
    const paiementPossible = 
      avis.statut === 'En cours' || 
      avis.statut === 'En attente' || 
      avis.statut === 'Retard' || 
      avis.statut === 'En retard';
    
    return paiementPossible && avis.statut !== 'Payé' && avis.statut !== 'Annulé';
  };

  // Fonction pour calculer le nombre de jours de retard
  const calculerJoursRetard = (datePaiement: string) => {
    if (!datePaiement) return 0;
    
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    
    const dateFin = new Date(datePaiement);
    dateFin.setHours(0, 0, 0, 0);
    
    const diffTime = aujourdhui.getTime() - dateFin.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };

  // Fonction pour vérifier les paiements en retard
  const checkRetardPaiements = useCallback((avisList: AvisPaiement[]) => {
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    
    const paiementsRetard = avisList.filter(avis => {
      if (!avis.fin_premier_paiement || avis.statut === 'Payé' || avis.statut === 'Annulé') {
        return false;
      }
      
      const dateFinPaiement = new Date(avis.fin_premier_paiement);
      dateFinPaiement.setHours(0, 0, 0, 0);
      
      const diffTime = aujourdhui.getTime() - dateFinPaiement.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays > 3;
    });
    
    setRetardPaiements(paiementsRetard);
  }, []);

  // Récupérer la liste des avis de paiement
  const fetchAvisList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const offset = (page - 1) * pageSize;
      let url = `${API_BASE_URL}`;
      const params = new URLSearchParams({
        offset: offset.toString(),
        limit: pageSize.toString(),
      });
      
      if (searchTerm) {
        params.append('q', searchTerm);
      }
      
      if (filtreStatut !== 'tous') {
        let statutApi = filtreStatut;
        if (filtreStatut === 'En retard') statutApi = 'Retard';
        params.append('statut', statutApi);
      }
      
      const fullUrl = `${url}?${params.toString()}`;
      console.log('Fetching avis list from:', fullUrl);
      
      const response = await fetch(fullUrl);
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const avisData = result.data || [];
        
        let filteredData = avisData;
        if (searchTerm.trim()) {
          const searchLower = searchTerm.toLowerCase().trim();
          filteredData = filteredData.filter(avis => (
            avis.num_ap?.toLowerCase().includes(searchLower) ||
            avis.reference_paiement?.toLowerCase().includes(searchLower) ||
            avis.ft?.reference_ft?.toLowerCase().includes(searchLower) ||
            avis.ft?.nom_convoquee?.toLowerCase().includes(searchLower) ||
            avis.ft?.nom_personne_r?.toLowerCase().includes(searchLower)
          ));
        }
        
        setAvisList(filteredData);
        
        // Vérifier les paiements en retard
        checkRetardPaiements(filteredData);
        
        // Calculer les statistiques
        calculerStatistiques(filteredData);
        
        setTotalCount(filteredData.length);
        setTotalPages(Math.ceil(filteredData.length / pageSize));
      } else {
        throw new Error(result.message || 'Erreur lors de la récupération des données');
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement des avis de paiement:', err);
      setError(err.message);
      setAvisList([]);
      setRetardPaiements([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchTerm, filtreStatut, checkRetardPaiements]);

  // Récupérer la liste des mises en demeure
  const fetchMiseEnDemeureList = useCallback(async () => {
    try {
      setLoadingMED(true);
      
      const response = await fetch(`${API_MISE_EN_DEMEURE_URL}`);
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setMiseEnDemeureList(result.data || []);
      } else {
        throw new Error(result.message || 'Erreur lors de la récupération des mises en demeure');
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement des mises en demeure:', err);
      setMiseEnDemeureList([]);
    } finally {
      setLoadingMED(false);
    }
  }, []);

  // Calculer les statistiques basées sur le statut réel
  const calculerStatistiques = (avisList: AvisPaiement[]) => {
    const statsCalcul: PaiementStats = {
      totalEnAttente: 0,
      totalEnCours: 0,
      totalPaye: 0,
      totalRetard: 0,
      totalAnnule: 0,
      totalMontantEnAttente: 0,
      totalMontantEnCours: 0,
      totalMontantPaye: 0,
      totalMontantRetard: 0
    };

    avisList.forEach(avis => {
      switch (avis.statut) {
        case 'En attente':
          statsCalcul.totalEnAttente++;
          statsCalcul.totalMontantEnAttente += avis.montant;
          break;
        case 'En cours':
        case 'Partiellement payé':
          statsCalcul.totalEnCours++;
          statsCalcul.totalMontantEnCours += avis.montant;
          break;
        case 'Payé':
          statsCalcul.totalPaye++;
          statsCalcul.totalMontantPaye += avis.montant;
          break;
        case 'Retard':
        case 'En retard':
          statsCalcul.totalRetard++;
          statsCalcul.totalMontantRetard += avis.montant;
          break;
        case 'Annulé':
          statsCalcul.totalAnnule++;
          break;
      }
    });

    setStats(statsCalcul);
  };

  // Initial fetch
  useEffect(() => {
    fetchAvisList();
    fetchMiseEnDemeureList();
  }, [fetchAvisList, fetchMiseEnDemeureList]);

  // Gérer le délai de recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== '') {
        setPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Réinitialiser les filtres
  const resetFiltres = () => {
    setFiltreStatut('tous');
    setSearchTerm('');
    setPage(1);
  };

  // Ouvrir le modal PasserPaiement
  const handleOpenPasserPaiementModal = (avis: AvisPaiement) => {
    setSelectedAvisForPasserPaiement(avis);
    setShowPasserPaiementModal(true);
  };

  // Annuler un avis
  const handleAnnulerAvis = async (avisId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cet avis de paiement?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/${avisId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          statut: 'Annulé'
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        alert('Avis annulé avec succès!');
        fetchAvisList();
      } else {
        throw new Error(result.message || 'Erreur lors de l\'annulation');
      }
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    }
  };

  // Télécharger l'avis en PDF
  const handleDownloadAvis = async (avisId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/${avisId}/pdf`);
      
      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Avis-Paiement-${avisId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    }
  };

  // Fonction utilitaire pour formater la date et l'heure
  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Date invalide';
      return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // Ouvrir le modal Mise en Demeure
  const handleOpenMiseEnDemeureModal = (avis: AvisPaiement) => {
    setSelectedAvisForMED(avis);
    
    // Définir la date par défaut (7 jours à partir d'aujourd'hui)
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    setNewPaymentDate(defaultDate.toISOString().split('T')[0]);
    
    // Définir l'heure par défaut (09:00)
    setNewPaymentTime('09:00');
    
    setShowMiseEnDemeureModal(true);
  };
// Dans PaiementContent.tsx, modifiez la fonction handleSendMiseEnDemeure
const handleSendMiseEnDemeure = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!newPaymentDate || !selectedAvisForMED) {
    alert('Veuillez sélectionner une date et une heure');
    return;
  }

  try {
    const miseEnDemeureData = {
      nouvelle_date_paiement: newPaymentDate,
      nouvelle_heure_paiement: newPaymentTime || '09:00'
    };

    // Utiliser la route correcte : /api/avis-de-paiement/{id}/mise-en-demeure
    const response = await fetch(`${API_BASE_URL}/${selectedAvisForMED.id}/mise-en-demeure`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(miseEnDemeureData)
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      // Générer le PDF de mise en demeure
      await generateMiseEnDemeurePaiementPDF(
        selectedAvisForMED, 
        newPaymentDate, 
        newPaymentTime || '09:00'
      );
      
      alert('Mise en demeure envoyée avec succès et PDF généré!');
      setShowMiseEnDemeureModal(false);
      setSelectedAvisForMED(null);
      setNewPaymentDate('');
      setNewPaymentTime('');
      
      // Rafraîchir la liste des avis
      fetchAvisList();
      
    } else {
      throw new Error(result.message || 'Erreur lors de l\'envoi de la mise en demeure');
    }
  } catch (error: any) {
    alert(`Erreur: ${error.message}`);
  }
};

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Payé':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'En attente':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'En cours':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Partiellement payé':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Retard':
      case 'En retard':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Annulé':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Payé':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'En attente':
        return <Clock className="w-4 h-4 text-orange-600" />;
      case 'En cours':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'Partiellement payé':
        return <DollarSign className="w-4 h-4 text-purple-600" />;
      case 'Retard':
      case 'En retard':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'Annulé':
        return <XCircle className="w-4 h-4 text-slate-600" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getMethodeIcon = (methode: string) => {
    switch (methode?.toLowerCase()) {
      case 'espèce':
        return <Banknote className="w-4 h-4" />;
      case 'carte bancaire':
        return <CreditCard className="w-4 h-4" />;
      case 'virement':
        return <TrendingUp className="w-4 h-4" />;
      case 'mobile money':
        return <Phone className="w-4 h-4" />;
      default:
        return <Wallet className="w-4 h-4" />;
    }
  };

  const handleViewDetails = (avis: AvisPaiement) => {
    setSelectedAvis(avis);
    setShowDetailsModal(true);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  // Filtrer les avis par statut
  const getAvisByStatus = (status: string) => {
    return avisList.filter(avis => avis.statut === status);
  };

  // Fonction pour normaliser le nom du statut pour l'affichage
  const getDisplayStatusName = (status: string) => {
    switch (status) {
      case 'En cours':
        return 'En cours de paiement';
      case 'Partiellement payé':
        return 'Partiellement payés';
      case 'En attente':
        return 'En attente de paiement';
      case 'Retard':
      case 'En retard':
        return 'En retard de paiement';
      case 'Payé':
        return 'Paiements effectués';
      case 'Annulé':
        return 'Avis annulés';
      default:
        return status;
    }
  };

  // Calculer les indices affichés
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, avisList.length);

  // Fonction pour rendre un tableau pour un statut spécifique
  const renderTableauParStatut = (statut: string, avisListStatut: AvisPaiement[]) => {
    if (avisListStatut.length === 0) return null;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
          {getStatusIcon(statut)}
          <span className="ml-2">{getDisplayStatusName(statut)}</span>
          <span className="ml-2 px-2 py-1 text-xs rounded font-medium"
            style={{
              backgroundColor: statut === 'Payé' ? '#dcfce7' : 
                              statut === 'En attente' ? '#ffedd5' :
                              statut === 'En cours' ? '#dbeafe' :
                              statut === 'Partiellement payé' ? '#f3e8ff' :
                              statut === 'Retard' || statut === 'En retard' ? '#fee2e2' : '#f1f5f9',
              color: statut === 'Payé' ? '#166534' : 
                    statut === 'En attente' ? '#9a3412' :
                    statut === 'En cours' ? '#1e40af' :
                    statut === 'Partiellement payé' ? '#7e22ce' :
                    statut === 'Retard' || statut === 'En retard' ? '#991b1b' : '#475569'
            }}>
            {avisListStatut.length} avis
          </span>
        </h3>
        
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  N° Avis
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Référence FT
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Montant
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Date Émission
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Statut
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {avisListStatut.slice(startIndex, Math.min(endIndex, startIndex + pageSize)).map((avis) => {
                const peutEtrePaye = canBePaid(avis);
                
                return (
                  <tr key={avis.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-3">
                          <Receipt className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900">{avis.num_ap}</div>
                          {avis.reference_paiement && (
                            <div className="text-xs text-slate-500">Ref: {avis.reference_paiement}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {avis.ft?.reference_ft || `FT-${avis.idft}`}
                      </div>
                      <div className="text-xs text-slate-500">
                        DS-{avis.iddescente}
                      </div>
                    </td>
                   
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg font-bold text-slate-900">
                        {formatMontant(avis.montant)} Ar
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-900">{formatDate(avis.date_ap)}</span>
                      </div>
                      {avis.date_paiement ? (
                        <div className="text-xs text-slate-500">
                          Payé le: {formatDate(avis.date_paiement)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${getStatusColor(avis.statut)}`}>
                        {getStatusIcon(avis.statut)}
                        <span className="text-sm font-medium">{avis.statut}</span>
                      </div>
                      {avis.methode_paiement && avis.statut === 'Payé' && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-slate-600">
                          {getMethodeIcon(avis.methode_paiement)}
                          {avis.methode_paiement}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDetails(avis)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                          title="Voir détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDownloadAvis(avis.id)}
                          className="p-1.5 text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded transition-colors"
                          title="Télécharger PDF"
                        >
                          <DownloadIcon className="w-4 h-4" />
                        </button>
                        
                        {peutEtrePaye && (
                          <button
                            onClick={() => handleOpenPasserPaiementModal(avis)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors"
                            title="Passer au paiement"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )}

                        {(avis.statut === 'Retard' || avis.statut === 'En retard') && (
                          <button
                            onClick={() => handleOpenMiseEnDemeureModal(avis)}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                            title="Envoyer mise en demeure"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Fonction pour rendre le tableau des retards
  const renderTableauRetards = () => {
    if (retardPaiements.length === 0) return null;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-red-800 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            Paiements en Retard (3+ jours)
            <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded font-medium">
              {retardPaiements.length} avis
            </span>
          </h3>
        </div>
        
        <div className="overflow-x-auto rounded-lg border border-red-200">
          <table className="min-w-full divide-y divide-red-100">
            <thead className="bg-red-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-red-700 uppercase tracking-wider">
                  N° Avis
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-red-700 uppercase tracking-wider">
                  Référence FT
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-red-700 uppercase tracking-wider">
                  Date Limite
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-red-700 uppercase tracking-wider">
                  Jours Retard
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-red-700 uppercase tracking-wider">
                  Montant
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-red-700 uppercase tracking-wider">
                  Contact
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-red-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-red-100">
              {retardPaiements.map((avis) => {
                const joursRetard = calculerJoursRetard(avis.fin_premier_paiement || '');
                
                return (
                  <tr key={avis.id} className="hover:bg-red-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center mr-3">
                          <AlertCircle className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900">{avis.num_ap}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {avis.ft?.reference_ft || `FT-${avis.idft}`}
                      </div>
                      <div className="text-xs text-slate-500">
                        {avis.ft?.nom_convoquee || 'Non spécifié'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-red-400" />
                        <span className="text-sm text-slate-900">
                          {formatDate(avis.fin_premier_paiement || '')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                        joursRetard > 7 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        +{joursRetard} jours
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg font-bold text-red-900">
                        {formatMontant(avis.montant)} Ar
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">
                        {avis.contact || 'N/A'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {avis.ft?.commune || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleOpenMiseEnDemeureModal(avis)}
                          className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                          title="Envoyer mise en demeure"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenPasserPaiementModal(avis)}
                          className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors"
                          title="Payer maintenant"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleViewDetails(avis)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                          title="Voir détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Fonction pour rendre le tableau des mises en demeure
  const renderTableauMiseEnDemeure = () => {
    if (miseEnDemeureList.length === 0) return null;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-purple-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-purple-800 flex items-center">
            <Mail className="w-5 h-5 mr-2" />
            Historique des Mises en Demeure
            <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded font-medium">
              {miseEnDemeureList.length} envois
            </span>
          </h3>
        </div>
        
        {loadingMED ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-2"></div>
              <p className="text-slate-600 text-sm">Chargement des mises en demeure...</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-purple-200">
            <table className="min-w-full divide-y divide-purple-100">
              <thead className="bg-purple-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Date Envoi
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    N° Avis
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Référence FT
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Nouvelle Date Paiement
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Statut
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Contact
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Montant
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-purple-100">
                {miseEnDemeureList.map((med) => (
                  <tr key={med.id} className="hover:bg-purple-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-purple-400" />
                        <span className="text-sm text-slate-900">
                          {formatDateTime(med.date_envoi)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {med.avis?.num_ap || `AP-${med.avis_id}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {med.avis?.ft?.reference_ft || `FT-${med.avis?.idft || 'N/A'}`}
                      </div>
                      <div className="text-xs text-slate-500">
                        {med.avis?.ft?.nom_convoquee || 'Non spécifié'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-medium text-emerald-900">
                            {formatDate(med.nouvelle_date_paiement)}
                          </span>
                        </div>
                        {med.nouvelle_heure_paiement && (
                          <div className="text-xs text-slate-600 pl-6">
                            à {med.nouvelle_heure_paiement}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded font-medium ${
                        med.statut === 'envoyée' 
                          ? 'bg-blue-100 text-blue-800'
                          : med.statut === 'relancée'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {med.statut.charAt(0).toUpperCase() + med.statut.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">
                        {med.avis?.contact || 'N/A'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {med.avis?.ft?.commune || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-purple-900">
                        {med.avis ? formatMontant(med.avis.montant) : 'N/A'} Ar
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // Regrouper tous les statuts uniques présents dans les données
  const getAllUniqueStatuses = () => {
    const statuses = new Set<string>();
    avisList.forEach(avis => {
      if (avis.statut) {
        statuses.add(avis.statut);
      }
    });
    return Array.from(statuses).sort();
  };

  return (
    <div className="space-y-6">
     

      {/* Tableau des paiements en retard */}
      {renderTableauRetards()}

      {/* Barre de recherche et filtres */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Barre de recherche */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par N° AP, référence FT, nom..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filtres supplémentaires */}
          <div className="flex flex-wrap gap-2">
            {/* Filtre par statut */}
            <select
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filtreStatut}
              onChange={(e) => {
                setFiltreStatut(e.target.value as any);
                setPage(1);
              }}
            >
              <option value="tous">Tous les statuts</option>
              <option value="En attente">En attente</option>
              <option value="En cours">En cours</option>
              <option value="Payé">Payés</option>
              <option value="Retard">En retard</option>
              <option value="Annulé">Annulés</option>
            </select>

            {/* Filtre par page */}
            <select
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            >
              <option value="5">5 par page</option>
              <option value="10">10 par page</option>
              <option value="20">20 par page</option>
              <option value="50">50 par page</option>
            </select>

            {/* Bouton réinitialiser si filtres actifs */}
            {(filtreStatut !== 'tous' || searchTerm) && (
              <button
                onClick={resetFiltres}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm"
              >
                <X className="w-4 h-4" />
                Réinitialiser
              </button>
            )}

            {/* Bouton actualiser */}
            <button 
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              onClick={() => {
                fetchAvisList();
                fetchMiseEnDemeureList();
              }}
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </button>
          </div>
        </div>

        {/* Tableaux séparés par statut */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-600">Chargement des avis de paiement...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-700 font-medium">Erreur: {error}</p>
            <button 
              onClick={fetchAvisList}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Réessayer
            </button>
          </div>
        ) : avisList.length === 0 ? (
          <div className="text-center p-8">
            <Receipt className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              {searchTerm || filtreStatut !== 'tous' 
                ? 'Aucun avis trouvé' 
                : 'Aucun avis de paiement'}
            </h3>
            <p className="text-slate-500">
              {searchTerm || filtreStatut !== 'tous'
                ? `Aucun avis ne correspond à vos critères${filtreStatut !== 'tous' ? ` (${filtreStatut})` : ''}.`
                : 'Commencez par créer des avis de paiement à partir des procès-verbaux.'}
            </p>
            {(searchTerm || filtreStatut !== 'tous') && (
              <button
                onClick={resetFiltres}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Si filtre "tous", montrer les tableaux séparés pour chaque statut */}
            {filtreStatut === 'tous' ? (
              <div className="space-y-6">
                {/* Afficher les tableaux dans un ordre logique */}
                {getAllUniqueStatuses().map(status => {
                  // Ne pas afficher les tableaux pour "Partiellement payé" et "Payé"
                  if (status === 'Partiellement payé' || status === 'Payé') {
                    return null;
                  }
                  return renderTableauParStatut(status, getAvisByStatus(status));
                })}
              </div>
            ) : (
              // Si un statut spécifique est sélectionné, montrer uniquement ce tableau
              renderTableauParStatut(filtreStatut, getAvisByStatus(filtreStatut))
            )}

            {/* Pagination globale */}
            {avisList.length > 0 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-slate-600">
                  {searchTerm || filtreStatut !== 'tous' 
                    ? `Affichage de ${startIndex + 1} à ${endIndex} sur ${avisList.length} résultats`
                    : `Affichage de ${startIndex + 1} à ${endIndex} sur ${totalCount} résultats`}
                  {filtreStatut !== 'tous' && (
                    <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      {getDisplayStatusName(filtreStatut)}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
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
                        className={`w-10 h-10 rounded-lg border transition-colors ${page === pageNum 
                          ? 'bg-blue-500 text-white border-blue-500' 
                          : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Tableau des mises en demeure */}
      {renderTableauMiseEnDemeure()}

      {/* Modal de détails de l'avis */}
      {showDetailsModal && selectedAvis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center">
                  <Receipt className="w-6 h-6 mr-2 text-blue-600" />
                  Détails de l'Avis de Paiement
                </h2>
                <p className="text-slate-600 mt-1">
                  {selectedAvis.num_ap} • {selectedAvis.ft?.reference_ft || `FT-${selectedAvis.idft}`}
                </p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <span className="sr-only">Fermer</span>
                <span className="text-2xl">×</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Informations principales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Informations de l'Avis</h3>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-slate-600">N° Avis:</dt>
                      <dd className="font-medium text-slate-900">{selectedAvis.num_ap}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Date d'émission:</dt>
                      <dd className="font-medium text-slate-900">{formatDate(selectedAvis.date_ap)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Fin premier paiement:</dt>
                      <dd className="font-medium text-slate-900">{formatDate(selectedAvis.fin_premier_paiement) || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Montant:</dt>
                      <dd className="font-bold text-slate-900 text-lg">
                        {formatMontant(selectedAvis.montant)} Ar
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Superficie Remblai:</dt>
                      <dd className="font-medium text-slate-900">{selectedAvis.superficie_remblai ? `${selectedAvis.superficie_remblai} m²` : 'N/A'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Statut et Paiement</h3>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Statut:</dt>
                      <dd>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedAvis.statut)}`}>
                          {selectedAvis.statut}
                        </span>
                      </dd>
                    </div>
                    {selectedAvis.methode_paiement ? (
                      <div className="flex justify-between">
                        <dt className="text-slate-600">Méthode:</dt>
                        <dd className="font-medium text-slate-900">{selectedAvis.methode_paiement}</dd>
                      </div>
                    ) : null}
                    {selectedAvis.date_paiement ? (
                      <div className="flex justify-between">
                        <dt className="text-slate-600">Date paiement:</dt>
                        <dd className="font-medium text-slate-900">{formatDate(selectedAvis.date_paiement)}</dd>
                      </div>
                    ) : null}
                    {selectedAvis.reference_paiement ? (
                      <div className="flex justify-between">
                        <dt className="text-slate-600">Référence paiement:</dt>
                        <dd className="font-medium text-slate-900">{selectedAvis.reference_paiement}</dd>
                      </div>
                    ) : null}
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Zone Géographique:</dt>
                      <dd className="font-medium text-slate-900">{selectedAvis.zone_geo || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">PU:</dt>
                      <dd className="font-medium text-slate-900">{selectedAvis.pu || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Informations du FT associé */}
              {selectedAvis.ft && (
                <div className="bg-slate-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Informations du Procès-Verbal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600">Référence FT</p>
                      <p className="font-medium text-slate-900">{selectedAvis.ft.reference_ft}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Personne convoquée</p>
                      <p className="font-medium text-slate-900">{selectedAvis.ft.nom_convoquee || selectedAvis.ft.nom_personne_r || 'Non spécifié'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Type</p>
                      <p className="font-medium text-slate-900 capitalize">{selectedAvis.ft.type_convoquee || 'Non spécifié'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Localisation</p>
                      <p className="font-medium text-slate-900">
                        {selectedAvis.ft.commune || 'N/A'} {selectedAvis.ft.fokontany && `- ${selectedAvis.ft.fokontany}`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Détails Additionnels */}
              <div className="bg-slate-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Détails Additionnels</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600">Destination</p>
                    <p className="font-medium text-slate-900">{selectedAvis.destination || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Contact</p>
                    <p className="font-medium text-slate-900">{selectedAvis.contact || 'N/A'}</p>
                  </div>
                 

                </div>
              </div>

              {/* Description */}
              {selectedAvis.description && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Description</h3>
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <p className="text-slate-700">{selectedAvis.description}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-200 p-6 flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownloadAvis(selectedAvis.id)}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <DownloadIcon className="w-4 h-4" />
                  Télécharger PDF
                </button>
                
                {/* Bouton "Passer au paiement" dans le modal - seulement si l'avis peut être payé */}
                {canBePaid(selectedAvis) && (
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleOpenPasserPaiementModal(selectedAvis);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <DollarSign className="w-4 h-4" />
                    Passer au Paiement
                  </button>
                )}
                
                {selectedAvis.statut !== 'Annulé' && selectedAvis.statut !== 'Payé' && (
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleAnnulerAvis(selectedAvis.id);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Annuler l'Avis
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Mise en Demeure */}
      {showMiseEnDemeureModal && selectedAvisForMED && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-red-200 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-red-900 flex items-center">
                  <Mail className="w-6 h-6 mr-2 text-red-600" />
                  Envoyer Mise en Demeure
                </h2>
                <p className="text-slate-600 mt-1">
                  {selectedAvisForMED.num_ap} • {selectedAvisForMED.ft?.reference_ft || `FT-${selectedAvisForMED.idft}`}
                </p>
              </div>
              <button
                onClick={() => setShowMiseEnDemeureModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <span className="sr-only">Fermer</span>
                <span className="text-2xl">×</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Informations principales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Informations de l'Avis</h3>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-slate-600">N° Avis:</dt>
                      <dd className="font-medium text-slate-900">{selectedAvisForMED.num_ap}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Date d'émission:</dt>
                      <dd className="font-medium text-slate-900">{formatDate(selectedAvisForMED.date_ap)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Fin premier paiement:</dt>
                      <dd className="font-medium text-slate-900">{formatDate(selectedAvisForMED.fin_premier_paiement) || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Montant:</dt>
                      <dd className="font-bold text-slate-900 text-lg">
                        {formatMontant(selectedAvisForMED.montant)} Ar
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Superficie Remblai:</dt>
                      <dd className="font-medium text-slate-900">{selectedAvisForMED.superficie_remblai ? `${selectedAvisForMED.superficie_remblai} m²` : 'N/A'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Statut et Paiement</h3>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Statut:</dt>
                      <dd>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedAvisForMED.statut)}`}>
                          {selectedAvisForMED.statut}
                        </span>
                      </dd>
                    </div>
                    {selectedAvisForMED.methode_paiement ? (
                      <div className="flex justify-between">
                        <dt className="text-slate-600">Méthode:</dt>
                        <dd className="font-medium text-slate-900">{selectedAvisForMED.methode_paiement}</dd>
                      </div>
                    ) : null}
                    {selectedAvisForMED.date_paiement ? (
                      <div className="flex justify-between">
                        <dt className="text-slate-600">Date paiement:</dt>
                        <dd className="font-medium text-slate-900">{formatDate(selectedAvisForMED.date_paiement)}</dd>
                      </div>
                    ) : null}
                    {selectedAvisForMED.reference_paiement ? (
                      <div className="flex justify-between">
                        <dt className="text-slate-600">Référence paiement:</dt>
                        <dd className="font-medium text-slate-900">{selectedAvisForMED.reference_paiement}</dd>
                      </div>
                    ) : null}
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Zone Géographique:</dt>
                      <dd className="font-medium text-slate-900">{selectedAvisForMED.zone_geo || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">PU:</dt>
                      <dd className="font-medium text-slate-900">{selectedAvisForMED.pu || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Informations du FT associé */}
              {selectedAvisForMED.ft && (
                <div className="bg-slate-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Informations du Procès-Verbal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600">Référence FT</p>
                      <p className="font-medium text-slate-900">{selectedAvisForMED.ft.reference_ft}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Personne convoquée</p>
                      <p className="font-medium text-slate-900">{selectedAvisForMED.ft.nom_convoquee || selectedAvisForMED.ft.nom_personne_r || 'Non spécifié'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Type</p>
                      <p className="font-medium text-slate-900 capitalize">{selectedAvisForMED.ft.type_convoquee || 'Non spécifié'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Localisation</p>
                      <p className="font-medium text-slate-900">
                        {selectedAvisForMED.ft.commune || 'N/A'} {selectedAvisForMED.ft.fokontany && `- ${selectedAvisForMED.ft.fokontany}`}
                      </p>
                    </div>
                  </div>
                </div>
              )}


              {/* Formulaire pour nouvelle date et heure de paiement */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Nouvelle Date et Heure de Paiement</h3>
                <form onSubmit={handleSendMiseEnDemeure} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="newPaymentDate" className="block text-sm font-medium text-slate-700 mb-1">
                        Nouvelle date de paiement *
                      </label>
                      <input
                        type="date"
                        id="newPaymentDate"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        value={newPaymentDate}
                        onChange={(e) => setNewPaymentDate(e.target.value)}
                        required
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        La date doit être dans le futur
                      </p>
                    </div>
                    <div>
                      <label htmlFor="newPaymentTime" className="block text-sm font-medium text-slate-700 mb-1">
                        Heure de paiement
                      </label>
                      <input
                        type="time"
                        id="newPaymentTime"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        value={newPaymentTime}
                        onChange={(e) => setNewPaymentTime(e.target.value)}
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Heure limite pour le paiement
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowMiseEnDemeureModal(false)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      Envoyer la Mise en Demeure
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal PasserPaiement - Utilisation du composant importé */}
      {showPasserPaiementModal && selectedAvisForPasserPaiement && (
        <PasserPaiement
          avis={selectedAvisForPasserPaiement}
          onClose={() => {
            setShowPasserPaiementModal(false);
            setSelectedAvisForPasserPaiement(null);
          }}
          onSuccess={() => {
            setShowPasserPaiementModal(false);
            setSelectedAvisForPasserPaiement(null);
            fetchAvisList();
            fetchMiseEnDemeureList();
          }}
        />
      )}
    </div>
  );
}