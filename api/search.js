export default async function handler(req, res) {
  var p = req.query;
  var apiKey = process.env.RAPIDAPI_KEY;
  var apiHost = process.env.RAPIDAPI_HOST || "bayut14.p.rapidapi.com";
  if (!apiKey) return res.status(500).json({ error: "RAPIDAPI_KEY not configured" });

  var params = new URLSearchParams();
  params.set("purpose", p.purpose || "for-sale");
  params.set("page", p.page || "1");
  params.set("langs", "en");
  if (p.location_ids) params.set("location_ids", p.location_ids);
  if (p.rooms) params.set("rooms", p.rooms);
  if (p.baths) params.set("baths", p.baths);
  if (p.price_min) params.set("price_min", p.price_min);
  if (p.price_max) params.set("price_max", p.price_max);
  if (p.area_min) params.set("area_min", p.area_min);
  if (p.area_max) params.set("area_max", p.area_max);
  if (p.property_type) params.set("property_type", p.property_type);
  if (p.is_furnished) params.set("is_furnished", p.is_furnished);
  if (p.completion_status && p.completion_status !== "any") params.set("completion_status", p.completion_status);
  if (p.sort_order) params.set("sort_order", p.sort_order);
  if (p.purpose === "for-rent") params.set("rent_frequency", p.rent_frequency || "yearly");

  try {
    var url = "https://" + apiHost + "/search-property?" + params.toString();
    var response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json", "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": apiHost },
    });
    if (!response.ok) return res.status(200).json({ error: "Bayut returned " + response.status, listings: [] });

    var raw = await response.json();
    var data = raw.data || raw;
    var hits = data.hits || data.properties || data.listings || data.results || [];
    var total = data.nbHits || data.total || data.count || hits.length;
    var pages = data.nbPages || data.total_pages || 0;
    if (!pages && total > 0) pages = Math.ceil(total / 24);
    if (pages < 1) pages = 1;

    var listings = [];
    for (var i = 0; i < hits.length; i++) {
      var h = hits[i];
      listings.push(parseHit(h));
    }

    return res.status(200).json({ listings: listings, total: total, pages: pages, page: parseInt(p.page || "1", 10) });
  } catch (err) {
    return res.status(500).json({ error: err.message, listings: [] });
  }
}

function extractName(field) {
  if (!field) return "";
  if (typeof field === "string") return field;
  if (typeof field === "object" && field.en) return field.en;
  return "";
}

function parseHit(h) {
  var createdAt = h.createdAt || 0;
  var updatedAt = h.updatedAt || 0;
  var priceChanged = updatedAt > 0 && createdAt > 0 && (updatedAt - createdAt) > 86400;

  var areaSqft = null;
  if (h.area) {
    areaSqft = Math.round(h.area);
    if (areaSqft < 50 && h.price && h.price > 100000) areaSqft = Math.round(h.area * 10.764);
  }
  if (!areaSqft && h.sqArea) areaSqft = Math.round(h.sqArea);
  if (!areaSqft && h.size) areaSqft = Math.round(h.size);

  var price = h.price || 0;
  var pricePerSqft = areaSqft && price ? Math.round(price / areaSqft) : null;

  var title = extractName(h.title);

  var locParts = [];
  if (h.location && Array.isArray(h.location)) {
    for (var j = 0; j < h.location.length; j++) {
      var ln = extractName(h.location[j] && h.location[j].name);
      if (ln) locParts.push(ln);
    }
  }

  /* Extract the most specific location IDs for comps matching */
  var locationIds = [];
  if (h.location && Array.isArray(h.location)) {
    for (var k = 0; k < h.location.length; k++) {
      if (h.location[k] && h.location[k].externalID) locationIds.push(h.location[k].externalID);
    }
  }

  var typeName = "";
  if (h.category && Array.isArray(h.category)) {
    var cat = h.category[h.category.length - 1] || h.category[0];
    if (cat) typeName = extractName(cat.name);
  }

  var photoUrl = null;
  if (h.coverPhoto && h.coverPhoto.url) photoUrl = h.coverPhoto.url;
  else if (h.photos && h.photos.length && h.photos[0].url) photoUrl = h.photos[0].url;

  var externalId = h.externalID || h.id || "";
  var listingUrl = h.shareUrl || (externalId ? "https://www.bayut.com/property/details-" + externalId + ".html" : null);

  return {
    id: String(externalId),
    title: title,
    price: price,
    areaSqft: areaSqft,
    pricePerSqft: pricePerSqft,
    rooms: h.rooms != null ? h.rooms : null,
    baths: h.baths != null ? h.baths : null,
    type: typeName,
    location: locParts.length > 2 ? locParts.slice(-3).join(", ") : locParts.join(", "),
    locationIds: locationIds,
    photo: photoUrl,
    furnishing: h.furnishingStatus || "",
    completion: h.completionStatus || "",
    url: listingUrl,
    agency: (h.agency && h.agency.name) ? extractName(h.agency.name) : "",
    added: createdAt ? new Date(createdAt * 1000).toLocaleDateString("en-GB") : null,
    updated: updatedAt ? new Date(updatedAt * 1000).toLocaleDateString("en-GB") : null,
    priceChanged: priceChanged,
    verified: h.isVerified || false,
  };
}
