const pool = require('../config/db');

const Fokontany = {
    findByCoordinates: async (x, y) => {
        const query = `
            SELECT 
                adm4_en as fokontany,
                adm3_en as commune,
                adm2_en as district,
                ST_AsText(ST_Centroid(geom)) as centre_lambert,
                ST_Area(geom) as superficie_m2
            FROM fokontany
            WHERE ST_Contains(
                geom, 
                ST_SetSRID(ST_MakePoint($1, $2), 29702)
            );
        `;
        const result = await pool.query(query, [x, y]);
        return result.rows[0] || null;
    }
};

module.exports = Fokontany;