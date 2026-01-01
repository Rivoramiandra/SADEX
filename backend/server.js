require('dotenv').config();
const express = require("express");
const cors = require("cors");
const http = require('http');
const { Server } = require('socket.io');
const { Client } = require('pg');

// Import des routes
const descenteRoutes = require("./routes/descente.routes");
const rendezvousFtRoutes = require('./routes/rendezvousFtRoutes');
const ftRoutes = require('./routes/ftRoutes');
const avisDePaiementRoutes = require('./routes/avisDePaiementRoutes'); // Nouvelle route
const paiementRoutes = require('./routes/paiementRoutes');
const shapefileRoutes = require('./routes/ShapefileRoutes');
const cadastreRoutes = require('./routes/cadastreRoutes');
const titreRequisitionRoutes = require('./routes/titreRequisitionRoutes');
const titresSansNomRoutes = require("./routes/titresansnomRoutes");
const fokontanyRoutes = require('./routes/fokontanyRoutes');
const statsRoutes = require('./routes/statsDescentes'); 
const statRendezVousRoutes = require('./routes/statRendezVous');
const statApRoutes = require('./routes/statRoutes');
const paiementstatRoutes = require('./routes/paiementStatRoutes');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',  
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/descentes", descenteRoutes);
app.use('/api/rendezvousft', rendezvousFtRoutes);
app.use('/api/ft', ftRoutes);
app.use('/api/avis-de-paiement', avisDePaiementRoutes); 
app.use('/api', paiementRoutes);
app.use('/api/shapefile', shapefileRoutes);
app.use('/api/cadastre', cadastreRoutes);
app.use('/api/titre-requisition', titreRequisitionRoutes);
app.use("/api/titres-sans-nom", titresSansNomRoutes);
app.use('/api/fokontany', fokontanyRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/stats/rendezvous', statRendezVousRoutes);
app.use('/api', statApRoutes);
app.use('/api/statpaiement', paiementstatRoutes);

// Route de test santé du serveur
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    socketConnected: io.engine.clientsCount
  });
});

// Gestion des connexions Socket.io
io.on('connection', (socket) => {
  console.log('🔌 Nouveau client connecté:', socket.id);

  socket.on('join', (room) => {
    socket.join(room);
    console.log(`👥 ${socket.id} rejoint ${room}`);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client déconnecté:', socket.id);
  });
});

// Client PostgreSQL pour LISTEN/NOTIFY
const notificationClient = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 5432,
});

async function startPgListener() {
  try {
    await notificationClient.connect();
    console.log('✅ Client de notification PostgreSQL connecté');

    // Écoute des canaux
    await notificationClient.query('LISTEN new_rendezvous');
    await notificationClient.query('LISTEN new_descente');
    await notificationClient.query('LISTEN update_rendezvous');
    await notificationClient.query('LISTEN new_avis_paiement'); // Nouveau canal

    console.log('👂 Écoute active sur: new_rendezvous, new_descente, update_rendezvous, new_avis_paiement');

    notificationClient.on('notification', (msg) => {
      console.log(`📢 Notification reçue du canal "${msg.channel}"`);
      try {
        const payload = JSON.parse(msg.payload);

        switch(msg.channel) {
          case 'new_rendezvous':
            io.emit('new-rendezvous', payload);
            io.emit('notification', { type: 'rendezvous', action: 'create', data: payload, timestamp: new Date().toISOString() });
            break;
          case 'new_descente':
            io.emit('new-descente', payload);
            io.emit('notification', { type: 'descente', action: 'create', data: payload, timestamp: new Date().toISOString() });
            break;
          case 'update_rendezvous':
            io.emit('update-rendezvous', payload);
            io.emit('notification', { type: 'rendezvous', action: 'update', data: payload, timestamp: new Date().toISOString() });
            break;
          case 'new_avis_paiement':
            io.emit('new-avis-paiement', payload);
            io.emit('notification', { type: 'avis_paiement', action: 'create', data: payload, timestamp: new Date().toISOString() });
            break;
        }
      } catch (err) {
        console.error('❌ Erreur de parsing JSON:', err.message, 'Payload brut:', msg.payload);
      }
    });

    notificationClient.on('error', (err) => {
      console.error('❌ Erreur du client PostgreSQL:', err.message);
      setTimeout(startPgListener, 5000);
    });

    notificationClient.on('end', () => {
      console.log('🔌 Connexion PostgreSQL terminée');
    });

  } catch (err) {
    console.error('❌ Impossible de connecter le client PostgreSQL:', err.message);
    setTimeout(startPgListener, 10000);
  }
}

// Démarrer l'écoute PostgreSQL
startPgListener();

// Lancer le serveur
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📡 Socket.io actif`);
  console.log(`🔗 Frontend: http://localhost:3000`);
  console.log(`📋 Routes disponibles:`);
  console.log(`   • /api/descentes`);
  console.log(`   • /api/rendezvousft`);
  console.log(`   • /api/ft`);
  console.log(`   • /api/avis-de-paiement`); // Nouvelle route
  console.log(`   • /api/health`);
});