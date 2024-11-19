const express = require('express');
const axios = require('axios');
const router = express.Router();

const geoNamesBaseUrl = 'http://api.geonames.org';
const geoNamesUsername = 'myApp_123'; // Set your GeoNames API username in .env file

// Helper function to format GeoNames results
function formatGeoNamesResult(data) {
  return data.geonames.map(item => ({
    code: item.geonameId,
    name: item.name,
  }));
}

// Route to fetch regions (Admin level 1 in GeoNames)
router.get('/regions', async (req, res) => {
  try {
    const response = await axios.get(`${geoNamesBaseUrl}/childrenJSON`, {
      params: {
        geonameId: 1694008, // Example for "World" to get country list; adjust to your use case
        username: geoNamesUsername,
      },
    });
    res.json(formatGeoNamesResult(response.data));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch regions', error: error.message });
  }
});

// Route to fetch provinces by region code
router.get('/provinces/:regionCode', async (req, res) => {
  const { regionCode } = req.params;
  try {
    const response = await axios.get(`${geoNamesBaseUrl}/childrenJSON`, {
      params: {
        geonameId: regionCode,
        username: geoNamesUsername,
      },
    });
    res.json(formatGeoNamesResult(response.data));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch provinces', error: error.message });
  }
});

// Route to fetch cities by province code
router.get('/cities/:provinceCode', async (req, res) => {
  const { provinceCode } = req.params;
  try {
    const response = await axios.get(`${geoNamesBaseUrl}/childrenJSON`, {
      params: {
        geonameId: provinceCode,
        username: geoNamesUsername,
      },
    });
    res.json(formatGeoNamesResult(response.data));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch cities', error: error.message });
  }
});

// Route to fetch barangays by city code
router.get('/barangays/:cityCode', async (req, res) => {
  const { cityCode } = req.params;
  try {
    const response = await axios.get(`${geoNamesBaseUrl}/childrenJSON`, {
      params: {
        geonameId: cityCode,
        username: geoNamesUsername,
      },
    });
    res.json(formatGeoNamesResult(response.data));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch barangays', error: error.message });
  }
});

module.exports = router;
