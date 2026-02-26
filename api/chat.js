export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { system, user } = req.body || {};
  if (!system || !user) {
    res.status(400).json({ error: "Missing prompts" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    return;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.9,
        max_tokens: 80,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      res.status(500).json({ error: "OpenAI error", detail: detail.slice(0, 200) });
      return;
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      res.status(500).json({ error: "Empty response" });
      return;
    }

    res.status(200).json({ text });
  } catch (error) {
    res.status(500).json({ error: "Request failed" });
  }
}
