export default async function handler(req, res) {
  var q = req.query.query || "";
  if (q.length < 2) return res.status(200).json({ developers: [] });

  var apiKey = process.env.RAPIDAPI_KEY;
  var apiHost = process.env.RAPIDAPI_HOST || "bayut14.p.rapidapi.com";
  if (!apiKey) return res.status(500).json({ error: "RAPIDAPI_KEY not configured" });

  try {
    var url = "https://" + apiHost + "/developer-search-by-name?query=" + encodeURIComponent(q) + "&page=1&langs=en";
    var response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json", "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": apiHost },
    });
    if (!response.ok) return res.status(200).json({ error: "Bayut returned " + response.status, developers: [] });

    var raw = await response.json();
    var data = raw.data || raw;
    var hits = data.hits || data.developers || data.results || [];
    if (Array.isArray(data) && !hits.length) hits = data;

    var developers = [];
    for (var i = 0; i < hits.length; i++) {
      var d = hits[i];
      var name = "";
      if (d.name) name = (typeof d.name === "object" && d.name.en) ? d.name.en : (typeof d.name === "string" ? d.name : "");
      var id = d.externalID || d.id || d.external_id || "";
      if (name && id) {
        developers.push({
          id: String(id),
          name: name,
          logo: (d.logo && d.logo.url) ? d.logo.url : null,
        });
      }
    }

    return res.status(200).json({ developers: developers });
  } catch (err) {
    return res.status(500).json({ error: err.message, developers: [] });
  }
}
