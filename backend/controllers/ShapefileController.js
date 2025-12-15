import { getShapefileGeoJSON } from '../models/ShapefileModel.js';

export const getShapefile = async (req, res) => {
  try {
    const geojson = await getShapefileGeoJSON();
    res.json(geojson);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur récupération GeoJSON' });
  }
};
