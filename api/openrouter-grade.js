module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "OPENROUTER_API_KEY no está configurada en el servidor.",
    });
  }

  const { prompt } = req.body || {};
  if (!String(prompt || "").trim()) {
    return res.status(400).json({ error: "Falta el prompt de corrección." });
  }

  const forwardedProto = req.headers["x-forwarded-proto"];
  const host = req.headers.host;
  const referer =
    process.env.OPENROUTER_SITE_URL ||
    (host ? `${forwardedProto || "https"}://${host}` : "https://www.examenmedfam.online");
  const appName = process.env.OPENROUTER_APP_NAME || "ResidenciaMF";

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": referer,
        "X-Title": appName,
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4-5",
        temperature: 0.1,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const text = await response.text();
    if (!response.ok) {
      return res.status(response.status).json({
        error: `OpenRouter devolvió ${response.status}`,
        detail: text,
      });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        error: "OpenRouter devolvió una respuesta no parseable.",
        detail: text,
      });
    }

    return res.status(200).json({
      content: data.choices?.[0]?.message?.content || "",
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "No se pudo conectar con OpenRouter.",
    });
  }
};
