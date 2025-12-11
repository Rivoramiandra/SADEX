// config/db.js
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'votre_base_de_donnees',
  password: process.env.DB_PASSWORD || 'votre_mot_de_passe',
  port: process.env.DB_PORT || 5432,
});

// Fonction pour exécuter des requêtes
const query = (text, params) => {
  console.log(`📝 Exécution SQL: ${text.substring(0, 100)}...`);
  return pool.query(text, params);
};

// Tester la connexion
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Erreur de connexion à PostgreSQL:', err.message);
  } else {
    console.log('✅ Connexion PostgreSQL réussie !');
    release();
  }
});

module.exports = {
  query,
  pool
};