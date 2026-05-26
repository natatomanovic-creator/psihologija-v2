const Anthropic = require('@anthropic-ai/sdk');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { clientName, riasecText, valuesText, anxietyText, swotData } = JSON.parse(event.body);
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const swotText = `Snage: ${swotData?.s || '-'} | Slabosti: ${swotData?.w || '-'} | Prilike: ${swotData?.o || '-'} | Prijetnje: ${swotData?.t || '-'}`;

    const prompt = `Karijerni coach, hrvatski jezik. Za klijenta ${clientName} napiši JSON s dva kratka teksta:

RIASEC: ${riasecText}
Vrijednosti: ${valuesText}
Socijalna nelagoda: ${anxietyText}
SWOT: ${swotText}

Format (SAMO JSON, bez komentara):
{"client": "2 paragrafa direktno klijentu — karijerni tip, okruženje koje mu odgovara, jedna konkretna preporuka", "coach": "2-3 rečenice za coacha — ključni izazovi, fokus prvih sesija"}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    let interpretation = '';
    let coachNote = '';

    try {
      const parsed = JSON.parse(message.content[0].text);
      interpretation = parsed.client || '';
      coachNote = parsed.coach || '';
    } catch(e) {
      interpretation = message.content[0].text;
      coachNote = '';
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interpretation, coachNote }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
