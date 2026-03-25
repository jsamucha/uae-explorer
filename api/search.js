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
  if (p.rent_frequency) params.set("rent_frequency", p.rent_frequency);
  if (p.purpose === "for-rent") params.set("rent_frequency", p.rent_frequency || "yearly");

  try {
    var url = "https://" + apiHost + "/search-property?" + params.toString();
    var response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json", "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": apiHost },
    });
    if (!response.ok) return res.status(200).json({ error: "Bayut returned " + response.status, listings: [] });

    var raw = await response.json();
    var hits = [];
    var total = 0;
    var pages = 0;

    if (raw.data) {
      hits = raw.data.hits || raw.data.properties || raw.data.listings || raw.data.results || [];
      total = raw.data.nbHits || raw.data.total || hits.length;
      pages = raw.data.nbPages || raw.data.total_pages || Math.ceil(total / 24) || 1;
    }

    var listings = [];
    for (var i = 0; i < hits.length; i++) {
      var h = hits[i];
      var createdAt = h.createdAt || 0;
      var updatedAt = h.updatedAt || 0;
      var areaSqft = h.area ? Math.round(h.area) : null;
      var price = h.price || 0;
      var pricePerSqft = areaSqft && price ? Math.round(price / areaSqft) : null;
      var priceChanged = updatedAt > 0 && createdAt > 0 && (updatedAt - createdAt) > 86400;

      var title = "";
      if (h.title) title = (typeof h.title === "object" && h.title.en) ? h.title.en : (typeof h.title === "string" ? h.title : "");

      var locParts = [];
      if (h.location && Array.isArray(h.location)) {
        for (var j = 0; j < h.location.length; j++) {
          var locName = "";
          if (h.location[j] && h.location[j].name) {
            locName = (typeof h.location[j].name === "object" && h.location[j].name.en) ? h.location[j].name.en : (typeof h.location[j].name === "string" ? h.location[j].name : "");
          }
          if (locName) locParts.push(locName);
        }
      }

      var typeName = "";
      if (h.category && Array.isArray(h.category)) {
        var cat = h.category[h.category.length - 1] || h.category[0];
        if (cat && cat.name) {
          typeName = (typeof cat.name === "object" && cat.name.en) ? cat.name.en : (typeof cat.name === "string" ? cat.name : "");
        }
      }

      var photoUrl = null;
      if (h.coverPhoto && h.coverPhoto.url) photoUrl = h.coverPhoto.url;
      else if (h.photos && h.photos.length && h.photos[0].url) photoUrl = h.photos[0].url;

      var externalId = h.externalID || h.id || "";
      var listingUrl = h.shareUrl || (externalId ? "https://www.bayut.com/property/details-" + externalId + ".html" : null);

      listings.push({
        id: String(externalId),
        title: title,
        price: price,
        areaSqft: areaSqft,
        pricePerSqft: pricePerSqft,
        rooms: h.rooms != null ? h.rooms : null,
        baths: h.baths != null ? h.baths : null,
        type: typeName,
        location: locParts.length > 2 ? locParts.slice(-3).join(", ") : locParts.join(", "),
        photo: photoUrl,
        furnishing: h.furnishingStatus || "",
        completion: h.completionStatus || "",
        url: listingUrl,
        agency: (h.agency && h.agency.name) ? (typeof h.agency.name === "object" ? h.agency.name.en || "" : h.agency.name) : "",
        added: createdAt ? new Date(createdAt * 1000).toLocaleDateString("en-GB") : null,
        updated: updatedAt ? new Date(updatedAt * 1000).toLocaleDateString("en-GB") : null,
        priceChanged: priceChanged,
        verified: h.isVerified || false,
      });
    }

    return res.status(200).json({ listings: listings, total: total, pages: pages, page: parseInt(p.page || "1", 10) });
  } catch (err) {
    return res.status(500).json({ error: err.message, listings: [] });
  }
}