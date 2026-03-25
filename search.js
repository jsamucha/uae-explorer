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
  params.set("purpose", p.purpose || "for-sale");
  params.set("categoryExternalID", p.category || "4");
  params.set("hitsPerPage", p.limit || "25");
  params.set("page", p.page || "0");
  params.set("lang", "en");
  params.set("sort", p.sort || "city-level-score");

  if (p.roomsMin) params.set("roomsMin", p.roomsMin);
  if (p.roomsMax) params.set("roomsMax", p.roomsMax);
  if (p.bathsMin) params.set("bathsMin", p.bathsMin);
  if (p.priceMin) params.set("priceMin", p.priceMin);
  if (p.priceMax) params.set("priceMax", p.priceMax);
  if (p.areaMin) params.set("areaMin", p.areaMin);
  if (p.areaMax) params.set("areaMax", p.areaMax);
  if (p.furnishingStatus) params.set("furnishingStatus", p.furnishingStatus);
  if (p.completionStatus) params.set("completionStatus", p.completionStatus);
  if (p.purpose === "for-rent") params.set("rentFrequency", "yearly");

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
    var listings = (data.hits || []).map(function (h) {
      var createdAt = h.createdAt || 0;
      var updatedAt = h.updatedAt || 0;
      var areaSqft = h.area ? Math.round(h.area * 10.764) : null;
      var pricePerSqft = h.area && h.price ? Math.round(h.price / (h.area * 10.764)) : null;
      var priceChanged = updatedAt > 0 && createdAt > 0 && (updatedAt - createdAt) > 86400;

      var locParts = [];
      if (h.location && h.location[2] && h.location[2].name) locParts.push(h.location[2].name);
      if (h.location && h.location[3] && h.location[3].name) locParts.push(h.location[3].name);
      if (h.location && h.location[4] && h.location[4].name) locParts.push(h.location[4].name);

      var typeName = "";
      if (h.category && h.category[1] && h.category[1].name) typeName = h.category[1].name;
      else if (h.category && h.category[0] && h.category[0].name) typeName = h.category[0].name;

      return {
        id: h.externalID,
        title: h.title || "",
        price: h.price,
        areaSqft: areaSqft,
        pricePerSqft: pricePerSqft,
        rooms: h.rooms,
        baths: h.baths,
        type: typeName,
        location: locParts.join(", "),
        photo: h.coverPhoto && h.coverPhoto.url ? h.coverPhoto.url : null,
        furnishing: h.furnishingStatus || "",
        completion: h.completionStatus || "",
        url: h.shareUrl || (h.externalID ? "https://www.bayut.com/property/details-" + h.externalID + ".html" : null),
        agency: h.agency && h.agency.name ? h.agency.name : "",
        added: createdAt ? new Date(createdAt * 1000).toLocaleDateString("en-GB") : null,
        updated: updatedAt ? new Date(updatedAt * 1000).toLocaleDateString("en-GB") : null,
        priceChanged: priceChanged,
        verified: h.isVerified || false,
      };
    });

    return res.status(200).json({
      listings: listings,
      total: data.nbHits || 0,
      pages: data.nbPages || 0,
      page: data.page || 0,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
