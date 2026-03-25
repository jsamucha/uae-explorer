export default async function handler(req, res) {
  var p = req.query;
  if (!p.locationId) {
    return res.status(400).json({ error: "locationId is required" });
  }

  var apiKey = process.env.RAPIDAPI_KEY;
  var apiHost = process.env.RAPIDAPI_HOST || "bayut-api1.p.rapidapi.com";

  if (!apiKey) {
    return res.status(500).json({ error: "RAPIDAPI_KEY not configured" });
  }

  var params = new URLSearchParams();
  params.set("locationExternalIDs", p.locationId);
  params.set("purpose", "for-rent");
  params.set("rentFrequency", "yearly");
  params.set("categoryExternalID", p.category || "4");
  params.set("hitsPerPage", "10");
  params.set("page", "0");
  params.set("lang", "en");
  params.set("sort", "city-level-score");

  if (p.roomsMin) params.set("roomsMin", p.roomsMin);
  if (p.roomsMax) params.set("roomsMax", p.roomsMax);

  try {
    var url = "https://" + apiHost + "/properties/list?" + params.toString();
    var response = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": apiHost,
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Bayut API returned " + response.status });
    }

    var data = await response.json();
    var rents = [];
    var hits = data.hits || [];
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
