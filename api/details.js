export default async function handler(req, res) {
  var p = req.query;
  var apiKey = process.env.RAPIDAPI_KEY;
  var apiHost = process.env.RAPIDAPI_HOST || "bayut14.p.rapidapi.com";
  if (!apiKey) return res.status(500).json({ error: "RAPIDAPI_KEY not configured" });

  var externalId = p.external_id || "";
  if (!externalId) return res.status(400).json({ error: "external_id is required" });

  try {
    var url = "https://" + apiHost + "/property-details?external_id=" + encodeURIComponent(externalId) + "&langs=en";
    var response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json", "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": apiHost },
    });
    if (!response.ok) return res.status(200).json({ error: "Bayut returned " + response.status, property: null });

    var raw = await response.json();
    var data = raw.data || raw;

    return res.status(200).json({ property: data });
  } catch (err) {
    return res.status(500).json({ error: err.message, property: null });
  }
}
