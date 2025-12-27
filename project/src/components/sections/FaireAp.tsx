import React, { useState, useEffect, useRef } from 'react';
import {
  DollarSign, FileText, Calendar, User, MapPin, Building,
  CheckCircle, Download, Printer, Save, ArrowLeft, CreditCard,
  Check, Calculator, AlertCircle, Receipt, X, Plus, FileSignature,
  Clock, Users, Home, Briefcase, Eye, Phone, Target, ChevronDown,
  ChevronUp, AlertTriangle, Mail as MailIcon, FileCheck
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import proj4 from 'proj4';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import toast, { Toaster } from 'react-hot-toast';
// ==================== ALGORITHMES DE CALCUL ====================
export interface CalculResult {
  redevance: number;
  amende: number;
  calcul_redevance: boolean;
}
export const mapDestinationToAttraction = (destination: string): 'H' | 'I' | 'C' => {
  switch (destination) {
    case 'HABITATION':
      return 'H';
    case 'INDUSTRIEL':
      return 'I';
    case 'COMMERCIAL':
      return 'C';
    default:
      return 'H';
  }
};
export const calculerTaxesComplet = (
  zone_type: 'constructible' | 'inconstructible',
  type_attraction: 'H' | 'I' | 'C',
  superficie: number,
  zone_geographique: 'CUA' | 'peripherie'
): CalculResult => {
  const resultats: CalculResult = {
    redevance: 0,
    amende: 0,
    calcul_redevance: false
  };
  if (zone_type === 'constructible') {
    resultats.calcul_redevance = true;
   
    if (zone_geographique === 'CUA') {
      if (superficie < 100) {
        resultats.redevance = type_attraction === 'H' ? 6250 : 12500;
        resultats.amende = type_attraction === 'H' ? 12500 : 25000;
      } else if (superficie === 100) {
        resultats.redevance = type_attraction === 'H' ? 12500 : 18750;
        resultats.amende = type_attraction === 'H' ? 25000 : 37500;
      } else if (superficie < 2000) {
        if (type_attraction === 'H') {
          resultats.redevance = 12500;
          resultats.amende = 25000;
        } else {
          resultats.redevance = 18750;
          resultats.amende = 37500;
        }
      } else {
        resultats.redevance = type_attraction === 'H' ? 12500 : 25000;
        resultats.amende = type_attraction === 'H' ? 25000 : 50000;
      }
    } else {
      if (superficie < 100) {
        resultats.redevance = type_attraction === 'H' ? 3125 : 6250;
        resultats.amende = type_attraction === 'H' ? 6250 : 12500;
      } else if (superficie === 100) {
        resultats.redevance = type_attraction === 'H' ? 6250 : 9375;
        resultats.amende = type_attraction === 'H' ? 12500 : 18750;
      } else if (superficie < 2000) {
        if (type_attraction === 'H') {
          resultats.redevance = 6250;
          resultats.amende = 12500;
        } else {
          resultats.redevance = 9375;
          resultats.amende = 18750;
        }
      } else {
        resultats.redevance = type_attraction === 'H' ? 6250 : 12500;
        resultats.amende = type_attraction === 'H' ? 12500 : 25000;
      }
    }
  } else if (zone_type === 'inconstructible') {
    resultats.calcul_redevance = false;
    resultats.redevance = 0;
   
    if (zone_geographique === 'CUA') {
      if (superficie < 100) {
        resultats.amende = type_attraction === 'H' ? 12500 : 25000;
      } else if (superficie === 100) {
        resultats.amende = type_attraction === 'H' ? 25000 : 37500;
      } else if (superficie < 2000) {
        resultats.amende = type_attraction === 'H' ? 25000 : 37500;
      } else {
        resultats.amende = type_attraction === 'H' ? 25000 : 50000;
      }
    } else {
      if (superficie < 100) {
        resultats.amende = type_attraction === 'H' ? 6250 : 12500;
      } else if (superficie === 100) {
        resultats.amende = type_attraction === 'H' ? 12500 : 18750;
      } else if (superficie < 2000) {
        resultats.amende = type_attraction === 'H' ? 12500 : 18750;
      } else {
        resultats.amende = type_attraction === 'H' ? 12500 : 25000;
      }
    }
  }
  return resultats;
};
export const getTypePaiementSelonZone = (zone_type: 'constructible' | 'inconstructible'): 'amende' | 'redevance' | 'total' => {
  return zone_type === 'inconstructible' ? 'amende' : 'total';
};
export const formatNumber = (num: string | number): string => {
  if (!num) return '0';
  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(numValue)) return '0';
  return new Intl.NumberFormat('fr-FR').format(numValue);
};
export const convertToLetters = (amount: number): string => {
  const units = ['', 'UN', 'DEUX', 'TROIS', 'QUATRE', 'CINQ', 'SIX', 'SEPT', 'HUIT', 'NEUF'];
  const teens = ['DIX', 'ONZE', 'DOUZE', 'TREIZE', 'QUATORZE', 'QUINZE', 'SEIZE', 'DIX-SEPT', 'DIX-HUIT', 'DIX-NEUF'];
  const tens = ['', 'DIX', 'VINGT', 'TRENTE', 'QUARANTE', 'CINQUANTE', 'SOIXANTE', 'SOIXANTE-DIX', 'QUATRE-VINGT', 'QUATRE-VINGT-DIX'];
 
  if (amount === 0) return 'ZÉRO';
 
  let result = '';
  const millions = Math.floor(amount / 1000000);
  const thousands = Math.floor((amount % 1000000) / 1000);
  const remainder = amount % 1000;
 
  if (millions > 0) {
    if (millions === 1) {
      result += 'UN MILLION ';
    } else {
      result += convertSmallNumber(millions) + ' MILLIONS ';
    }
  }
 
  if (thousands > 0) {
    if (thousands === 1) {
      result += 'MILLE ';
    } else {
      result += convertSmallNumber(thousands) + ' MILLE ';
    }
  }
 
  if (remainder > 0) {
    result += convertSmallNumber(remainder);
  }
 
  return result.trim() + ' ARIARY';
 
  function convertSmallNumber(num: number): string {
    if (num === 0) return '';
    if (num < 10) return units[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) {
      const ten = Math.floor(num / 10);
      const unit = num % 10;
      if (unit === 0) return tens[ten];
      if (ten === 7 || ten === 9) {
        return tens[ten - 1] + '-' + teens[unit];
      }
      return tens[ten] + '-' + units[unit];
    }
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    if (hundred === 1) {
      return rest === 0 ? 'CENT' : 'CENT ' + convertSmallNumber(rest);
    }
    return units[hundred] + ' CENT' + (rest === 0 ? 'S' : ' ' + convertSmallNumber(rest));
  }
};
// ==================== SYSTEMES DE COORDONNEES ====================
const lambertMadagascar = '+proj=lcc +lat_1=-18.9 +lat_2=-18.9 +lat_0=-18.9 +lon_0=46.43722916666667 +x_0=400000 +y_0=800000 +ellps=intl +towgs84=-189,-242,-91,0,0,0,0 +units=m +no_defs';
const wgs84 = '+proj=longlat +datum=WGS84 +no_defs';
const convertLambertToWGS84 = (x: number, y: number): { lat: number, lng: number } => {
  try {
    const result = proj4(lambertMadagascar, wgs84, [x, y]);
    return {
      lat: result[1],
      lng: result[0]
    };
  } catch (error) {
    console.error('Erreur de conversion de coordonnées:', error);
    return {
      lat: -18.8792,
      lng: 47.5079
    };
  }
};
// ==================== INTERFACES ====================
interface FT {
  id: number;
  reference_ft: string;
  date_ft: string;
  heure_ft: string;
  type_convoquee: string;
  nom_convoquee: string;
  cin: string;
  adresse: string;
  titre_terrain: string;
  nom_propriete: string;
  nom_proprietaire: string;
  superficie_remblai: number;
  dossier: string;
  date_deadlinedossier: string;
  statut: string;
  statut_dossier: string;
  conclusion: string;
  contact: string;
  iddescente: number;
  idrendezvous: number;
  created_at: string;
  updated_at: string;
  nom_personne_r?: string;
  commune?: string;
  fokontany?: string;
  dossiers_fournis?: string[];
  dossier_a_fournir?: string[];
  delai_complement?: number;
}
interface Descente {
  id?: number;
  reference?: string;
  date_descente?: string;
  heure_descente?: string;
  n_pv_pat?: string;
  n_fifafi?: string;
  type_verbalisateur?: string;
  nom_verbalisateur?: string;
  personne_r?: string;
  nom_personne_r?: string;
  contact_r?: string;
  adresse_r?: string;
  commune?: string;
  fokontany?: string;
  district?: string;
  localisation?: string;
  superficie?: string;
  x_coord?: string;
  y_coord?: string;
  infraction?: any;
  actions?: string;
  modele_pv?: string;
  dossier_a_fournir?: string;
  statut_descente?: string;
  created_at?: string;
}
interface FaireApProps {
  ft?: FT;
  onClose?: () => void;
  onSuccess?: () => void;
}
// ==================== FONCTIONS UTILITAIRES POUR PDF ====================
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
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Impossible de convertir l\'image en Base64'));
        }
      };
      reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Erreur lors du chargement de l'image ${imagePath}:`, error);
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idHJhbnNwYXJlbnQiLz48L3N2Zz4=';
  }
};
const formatDate = (dateString: string): string => {
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
// ==================== COMPOSANT PRINCIPAL ====================
const FaireAp: React.FC<FaireApProps> = ({ ft, onClose, onSuccess }) => {
  const [selectedFt, setSelectedFt] = useState<FT | null>(null);
  const [descenteData, setDescenteData] = useState<Descente | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDescente, setLoadingDescente] = useState(false);
  const [showFtSelection, setShowFtSelection] = useState(!ft);
  const [fts, setFts] = useState<FT[]>([]);
  const [expandedSections, setExpandedSections] = useState({
    ft: true,
    descente: true,
    carte: true,
    formulaire: true
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
 
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [calculDetails, setCalculDetails] = useState({
    redevance: 0,
    amende: 0,
    total: 0
  });
  const [formData, setFormData] = useState({
    iddescente: ft?.iddescente || 0,
    idft: ft?.id || 0,
    num_ap: `AP-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
    date_ap: new Date().toISOString().split('T')[0],
    superficie_remblai: ft?.superficie_remblai?.toString() || '',
    zone_geo: 'CUA' as 'CUA' | 'peripherie',
    pu: 'PU1' as 'PU1' | 'PU2' | 'PU3' | 'PU4' | 'autre',
    destination: 'HABITATION' as 'HABITATION' | 'INDUSTRIEL' | 'COMMERCIAL',
    montant: '',
    montant_lettre: '',
    fin_premier_paiement: '',
    contact: ft?.contact || '',
   
    zone_type: 'constructible' as 'constructible' | 'inconstructible',
    type_payment: 'total' as 'amende' | 'redevance' | 'total',
    valeur_unitaire: '',
    montant_total: '',
    motif: ''
  });
  // ==================== FONCTIONS UTILITAIRES ====================
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
  const cleanJsonString = (str: any): string => {
    if (str === null || str === undefined) {
      return '';
    }
    let cleanStr = typeof str === 'string' ? str : String(str);
    cleanStr = cleanStr.trim();
    if (cleanStr === '') {
      return '';
    }
    if (cleanStr.startsWith('{') && cleanStr.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleanStr);
        if (typeof parsed === 'object' && parsed !== null) {
          const firstKey = Object.keys(parsed)[0];
          const value = parsed[firstKey];
          return value !== null && value !== undefined ? String(value) : '';
        }
      } catch (error) {
        console.debug('JSON parsing failed, continuing with normal cleaning:', error);
      }
    }
    if ((cleanStr.startsWith('"') && cleanStr.endsWith('"')) ||
        (cleanStr.startsWith("'") && cleanStr.endsWith("'"))) {
      cleanStr = cleanStr.slice(1, -1);
    }
    return cleanStr;
  };
  const extractInfractionText = (infraction: any): string => {
    if (!infraction) return '';
   
    if (typeof infraction === 'string') {
      return infraction;
    }
   
    if (typeof infraction === 'object') {
      try {
        if (infraction.description) return String(infraction.description);
        if (infraction.text) return String(infraction.text);
        if (infraction.message) return String(infraction.message);
        if (infraction.infraction) return String(infraction.infraction);
        return JSON.stringify(infraction);
      } catch {
        return 'Infraction non textuelle';
      }
    }
   
    return String(infraction);
  };
  const determineZoneConstructible = (infraction?: any): 'constructible' | 'inconstructible' => {
    if (!infraction) return 'constructible';
   
    const infractionText = extractInfractionText(infraction).toLowerCase();
    if (infractionText.includes('inconstructible') ||
        infractionText.includes('zone rouge') ||
        infractionText.includes('zone inondable') ||
        infractionText.includes('non constructible') ||
        infractionText.includes('zone interdite')) {
      return 'inconstructible';
    }
    return 'constructible';
  };
  const calculerValeurs = () => {
    const superficie = parseFloat(formData.superficie_remblai) || 0;
    const zoneGeographique = formData.zone_geo;
    const typePayment = formData.type_payment;
    const destination = formData.destination;
    const zoneConstructible = formData.zone_type;
   
    if (superficie <= 0) {
      setCalculDetails({ redevance: 0, amende: 0, total: 0 });
      setFormData(prev => ({
        ...prev,
        valeur_unitaire: '0',
        montant_total: '0',
        montant: '0',
        montant_lettre: ''
      }));
      return;
    }
   
    const typeAttraction = mapDestinationToAttraction(destination);
    const calcul = calculerTaxesComplet(zoneConstructible, typeAttraction, superficie, zoneGeographique);
   
    const totalCalcul = calcul.redevance + calcul.amende;
    setCalculDetails({
      redevance: calcul.redevance,
      amende: calcul.amende,
      total: totalCalcul
    });
   
    let valeurUnitaire = 0;
    let montantTotal = 0;
    if (zoneConstructible === 'constructible') {
      if (typePayment === 'total') {
        valeurUnitaire = totalCalcul;
        montantTotal = superficie * totalCalcul;
      } else if (typePayment === 'amende') {
        valeurUnitaire = calcul.amende;
        montantTotal = superficie * calcul.amende;
      } else if (typePayment === 'redevance') {
        valeurUnitaire = calcul.redevance;
        montantTotal = superficie * calcul.redevance;
      }
    } else {
      valeurUnitaire = calcul.amende;
      montantTotal = superficie * calcul.amende;
    }
   
    setFormData(prev => ({
      ...prev,
      valeur_unitaire: valeurUnitaire.toFixed(0),
      montant_total: montantTotal.toFixed(0),
      montant: montantTotal.toFixed(0),
      montant_lettre: montantTotal > 0 ? convertToLetters(montantTotal) : ''
    }));
  };
  // ==================== FONCTION GENERATEPDF COMPLETE ====================
// ==================== FONCTION GENERATEPDF CORRIGEE ====================
// Fonction pour générer et télécharger le PDF
const generatePDF = async () => {
  // Déclarer pdfContent en dehors du bloc try pour qu'il soit accessible dans le finally
  let pdfContent: HTMLDivElement | null = null;
 
  if (!descenteData) {
    customToast.error('Veuillez d\'abord charger les données de la descente');
    return;
  }
 
  const prepareFTDataForPDF = () => {
    if (!selectedFt || !descenteData) return null;
   
    return {
      referenceFT: selectedFt.reference_ft,
      currentDate: formatDate(new Date().toISOString()),
      dateDescente: formatDate(descenteData.date_descente || ''),
      heureDescente: descenteData.heure_descente || '',
      commune: descenteData.commune || '',
      fokontany: descenteData.fokontany || '',
      localite: descenteData.localisation || '',
      titreTerrain: selectedFt.titre_terrain || '',
      nomproprietaire: selectedFt.nom_proprietaire || '',
      coordX: descenteData.x_coord || '',
      coordY: descenteData.y_coord || '',
      superficie: descenteData.superficie || '',
      infraction: extractInfractionText(descenteData.infraction),
      action: descenteData.actions || '',
      formattedDateFT: formatDate(selectedFt.date_ft),
      formattedHeureFT: selectedFt.heure_ft ? selectedFt.heure_ft.substring(0, 5) : '',
      typeConvoquee: selectedFt.type_convoquee || '',
      nomComplet: selectedFt.nom_convoquee || '',
      cin: selectedFt.cin || '',
      contact: selectedFt.contact || '',
      dossierType: selectedFt.dossier ? [selectedFt.dossier] : [],
      missingDossiers: selectedFt.dossier_a_fournir ? [selectedFt.dossier_a_fournir] : [],
      deadline: selectedFt.date_deadlinedossier || '',
      mesure: selectedFt.conclusion || ''
    };
  };
 
  const preparedData = prepareFTDataForPDF();
  if (!preparedData) {
    customToast.error('Impossible de préparer les données pour le PDF');
    return;
  }
 
  try {
    setGeneratingPDF(true);
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
      }
     
      .info-table td, .info-table th {
        border: 1px solid black;
        padding: 3px;
        text-align: center;
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
              <strong>Ministeran'ny Fitsinjiram-pahefana<br>sy ny Fanajariana ny Tany<br>
              --------------------<br>
              Sekretera Jeneraly<br>
              --------------------<br>
              <em>Fitaleavana Ankapobeny</em><br>
              <em>Fahefana misahana ny fiarovana ny</em><br>
              <em>Lemak'Antananarivo amin'ny tondra-drano</em><br>
              --------------------</strong>
            </td>
            <td style="width: 10%;"></td>
            <td style="width: 45%; vertical-align: top; text-align: center;">
              Antananarivo, le ${formatDate(formData.date_ap)}<br><br>
              Le Directeur Général<br><br>
              À<br><br>
              <strong>${selectedFt.nom_convoquee}</strong>
            </td>
          </tr>
        </table>
        <div class="document-title text-center">
          Avis de Paiement n°<u>${formData.num_ap.replace('AP-', '')}</u>
        </div>
       
        <div class="content-block1">
          <p>En application des dispositions du <em>décret n°2019-1543 du 11 septembre 2019 portant régulation de l'exécution des travaux de remblaiement dans les zones d'intervention de l'APIPA, en application de la loi n°2015-052 du 03 février 2016 relative à l'Urbanisme et à l'Habitat</em> ;</p>
         
          <p>Vu le rapport de descente n°${descenteData.reference || 'DS-XXX'} en date du ${formatDate(descenteData.date_descente || '')} effectué par l'équipe composée des Polices de l'Aménagement du Territoire/Brigade Spéciale ;</p>
         
          <p>Vu le certificat de situation juridique de la propriété dite ${selectedFt.nom_propriete || 'NON SPECIFIE'} sise à ${descenteData.commune || ''} en date du ${formatDate(selectedFt.created_at)} ;</p>
         
          <p>Vu le plan officiel ;</p>
         
          <p>Par la présente,</p>
         
          <p>Nous vous informons que le montant de <strong>${formData.montant_lettre}</strong> (<strong>${formatNumber(formData.montant)} Ar</strong>), dont les détails se trouvent au verso de ce document, est dû à l'Autorité pour la Protection contre les Inondations de la Plaine d'Antananarivo (APIPA) à titre <u>d'<strong>${formData.zone_type === 'inconstructible' ? 'AMENDE' : 'AMENDE/REDEVANCE'}</strong></u> relative aux travaux de remblai et/ou de déblai illicites effectués sur votre propriété correspondant aux coordonnées « X = ${descenteData.x_coord || 'N/A'} et Y = ${descenteData.y_coord || 'N/A'}»</p>
         
          <p>Vous êtes contraint de règlement de ce montant dans les quinzaines (15 jours) à compter de la réception de la présente par le moyen <em>d'un chèque de banque dûment légalisé par l'établissement bancaire auquel vous êtes affilié, et adressé à l'ordre de « Monsieur l'Agent Comptable de l'Autorité pour la Protection contre les Inondations de la Plaine d'Antananarivo (APIPA) ».</em></p>
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
   
    // Contenu de la page 2
    page2.innerHTML = `
      <style>${styles}</style>
      <div class="pdf-header"></div>
      <div class="pdf-content">
        <div class="content-block2">
          <p><strong><u>INFORMATIONS FONCIERES</u> :</strong></p>
         
          <p><strong><u>Titre N°:</u></strong> ${selectedFt.titre_terrain || 'N/A'}</p>
         
          <p><strong><u>Coordonnées :</u></strong></p>
          <p>X = ${descenteData.x_coord || 'N/A'}</p>
          <p>Y = ${descenteData.y_coord || 'N/A'}</p>
         
          <p><strong><u>Localisation :</u></strong> ${descenteData.commune || ''}</p>
        </div>
       
        <div style="padding: 50px; position: relative; top: -50px;">
          <p><strong><u>TABLEAU PORTANT REFERENCE DE CALCUL</u> :</strong></p>
         
          <table class="info-table">
            <tr>
              <th style="width: 20%;">N° Titre</th>
              <th style="width: 20%;">Destination</th>
              <th style="width: 20%;">Superficie</th>
              <th style="width: 20%;">Valeur de l'amande/redevance par unité</th>
              <th style="width: 20%;">Montant</th>
            </tr>
            <tr>
              <td>${selectedFt.titre_terrain || 'N/A'}</td>
              <td>${formData.destination}</td>
              <td>${formatNumber(formData.superficie_remblai)} m²</td>
              <td>${formatNumber(formData.valeur_unitaire)} Ar</td>
              <td>${formatNumber(formData.montant)} Ar</td>
            </tr>
          </table>
         
          <p>Le montant total à payer s'élève à ${formData.montant_lettre}.</p>
        </div>
       
        <table class="signature-section" style="position: relative; top: -30px;">
          <tr>
            <td style="width: 50%;"></td>
            <td style="width: 50%; text-align: right;">
              Antananarivo, le ${formatDate(formData.date_ap)}<br><br>
              <em>Le Directeur Général,</em><br><br><br>
              <strong>_________________________</strong>
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
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
   
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
   
    // Capturer et ajouter la première page
    const canvas1 = await html2canvas(page1, {
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
    const canvas2 = await html2canvas(page2, {
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
    pdf.save(`Avis_Paiement_AP_${formData.num_ap}.pdf`);
    customToast.success('PDF généré et téléchargé avec succès!');
   
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    customToast.error(`Erreur lors de la génération du PDF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  } finally {
    // Nettoyer le div temporaire
    if (pdfContent && pdfContent.parentNode) {
      pdfContent.parentNode.removeChild(pdfContent);
    }
    setGeneratingPDF(false);
  }
};
  // ==================== GESTION DE LA CARTE ====================
  const initializeMap = () => {
    if (!mapContainerRef.current || mapRef.current) return;
    try {
      mapRef.current = L.map(mapContainerRef.current).setView([-18.8792, 47.5079], 15);
      const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      });
      const satellite = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        attribution: 'Imagery © <a href="https://maps.google.com">Google Maps</a>',
        maxZoom: 19
      });
      satellite.addTo(mapRef.current);
      L.control.layers({
        "Vue standard 🗺️": osm,
        "Vue satellite 🌍": satellite
      }).addTo(mapRef.current);
      updateMapWithDescenteData();
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la carte:', error);
    }
  };
  const updateMapWithDescenteData = () => {
    if (!mapRef.current || !descenteData) return;
   
    try {
      const xCoord = descenteData.x_coord ? parseFloat(descenteData.x_coord) : null;
      const yCoord = descenteData.y_coord ? parseFloat(descenteData.y_coord) : null;
     
      if (xCoord && yCoord) {
        const coords = convertLambertToWGS84(xCoord, yCoord);
       
        if (markerRef.current) {
          mapRef.current.removeLayer(markerRef.current);
        }
       
        markerRef.current = L.marker([coords.lat, coords.lng]);
       
        markerRef.current.bindPopup(`
          <div style="font-family: Arial, sans-serif; padding: 10px;">
            <strong>📍 Localisation du terrain</strong><br/>
            <hr style="margin: 5px 0;"/>
            <strong>Descente:</strong> DS-${descenteData.id}<br/>
            <strong>Localisation:</strong> ${descenteData.commune || ''}, ${descenteData.fokontany || ''}<br/>
            <strong>Superficie:</strong> ${descenteData.superficie || 'Non spécifiée'} m²<br/>
            <hr style="margin: 5px 0;"/>
            <strong>Coordonnées Lambert:</strong><br/>
            X: ${xCoord.toLocaleString()}<br/>
            Y: ${yCoord.toLocaleString()}
          </div>
        `);
       
        markerRef.current.addTo(mapRef.current);
        mapRef.current.setView([coords.lat, coords.lng], 15);
        markerRef.current.openPopup();
       
      } else {
        mapRef.current.setView([-18.8792, 47.5079], 13);
        L.popup()
          .setLatLng([-18.8792, 47.5079])
          .setContent('<div style="padding: 10px;">Aucune coordonnée disponible pour cette descente</div>')
          .openOn(mapRef.current);
      }
     
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la carte:', error);
    }
  };
  const resizeMap = () => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current!.invalidateSize();
      }, 100);
    }
  };
  const centerMapOnLocation = () => {
    if (descenteData && mapRef.current) {
      updateMapWithDescenteData();
    }
  };
  // ==================== USE EFFECTS ====================
  useEffect(() => {
    if (!ft) {
      fetchFTsComplets();
    } else {
      setSelectedFt(ft);
      setFormData(prev => ({
        ...prev,
        idft: ft.id,
        iddescente: ft.iddescente,
        superficie_remblai: ft.superficie_remblai?.toString() || '',
        contact: ft.contact || '',
        motif: ft.conclusion || ft.dossier || ''
      }));
    }
  }, [ft]);
  useEffect(() => {
    if (selectedFt && selectedFt.id) {
      fetchDescenteData(selectedFt.id);
    }
  }, [selectedFt]);
  useEffect(() => {
    if (selectedFt) {
      setFormData(prev => ({
        ...prev,
        idft: selectedFt.id,
        iddescente: selectedFt.iddescente,
        superficie_remblai: selectedFt.superficie_remblai?.toString() || '',
        contact: selectedFt.contact || '',
        motif: selectedFt.conclusion || selectedFt.dossier || ''
      }));
    }
  }, [selectedFt]);
  useEffect(() => {
    if (descenteData && !mapRef.current && mapContainerRef.current) {
      initializeMap();
    }
   
    if (expandedSections.carte && mapRef.current) {
      resizeMap();
    }
  }, [expandedSections.carte, descenteData]);
  useEffect(() => {
    if (descenteData && mapRef.current) {
      updateMapWithDescenteData();
    }
  }, [descenteData]);
  useEffect(() => {
    if (formData.superficie_remblai && parseFloat(formData.superficie_remblai) > 0) {
      calculerValeurs();
    }
  }, [formData.zone_geo, formData.destination, formData.superficie_remblai, formData.zone_type, formData.type_payment]);
  useEffect(() => {
    if (descenteData?.infraction) {
      const zoneType = determineZoneConstructible(descenteData.infraction);
      setFormData(prev => ({
        ...prev,
        zone_type: zoneType
      }));
    }
  }, [descenteData]);
  useEffect(() => {
    const typePaiement = getTypePaiementSelonZone(formData.zone_type);
    setFormData(prev => ({
      ...prev,
      type_payment: typePaiement
    }));
  }, [formData.zone_type]);
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);
  // ==================== FONCTIONS D'API ====================
  const fetchFTsComplets = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/api/ft?statut_dossier=Complet&limit=50');
      const result = await response.json();
     
      if (result.success) {
        setFts(result.data || []);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };
  const fetchDescenteData = async (ftId: number) => {
    try {
      setLoadingDescente(true);
     
      const response = await fetch(`http://localhost:3000/api/ft/${ftId}/with-descente`);
     
      if (!response.ok) {
        throw new Error(`Erreur ${response.status} lors de la récupération des données`);
      }
      const result = await response.json();
     
      if (result.success && result.data) {
        const ftData = result.data;
       
        const descenteInfo: Descente = {
          id: ftData.iddescente,
          reference: `DS-${ftData.iddescente}`,
          date_descente: ftData.date_descente || ftData.date_ft,
          heure_descente: ftData.heure_descente || ftData.heure_ft,
          nom_personne_r: ftData.nom_personne_r || ftData.nom_convoquee || '',
          commune: ftData.commune || '',
          fokontany: ftData.fokontany || '',
          district: ftData.district || '',
          adresse_r: ftData.adresse || ftData.adresse_r || '',
          contact_r: ftData.contact || ftData.contact_r || '',
          x_coord: ftData.x_coord,
          y_coord: ftData.y_coord,
          infraction: ftData.infraction,
          actions: ftData.actions,
          dossier_a_fournir: ftData.dossier_a_fournir || ftData.descente_dossier_a_fournir || '',
          superficie: ftData.superficie || ftData.superficie_remblai?.toString() || '',
          localisation: ftData.localisation,
          nom_verbalisateur: ftData.nom_verbalisateur,
          type_verbalisateur: ftData.type_verbalisateur,
          statut_descente: ftData.statut_descente
        };
       
        setDescenteData(descenteInfo);
      } else {
        throw new Error(result.message || 'Données non disponibles');
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement de la descente:', error);
     
      if (selectedFt) {
        setDescenteData({
          id: selectedFt.iddescente,
          reference: `DS-${selectedFt.iddescente}`,
          date_descente: selectedFt.date_ft,
          heure_descente: selectedFt.heure_ft,
          nom_personne_r: selectedFt.nom_personne_r || selectedFt.nom_convoquee || '',
          commune: selectedFt.commune || '',
          fokontany: selectedFt.fokontany || '',
          adresse_r: selectedFt.adresse || '',
          contact_r: selectedFt.contact || ''
        });
      }
    } finally {
      setLoadingDescente(false);
    }
  };
  // ==================== GESTION DES ÉVÉNEMENTS ====================
  const handleSelectFt = (ft: FT) => {
    setSelectedFt(ft);
    setShowFtSelection(false);
    setFormData(prev => ({
      ...prev,
      idft: ft.id,
      iddescente: ft.iddescente,
      superficie_remblai: ft.superficie_remblai?.toString() || '',
      contact: ft.contact || '',
      motif: ft.conclusion || ft.dossier || ''
    }));
  };
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Validate single field
    validateField(name, value);
  };
  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    validateField(name, value);
  };
  const validateField = (name: string, value: string) => {
    let error = '';
    switch (name) {
      case 'superficie_remblai':
        if (!value || parseFloat(value) <= 0) error = 'Superficie requise et positive';
        break;
      case 'date_ap':
        if (!value) error = 'Date requise';
        break;
      case 'contact':
        if (!value) error = 'Contact requis';
        break;
      case 'montant':
        if (!value || parseFloat(value) <= 0) error = 'Montant invalide';
        break;
    }
    setErrors(prev => {
      if (error) {
        return { ...prev, [name]: error };
      } else {
        const { [name]: _, ...rest } = prev;
        return rest;
      }
    });
  };
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.superficie_remblai || parseFloat(formData.superficie_remblai) <= 0) newErrors.superficie_remblai = 'Superficie requise et positive';
    if (!formData.date_ap) newErrors.date_ap = 'Date requise';
    if (!formData.contact) newErrors.contact = 'Contact requis';
    if (!formData.montant || parseFloat(formData.montant) <= 0) newErrors.montant = 'Montant invalide';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const formatDateTime = (dateString?: string, timeString?: string) => {
    if (!dateString) return 'Non spécifié';
    try {
      const date = new Date(dateString);
      const timePart = timeString ? ` à ${timeString.substring(0, 5)}` : '';
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }) + timePart;
    } catch {
      return dateString;
    }
  };
  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  };
  const formatMontant = (montant: string) => {
    const num = parseFloat(montant);
    return isNaN(num) ? '0 Ar' : num.toLocaleString('fr-FR') + ' Ar';
  };
  const formatSuperficie = (superficie: string) => {
    const num = parseFloat(superficie);
    return isNaN(num) ? '0 m²' : num.toLocaleString('fr-FR') + ' m²';
  };
  const getLocationText = () => {
    if (!descenteData) return 'Non spécifié';
    const parts = [
      descenteData.adresse_r,
      descenteData.commune,
      descenteData.fokontany,
      descenteData.district
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Non spécifié';
  };
  const getDossierStatusColor = (status: string) => {
    switch (status) {
      case 'Complet':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Incomplet':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };
  // ==================== SOUMISSION DU FORMULAIRE ====================
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
   
    if (!selectedFt) {
      customToast.error('Veuillez sélectionner un FT');
      return;
    }
    if (!validateForm()) {
      customToast.error('Veuillez corriger les erreurs dans le formulaire');
      return;
    }
    setShowConfirmModal(true);
  };
  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setLoading(true);
   
    try {
      const avisData = {
        iddescente: formData.iddescente,
        idft: formData.idft,
        num_ap: formData.num_ap,
        date_ap: formData.date_ap,
        superficie_remblai: parseFloat(formData.superficie_remblai) || null,
        zone_geo: formData.zone_geo,
        pu: formData.pu,
        destination: formData.destination,
        montant: parseFloat(formData.montant) || null,
        montant_lettre: formData.montant_lettre,
        fin_premier_paiement: formData.fin_premier_paiement || null,
        contact: formData.contact || null
      };
     
      const response = await fetch('http://localhost:3000/api/avis-de-paiement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(avisData)
      });
     
      if (!response.ok) {
        let errorMessage = `Erreur HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage += `: ${errorData.message || JSON.stringify(errorData)}`;
        } catch {
          const errorText = await response.text();
          errorMessage += `: ${errorText}`;
        }
        throw new Error(errorMessage);
      }
     
      const result = await response.json();
     
      if (result.success) {
        customToast.success('Avis de paiement créé avec succès !');
       
        // Générer automatiquement le PDF après l'enregistrement réussi
        await generatePDF();
       
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      } else {
        throw new Error(result.message || 'Erreur inconnue');
      }
    } catch (error: any) {
      console.error('❌ Erreur:', error);
      customToast.error(`Erreur lors de la création de l'avis de paiement: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  // ==================== RENDER ====================
  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center z-10">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                <Receipt className="inline-block w-6 h-6 mr-2 text-emerald-600" />
                Créer un Avis de Paiement APIPA
              </h2>
              <p className="text-slate-600 mt-1">
                {selectedFt ? `Pour le FT: ${selectedFt.reference_ft}` : 'Sélectionnez un procès-verbal complet'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedFt && descenteData && (
                <button
                  className="p-2 hover:bg-slate-100 rounded-full"
                  title="Générer PDF"
                  onClick={generatePDF}
                  disabled={generatingPDF || !formData.montant}
                >
                  {generatingPDF ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-600"></div>
                  ) : (
                    <Printer className="w-5 h-5 text-slate-600" />
                  )}
                </button>
              )}
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-full"
                >
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
          <div className="p-6">
            {showFtSelection && !selectedFt && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                  <FileSignature className="w-5 h-5 mr-2 text-blue-600" />
                  Sélectionnez un FT avec dossier complet
                </h2>
               
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <p className="text-slate-600">Chargement des FT...</p>
                    </div>
                  </div>
                ) : fts.length === 0 ? (
                  <div className="text-center p-8">
                    <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600">Aucun FT avec dossier complet disponible</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto p-2">
                    {fts.map((ftItem) => (
                      <div
                        key={ftItem.id}
                        className="border rounded-lg p-4 hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition-colors"
                        onClick={() => handleSelectFt(ftItem)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-semibold text-slate-900">{ftItem.reference_ft}</div>
                            <div className="text-sm text-slate-500">DS-{ftItem.iddescente}</div>
                          </div>
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold">
                            Complet
                          </span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center text-slate-600">
                            <User className="w-3 h-3 mr-1" />
                            {ftItem.nom_convoquee}
                          </div>
                          <div className="flex items-center text-slate-600">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDateTime(ftItem.date_ft, ftItem.heure_ft)}
                          </div>
                          <div className="flex items-center text-slate-600">
                            <MapPin className="w-3 h-3 mr-1" />
                            {ftItem.adresse || 'Adresse non spécifiée'}
                          </div>
                          {ftItem.superficie_remblai && (
                            <div className="flex items-center text-slate-600">
                              <Calculator className="w-3 h-3 mr-1" />
                              Superficie: {ftItem.superficie_remblai.toLocaleString('fr-FR')} m²
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {selectedFt && (
              <>
                <div className="mb-6">
                  <div
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg cursor-pointer"
                    onClick={() => toggleSection('ft')}
                  >
                    <div className="flex items-center gap-3">
                      <FileSignature className="w-6 h-6 text-blue-600" />
                      <h3 className="text-lg font-semibold text-slate-800">
                        Procès-verbal sélectionné
                      </h3>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {selectedFt.reference_ft}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFt(null);
                        setShowFtSelection(true);
                        setDescenteData(null);
                        setFormData(prev => ({
                          ...prev,
                          idft: 0,
                          iddescente: 0,
                          montant: '',
                          montant_lettre: ''
                        }));
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Changer de FT
                    </button>
                  </div>
                  {expandedSections.ft && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600">Référence FT:</span>
                              <span className="font-medium text-slate-900">{selectedFt.reference_ft}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600">Date et heure:</span>
                              <span className="font-medium">
                                {formatDateTime(selectedFt.date_ft, selectedFt.heure_ft)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600">Personne:</span>
                              <span className="font-medium text-slate-900">{selectedFt.nom_convoquee}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600">Type:</span>
                              <span className="font-medium capitalize">{selectedFt.type_convoquee}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600">CIN:</span>
                              <span className="font-medium">{selectedFt.cin || 'Non spécifié'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600">Adresse:</span>
                              <span className="font-medium text-slate-900">{selectedFt.adresse || 'Non spécifiée'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600">Titre terrain:</span>
                              <span className="font-medium">{selectedFt.titre_terrain || 'Non spécifié'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600">Nom propriétaire:</span>
                              <span className="font-medium">{selectedFt.nom_proprietaire || 'Non spécifié'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600">Superficie remblai:</span>
                              <span className="font-medium text-emerald-600">
                                {selectedFt.superficie_remblai ? `${selectedFt.superficie_remblai.toLocaleString('fr-FR')} m²` : 'Non spécifiée'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600">Contact:</span>
                              <span className="font-medium">{selectedFt.contact || 'Non spécifié'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-6 pt-6 border-t border-slate-200">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">Statut dossier:</span>
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getDossierStatusColor(selectedFt.statut_dossier)}`}>
                            {selectedFt.statut_dossier}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-slate-600">Référence descente:</span>
                          <span className="font-medium">DS-{selectedFt.iddescente}</span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-slate-600">Créé le:</span>
                          <span className="font-medium">{formatDate(selectedFt.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mb-6">
                  <div
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg cursor-pointer"
                    onClick={() => toggleSection('descente')}
                  >
                    <div className="flex items-center gap-3">
                      <Home className="w-6 h-6 text-emerald-600" />
                      <h3 className="text-lg font-semibold text-slate-800">
                        Descente liée
                      </h3>
                      {descenteData && (
                        <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 rounded-full">
                          DS-{descenteData.id}
                        </span>
                      )}
                    </div>
                    {expandedSections.descente ?
                      <ChevronUp className="w-5 h-5 text-slate-600" /> :
                      <ChevronDown className="w-5 h-5 text-slate-600" />
                    }
                  </div>
                  {expandedSections.descente && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                      {loadingDescente ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500 mr-3"></div>
                          <span className="text-slate-600">Chargement des données de la descente...</span>
                        </div>
                      ) : descenteData ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-4">
                              <div className="p-3 bg-white rounded-lg border border-slate-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <Calendar className="w-3 h-3 text-slate-500" />
                                  <span className="text-sm font-medium text-slate-700">Date de la descente</span>
                                </div>
                                <p className="text-slate-900 font-medium">
                                  {formatDateTime(descenteData.date_descente, descenteData.heure_descente)}
                                </p>
                              </div>
                              <div className="p-3 bg-white rounded-lg border border-slate-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <User className="w-3 h-3 text-slate-500" />
                                  <span className="text-sm font-medium text-slate-700">Verbalisateur</span>
                                </div>
                                <p className="text-slate-900 font-medium">
                                  {descenteData.nom_verbalisateur || 'Non spécifié'}
                                  {descenteData.type_verbalisateur && (
                                    <span className="text-sm text-slate-500 block mt-1">
                                      Type: {descenteData.type_verbalisateur}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div className="p-3 bg-white rounded-lg border border-slate-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <Users className="w-3 h-3 text-slate-500" />
                                  <span className="text-sm font-medium text-slate-700">Personne concernée</span>
                                </div>
                                <p className="text-slate-900 font-medium">
                                  {descenteData.nom_personne_r || 'Non spécifié'}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div className="p-3 bg-white rounded-lg border border-slate-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <MapPin className="w-3 h-3 text-slate-500" />
                                  <span className="text-sm font-medium text-slate-700">Localisation</span>
                                </div>
                                <p className="text-slate-900 font-medium">
                                  {getLocationText()}
                                </p>
                                {descenteData.localisation && (
                                  <p className="text-sm text-slate-600 mt-2">
                                    {descenteData.localisation}
                                  </p>
                                )}
                                {(descenteData.x_coord || descenteData.y_coord) && (
                                  <p className="text-xs text-slate-500 mt-1">
                                    Coordonnées Lambert: {descenteData.x_coord || 'N/A'}, {descenteData.y_coord || 'N/A'}
                                  </p>
                                )}
                              </div>
                              <div className="p-3 bg-white rounded-lg border border-slate-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <Phone className="w-3 h-3 text-slate-500" />
                                  <span className="text-sm font-medium text-slate-700">Contact</span>
                                </div>
                                <p className="text-slate-900 font-medium">
                                  {descenteData.contact_r || 'Non spécifié'}
                                </p>
                              </div>
                              {descenteData.superficie && (
                                <div className="p-3 bg-white rounded-lg border border-slate-200">
                                  <span className="text-sm font-medium text-slate-700">Superficie</span>
                                  <p className="text-slate-900 font-medium mt-1">
                                    {descenteData.superficie} m²
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="space-y-4">
                              {descenteData.infraction && (
                                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                                  <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle className="w-4 h-4 text-red-600" />
                                    <span className="text-sm font-medium text-red-700">Infraction constatée</span>
                                  </div>
                                  <p className="text-red-900 font-medium">
                                    {cleanJsonString(descenteData.infraction) || 'Aucune description disponible'}
                                  </p>
                                </div>
                              )}
                              {descenteData.actions && (
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <span className="text-sm font-medium text-blue-700">Actions recommandées</span>
                                  <p className="text-blue-900 font-medium mt-1">
                                    {cleanJsonString(descenteData.actions) || 'Aucune action spécifiée'}
                                  </p>
                                </div>
                              )}
                              {descenteData.dossier_a_fournir && (
                                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                                  <span className="text-sm font-medium text-amber-700">Dossier à fournir</span>
                                  <p className="text-amber-900 font-medium mt-1">
                                    {descenteData.dossier_a_fournir}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                         
                          {descenteData && (
                            <div className="mt-6">
                              <div
                                className="flex items-center justify-between p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg cursor-pointer mb-4"
                                onClick={() => toggleSection('carte')}
                              >
                                <div className="flex items-center gap-3">
                                  <Target className="w-6 h-6 text-violet-600" />
                                  <h3 className="text-lg font-semibold text-slate-800">
                                    Cartographie du terrain
                                  </h3>
                                </div>
                                {expandedSections.carte ?
                                  <ChevronUp className="w-5 h-5 text-slate-600" /> :
                                  <ChevronDown className="w-5 h-5 text-slate-600" />
                                }
                              </div>
                             
                              {expandedSections.carte && (
                                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-slate-50 to-slate-100">
                                    <div className="flex items-center gap-2">
                                      <Target className="w-4 h-4 text-slate-700" />
                                      <span className="text-sm font-medium text-slate-800">
                                        Localisation sur carte satellite
                                      </span>
                                      {descenteData.x_coord && descenteData.y_coord && (
                                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full ml-2">
                                          Coordonnées disponibles
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={centerMapOnLocation}
                                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition flex items-center gap-2 shadow-sm"
                                        disabled={!descenteData.x_coord || !descenteData.y_coord}
                                      >
                                        <Target className="w-3 h-3" />
                                        Recentrer
                                      </button>
                                      <button
                                        type="button"
                                        onClick={resizeMap}
                                        className="px-3 py-1.5 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition flex items-center gap-2"
                                      >
                                        🔄 Rafraîchir
                                      </button>
                                    </div>
                                  </div>
                                 
                                  <div
                                    ref={mapContainerRef}
                                    className="h-[400px] w-full bg-slate-100 relative z-0"
                                  >
                                    {!mapRef.current && (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <div className="text-center">
                                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                                          <p className="text-slate-600">Chargement de la carte...</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                 
                                  <div className="p-4 border-t border-slate-200 bg-slate-50">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                                        <span className="font-medium text-slate-700 block mb-1">Coordonnées Lambert</span>
                                        <div className="font-mono text-sm text-slate-800">
                                          <div>X: <span className="text-blue-600">{descenteData.x_coord || 'N/A'}</span></div>
                                          <div>Y: <span className="text-blue-600">{descenteData.y_coord || 'N/A'}</span></div>
                                        </div>
                                      </div>
                                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                                        <span className="font-medium text-slate-700 block mb-1">Localisation</span>
                                        <p className="text-slate-800">
                                          {descenteData.commune || 'Non spécifiée'}, {descenteData.fokontany || ''}
                                        </p>
                                        {descenteData.district && (
                                          <p className="text-xs text-slate-500 mt-1">District: {descenteData.district}</p>
                                        )}
                                      </div>
                                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                                        <span className="font-medium text-slate-700 block mb-1">Caractéristiques</span>
                                        <p className="text-slate-800">
                                          Superficie: <span className="font-medium">{descenteData.superficie || 'Non spécifiée'} m²</span>
                                        </p>
                                        {descenteData.localisation && (
                                          <p className="text-xs text-slate-500 mt-1 truncate">{descenteData.localisation}</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center p-8">
                          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                          <p className="text-slate-600">Aucune donnée de descente disponible</p>
                          <p className="text-sm text-slate-500 mt-1">
                            La descente associée à ce FT n'a pas été trouvée
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <div
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg cursor-pointer"
                    onClick={() => toggleSection('formulaire')}
                  >
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-6 h-6 text-amber-600" />
                      <h3 className="text-lg font-semibold text-slate-800">
                        Formulaire Avis de Paiement
                      </h3>
                      {Object.keys(errors).length > 0 && (
                        <span className="ml-2 bg-red-500 text-white text-xs font-medium inline-flex items-center px-2.5 py-0.5 rounded">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {Object.keys(errors).length}
                        </span>
                      )}
                    </div>
                    {expandedSections.formulaire ?
                      <ChevronUp className="w-5 h-5 text-slate-600" /> :
                      <ChevronDown className="w-5 h-5 text-slate-600" />
                    }
                  </div>
                  {expandedSections.formulaire && (
                    <form onSubmit={handleSubmit} className="mt-4 space-y-6">
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                          <Calculator className="w-5 h-5 mr-2" />
                          Calcul automatique du montant APIPA
                        </h4>
                       
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Type de Zone *
                            </label>
                            <div className="flex flex-col space-y-2">
                              <label className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  name="zone_type"
                                  value="constructible"
                                  checked={formData.zone_type === 'constructible'}
                                  onChange={handleRadioChange}
                                  className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm">Constructible</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  name="zone_type"
                                  value="inconstructible"
                                  checked={formData.zone_type === 'inconstructible'}
                                  onChange={handleRadioChange}
                                  className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm">Inconstructible</span>
                              </label>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              {descenteData?.infraction ?
                                `Détecté depuis l'infraction: ${extractInfractionText(descenteData.infraction).substring(0, 50)}...` :
                                'Sélectionnez manuellement'}
                            </p>
                          </div>
                         
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Zone Géographique *
                            </label>
                            <div className="flex flex-col space-y-2">
                              <label className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  name="zone_geo"
                                  value="CUA"
                                  checked={formData.zone_geo === 'CUA'}
                                  onChange={handleRadioChange}
                                  className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm">CUA</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  name="zone_geo"
                                  value="peripherie"
                                  checked={formData.zone_geo === 'peripherie'}
                                  onChange={handleRadioChange}
                                  className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm">Périphérie</span>
                              </label>
                            </div>
                          </div>
                         
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Destination *
                            </label>
                            <select
                              name="destination"
                              value={formData.destination}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                              required
                            >
                              <option value="HABITATION">HABITATION</option>
                              <option value="INDUSTRIEL">INDUSTRIEL</option>
                              <option value="COMMERCIAL">COMMERCIAL</option>
                            </select>
                          </div>
                         
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              PU (Plan d'Urbanisme)
                            </label>
                            <select
                              name="pu"
                              value={formData.pu}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            >
                              <option value="PU1">PU1</option>
                              <option value="PU2">PU2</option>
                              <option value="PU3">PU3</option>
                              <option value="PU4">PU4</option>
                              <option value="autre">Autre</option>
                            </select>
                          </div>
                        </div>
                       
                        <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                          <div className="text-sm text-slate-600 mb-2">Détails du calcul:</div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="p-2 bg-slate-50 rounded">
                              <div className="text-slate-500">Redevance unitaire:</div>
                              <div className="font-bold text-blue-700">${formatNumber(calculDetails.redevance)} Ar/m²</div>
                            </div>
                            <div className="p-2 bg-slate-50 rounded">
                              <div className="text-slate-500">Amende unitaire:</div>
                              <div className="font-bold text-red-700">${formatNumber(calculDetails.amende)} Ar/m²</div>
                            </div>
                            <div className="p-2 bg-blue-50 rounded">
                              <div className="text-slate-700">Valeur unitaire totale:</div>
                              <div className="font-bold text-green-700">${formatNumber(formData.valeur_unitaire)} Ar/m²</div>
                            </div>
                          </div>
                         
                          {formData.zone_type === 'constructible' && (
                            <div className="mt-3 text-sm text-slate-600 p-2 bg-green-50 rounded">
                              <span className="font-medium">Type de calcul:</span> Zone constructible = Amende (${formatNumber(calculDetails.amende)} Ar) + Redevance (${formatNumber(calculDetails.redevance)} Ar) = Total (${formatNumber(calculDetails.total)} Ar) par m²
                            </div>
                          )}
                          {formData.zone_type === 'inconstructible' && (
                            <div className="mt-3 text-sm text-slate-600 p-2 bg-red-50 rounded">
                              <span className="font-medium">Type de calcul:</span> Zone inconstructible = Amende seulement (${formatNumber(calculDetails.amende)} Ar) par m² (Pas de redevance)
                            </div>
                          )}
                        </div>
                       
                        <div className="mt-4 bg-white p-4 rounded-lg border border-blue-200 shadow-sm">
                          <div className="flex justify-between items-center mb-2">
                            <div className="text-sm text-slate-700">
                              Superficie × Valeur unitaire
                            </div>
                            <div className="text-sm font-medium text-slate-600">
                              ${formatNumber(formData.superficie_remblai)} m² × ${formatNumber(formData.valeur_unitaire)} Ar
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t">
                            <div className="text-lg font-bold text-blue-700">
                              Montant total calculé
                            </div>
                            <div className="text-2xl font-bold text-blue-700">
                              ${formatNumber(formData.montant_total)} Ar
                            </div>
                          </div>
                        </div>
                      </div>
                     
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            <Receipt className="inline-block w-4 h-4 mr-1" />
                            N° AP *
                          </label>
                          <input
                            type="text"
                            name="num_ap"
                            value={formData.num_ap}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-slate-50"
                            required
                            readOnly
                          />
                        </div>
                       
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            <Calendar className="inline-block w-4 h-4 mr-1" />
                            Date AP *
                          </label>
                          <input
                            type="date"
                            name="date_ap"
                            value={formData.date_ap}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            required
                          />
                          {errors.date_ap && <p className="text-red-500 text-xs mt-1">{errors.date_ap}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            <Calculator className="inline-block w-4 h-4 mr-1" />
                            Superficie Remblai (m²) *
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              name="superficie_remblai"
                              value={formData.superficie_remblai}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                              min="0"
                              step="0.01"
                              required
                            />
                          </div>
                          {errors.superficie_remblai && <p className="text-red-500 text-xs mt-1">{errors.superficie_remblai}</p>}
                          {formData.superficie_remblai && (
                            <div className="text-sm text-slate-600 mt-1">
                              ${formatSuperficie(formData.superficie_remblai)}
                            </div>
                          )}
                        </div>
                       
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Motif (pour information seulement)
                          </label>
                          <input
                            type="text"
                            name="motif"
                            value={formData.motif}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            placeholder="Motif du paiement"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            <Calculator className="inline-block w-4 h-4 mr-1" />
                            Montant calculé (Ar) *
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">Ar</span>
                            <input
                              type="number"
                              name="montant"
                              value={formData.montant}
                              onChange={handleInputChange}
                              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-slate-50"
                              required
                              min="0"
                              step="0.01"
                              readOnly
                            />
                          </div>
                          {errors.montant && <p className="text-red-500 text-xs mt-1">{errors.montant}</p>}
                          {formData.montant && (
                            <div className="text-sm text-slate-600 mt-1">
                              ${formatMontant(formData.montant)}
                            </div>
                          )}
                        </div>
                       
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Montant en lettres *
                          </label>
                          <textarea
                            name="montant_lettre"
                            value={formData.montant_lettre}
                            onChange={handleInputChange}
                            rows={2}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-slate-50"
                            required
                            readOnly
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Fin premier paiement
                          </label>
                          <input
                            type="date"
                            name="fin_premier_paiement"
                            value={formData.fin_premier_paiement}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          />
                        </div>
                       
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Contact *
                          </label>
                          <input
                            type="text"
                            name="contact"
                            value={formData.contact}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            required
                          />
                          {errors.contact && <p className="text-red-500 text-xs mt-1">{errors.contact}</p>}
                        </div>
                      </div>
                     
                      <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={generatePDF}
                          disabled={generatingPDF || !selectedFt || !descenteData || !formData.montant}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {generatingPDF ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Génération...
                            </>
                          ) : (
                            <>
                              <Printer className="w-4 h-4" />
                              Générer PDF
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
                          disabled={!selectedFt || !formData.montant || parseFloat(formData.montant) <= 0}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save className="w-4 h-4" />
                          Créer et Générer PDF
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
              <h3 className="text-lg font-semibold text-slate-800">Confirmation</h3>
            </div>
            <p className="text-slate-600 mb-4">
              Êtes-vous sûr de vouloir créer cet avis de paiement pour le FT <strong>{selectedFt?.reference_ft}</strong> ?
            </p>
            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <div className="font-medium text-blue-800 mb-1">Détails du calcul:</div>
              <div className="text-sm text-blue-700">
                <div>• Superficie: ${formatNumber(formData.superficie_remblai)} m²</div>
                <div>• Valeur unitaire: ${formatNumber(formData.valeur_unitaire)} Ar</div>
                <div>• Montant total: <strong>${formatNumber(formData.montant)} Ar</strong></div>
                <div className="mt-2 italic">${formData.montant_lettre}</div>
              </div>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Le PDF sera généré et téléchargé automatiquement après l'enregistrement.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmSubmit}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Confirmer et Générer PDF
              </button>
            </div>
          </div>
        </div>
      )}
      <Toaster />
    </>
  );
};
export default FaireAp;