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

    return res.status(200).json({
      debug_raw_type: typeof data,
      debug_is_array: Array.isArray(data),
      debug_keys: data && typeof data === "object" ? Object.keys(data) : [],
      debug_first_item: Array.isArray(data) && data.length > 0 ? data[0] : (data.hits && data.hits.length > 0 ? data.hits[0] : null),
      debug_raw_length: Array.isArray(data) ? data.length : "not array",
      locations: [],
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}