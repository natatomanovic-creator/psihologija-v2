const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    const { clientName } = data;

    const clientKey = clientName
      .toLowerCase()
      .replace(/\./g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '');

    const store = getStore({
      name: 'results',
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_BLOBS_TOKEN,
    });

    let clientData;
    try {
      const existing = await store.get(clientKey, { type: 'json' });
      clientData = existing || { name: clientName, entries: [] };
    } catch (e) {
      clientData = { name: clientName, entries: [] };
    }

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
