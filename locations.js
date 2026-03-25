export default async function handler(req, res) {
  const q = req.query.q || "";
  if (q.length < 2) {
    return res.status(200).json({ locations: [] });
  }

  const apiKey = process.env.RAPIDAPI_KEY;
  const apiHost = process.env.RAPIDAPI_HOST || "bayut-api1.p.rapidapi.com";

  if (!apiKey) {
    return res.status(500).json({ error: "RAPIDAPI_KEY not configured" });
  }

  try {
    const url = "https://" + apiHost + "/auto-complete?query=" + encodeURIComponent(q) + "&hitsPerPage=10&page=0&lang=en";
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": apiHost,
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Bayut API returned " + response.status });
    }

    const data = await response.json();
    const locations = (data.hits || []).map(function (h) {
      return {
        id: h.externalID,
        name: h.name,
        path: [
          h.geography && h.geography.level1 && h.geography.level1.name,
          h.geography && h.geography.level2 && h.geography.level2.name,
          h.geography && h.geography.level3 && h.geography.level3.name,
          h.geography && h.geography.level4 && h.geography.level4.name,
        ]
          .filter(Boolean)
          .join(" > "),
      };
    });

    return res.status(200).json({ locations: locations });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
