import pool from '../config/db.js';

export const getShapefileGeoJSON = async () => {
  const query = `
    SELECT gid, commune, ST_AsGeoJSON(ST_Transform(geom, 4326)) AS geom
    FROM limit_iv_arrond;
  `;
  const { rows } = await pool.query(query);

  // Retourne toutes les lignes avec geom converti en JSON
  return rows.map(row => ({
    id: row.gid,
    commune: row.commune,
    geom: JSON.parse(row.geom) // maintenant en EPSG:4326
  }));
};
