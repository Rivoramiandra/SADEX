const express = require("express");
const cors = require("cors");
require("dotenv").config();

const descenteRoutes = require("./routes/descente.routes");
const pool = require("./config/db"); // On importe la connexion
const rendezvousFtRoutes = require('./routes/rendezvousFtRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/descentes", descenteRoutes);
app.use('/api/rendezvousft', rendezvousFtRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Backend running on port " + PORT);
});
