export default async function handler(req, res) {
  var p = req.query;
  var apiKey = process.env.RAPIDAPI_KEY;
  var apiHost = process.env.RAPIDAPI_HOST || "bayut14.p.rapidapi.com";
  if (!apiKey) return res.status(500).json({ error: "RAPIDAPI_KEY not configured" });

  var params = new URLSearchParams();
  params.set("purpose", p.purpose || "for-sale");
  params.set("page", p.page || "1");
  params.set("sort_by", p.sort_by || "date_desc");
  params.set("time_period", p.time_period || "12m");

  if (p.location_ids) params.set("location_ids", p.location_ids);
  if (p.beds) params.set("beds", p.beds);
  if (p.category_ids) params.set("category_ids", p.category_ids);
  if (p.area_min) params.set("area_min", p.area_min);
  if (p.area_max) params.set("area_max", p.area_max);
  if (p.price_min) params.set("price_min", p.price_min);
  if (p.price_max) params.set("price_max", p.price_max);
  if (p.completion_status && p.completion_status !== "any") params.set("completion_status", p.completion_status);

  try {
    var url = "https://" + apiHost + "/transactions?" + params.toString();
    var response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json", "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": apiHost },
    });
    if (!response.ok) return res.status(200).json({ error: "Bayut returned " + response.status, transactions: [] });

    var raw = await response.json();
    var data = raw.data || raw;
    var hits = data.hits || data.transactions || data.results || data.properties || [];
    if (Array.isArray(data) && !hits.length) hits = data;

    var total = data.nbHits || data.total || data.count || hits.length;
    var pages = data.nbPages || data.total_pages || 0;
    if (!pages && total > 0) pages = Math.ceil(total / 20);
    if (pages < 1) pages = 1;

    var transactions = [];
    for (var i = 0; i < hits.length; i++) {
      var t = hits[i];

      var locName = "";
      if (t.location) {
        if (typeof t.location === "string") locName = t.location;
        else if (t.location.name) locName = (typeof t.location.name === "object" && t.location.name.en) ? t.location.name.en : (typeof t.location.name === "string" ? t.location.name : "");
        else if (Array.isArray(t.location)) {
          var parts = [];
          for (var j = 0; j < t.location.length; j++) {
            var ln = "";
            if (t.location[j] && t.location[j].name) {
              ln = (typeof t.location[j].name === "object" && t.location[j].name.en) ? t.location[j].name.en : (typeof t.location[j].name === "string" ? t.location[j].name : "");
            }
            if (ln) parts.push(ln);
          }
          locName = parts.join(", ");
        }
      }
      if (!locName && t.area) locName = (typeof t.area === "object" && t.area.en) ? t.area.en : (typeof t.area === "string" ? t.area : "");
      if (!locName && t.building) locName = (typeof t.building === "object" && t.building.en) ? t.building.en : (typeof t.building === "string" ? t.building : "");

      var areaSqft = null;
      if (t.area_sqft) areaSqft = Math.round(t.area_sqft);
      else if (t.areaSqft) areaSqft = Math.round(t.areaSqft);
      else if (t.size) areaSqft = Math.round(t.size);
      else if (t.area && typeof t.area === "number") areaSqft = Math.round(t.area);

      var date = t.date || t.transaction_date || t.transactionDate || t.created || null;
      if (date && typeof date === "number") date = new Date(date * 1000).toLocaleDateString("en-GB");

      transactions.push({
        date: date || "",
        location: locName,
        areaSqft: areaSqft,
        price: t.price || t.amount || t.transaction_price || 0,
        purpose: t.purpose || t.type || t.transaction_type || "",
        beds: t.beds != null ? t.beds : (t.rooms != null ? t.rooms : null),
      });
    }

    return res.status(200).json({ transactions: transactions, total: total, pages: pages });
  } catch (err) {
    return res.status(500).json({ error: err.message, transactions: [] });
  }
}
