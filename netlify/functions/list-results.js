const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  try {
    const store = getStore('results');
    const params = event.queryStringParameters || {};

    // Get single client
    if (params.client) {
      const data = await store.get(params.client, { type: 'json' });
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || null),
      };
    }

    // List all clients
    const { blobs } = await store.list();
    const clients = [];
    for (const blob of blobs) {
      try {
        const data = await store.get(blob.key, { type: 'json' });
        if (data) {
          clients.push({
            key: blob.key,
            name: data.name,
            lastUpdated: data.lastUpdated,
            entryCount: data.entries?.length || 0,
            types: [...new Set((data.entries || []).map(e => e.type))],
          });
        }
      } catch (e) { /* skip */ }
    }

    clients.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clients),
    };
  } catch (err) {
    console.error('list-results error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
