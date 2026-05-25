const Anthropic = require('@anthropic-ai/sdk');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { clientName, riasecText, valuesText, anxietyText, swotData } = JSON.parse(event.body);
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const swotText = `Snage: ${swotData?.s || '-'} | Slabosti: ${swotData?.w || '-'} | Prilike: ${swotData?.o || '-'} | Prijetnje: ${swotData?.t || '-'}`;

    const prompt = `Si karijerni coach. Napiši kratku interpretaciju (2-3 paragrafa) na hrvatskom za klijenta ${clientName}.

RIASEC: ${riasecText}
Vrijednosti: ${valuesText}
Socijalna nelagoda: ${anxietyText}
SWOT: ${swotText}

Piši direktno klijentu. Budi konkretan i praktičan.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interpretation: message.content[0].text }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
