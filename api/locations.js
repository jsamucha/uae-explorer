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
      return res.status(200).json({ error: "Bayut returned " + response.status, detail: errText });
    }

    var data = await response.json();
    var locs = data.data && data.data.locations ? data.data.locations : [];

    return res.status(200).json({
      debug_total: data.data ? data.data.total : 0,
      debug_count: locs.length,
      debug_first_two: locs.slice(0, 2),
      locations: [],
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}