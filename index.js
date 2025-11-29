require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// Simple store en mémoire pour démonstration CRUD
// Attention : non persistant, perdu au redémarrage
let localCharacters = [];
let nextLocalId = 1;

/*
 GET /characters
 - Par défaut : proxie l'API Marvel externe (source=external ou pas de source)
 - Pour utiliser le store local : GET /characters?source=local
 */
app.get("/characters", async (req, res) => {
  try {
    const source = req.query.source || "external";

    if (source === "local") {
      // support skip & limit pour le store local aussi
      const skip = parseInt(req.query.skip || "0", 10);
      const limit = parseInt(req.query.limit || "100", 10);
      const result = localCharacters.slice(skip, skip + limit);
      return res.json({ results: result, total: localCharacters.length });
    }

    // External API
    const name = req.query.name || "";
    const skip = parseInt(req.query.skip || "0", 10);
    const limit = parseInt(req.query.limit || "100", 10);

    const response = await axios.get(
      `https://lereacteur-marvel-api.herokuapp.com/characters`,
      {
        params: {
          apiKey: process.env.API_KEY,
          name,
          skip,
          limit,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error(error?.response?.data || error.message || error);
    res.status(500).json({ message: error.message });
  }
});

app.get("/comics", async (req, res) => {
  try {
    const name = req.query.name || "";
    const skip = parseInt(req.query.skip || "0", 10);
    const limit = parseInt(req.query.limit || "100", 10);

    const response = await axios.get(
      `https://lereacteur-marvel-api.herokuapp.com/comics`,
      {
        params: {
          apiKey: process.env.API_KEY,
          name,
          skip,
          limit,
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error(error?.response?.data || error.message || error);
    res.status(500).json({ message: error.message });
  }
});

/*
 CRUD local pour /characters (exemples)
 POST   /characters         -> create
 PUT    /characters/:id     -> update
 DELETE /characters/:id     -> delete
*/
app.post("/characters", (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.name) {
      return res.status(400).json({ message: "Le body doit contenir au moins { name }" });
    }
    const newChar = {
      id: String(nextLocalId++),
      ...payload,
      createdAt: new Date().toISOString(),
    };
    localCharacters.push(newChar);
    res.status(201).json(newChar);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

app.put("/characters/:id", (req, res) => {
  try {
    const id = req.params.id;
    const idx = localCharacters.findIndex((c) => c.id === id);
    if (idx === -1) {
      return res.status(404).json({ message: "Character not found in local store" });
    }
    // Merge update
    localCharacters[idx] = { ...localCharacters[idx], ...req.body, updatedAt: new Date().toISOString() };
    res.json(localCharacters[idx]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

app.delete("/characters/:id", (req, res) => {
  try {
    const id = req.params.id;
    const idx = localCharacters.findIndex((c) => c.id === id);
    if (idx === -1) {
      return res.status(404).json({ message: "Character not found in local store" });
    }
    const removed = localCharacters.splice(idx, 1)[0];
    res.json({ deleted: removed });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// racine (OK maintenant car catch-all est après)
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// catch-all : placer en dernier
app.all(/.*/, (req, res) => {
  res.status(404).json({ message: "This route does not exist" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server started on port " + PORT);
});