const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    const { clientName, date } = data;

    // Normalize client key: "Ana K." -> "ana-k"
    const clientKey = clientName
      .toLowerCase()
      .replace(/\./g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-čćšžđ]/g, '');

    const store = getStore('results');

    // Load existing client data or start fresh
    let clientData;
    try {
      const existing = await store.get(clientKey, { type: 'json' });
      clientData = existing || { name: clientName, entries: [] };
    } catch (e) {
      clientData = { name: clientName, entries: [] };
    }

    // Add new entry
    clientData.entries.push({
      ...data,
      savedAt: new Date().toISOString(),
    });
    clientData.lastUpdated = new Date().toISOString();

    await store.setJSON(clientKey, clientData);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error('save-result error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
