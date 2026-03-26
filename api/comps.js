export default async function handler(req, res) {
  var p = req.query;
  var apiKey = process.env.RAPIDAPI_KEY;
  var apiHost = process.env.RAPIDAPI_HOST || "bayut14.p.rapidapi.com";
  if (!apiKey) return res.status(500).json({ error: "RAPIDAPI_KEY not configured" });

  var locationId = p.location_ids || "";
  var areaSqft = parseInt(p.area_sqft || "0", 10);
  var rooms = p.rooms || "";
  var propertyType = p.property_type || "";

  if (!locationId) return res.status(200).json({ comps: [], avgRent: null, count: 0 });

  /*
   * area_min/area_max in the bayut14 search-property API accepts sqft values
   * (confirmed from the API docs screenshot). So we pass sqft directly.
   * But the response returns area in m2. We convert response area to sqft for display.
   */
  var comps = [];
  var attempts = [0.15, 0.30, 0.50];

  for (var a = 0; a < attempts.length; a++) {
    var margin = attempts[a];
    var params = new URLSearchParams();
    params.set("purpose", "for-rent");
    params.set("rent_frequency", "yearly");
    params.set("page", "1");
    params.set("langs", "en");
    params.set("location_ids", locationId);

    if (rooms) params.set("rooms", rooms);
    if (propertyType) params.set("property_type", propertyType);

    if (areaSqft > 0) {
      params.set("area_min", String(Math.round(areaSqft * (1 - margin))));
      params.set("area_max", String(Math.round(areaSqft * (1 + margin))));
    }

    try {
      var url = "https://" + apiHost + "/search-property?" + params.toString();
      var response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json", "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": apiHost },
      });
      if (!response.ok) continue;

      var raw = await response.json();
      var data = raw.data || raw;
      var hits = data.hits || data.properties || data.results || [];

      if (hits.length >= 3 || a === attempts.length - 1) {
        comps = hits;
        break;
      }
    } catch (err) {
      continue;
    }
  }

  var parsed = [];
  var rents = [];
  for (var i = 0; i < comps.length && i < 10; i++) {
    var h = comps[i];
    var rent = h.price || 0;
    if (rent > 0) rents.push(rent);

    var title = "";
    if (h.title) title = (typeof h.title === "object" && h.title.en) ? h.title.en : (typeof h.title === "string" ? h.title : "");

    /* Convert area from m2 to sqft */
    var compAreaSqft = null;
    if (h.area && typeof h.area === "number") {
      compAreaSqft = Math.round(h.area * 10.764);
    }

    var locParts = [];
    if (h.location && Array.isArray(h.location)) {
      for (var j = 0; j < h.location.length; j++) {
        var ln = "";
        if (h.location[j] && h.location[j].name) {
          ln = (typeof h.location[j].name === "object" && h.location[j].name.en) ? h.location[j].name.en : (typeof h.location[j].name === "string" ? h.location[j].name : "");
        }
        if (ln) locParts.push(ln);
      }
    }

    var externalId = h.externalID || h.id || "";
    parsed.push({
      id: String(externalId),
      title: title,
      rent: rent,
      areaSqft: compAreaSqft,
      rooms: h.rooms != null ? h.rooms : null,
      location: locParts.length > 2 ? locParts.slice(-3).join(", ") : locParts.join(", "),
      url: h.shareUrl || (externalId ? "https://www.bayut.com/property/details-" + externalId + ".html" : null),
      furnishing: h.furnishingStatus || "",
    });
  }

  var avgRent = null;
  if (rents.length > 0) {
    var sum = 0;
    for (var k = 0; k < rents.length; k++) sum += rents[k];
    avgRent = Math.round(sum / rents.length);
  }

  return res.status(200).json({
    comps: parsed,
    avgRent: avgRent,
    count: rents.length,
  });
}
