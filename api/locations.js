export default async function handler(req, res) {
  var q = req.query.q || "";
  if (q.length < 1) {
    return res.status(200).json({ locations: [] });
  }

  var apiKey = process.env.RAPIDAPI_KEY;
  var apiHost = process.env.RAPIDAPI_HOST || "bayut14.p.rapidapi.com";

  if (!apiKey) {
    return res.status(500).json({ error: "RAPIDAPI_KEY not configured" });
  }

  try {
    var url = "https://" + apiHost + "/autocomplete?query=" + encodeURIComponent(q) + "&langs=en";
    var response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": apiHost,
      },
    });

    if (!response.ok) {
      var errText = await response.text();
      return res.status(response.status).json({ error: "Bayut API returned " + response.status + ": " + errText });
    }

    var data = await response.json();
    var results = Array.isArray(data) ? data : (data.hits || data.results || []);

    var locations = [];
    for (var i = 0; i < results.length; i++) {
      var h = results[i];
      var id = h.externalID || h.id || h.external_id || "";
      var name = h.name || h.title || "";
      var pathParts = [];
      if (h.geography) {
        if (h.geography.level1 && h.geography.level1.name) pathParts.push(h.geography.level1.name);
        if (h.geography.level2 && h.geography.level2.name) pathParts.push(h.geography.level2.name);
        if (h.geography.level3 && h.geography.level3.name) pathParts.push(h.geography.level3.name);
      }
      if (id && name) {
        locations.push({ id: String(id), name: name, path: pathParts.join(" > ") });
      }
    }

    return res.status(200).json({ locations: locations });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
