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

  const { clientName, scores } = body;

  const DIM_NAMES = { E:"Ekstraverzija", N:"Neuroticizam", O:"Otvorenost", A:"Ugodnost", C:"Savjesnost" };
  const ATTACH_NAMES = { secure:"Siguran", anxious:"Anksiozni", avoidant:"Izbjegavajući", fearful:"Plašljivi" };

  let scoreText = `Klijent: ${clientName || "Anonimno"}\n\n`;

  if (scores.b5 && Object.keys(scores.b5).length) {
    scoreText += "BIG FIVE (0-100):\n";
    for (const k of Object.keys(scores.b5)) scoreText += `${DIM_NAMES[k]}: ${scores.b5[k]}\n`;
    scoreText += "\n";
  }
  if (scores.attach && Object.keys(scores.attach).length) {
    const dom = Object.keys(scores.attach).sort((a,b) => scores.attach[b]-scores.attach[a])[0];
    scoreText += "PRIVRŽENOST (0-100):\n";
    for (const k of Object.keys(scores.attach)) scoreText += `${ATTACH_NAMES[k]}: ${scores.attach[k]}\n`;
    scoreText += `Dominantni stil: ${ATTACH_NAMES[dom]}\n\n`;
  }
  if (scores.phq9 !== undefined) scoreText += `PHQ-9 depresija (0-27, klinički prag >=10): ${scores.phq9}\n`;
  if (scores.gad7 !== undefined) scoreText += `GAD-7 anksioznost (0-21, klinički prag >=10): ${scores.gad7}\n`;
  if (scores.rosenberg !== undefined) scoreText += `Rosenberg samopoštovanje (0-30, niže = lošije): ${scores.rosenberg}\n`;
  if (scores.pcl5 !== undefined) scoreText += `PCL-5 trauma (0-80, klinički prag >=33): ${scores.pcl5}\n`;

  const userPrompt = `Si iskusni klinički psiholog. Klijent je ispunio psihološku bateriju testova.

Rezultati:
${scoreText}

Napiši na hrvatskom jeziku detaljnu analizu. Vrati SAMO JSON objekt bez ikakvog teksta prije ili poslije:
{"client_text":"Topla razumljiva interpretacija za klijenta, 4-5 rečenica bez stručnog žargona","therapist_text":"Detaljna klinička napomena s ključnim nalazima, preporučenim terapijskim pristupima i prioritetima u radu","red_flags":["Navedi konkretne crvene zastavice ako postoje, inače prazna lista"],"priority":"visok ili srednji ili nizak"}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1500,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify({ error: JSON.stringify(data) }) };
    }

    const textContent = data.content && data.content.find(c => c.type === "text");
    if (!textContent) return { statusCode: 500, body: JSON.stringify({ error: "Prazan odgovor." }) };

    const raw = textContent.text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { statusCode: 500, body: JSON.stringify({ error: "Format: " + raw.substring(0, 100) }) };

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Greška: " + err.message }) };
  }
};
