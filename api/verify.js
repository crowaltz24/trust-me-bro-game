export default function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { password } = req.body || {};
  if (!password) {
    res.status(400).json({ error: "Missing password" });
    return;
  }

  const expected = process.env.GAME_PASSWORD;
  if (!expected) {
    res.status(500).json({ error: "Missing GAME_PASSWORD" });
    return;
  }

  if (password !== expected) {
    res.status(401).json({ ok: false });
    return;
  }

  res.status(200).json({ ok: true });
}
