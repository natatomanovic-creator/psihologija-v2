exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "Nema API ključa." }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: "Neispravan zahtjev." }) }; }

  const { b5scores, atscores } = body;

  const DIM_NAMES = { E:"Ekstraverzija", N:"Neuroticizam", O:"Otvorenost", A:"Ugodnost", C:"Savjesnost" };
  const ATTACH_NAMES = { secure:"Siguran", anxious:"Anksiozni", avoidant:"Izbjegavajući", fearful:"Plašljivi" };

  let scoreText = "";
  if (b5scores && Object.keys(b5scores).length) {
    scoreText += "Big Five (0-100):\n";
    for (const k of Object.keys(b5scores)) scoreText += `${DIM_NAMES[k]}: ${b5scores[k]}\n`;
  }
  if (atscores && Object.keys(atscores).length) {
    const dom = Object.keys(atscores).sort((a,b) => atscores[b]-atscores[a])[0];
    scoreText += "\nPrivrženost (0-100):\n";
    for (const k of Object.keys(atscores)) scoreText += `${ATTACH_NAMES[k]}: ${atscores[k]}\n`;
    scoreText += `Dominantni: ${ATTACH_NAMES[dom]}\n`;
  }

  const userPrompt = `Rezultati psihološkog testa klijenta:\n${scoreText}\nNapiši interpretaciju na hrvatskom jeziku. Vrati SAMO JSON objekt, bez ikakvog drugog teksta prije ili poslije:\n{"client_text":"3-4 rečenice tople interpretacije za klijenta bez stručnog žargona","therapist_text":"2-3 kliničke opservacije i prijedloge za terapijski rad"}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 800,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify({ error: data.error?.message || "API greška." }) };
    }

    const textContent = data.content && data.content.find(c => c.type === "text");
    if (!textContent) {
      return { statusCode: 500, body: JSON.stringify({ error: "Prazan odgovor od API-ja." }) };
    }

    const raw = textContent.text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { statusCode: 500, body: JSON.stringify({ error: "Neispravan format: " + raw.substring(0, 100) }) };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_text: parsed.client_text || "",
        therapist_text: parsed.therapist_text || "",
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Greška: " + err.message }) };
  }
};
