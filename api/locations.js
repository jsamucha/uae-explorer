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
    var inner = data.data;

    return res.status(200).json({
      debug_success: data.success,
      debug_data_type: typeof inner,
      debug_data_is_array: Array.isArray(inner),
      debug_data_keys: inner && typeof inner === "object" && !Array.isArray(inner) ? Object.keys(inner) : [],
      debug_data_length: Array.isArray(inner) ? inner.length : "not array",
      debug_first_item: Array.isArray(inner) && inner.length > 0 ? inner[0] : null,
      locations: [],
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}