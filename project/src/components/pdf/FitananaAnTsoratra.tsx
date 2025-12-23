import React from 'react';

// Import des images
import headerImage from '/images/header_vm.png';
import emblemeImage from '/images/emblème_vf.png';
import footerImage from '/images/footer.png';

const FitananaAnTsoratra = ({ formData = {} }) => {
  // Fonction pour formater la date
  const formatDate = (dateString) => {
    if (!dateString || dateString === 'undefined') {
      const today = new Date();
      return today.toLocaleDateString('fr-FR');
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return new Date().toLocaleDateString('fr-FR');
      }
      return date.toLocaleDateString('fr-FR');
    } catch (error) {
      console.error('Erreur de formatage de date:', error);
      return new Date().toLocaleDateString('fr-FR');
    }
  };

  // Fonction pour obtenir l'heure formatée
  const formatTime = (timeString) => {
    if (!timeString || timeString === 'undefined') {
      return 'heure non spécifiée';
    }
    return timeString.substring(0, 5); // Format HH:mm
  };

  // Nettoyage des chaînes de caractères
  const cleanString = (str) => {
    if (!str || str === 'undefined' || str === 'null') return '';
    return String(str).trim();
  };

  // Données adaptées depuis le formulaire
  const data = {
    // Informations générales
    currentDate: formatDate(formData.currentDate || new Date()),
    nomComplet: cleanString(formData.nom_compleet || formData.nom_convoquee || formData.nom_personne_r) || 'NOM DESTINATAIRE',
    referenceFT: cleanString(formData.reference_ft) || `FT-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
    
    // Informations de la descente
    dateDescente: formatDate(formData.date_descente),
    heureDescente: formatTime(formData.heure_descente) || 'heure non spécifiée',
    commune: cleanString(formData.commune) || 'COMMUNE NON SPECIFIEE',
    fokotany: cleanString(formData.fokontany) || 'FOKONTANY NON SPECIFIE',
    localite: cleanString(formData.localisation || formData.adresse_r) || 'LOCALITE NON SPECIFIEE',
    
    // Informations du terrain
    titreTerrain: cleanString(formData.titre_terrain) || 'TITRE TERRAIN NON SPECIFIE',
    nomproprietaire: cleanString(formData.nom_proprietaire || formData.nom_convoquee || formData.nom_personne_r) || 'PROPRIETAIRE NON SPECIFIE',
    coordX: cleanString(formData.x_coord) || 'X',
    coordY: cleanString(formData.y_coord) || 'Y',
    superficie: formData.superficie_remblai || formData.superficie ? `${cleanString(formData.superficie_remblai || formData.superficie)} m²` : 'SUPERFICIE NON SPECIFIEE',
    
    // Informations sur l'infraction
    infraction: cleanString(formData.infraction) || 'INFRACTION NON SPECIFIEE',
    action: cleanString(formData.actions) || 'ACTION NON SPECIFIEE',
    
    // Informations du rendez-vous FT
    formattedDateFT: formatDate(formData.date_ft),
    formattedHeureFT: formatTime(formData.heure_ft) || 'heure non spécifiée',
    typeConvoquee: formData.type_convoquee === 'representant' ? 'Représentant' : 
                   formData.type_convoquee === 'proprietaire' ? 'Propriétaire' : 
                   'Personne convoquée',
    cin: cleanString(formData.cin) || 'CIN NON SPECIFIE',
    contact: cleanString(formData.contact || formData.contact_r) || 'CONTACT NON SPECIFIE',
    
    // Dossiers
    dossierType: Array.isArray(formData.dossiers_fournis) ? formData.dossiers_fournis : 
                (formData.dossiers_fournis ? [formData.dossiers_fournis] : 
                ['Raportan-tsidina', 'Fahazoan-dàlana']),
    
    missingDossiers: formData.missing_dossiers || 
                    (formData.dossier_a_fournir ? 
                      cleanString(formData.dossier_a_fournir).split(',').map(d => d.trim()).filter(d => d) : 
                      ['Taratasy famantarana ny fananana', 'Sarin-tany ofisialy']),
    
    deadline: formData.deadline,
    
    // Conclusion
    mesure: cleanString(formData.conclusion) || 
            'Fanarahan-dalàna ny lalàna momba ny fananganana tany feno sy ny fanaovana asa fanodinana ary ny fanajana ny fomba fiasa ara-pahefana.'
  };

  // Calculer la date limite formatée
  const deadlineDate = data.deadline ? formatDate(data.deadline) : null;

  return (
    <div style={{
      fontFamily: "'Times New Roman', serif",
      fontSize: '12px',
      lineHeight: 1.4,
      color: '#000',
      width: '210mm',
      minHeight: '297mm',
      margin: '0 auto',
      position: 'relative',
      boxSizing: 'border-box',
      backgroundColor: 'white'
    }}>
      {/* En-tête avec image */}
      <div style={{
        height: '200px',
        width: '100%',
        backgroundImage: `url(${headerImage})`,
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        marginBottom: '5px'
      }}></div>
      
      {/* Logo central */}
      <div style={{
        height: '80px',
        width: '80%',
        position: 'relative',
        top: '-120px',
        backgroundImage: `url(${emblemeImage})`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center center',
        margin: '0 auto',
        marginBottom: '-100px'
      }}></div>

      {/* Contenu du document */}
      <div style={{
        padding: '15mm',
        position: 'relative',
        minHeight: 'calc(297mm - 200px - 250px - 30mm)'
      }}>
        {/* En-tête avec trois colonnes */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '25px',
          borderBottom: '1px solid #333',
          paddingBottom: '15px'
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '2px' }}>MINISITERAN'NY</div>
            <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '2px' }}>FITSINJIRAM-PAHEFANA</div>
            <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '2px' }}>SY NY FANAJARIANA</div>
            <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '5px' }}>NY TANY</div>
            <div style={{ fontSize: '10px', marginBottom: '2px' }}>SEKRETERA JENERALY</div>
            <div style={{ fontSize: '10px', marginBottom: '5px' }}>-------------------</div>
            <div style={{ fontStyle: 'italic', fontSize: '10px', marginBottom: '2px' }}>DIRECTION GENERALE</div>
            <div style={{ fontStyle: 'italic', fontSize: '10px', marginBottom: '2px' }}>NY FAHEFANA MIKAROKA</div>
            <div style={{ fontStyle: 'italic', fontSize: '10px', marginBottom: '2px' }}>NY FIAROVANA NY LEMAKA</div>
            <div style={{ fontStyle: 'italic', fontSize: '10px', marginBottom: '2px' }}>ANTANANARIVO AMIN'NY</div>
            <div style={{ fontStyle: 'italic', fontSize: '10px', marginBottom: '2px' }}>TONDRA-DRANO (APIPA)</div>
          </div>
          
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{ fontSize: '11px', marginBottom: '3px' }}>Antananarivo, ny {data.currentDate}</div>
            <div style={{ fontSize: '11px', marginBottom: '3px' }}>Ny Tale Jeneraly</div>
            <div style={{ fontSize: '11px', marginBottom: '3px' }}>Ho an'ny</div>
            <div style={{ fontWeight: 'bold', fontSize: '11px' }}>Monsieur {data.nomComplet}</div>
          </div>
        </div>
        
        {/* Numéro d'avis */}
        <div style={{
          textAlign: 'center',
          margin: '25px 0',
          fontWeight: 'bold',
          fontSize: '14px',
          fontFamily: 'Arial, Helvetica, sans-serif'
        }}>
          Fitanana an-Tsoratra faha <span style={{ textDecoration: 'underline' }}>{data.referenceFT}</span>
        </div>
        
        {/* Informations de titre */}
        <div style={{
          fontFamily: 'Arial, Helvetica, sans-serif',
          margin: '10px 0 20px 0',
          padding: '0'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '3px' }}>
            Antony: <span style={{ fontWeight: '100' }}>Fitaterana rano-tany</span>
          </div>
          <div style={{ fontWeight: '600', marginBottom: '3px' }}>
            Daty: <span style={{ fontWeight: '100' }}>{data.dateDescente}</span>
          </div>
          <div style={{ fontWeight: '600', marginBottom: '3px' }}>
            Toerana: <span style={{ fontWeight: '100' }}>Biraon'ny APIPA Anosizato Antsinanana</span>
          </div>
          <div style={{ fontWeight: '600', marginBottom: '10px' }}>
            Tanjona: <span style={{ fontWeight: '100' }}>Fampanarahandalana</span>
          </div>
          <div style={{
            borderTop: '1px solid #000',
            margin: '10px 0',
            width: '100%'
          }}></div>
        </div>
        
        {/* Corps du document */}
        <div style={{ textAlign: 'justify' }}>
          {/* Premier paragraphe */}
          <div style={{ marginBottom: '15px', textIndent: '20px' }}>
            Araka ny fepetra ao amin'ny <span style={{ fontStyle: 'italic' }}>Dekri governemantaly n°2019-1543 ny 11 Septambra 2019</span> 
            momba ny fandaminana ny asa fananganana tany feno ao amin'ireo faritra fehezin'ny APIPA, 
            ary mampiasa ny <span style={{ fontStyle: 'italic' }}>lalàna n°2015-052 ny 03 Febroary 2016</span> mikasika ny Fandrindrana ny Tanibe sy ny Fonènana ;
          </div>
          
          {/* Deuxième paragraphe */}
          <div style={{ marginBottom: '15px', textIndent: '20px' }}>
            Arak'ireo baiko nomen'ny Tale Jeneralin'ny APIPA, nisy fitsidina teo amin'ny toerana natao 
            tamin'ny <span style={{ fontWeight: 'bold' }}>{data.dateDescente}</span> amin'ny <span style={{ fontWeight: 'bold' }}>{data.heureDescente}</span>, 
            teo amin'ny <span style={{ fontWeight: 'bold' }}>{data.commune}</span>, Fokontany <span style={{ fontWeight: 'bold' }}>{data.fokotany}</span>, 
            Toerana <span style={{ fontWeight: 'bold' }}>{data.localite}</span>. Ny tany voamarika amin'ny laharana 
            <span style={{ fontWeight: 'bold' }}> {data.titreTerrain}</span>, an'ny 
            <span style={{ fontWeight: 'bold' }}> {data.nomproprietaire}</span>, 
            amin'ny koordinà <span style={{ fontWeight: 'bold' }}>{data.coordX}</span> ; <span style={{ fontWeight: 'bold' }}>{data.coordY}</span> 
            velarana <span style={{ fontWeight: 'bold' }}>{data.superficie}</span>.
          </div>
          
          {/* Troisième paragraphe */}
          <div style={{ marginBottom: '15px', textIndent: '20px' }}>
            Hita fa misy <span style={{ fontWeight: 'bold' }}>{data.infraction}</span> eo amin'io tany io, 
            izay niteraka ny fandraiketana ny <span style={{ fontWeight: 'bold' }}>{data.action}</span>.
          </div>
          
          {/* Quatrième paragraphe */}
          <div style={{ marginBottom: '15px', textIndent: '20px' }}>
            Antsoina ianao hankany amin'ny biraon'ny APIPA ny <span style={{ fontWeight: 'bold' }}>{data.formattedDateFT}</span> 
            amin'ny <span style={{ fontWeight: 'bold' }}>{data.formattedHeureFT}</span> ho <span style={{ fontWeight: 'bold' }}>{data.typeConvoquee}</span>, 
            <span style={{ fontWeight: 'bold' }}> {data.nomComplet}</span>, manana CIN n° 
            <span style={{ fontWeight: 'bold' }}> {data.cin}</span>, azo antsoina amin'ny <span style={{ fontWeight: 'bold' }}>{data.contact}</span>.
          </div>
          
          {/* Documents apportés */}
          <div style={{ marginBottom: '15px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Taratasy naterina :</div>
            <ul style={{ marginLeft: '25px', marginBottom: '10px' }}>
              {data.dossierType && data.dossierType.length > 0 
                ? data.dossierType.map((doc, index) => (
                    <li key={index} style={{ marginBottom: '3px' }}>— {doc}</li>
                  ))
                : <li>— Tsy misy taratasy naterina</li>
              }
            </ul>
          </div>
          
          {/* Documents manquants */}
          <div style={{ marginBottom: '15px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Taratasy tsy ampy tokony hotaterina :</div>
            <ul style={{ marginLeft: '25px', marginBottom: '10px' }}>
              {data.missingDossiers && data.missingDossiers.length > 0 
                ? data.missingDossiers.map((doc, index) => (
                    <li key={index} style={{ marginBottom: '3px' }}>— {doc}</li>
                  ))
                : <li>— Tsy misy taratasy tsy ampy</li>
              }
            </ul>
            {deadlineDate && (
              <div style={{ fontWeight: 'bold', marginTop: '10px' }}>
                Daty farany fametrahana : <span style={{ textDecoration: 'underline' }}>
                  {deadlineDate}
                </span>
              </div>
            )}
          </div>
          
          {/* Mesures requises */}
          <div style={{ marginBottom: '15px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Fepetra takin'ny APIPA :</div>
            <div style={{ textIndent: '20px', marginBottom: '10px' }}>
              {data.mesure}
            </div>
          </div>
          
          {/* Avertissement */}
          <div style={{ marginBottom: '15px', textIndent: '20px' }}>
            Tena ilaina ny manaraka ny fepetra rehetra voalaza etsy ambony. Ny tsy fanarahana, na ampahany aza, 
            ho heverina ho tsy fanarahana lalàna ary mety hitarika ny fanenjehana ara-pitsarana avy amin'ny fahefana manan-draharaha.
          </div>
          
          {/* Conclusion */}
          <div style={{ marginBottom: '20px', textIndent: '20px' }}>
            Mba hanamafisana ny fahafantarana ity fanambarana ity sy ny fanolorana tena hanaraka ny fepetrin'ny APIPA, 
            azafady sonia ity taratasy ity amin'ny dika roa.
          </div>
        </div>
        
        {/* Sections de signature */}
        <div style={{
          marginTop: '40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '20px' }}>Vakina sy ekena,</div>
            <div style={{ borderTop: '1px solid #000', width: '250px', paddingTop: '5px' }}>
              <div style={{ textAlign: 'center', fontStyle: 'italic' }}>Sonin'ny mpandray</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Antananarivo, ny {data.currentDate}</div>
            <div style={{ fontStyle: 'italic', marginBottom: '20px' }}>Ny Tale Jeneralin'ny APIPA</div>
            <div style={{ borderTop: '1px solid #000', width: '250px', marginLeft: 'auto', paddingTop: '5px' }}>
              <div style={{ textAlign: 'center', fontStyle: 'italic' }}>Sonia sy tombo-kase</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Pied de page avec image */}
      <div style={{
        height: '250px',
        backgroundImage: `url(${footerImage})`,
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center center',
        backgroundColor: 'transparent',
        width: '100%',
        position: 'relative',
        bottom: '0'
      }}></div>
    </div>
  );
};

export default FitananaAnTsoratra;