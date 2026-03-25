export default async function handler(req, res) {
  var p = req.query;

  var apiKey = process.env.RAPIDAPI_KEY;
  var apiHost = process.env.RAPIDAPI_HOST || "bayut14.p.rapidapi.com";

  if (!apiKey) {
    return res.status(500).json({ error: "RAPIDAPI_KEY not configured" });
  }

  var params = new URLSearchParams();
  params.set("purpose", "for-rent");
  params.set("rent_frequency", "yearly");
  params.set("page", "1");
  params.set("langs", "en");

  if (p.location_ids) params.set("location_ids", p.location_ids);
  if (p.rooms) params.set("rooms", p.rooms);
  if (p.property_type) params.set("property_type", p.property_type);

  try {
    var url = "https://" + apiHost + "/search-property?" + params.toString();
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
    var hits = Array.isArray(data) ? data : (data.hits || data.results || data.properties || []);

    var rents = [];
    for (var i = 0; i < hits.length; i++) {
      if (hits[i].price) rents.push(hits[i].price);
    }

    var avg = null;
    if (rents.length > 0) {
      var sum = 0;
      for (var j = 0; j < rents.length; j++) sum += rents[j];
      avg = Math.round(sum / rents.length);
    }

    return res.status(200).json({
      avgRentYearly: avg,
      sampleSize: rents.length,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
