export default async function handler(req, res) {
  var q = req.query.q || "";
  if (q.length < 1) return res.status(200).json({ locations: [] });

  var apiKey = process.env.RAPIDAPI_KEY;
  var apiHost = process.env.RAPIDAPI_HOST || "bayut14.p.rapidapi.com";
  if (!apiKey) return res.status(500).json({ error: "RAPIDAPI_KEY not configured" });

  try {
    var url = "https://" + apiHost + "/autocomplete?query=" + encodeURIComponent(q) + "&langs=en";
    var response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json", "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": apiHost },
    });
    if (!response.ok) return res.status(200).json({ error: "Bayut returned " + response.status, locations: [] });

    var raw = await response.json();
    var locs = raw.data && raw.data.locations ? raw.data.locations : [];

    var locations = [];
    for (var i = 0; i < locs.length; i++) {
      var l = locs[i];
      var name = (l.name && l.name.en) ? l.name.en : (typeof l.name === "string" ? l.name : "");
      var id = l.externalID || l.id || "";
      if (name && id) {
        locations.push({ id: String(id), name: name, path: l.path || "" });
      }
    }
    return res.status(200).json({ locations: locations });
  } catch (err) {
    return res.status(500).json({ error: err.message, locations: [] });
  }
}