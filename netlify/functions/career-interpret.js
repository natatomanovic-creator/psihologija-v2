const Anthropic = require('@anthropic-ai/sdk');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { clientName, riasecText, valuesText, anxietyText, swotData } = JSON.parse(event.body);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const swotText = `Snage: ${swotData?.s || '-'}\nSlabosti: ${swotData?.w || '-'}\nPrilike: ${swotData?.o || '-'}\nPrijetnje: ${swotData?.t || '-'}`;

    const prompt = `Si iskusni karijerni coach koji piše na hrvatskom jeziku. Na temelju podataka klijenta napiši toplu, konkretnu i korisnu interpretaciju karijernog profila (3-5 paragrafa, bez stručnog žargona).

Klijent: ${clientName}

Holland RIASEC rezultati: ${riasecText}

Top karijernih vrijednosti: ${valuesText}

Socijalna nelagoda u radnim situacijama: ${anxietyText}

SWOT analiza:
${swotText}

Na temelju ovih podataka:
1. Opišite dominantni karijerni tip klijenta i što to znači u praksi
2. Istaknite ključne vrijednosti i kako ih uklopiti u karijerni izbor
3. Komentirajte socijalnu dimenziju — u kakvom okruženju bi ovaj klijent bio uspješniji
4. Završite s jednim konkretnim karijernim smjerom ili preporukom za istraživanje

Piši direktno klijentu (u drugom licu).`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const interpretation = message.content[0].text;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interpretation }),
    };
  } catch (err) {
    console.error('career-interpret error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
