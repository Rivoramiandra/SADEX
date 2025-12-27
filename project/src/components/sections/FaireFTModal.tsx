import React, { useState, useEffect, useRef } from 'react';
import {
  FileSignature, X, FileText, Calendar, MapPin, Users,
  Clock, Phone, Home, AlertTriangle, CheckCircle2,
  User, ChevronDown, ChevronUp, Download, Printer, Mail, Map as MapIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import proj4 from 'proj4';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Définition des systèmes de coordonnées
// Lambert Madagascar (EPSG:29701)
const lambertMadagascar = '+proj=lcc +lat_1=-18.9 +lat_2=-18.9 +lat_0=-18.9 +lon_0=46.43722916666667 +x_0=400000 +y_0=800000 +ellps=intl +towgs84=-189,-242,-91,0,0,0,0 +units=m +no_defs';
// WGS84 (EPSG:4326) - utilisé par Leaflet
const wgs84 = '+proj=longlat +datum=WGS84 +no_defs';

// Fonction de conversion Lambert Madagascar vers WGS84
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

// Interfaces
interface Rendezvous {
  id: number;
  iddescente: number;
  date_descente?: string;
  heure_descente?: string;
  date_rendez_vous: string;
  heure_rendez_vous: string;
  n_pv_pat?: string;
  n_fifafi?: string;
  contact_r?: string;
  infraction?: string;
  actions?: string;
  modele_pv?: string;
  reference?: string;
  statut: string;
  nom_verbalisateur?: string;
  nom_personne_r?: string;
  commune?: string;
  fokontany?: string;
  district?: string;
  created_at?: string;
  updated_at?: string;
}

interface Descente {
  id?: number;
  date_descente?: string;
  heure_descente?: string;
  date_rendez_vous?: string;
  heure_rendez_vous?: string;
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
  infraction?: string;
  actions?: string;
  modele_pv?: string;
  reference?: string;
  dossier_a_fournir?: string;
  statut_descente?: string;
}

interface FtData {
  conclusion: string;
  reference_ft: string;
  date_ft: string;
  heure_ft: string;
  type_convoquee: 'representant' | 'proprietaire' | '';
  nom_convoquee: string;
  cin: string;
  adresse: string;
  contact: string;
  titre_terrain: string;
  nom_propriete: string;
  nom_proprietaire: string;
  superficie_remblai: number | string;
  dossiers_fournis: string[];
  delai_complement: 0 | 8 | 15;
}

interface FaireFTModalProps {
  selectedRendezvous: Rendezvous | null;
  ftData: FtData;
  setFtData: React.Dispatch<React.SetStateAction<FtData>>;
  handleCloseFTModal: () => void;
  onSuccess?: () => void;
}

const FaireFTModal: React.FC<FaireFTModalProps> = ({
  selectedRendezvous,
  ftData,
  setFtData,
  handleCloseFTModal,
  onSuccess
}) => {
  const [descenteData, setDescenteData] = useState<Descente | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    descente: true,
    rendezvous: false,
    formulaire: true,
    carte: false
  });
  const [availableDossiers, setAvailableDossiers] = useState<string[]>([]);
  const [statutDossier, setStatutDossier] = useState<'Complet' | 'Incomplet' | 'Aucun dossier requis'>('Aucun dossier requis');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
 
  // Références pour la carte
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Fonction pour nettoyer les chaînes JSON
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

  // Fonction pour convertir une image en Base64
  const getImageAsBase64 = async (imagePath: string): Promise<string> => {
    try {
      // Construire l'URL complète
      const fullUrl = imagePath.startsWith('http')
        ? imagePath
        : `${window.location.origin}${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`;
     
      const response = await fetch(fullUrl);
     
      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status} pour ${imagePath}`);
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
      // Retourner une image de fallback transparente
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idHJhbnNwYXJlbnQiLz48L3N2Zz4=';
    }
  };

  // Fonction pour préparer les données pour le PDF
  const prepareFTDataForPDF = () => {
    if (!descenteData || !selectedRendezvous) return null;
    
    // Formater la date
    const formatDateFR = (dateString?: string): string => {
      if (!dateString || dateString === 'undefined') {
        return new Date().toLocaleDateString('fr-FR');
      }
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          return new Date().toLocaleDateString('fr-FR');
        }
        return date.toLocaleDateString('fr-FR');
      } catch {
        return new Date().toLocaleDateString('fr-FR');
      }
    };
    
    // Formater l'heure
    const formatTime = (timeString?: string): string => {
      if (!timeString || timeString === 'undefined') {
        return 'heure non spécifiée';
      }
      return timeString.substring(0, 5);
    };
    
    // Obtenir les dossiers manquants
    const getMissingDossiers = (): string[] => {
      if (!descenteData.dossier_a_fournir) return [];
      try {
        const allDossiers = cleanJsonString(descenteData.dossier_a_fournir)
          .split(',')
          .map(d => d.trim())
          .filter(d => d);
        const providedDossiers = ftData.dossiers_fournis || [];
        return allDossiers.filter(d => !providedDossiers.includes(d));
      } catch {
        return [];
      }
    };
    
    // Obtenir le type convoqué en français
    const getTypeConvoqueeFR = (): string => {
      switch (ftData.type_convoquee) {
        case 'representant':
          return 'Représentant';
        case 'proprietaire':
          return 'Propriétaire';
        default:
          return 'Personne convoquée';
      }
    };
    
    // Calculer la date limite
    const calculateDeadline = (): string => {
      if (!ftData.date_ft || ftData.delai_complement === 0) return '';
      try {
        const ftDate = new Date(ftData.date_ft);
        ftDate.setDate(ftDate.getDate() + ftData.delai_complement);
        return ftDate.toISOString();
      } catch {
        return '';
      }
    };
    
    return {
      // Données de base
      currentDate: new Date().toLocaleDateString('fr-FR'),
      nomComplet: ftData.nom_convoquee || descenteData.nom_personne_r || selectedRendezvous.nom_personne_r || 'NOM DESTINATAIRE',
      referenceFT: ftData.reference_ft || `FT-${selectedRendezvous.id}`,
     
      // Données de la descente
      dateDescente: formatDateFR(descenteData.date_descente),
      heureDescente: formatTime(descenteData.heure_descente) || 'heure non spécifiée',
      commune: descenteData.commune || 'COMMUNE NON SPECIFIEE',
      fokontany: descenteData.fokontany || 'FOKONTANY NON SPECIFIE',
      localite: descenteData.localisation || descenteData.adresse_r || 'LOCALITE NON SPECIFIEE',
     
      // Informations du terrain
      titreTerrain: ftData.titre_terrain || 'TITRE TERRAIN NON SPECIFIE',
      nomproprietaire: ftData.nom_proprietaire || ftData.nom_convoquee || descenteData.nom_personne_r || 'PROPRIETAIRE NON SPECIFIE',
      coordX: descenteData.x_coord || 'X',
      coordY: descenteData.y_coord || 'Y',
      superficie: ftData.superficie_remblai || descenteData.superficie ? `${ftData.superficie_remblai || descenteData.superficie} m²` : 'SUPERFICIE NON SPECIFIEE',
     
      // Informations sur l'infraction
      infraction: cleanJsonString(descenteData.infraction) || 'INFRACTION NON SPECIFIEE',
      action: cleanJsonString(descenteData.actions) || 'ACTION NON SPECIFIEE',
     
      // Informations du rendez-vous FT
      formattedDateFT: formatDateFR(ftData.date_ft),
      formattedHeureFT: formatTime(ftData.heure_ft) || 'heure non spécifiée',
      typeConvoquee: getTypeConvoqueeFR(),
      cin: ftData.cin || 'CIN NON SPECIFIE',
      contact: ftData.contact || descenteData.contact_r || selectedRendezvous.contact_r || 'CONTACT NON SPECIFIE',
     
      // Dossiers
      dossierType: ftData.dossiers_fournis || ['Raportan-tsidina', 'Fahazoan-dàlana'],
      missingDossiers: getMissingDossiers(),
      deadline: calculateDeadline(),
     
      // Conclusion
      mesure: ftData.conclusion || 'Fanarahan-dalàna ny lalàna momba ny fananganana tany feno sy ny fanaovana asa fanodinana ary ny fanajana ny fomba fiasa ara-pahefana.',
     
      // Données supplémentaires pour le style complet
      nom_compleet: ftData.nom_convoquee || descenteData.nom_personne_r,
      nom_convoquee: ftData.nom_convoquee,
      nom_personne_r: descenteData.nom_personne_r,
      reference_ft: ftData.reference_ft,
      date_ft: ftData.date_ft,
      heure_ft: ftData.heure_ft,
      type_convoquee: ftData.type_convoquee,
      nom_proprietaire: ftData.nom_proprietaire,
      superficie_remblai: ftData.superficie_remblai,
      dossiers_fournis: ftData.dossiers_fournis,
      missing_dossiers: getMissingDossiers(),
      dossier_a_fournir: descenteData.dossier_a_fournir,
      contact_r: descenteData.contact_r,
      x_coord: descenteData.x_coord,
      y_coord: descenteData.y_coord
    };
  };

  // Fonction pour générer et télécharger le PDF
  const generatePDF = async () => {
    // Déclarer pdfContent en dehors du bloc try pour qu'il soit accessible dans le finally
    let pdfContent: HTMLDivElement | null = null;
    
    if (!descenteData) {
      toast.error('Veuillez d\'abord charger les données de la descente');
      return;
    }
    
    const preparedData = prepareFTDataForPDF();
    if (!preparedData) {
      toast.error('Impossible de préparer les données pour le PDF');
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
      
      // Formater la date limite si elle existe
      const formatDeadlineFR = (deadlineString: string): string => {
        if (!deadlineString) return '';
        try {
          const date = new Date(deadlineString);
          if (isNaN(date.getTime())) return '';
          return date.toLocaleDateString('fr-FR');
        } catch {
          return '';
        }
      };
      
      // Créer un élément div temporaire pour le rendu HTML
      pdfContent = document.createElement('div');
      pdfContent.style.position = 'absolute';
      pdfContent.style.left = '-9999px';
      pdfContent.style.width = '210mm';
      pdfContent.style.minHeight = '297mm';
      pdfContent.style.backgroundColor = 'white';
      pdfContent.style.padding = '0';
      pdfContent.style.boxSizing = 'border-box';
      
      // Appliquer les styles directement
      pdfContent.innerHTML = `
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: 'Times New Roman', serif;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
            background-color: #fff;
          }
         
          .page-container {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            position: relative;
            box-sizing: border-box;
            background-color: white;
            page-break-inside: avoid;
          }
         
          .header-image {
            height: 100px;
            width: 100%;
            background-image: url('${headerImage}');
            background-size: cover;
            background-repeat: no-repeat;
            background-position: center;
            margin-bottom: 5px;
          }
         
          .logo-center {
            height: 80px;
            width: 80%;
            position: relative;
            top: -90px;
            background-image: url('${emblemImage}');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center center;
            margin: 0 auto;
            margin-bottom: -120px;
          }
         
          .content-wrapper {
            padding: 10mm;
            position: relative;
            min-height: calc(297mm - 200px - 250px - 30mm);
          }
         
          .header-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 5px;
            border-bottom: 1px solid #333;
            padding-bottom: 15px;
          }
         
          .left-column {
            flex: 1;
            text-align: center;
          }
         
          .right-column {
            flex: 1;
            text-align: right;
          }
         
          .title-section {
            text-align: center;
            margin: 20px 0;
            font-weight: bold;
            font-size: 14px;
            font-family: Arial, Helvetica, sans-serif;
          }
         
          .info-section {
            font-family: Arial, Helvetica, sans-serif;
            margin: 10px 0 20px 0;
            padding: 0;
          }
         
          .separator {
            border-top: 1px solid #000;
            margin: 10px 0;
            width: 100%;
          }
         
          .content {
            text-align: justify;
          }
         
          .paragraph {
            margin-bottom: 15px;
            text-indent: 20px;
          }
         
          .document-list {
            margin-left: 25px;
            margin-bottom: 10px;
          }
         
          .document-list li {
            margin-bottom: 3px;
          }
         
          .signature-section {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
         
          .signature-box {
            border-top: 1px solid #000;
            width: 250px;
            padding-top: 5px;
          }
         
          .signature-text {
            text-align: center;
            font-style: italic;
          }
         
          .footer-image {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 100px;
            background-image: url('${footerImage}');
            background-size: cover;
            background-position: center;
          }
         
          .bold {
            font-weight: bold;
          }
         
          .italic {
            font-style: italic;
          }
         
          .underline {
            text-decoration: underline;
          }
        </style>
        <div class="page-container">
          <!-- En-tête avec image -->
          <div class="header-image"></div>
         
          <!-- Logo central -->
          <div class="logo-center"></div>
          <!-- Contenu du document -->
          <div class="content-wrapper">
            <!-- En-tête avec trois colonnes -->
            <div class="header-section">
              <div class="left-column">
                <div class="bold" style="margin-bottom: 2px;">MINISITERAN'NY FITSINJIRAM-PAHEFANA</div>
                <div class="bold" style="margin-bottom: 2px;">SY NY FANAJARIANA NY TANY</div>
                <div style="margin-bottom: 5px;">-------------------</div>
                <div class="italic" style="margin-bottom: 2px;">DIRECTION GENERALE</div>
                <div class="italic" style="margin-bottom: 2px;">NY FAHEFANA MIKAROKA NY FIAROVANA NY LEMAKA</div>
                <div class="italic" style="margin-bottom: 2px;">ANTANANARIVO AMIN'NY TONDRA-DRANO (APIPA)</div>
              </div>
             
              <div class="right-column">
                <div style="margin-bottom: 3px;">Antananarivo, ny ${preparedData.currentDate}</div>
                <div style="margin-bottom: 3px;">Ny Tale Jeneraly</div>
                <div style="margin-bottom: 3px;">Ho an'ny</div>
                <div class="bold">Monsieur ${preparedData.nomComplet}</div>
              </div>
            </div>
           
            <!-- Numéro d'avis -->
            <div class="title-section">
              Fitanana an-Tsoratra faha <span class="underline">${preparedData.referenceFT}</span>
            </div>
           
            <!-- Informations de titre -->
            <div class="info-section">
              <div style="font-weight: 600; margin-bottom: 3px;">
                Antony: <span style="font-weight: 100;">Fitaterana rano-tany</span>
              </div>
              <div style="font-weight: 600; margin-bottom: 3px;">
                Daty: <span style="font-weight: 100;">${preparedData.dateDescente}</span>
              </div>
              <div style="font-weight: 600; margin-bottom: 3px;">
                Toerana: <span style="font-weight: 100;">Biraon'ny APIPA Anosizato Antsinanana</span>
              </div>
              <div style="font-weight: 600; margin-bottom: 10px;">
                Tanjona: <span style="font-weight: 100;">Fampanarahandalana</span>
              </div>
              <div class="separator"></div>
            </div>
           
            <!-- Corps du document -->
            <div class="content">
              <!-- Premier paragraphe -->
              <div class="paragraph">
                Araka ny fepetra ao amin'ny <span class="italic">Dekri governemantaly n°2019-1543 ny 11 Septambra 2019</span>
                momba ny fandaminana ny asa fananganana tany feno ao amin'ireo faritra fehezin'ny APIPA,
                ary mampiasa ny <span class="italic">lalàna n°2015-052 ny 03 Febroary 2016</span> mikasika ny Fandrindrana ny Tanibe sy ny Fonènana ;
              </div>
             
              <!-- Deuxième paragraphe -->
              <div class="paragraph">
                Arak'ireo baiko nomen'ny Tale Jeneralin'ny APIPA, nisy fitsidina teo amin'ny toerana natao
                tamin'ny <span class="bold">${preparedData.dateDescente}</span> amin'ny <span class="bold">${preparedData.heureDescente}</span>,
                teo amin'ny <span class="bold">${preparedData.commune}</span>, Fokontany <span class="bold">${preparedData.fokontany}</span>,
                Toerana <span class="bold">${preparedData.localite}</span>. Ny tany voamarika amin'ny laharana
                <span class="bold"> ${preparedData.titreTerrain}</span>, an'ny
                <span class="bold"> ${preparedData.nomproprietaire}</span>,
                amin'ny koordinà <span class="bold">${preparedData.coordX}</span> ; <span class="bold">${preparedData.coordY}</span>
                velarana <span class="bold">${preparedData.superficie}</span>.
              </div>
             
              <!-- Troisième paragraphe -->
              <div class="paragraph">
                Hita fa misy <span class="bold">${preparedData.infraction}</span> eo amin'io tany io,
                izay niteraka ny fandraiketana ny <span class="bold">${preparedData.action}</span>.
              </div>
             
              <!-- Quatrième paragraphe -->
              <div class="paragraph">
                Antsoina ianao hankany amin'ny biraon'ny APIPA ny <span class="bold">${preparedData.formattedDateFT}</span>
                amin'ny <span class="bold">${preparedData.formattedHeureFT}</span> ho <span class="bold">${preparedData.typeConvoquee}</span>,
                <span class="bold"> ${preparedData.nomComplet}</span>, manana CIN n°
                <span class="bold"> ${preparedData.cin}</span>, azo antsoina amin'ny <span class="bold">${preparedData.contact}</span>.
              </div>
             
              <!-- Documents apportés -->
              <div style="margin-bottom: 15px;">
                <div class="bold" style="margin-bottom: 5px;">Taratasy naterina :</div>
                <ul class="document-list">
                  ${preparedData.dossierType && preparedData.dossierType.length > 0
                    ? preparedData.dossierType.map(doc => `<li>— ${doc}</li>`).join('')
                    : '<li>— Tsy misy taratasy nentena</li>'
                  }
                </ul>
              </div>
             
              <!-- Documents manquants -->
              <div style="margin-bottom: 15px;">
                <div class="bold" style="margin-bottom: 5px;">Taratasy tsy ampy tokony hotaterina :</div>
                <ul class="document-list">
                  ${preparedData.missingDossiers && preparedData.missingDossiers.length > 0
                    ? preparedData.missingDossiers.map(doc => `<li>— ${doc}</li>`).join('')
                    : '<li>— Tsy misy taratasy tsy ampy</li>'
                  }
                </ul>
                ${preparedData.deadline ? `
                  <div class="bold" style="margin-top: 10px;">
                    Daty farany fametrahana : <span class="underline">${formatDeadlineFR(preparedData.deadline)}</span>
                  </div>
                ` : ''}
              </div>
             
              <!-- Mesures requises -->
              <div style="margin-bottom: 15px;">
                <div class="bold" style="margin-bottom: 5px;">Fepetra takin'ny APIPA :</div>
                <div class="paragraph" style="margin-bottom: 10px;">
                  ${preparedData.mesure}
                </div>
              </div>
             
              <!-- Avertissement -->
              <div class="paragraph">
                Tena ilaina ny manaraka ny fepetra rehetra voalaza etsy ambony. Ny tsy fanarahana, na ampahany aza,
                ho heverina ho tsy fanarahana lalàna ary mety hitarika ny fanenjehana ara-pitsarana avy amin'ny fahefana manan-draharaha.
              </div>
             
              <!-- Conclusion -->
              <div class="paragraph" style="margin-bottom: 20px;">
                Mba hanamafisana ny fahafantarana ity fanambarana ity sy ny fanolorana tena hanaraka ny fepetrin'ny APIPA,
                azafady sonia ity taratasy ity amin'ny dika roa.
              </div>
            </div>
           
            <!-- Sections de signature -->
            <div class="signature-section">
              <div>
                <div class="bold" style="margin-bottom: 20px;">Vakina sy ekena,</div>
                <div class="signature-box">
                  <div class="signature-text">Sonin'ny mpandray</div>
                </div>
              </div>
              <div style="text-align: right;">
                <div class="bold" style="margin-bottom: 5px;">Antananarivo, ny ${preparedData.currentDate}</div>
                <div class="italic" style="margin-bottom: 20px;">Ny Tale Jeneralin'ny APIPA</div>
                <div class="signature-box">
                  <div class="signature-text">Sonia sy tombo-kase</div>
                </div>
              </div>
            </div>
          </div>
         
          <!-- Pied de page avec image -->
          <div class="footer-image"></div>
        </div>
      `;
      
      // Ajouter le div au body pour le rendu
      document.body.appendChild(pdfContent);
      
      // Attendre le rendu complet (images chargées)
      await new Promise(resolve => setTimeout(resolve, 1000)); // Augmenter si nécessaire pour charger les images
      
      // Capturer avec html2canvas
      const canvas = await html2canvas(pdfContent, {
        scale: 2,
        useCORS: true,
        logging: true,
        backgroundColor: '#ffffff',
        windowWidth: 793, // Approx 210mm in pixels at 96dpi
        windowHeight: 1122 // Approx 297mm
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      // Créer le PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      // Télécharger le PDF
      pdf.save(`Fitanana_An-Tsoratra_${preparedData.referenceFT}.pdf`);
      toast.success('PDF téléchargé avec succès!');
      
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      toast.error(`Erreur lors de la génération du PDF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      // Nettoyer le div temporaire
      if (pdfContent && pdfContent.parentNode) {
        pdfContent.parentNode.removeChild(pdfContent);
      }
      setGeneratingPDF(false);
    }
  };

  // Fonction pour vérifier le statut de complétude
  const updateStatutDossier = () => {
    if (availableDossiers.length === 0) {
      setStatutDossier('Aucun dossier requis');
      return;
    }
   
    const tousDossiersCoches = availableDossiers.every(dossier =>
      ftData.dossiers_fournis.includes(dossier)
    );
   
    const auMoinsUnNonCoche = availableDossiers.some(dossier =>
      !ftData.dossiers_fournis.includes(dossier)
    );
    
    if (tousDossiersCoches) {
      setStatutDossier('Complet');
    } else if (auMoinsUnNonCoche) {
      setStatutDossier('Incomplet');
    } else {
      setStatutDossier('Aucun dossier requis');
    }
  };

  // Fonction pour initialiser la carte
  const initializeMap = () => {
    if (!mapContainerRef.current || mapRef.current) return;
    
    try {
      // Initialiser la carte
      mapRef.current = L.map(mapContainerRef.current).setView([-18.8792, 47.5079], 15);
      
      // Ajouter les couches de base
      const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      });
      
      const satellite = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        attribution: 'Imagery © <a href="https://maps.google.com">Google Maps</a>',
        maxZoom: 19
      });
      
      // Ajouter la couche satellite par défaut
      satellite.addTo(mapRef.current);
      
      // Ajouter le contrôle des couches
      L.control.layers({
        "Vue standard 🗺️": osm,
        "Vue satellite 🌍": satellite
      }).addTo(mapRef.current);
      
      // Mettre à jour la carte avec les données de descente
      updateMapWithDescenteData();
      
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la carte:', error);
    }
  };

  // Mettre à jour la carte avec les coordonnées de la descente
  const updateMapWithDescenteData = () => {
    if (!mapRef.current || !descenteData) return;
   
    try {
      // Nettoyer les coordonnées
      const xCoord = descenteData.x_coord ? parseFloat(descenteData.x_coord) : null;
      const yCoord = descenteData.y_coord ? parseFloat(descenteData.y_coord) : null;
     
      if (xCoord && yCoord) {
        // Convertir Lambert en WGS84
        const coords = convertLambertToWGS84(xCoord, yCoord);
       
        // Retirer l'ancien marqueur s'il existe
        if (markerRef.current) {
          mapRef.current.removeLayer(markerRef.current);
        }
       
        // Créer un marqueur à la position convertie
        markerRef.current = L.marker([coords.lat, coords.lng]);
       
        // Ajouter un popup informatif
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
       
        // Ajouter le marqueur à la carte
        markerRef.current.addTo(mapRef.current);
       
        // Centrer la carte sur la nouvelle position
        mapRef.current.setView([coords.lat, coords.lng], 15);
       
        // Ouvrir le popup
        markerRef.current.openPopup();
       
      } else {
        // Afficher un message si pas de coordonnées
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

  // Fonction pour redimensionner la carte
  const resizeMap = () => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current!.invalidateSize();
      }, 100);
    }
  };

  // Récupérer les données de la descente
  useEffect(() => {
    const fetchDescenteData = async () => {
      if (!selectedRendezvous) return;
      
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:3000/api/rendezvousft/${selectedRendezvous.id}/full`);
        
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des données');
        }
        
        const result = await response.json();
        if (result.success && result.data) {
          setDescenteData(result.data.descente || null);
          
          // Pré-remplir les champs
          setFtData(prev => ({
            ...prev,
            date_ft: prev.date_ft || new Date().toISOString().split('T')[0],
            heure_ft: prev.heure_ft || new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}),
            nom_convoquee: result.data.descente?.nom_personne_r || '',
            adresse: result.data.descente?.adresse_r || '',
            contact: result.data.descente?.contact_r || '',
            superficie_remblai: result.data.descente?.superficie || '',
            dossiers_fournis: [],
            delai_complement: 0,
            type_convoquee: '',
            cin: '',
            titre_terrain: '',
            nom_propriete: '',
            nom_proprietaire: '',
            reference_ft: `FT-${selectedRendezvous.id}-${new Date().getFullYear()}`
          }));
         
          // Parse dossiers a fournir
          if (result.data.descente?.dossier_a_fournir) {
            const dossiersStr = cleanJsonString(result.data.descente.dossier_a_fournir);
            const dossiersList = dossiersStr.split(',').map(d => d.trim()).filter(d => d);
            setAvailableDossiers(dossiersList);
          
            if (dossiersList.length === 0) {
              setStatutDossier('Aucun dossier requis');
            } else {
              setStatutDossier('Incomplet');
            }
          } else {
            setAvailableDossiers([]);
            setStatutDossier('Aucun dossier requis');
          }
        }
      } catch (err) {
        console.error('Erreur lors de la récupération des données de la descente:', err);
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDescenteData();
  }, [selectedRendezvous]);

  // Initialiser la carte quand la section s'ouvre
  useEffect(() => {
    if (expandedSections.carte && !mapRef.current && mapContainerRef.current) {
      initializeMap();
    }
   
    // Redimensionner la carte quand elle devient visible
    if (expandedSections.carte && mapRef.current) {
      resizeMap();
    }
  }, [expandedSections.carte]);

  // Mettre à jour la carte quand les données de descente changent
  useEffect(() => {
    if (descenteData && mapRef.current) {
      updateMapWithDescenteData();
    }
  }, [descenteData]);

  // Nettoyage de la carte
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Mettre à jour le statut quand les dossiers cochés changent
  useEffect(() => {
    updateStatutDossier();
  }, [ftData.dossiers_fournis, availableDossiers]);

  // Fonction pour enregistrer le FT
  const handleSubmitFT = async () => {
    if (!selectedRendezvous) {
      setError('Aucun rendez-vous sélectionné');
      return;
    }
   
    if (!ftData.date_ft) {
      setError('La date du FT est obligatoire');
      return;
    }
   
    if (!ftData.reference_ft) {
      setError('La référence FT est obligatoire');
      return;
    }
   
    if (statutDossier === 'Incomplet' && ftData.delai_complement === 0) {
      setError('Pour un dossier incomplet, veuillez spécifier un délai pour le complément de dossier');
      return;
    }
   
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    
    if (!selectedRendezvous) return;
    
    const ftDataToSend = {
      reference_ft: ftData.reference_ft,
      date_ft: ftData.date_ft,
      heure_ft: ftData.heure_ft,
      type_convoquee: ftData.type_convoquee,
      nom_convoquee: ftData.nom_convoquee,
      cin: ftData.cin,
      adresse: ftData.adresse,
      contact: ftData.contact,
      titre_terrain: ftData.titre_terrain,
      nom_propriete: ftData.nom_propriete,
      nom_proprietaire: ftData.nom_proprietaire,
      superficie_remblai: ftData.superficie_remblai,
      dossiers_fournis: ftData.dossiers_fournis,
      conclusion: ftData.conclusion,
      delai_complement: ftData.delai_complement,
      statut: 'Etabli',
      statut_dossier: statutDossier,
      iddescente: selectedRendezvous.iddescente,
      idrendezvous: selectedRendezvous.id
    };
    
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch('http://localhost:3000/api/ft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ftDataToSend)
      });
      
      const result = await response.json();
     
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Erreur lors de l\'enregistrement');
      }
     
      toast.success('Procès-verbal créé avec succès!');
     
      // Générer automatiquement le PDF après l'enregistrement
      await generatePDF();
     
      handleCloseFTModal();
     
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Erreur lors de l\'enregistrement du FT:', err);
      setError(err.message || 'Erreur lors de l\'enregistrement');
      toast.error(`Erreur: ${err.message || 'Erreur lors de l\'enregistrement'}`);
    } finally {
      setSaving(false);
    }
  };

  // Fonction pour générer le PDF manuellement
  const handleGeneratePDF = async () => {
    await generatePDF();
    handleCloseFTModal();
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Non spécifié';
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

  const getTypeFromInfraction = (infraction?: string) => {
    if (!infraction) return 'Inspection';
    const cleanInfraction = cleanJsonString(infraction);
    if (!cleanInfraction || cleanInfraction.trim() === '') return 'Inspection';
    const lowerInfraction = cleanInfraction.toLowerCase();
    if (lowerInfraction.includes('construction')) return 'Construction';
    if (lowerInfraction.includes('réunion')) return 'Réunion';
    if (lowerInfraction.includes('entretien')) return 'Entretien';
    if (lowerInfraction.includes('audit')) return 'Audit';
    if (lowerInfraction.includes('suivi')) return 'Suivi';
    if (lowerInfraction.includes('contrôle')) return 'Contrôle';
    if (lowerInfraction.includes('verification') || lowerInfraction.includes('vérification')) return 'Vérification';
    if (lowerInfraction.includes('remblai') || lowerInfraction.includes('illicite')) return 'Remblai Illícite';
    if (lowerInfraction.includes('inspection')) return 'Inspection';
    if (lowerInfraction.includes('visite')) return 'Visite';
    if (lowerInfraction.includes('surveillance')) return 'Surveillance';
    return cleanInfraction.length > 30 ? cleanInfraction.substring(0, 30) + '...' : cleanInfraction;
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

  const handleDossierChange = (dossier: string) => {
    setFtData(prev => ({
      ...prev,
      dossiers_fournis: prev.dossiers_fournis.includes(dossier)
        ? prev.dossiers_fournis.filter(d => d !== dossier)
        : [...prev.dossiers_fournis, dossier]
    }));
  };

  const calculateDateComplement = () => {
    if (!ftData.date_ft || ftData.delai_complement === 0) return 'Non spécifié';
    const ftDate = new Date(ftData.date_ft);
    ftDate.setDate(ftDate.getDate() + ftData.delai_complement);
    return formatDate(ftDate.toISOString());
  };

  const generateReference = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/ft/generate/reference');
      const result = await response.json();
    
      if (result.success && result.reference) {
        setFtData(prev => ({ ...prev, reference_ft: result.reference }));
      }
    } catch (err) {
      console.error('Erreur lors de la génération de référence:', err);
      const year = new Date().getFullYear();
      const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
      const timestamp = Date.now().toString().slice(-4);
      setFtData(prev => ({ ...prev, reference_ft: `FT-${year}${month}-${timestamp}` }));
    }
  };

  // Fonction pour centrer la carte sur la localisation
  const centerMapOnLocation = () => {
    if (descenteData && mapRef.current) {
      updateMapWithDescenteData();
    }
  };

  // Gérer la sélection du type convoquée
  const handleTypeConvoqueeChange = (value: 'representant' | 'proprietaire' | '') => {
    setFtData(prev => ({ ...prev, type_convoquee: value }));
  };

  if (!selectedRendezvous) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
          {/* En-tête du modal */}
          <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center z-10">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                <FileSignature className="inline-block w-6 h-6 mr-2 text-green-600" />
                Procès-verbal (Fitanana an-Tsoratra)
              </h2>
              <p className="text-slate-600 mt-1">
                Rendez-vous RDV-{selectedRendezvous.id} - DS-{selectedRendezvous.iddescente}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="p-2 hover:bg-slate-100 rounded-full"
                title="Générer référence"
                onClick={generateReference}
                disabled={saving || generatingPDF}
              >
                <FileText className="w-5 h-5 text-slate-600" />
              </button>
              <button
                className="p-2 hover:bg-slate-100 rounded-full"
                title="Générer PDF"
                onClick={handleGeneratePDF}
                disabled={saving || generatingPDF || !descenteData}
              >
                {generatingPDF ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-600"></div>
                ) : (
                  <Printer className="w-5 h-5 text-slate-600" />
                )}
              </button>
              <button 
                className="p-2 hover:bg-slate-100 rounded-full" 
                title="Exporter" 
                disabled={saving || generatingPDF || !descenteData}
                onClick={handleGeneratePDF}
              >
                <Download className="w-5 h-5 text-slate-600" />
              </button>
              <button className="p-2 hover:bg-slate-100 rounded-full" title="Envoyer par email" disabled={saving || generatingPDF}>
                <Mail className="w-5 h-5 text-slate-600" />
              </button>
              <button
                onClick={handleCloseFTModal}
                className="p-2 hover:bg-slate-100 rounded-full"
                disabled={saving || generatingPDF}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          {/* Message d'erreur */}
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="text-red-700 font-medium">{error}</span>
              </div>
            </div>
          )}
          
          {/* Contenu du modal */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                  <p className="text-slate-600">Chargement des données de la descente...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Section 1: Informations de la descente */}
                <div className="mb-6">
                  <div
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg cursor-pointer"
                    onClick={() => toggleSection('descente')}
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="w-6 h-6 text-blue-600" />
                      <h3 className="text-lg font-semibold text-slate-800">
                        Données de la Descente
                      </h3>
                      {descenteData && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
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
                      {descenteData ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Colonne 1: Informations de base */}
                            <div className="space-y-4">
                              <div className="p-3 bg-white rounded-lg border border-slate-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <Calendar className="w-4 h-4 text-slate-500" />
                                  <span className="text-sm font-medium text-slate-700">Date de la descente</span>
                                </div>
                                <p className="text-slate-900 font-medium">
                                  {formatDateTime(descenteData.date_descente, descenteData.heure_descente)}
                                </p>
                              </div>
                              <div className="p-3 bg-white rounded-lg border border-slate-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <User className="w-4 h-4 text-slate-500" />
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
                                  <Users className="w-4 h-4 text-slate-500" />
                                  <span className="text-sm font-medium text-slate-700">Personne concernée</span>
                                </div>
                                <p className="text-slate-900 font-medium">
                                  {descenteData.nom_personne_r || 'Non spécifié'}
                                  {descenteData.personne_r && (
                                    <span className="text-sm text-slate-500 block mt-1">
                                      {descenteData.personne_r}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                            {/* Colonne 2: Localisation et contact */}
                            <div className="space-y-4">
                              <div className="p-3 bg-white rounded-lg border border-slate-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <MapPin className="w-4 h-4 text-slate-500" />
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
                                  <Phone className="w-4 h-4 text-slate-500" />
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
                            {/* Colonne 3: Infractions et détails */}
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
                              {descenteData.statut_descente && (
                                <div className="p-3 bg-slate-100 rounded-lg border border-slate-300">
                                  <span className="text-sm font-medium text-slate-700">Statut de la descente</span>
                                  <p className="text-slate-900 font-medium mt-1">
                                    {descenteData.statut_descente}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                         
                          {/* Section Cartographie */}
                          {descenteData && (
                            <div className="mt-6">
                              <div
                                className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg cursor-pointer mb-4"
                                onClick={() => toggleSection('carte')}
                              >
                                <div className="flex items-center gap-3">
                                  <MapIcon className="w-6 h-6 text-emerald-600" />
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
                                      <MapIcon className="w-4 h-4 text-slate-700" />
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
                                        <MapIcon className="w-3 h-3" />
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
                                 
                                  {/* Informations de coordonnées */}
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
                            La descente associée à ce rendez-vous n'a pas été trouvée
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {/* Section 2: Informations du rendez-vous */}
                <div className="mb-6">
                  <div
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg cursor-pointer"
                    onClick={() => toggleSection('rendezvous')}
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-6 h-6 text-green-600" />
                      <h3 className="text-lg font-semibold text-slate-800">
                        Informations du Rendez-vous
                      </h3>
                    </div>
                    {expandedSections.rendezvous ?
                      <ChevronUp className="w-5 h-5 text-slate-600" /> :
                      <ChevronDown className="w-5 h-5 text-slate-600" />
                    }
                  </div>
                  {expandedSections.rendezvous && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600">Date du rendez-vous:</span>
                            <span className="font-medium text-slate-900">
                              {formatDateTime(selectedRendezvous.date_rendez_vous, selectedRendezvous.heure_rendez_vous)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600">Statut:</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              selectedRendezvous.statut.toLowerCase() === 'en cours' ? 'bg-blue-100 text-blue-800' :
                              selectedRendezvous.statut.toLowerCase() === 'en attente' ? 'bg-yellow-100 text-yellow-800' :
                              selectedRendezvous.statut.toLowerCase() === 'fini' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {selectedRendezvous.statut}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600">Type d'intervention:</span>
                            <span className="font-medium text-slate-900">
                              {getTypeFromInfraction(selectedRendezvous.infraction)}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {selectedRendezvous.n_pv_pat && (
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600">N° PV PAT:</span>
                              <span className="font-medium text-slate-900">{selectedRendezvous.n_pv_pat}</span>
                            </div>
                          )}
                          {selectedRendezvous.n_fifafi && (
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600">N° FIFAFI:</span>
                              <span className="font-medium text-slate-900">{selectedRendezvous.n_fifafi}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600">Créé le:</span>
                            <span className="font-medium text-slate-900">
                              {selectedRendezvous.created_at ? formatDate(selectedRendezvous.created_at) : 'Non spécifié'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {/* Section 3: Formulaire du procès-verbal */}
                <div>
                  <div
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg cursor-pointer"
                    onClick={() => toggleSection('formulaire')}
                  >
                    <div className="flex items-center gap-3">
                      <FileSignature className="w-6 h-6 text-emerald-600" />
                      <h3 className="text-lg font-semibold text-slate-800">
                        Formulaire du Procès-Verbal
                      </h3>
                    </div>
                    {expandedSections.formulaire ?
                      <ChevronUp className="w-5 h-5 text-slate-600" /> :
                      <ChevronDown className="w-5 h-5 text-slate-600" />
                    }
                  </div>
                  {expandedSections.formulaire && (
                    <div className="mt-4 space-y-6">
                      {/* Informations générales FT */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Référence FT *
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                              value={ftData.reference_ft}
                              onChange={(e) => setFtData(prev => ({ ...prev, reference_ft: e.target.value }))}
                              disabled={saving || generatingPDF}
                            />
                            <button
                              type="button"
                              onClick={generateReference}
                              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm"
                              disabled={saving || generatingPDF}
                            >
                              Générer
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Date FT *
                          </label>
                          <input
                            type="date"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            value={ftData.date_ft}
                            onChange={(e) => setFtData(prev => ({ ...prev, date_ft: e.target.value }))}
                            disabled={saving || generatingPDF}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Heure FT
                          </label>
                          <input
                            type="time"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            value={ftData.heure_ft}
                            onChange={(e) => setFtData(prev => ({ ...prev, heure_ft: e.target.value }))}
                            disabled={saving || generatingPDF}
                          />
                        </div>
                      </div>
                      {/* Informations du convoqué */}
                      <h4 className="text-md font-semibold text-slate-800 mt-6 mb-4">Informations du Convoqué</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Type convoquée
                          </label>
                          <select
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            value={ftData.type_convoquee}
                            onChange={(e) => handleTypeConvoqueeChange(e.target.value as 'representant' | 'proprietaire' | '')}
                            disabled={saving || generatingPDF}
                          >
                            <option value="">Sélectionner</option>
                            <option value="representant">Représentant</option>
                            <option value="proprietaire">Propriétaire</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Nom convoquée
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            value={ftData.nom_convoquee}
                            onChange={(e) => setFtData(prev => ({ ...prev, nom_convoquee: e.target.value }))}
                            disabled={saving || generatingPDF}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            CIN
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            value={ftData.cin}
                            onChange={(e) => setFtData(prev => ({ ...prev, cin: e.target.value }))}
                            disabled={saving || generatingPDF}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Adresse
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            value={ftData.adresse}
                            onChange={(e) => setFtData(prev => ({ ...prev, adresse: e.target.value }))}
                            disabled={saving || generatingPDF}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Contact
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            value={ftData.contact}
                            onChange={(e) => setFtData(prev => ({ ...prev, contact: e.target.value }))}
                            disabled={saving || generatingPDF}
                          />
                        </div>
                      </div>
                      {/* Informations terrain */}
                      <h4 className="text-md font-semibold text-slate-800 mt-6 mb-4">Informations du Terrain</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Titre terrain
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            value={ftData.titre_terrain}
                            onChange={(e) => setFtData(prev => ({ ...prev, titre_terrain: e.target.value }))}
                            disabled={saving || generatingPDF}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Nom propriété
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            value={ftData.nom_propriete}
                            onChange={(e) => setFtData(prev => ({ ...prev, nom_propriete: e.target.value }))}
                            disabled={saving || generatingPDF}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Nom propriétaire
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            value={ftData.nom_proprietaire}
                            onChange={(e) => setFtData(prev => ({ ...prev, nom_proprietaire: e.target.value }))}
                            disabled={saving || generatingPDF}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Superficie remblai
                          </label>
                          <input
                            type="number"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            value={ftData.superficie_remblai}
                            onChange={(e) => setFtData(prev => ({ ...prev, superficie_remblai: e.target.value }))}
                            disabled={saving || generatingPDF}
                          />
                        </div>
                      </div>
                      {/* Dossiers */}
                      {availableDossiers.length > 0 && (
                        <div className="mt-6">
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-slate-700">
                              Dossiers fournis
                            </label>
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                              statutDossier === 'Complet' ? 'bg-green-100 text-green-800' :
                              statutDossier === 'Incomplet' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {statutDossier}
                            </div>
                          </div>
                        
                          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <p className="text-sm text-slate-600 mb-3">
                              Dossiers requis selon la descente : {availableDossiers.length} document(s)
                            </p>
                            <div className="space-y-3">
                              {availableDossiers.map((dossier, index) => (
                                <div key={index} className="flex items-start p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300">
                                  <div className="flex items-center h-5 mt-0.5">
                                    <input
                                      type="checkbox"
                                      id={`dossier-${index}`}
                                      checked={ftData.dossiers_fournis.includes(dossier)}
                                      onChange={() => handleDossierChange(dossier)}
                                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded"
                                      disabled={saving || generatingPDF}
                                    />
                                  </div>
                                  <div className="ml-3 flex-1">
                                    <label htmlFor={`dossier-${index}`} className="text-sm font-medium text-slate-700">
                                      {dossier}
                                    </label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                                        ftData.dossiers_fournis.includes(dossier)
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-red-100 text-red-800'
                                      }`}>
                                        {ftData.dossiers_fournis.includes(dossier) ? (
                                          <>
                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                            Fourni
                                          </>
                                        ) : (
                                          <>
                                            <X className="w-3 h-3 mr-1" />
                                            Non fourni
                                          </>
                                        )}
                                      </span>
                                      {!ftData.dossiers_fournis.includes(dossier) && (
                                        <span className="text-xs text-slate-500">
                                          Manquant
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          
                            {/* Résumé des dossiers */}
                            <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-green-600">
                                    {ftData.dossiers_fournis.length}
                                  </div>
                                  <div className="text-sm text-slate-600">Dossiers fournis</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-red-600">
                                    {availableDossiers.length - ftData.dossiers_fournis.length}
                                  </div>
                                  <div className="text-sm text-slate-600">Dossiers manquants</div>
                                </div>
                              </div>
                            
                              {/* Message d'alerte si incomplet */}
                              {statutDossier === 'Incomplet' && (
                                <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded">
                                  <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                                    <span className="text-sm text-amber-700">
                                      Dossier incomplet. Veuillez spécifier un délai pour les documents manquants.
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Délai complément dossier */}
                      <div className="mt-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Délai pour complément de dossier
                        </label>
                        <select
                          className="w-full md:w-1/3 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          value={ftData.delai_complement}
                          onChange={(e) => setFtData(prev => ({ ...prev, delai_complement: parseInt(e.target.value) as 0 | 8 | 15 }))}
                          disabled={saving || generatingPDF}
                        >
                          <option value={0}>Sélectionner</option>
                          <option value={8}>8 jours</option>
                          <option value={15}>15 jours</option>
                        </select>
                        {ftData.delai_complement > 0 && (
                          <p className="mt-2 text-sm text-slate-600">
                            Date limite: {calculateDateComplement()}
                          </p>
                        )}
                      </div>
                      {/* Conclusion */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Conclusion et décision
                        </label>
                        <textarea
                          className="w-full h-32 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          placeholder="Indiquez la conclusion et la décision prise..."
                          value={ftData.conclusion}
                          onChange={(e) => setFtData(prev => ({ ...prev, conclusion: e.target.value }))}
                          disabled={saving || generatingPDF}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          {/* Pied du modal */}
          <div className="sticky bottom-0 bg-white border-t border-slate-200 p-6 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Procès-verbal de Fin de Traitement</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Toutes les informations seront enregistrées et le rendez-vous sera marqué comme "Fini"
                </p>
              </div>
            
              {availableDossiers.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    statutDossier === 'Complet' ? 'bg-green-100 text-green-800 border border-green-200' :
                    statutDossier === 'Incomplet' ? 'bg-red-100 text-red-800 border border-red-200' :
                    'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  }`}>
                    {statutDossier === 'Complet' ? '✓ Dossier complet' :
                     statutDossier === 'Incomplet' ? '✗ Dossier incomplet' :
                     'Aucun dossier requis'}
                  </div>
                  <span className="text-sm text-slate-600">
                    ({ftData.dossiers_fournis.length}/{availableDossiers.length} dossiers)
                  </span>
                </div>
              )}
            </div>
          
            <div className="flex gap-3">
              <button
                onClick={handleCloseFTModal}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                disabled={saving || generatingPDF}
              >
                Annuler
              </button>

              <button
                onClick={handleSubmitFT}
                disabled={saving || generatingPDF || loading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <FileSignature className="w-4 h-4" />
                    Enregistrer le procès-verbal
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal de confirmation */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
              <h3 className="text-lg font-semibold text-slate-800">Confirmation</h3>
            </div>
            <p className="text-slate-600 mb-4">
              Êtes-vous sûr de vouloir créer ce procès-verbal ?
            </p>
            <p className="text-sm text-slate-500 mb-6">
              Cela marquera le rendez-vous comme fini, enregistrera les données et générera automatiquement le PDF.
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
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FaireFTModal;