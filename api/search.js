export default async function handler(req, res) {
  var p = req.query;

  var apiKey = process.env.RAPIDAPI_KEY;
  var apiHost = process.env.RAPIDAPI_HOST || "bayut14.p.rapidapi.com";

  if (!apiKey) {
    return res.status(500).json({ error: "RAPIDAPI_KEY not configured" });
  }

  /* Build query string matching bayut14 API params exactly */
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
    var total = data.nbHits || data.total || data.count || hits.length;
    var pages = data.nbPages || data.total_pages || Math.ceil(total / 24) || 1;

    var listings = [];
    for (var i = 0; i < hits.length; i++) {
      var h = hits[i];
      var createdAt = h.createdAt || h.created_at || 0;
      var updatedAt = h.updatedAt || h.updated_at || 0;
      var areaVal = h.area || h.size || null;
      var areaSqft = null;
      if (areaVal) {
        /* API area_min/max is in sqft, so assume area is sqft too */
        areaSqft = Math.round(areaVal);
      }
      var price = h.price || 0;
      var pricePerSqft = areaSqft && price ? Math.round(price / areaSqft) : null;
      var priceChanged = updatedAt > 0 && createdAt > 0 && (updatedAt - createdAt) > 86400;

      var locParts = [];
      if (h.location) {
        if (Array.isArray(h.location)) {
          for (var j = 0; j < h.location.length; j++) {
            if (h.location[j] && h.location[j].name) locParts.push(h.location[j].name);
          }
        } else if (typeof h.location === "string") {
          locParts.push(h.location);
        }
      }
      if (!locParts.length && h.geography) {
        if (h.geography.level2 && h.geography.level2.name) locParts.push(h.geography.level2.name);
        if (h.geography.level3 && h.geography.level3.name) locParts.push(h.geography.level3.name);
      }

      var typeName = "";
      if (h.category) {
        if (Array.isArray(h.category)) {
          typeName = (h.category[1] && h.category[1].name) || (h.category[0] && h.category[0].name) || "";
        } else if (typeof h.category === "string") {
          typeName = h.category;
        }
      }
      if (!typeName && h.type) typeName = h.type;
      if (!typeName && h.property_type) typeName = h.property_type;

      var photoUrl = null;
      if (h.coverPhoto && h.coverPhoto.url) photoUrl = h.coverPhoto.url;
      else if (h.cover_photo && h.cover_photo.url) photoUrl = h.cover_photo.url;
      else if (h.photos && h.photos.length && h.photos[0].url) photoUrl = h.photos[0].url;
      else if (h.photo) photoUrl = h.photo;

      var externalId = h.externalID || h.external_id || h.id || "";
      var listingUrl = h.shareUrl || h.share_url || h.url || (externalId ? "https://www.bayut.com/property/details-" + externalId + ".html" : null);

      listings.push({
        id: String(externalId),
        title: h.title || h.name || "",
        price: price,
        areaSqft: areaSqft,
        pricePerSqft: pricePerSqft,
        rooms: h.rooms != null ? h.rooms : (h.bedrooms != null ? h.bedrooms : null),
        baths: h.baths != null ? h.baths : (h.bathrooms != null ? h.bathrooms : null),
        type: typeName,
        location: locParts.length > 2 ? locParts.slice(-3).join(", ") : locParts.join(", "),
        photo: photoUrl,
        furnishing: h.furnishingStatus || h.furnishing_status || h.is_furnished || "",
        completion: h.completionStatus || h.completion_status || "",
        url: listingUrl,
        agency: (h.agency && h.agency.name) ? h.agency.name : "",
        added: createdAt ? new Date(createdAt * 1000).toLocaleDateString("en-GB") : null,
        updated: updatedAt ? new Date(updatedAt * 1000).toLocaleDateString("en-GB") : null,
        priceChanged: priceChanged,
        verified: h.isVerified || h.is_verified || false,
      });
    }

    return res.status(200).json({
      listings: listings,
      total: total,
      pages: pages,
      page: parseInt(p.page || "1", 10),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
