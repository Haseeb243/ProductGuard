/**
 * Build a descriptive, deduplicated location string from the BigDataCloud response.
 * Falls back to null if nothing meaningful is available.
 */
export function buildDescriptiveLocation(data) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const administrative = Array.isArray(data?.localityInfo?.administrative)
    ? data.localityInfo.administrative.map((item) => item?.name)
    : [];
  const informative = Array.isArray(data?.localityInfo?.informative)
    ? data.localityInfo.informative.map((item) => item?.name)
    : [];

  const rawParts = [
    data.locality,
    data.city,
    data.localityUnicode,
    data.suburb,
    data.postcode,
    ...administrative,
    data.principalSubdivision,
    data.principalSubdivisionCode,
    ...informative,
    data.countryName,
    data.continent,
  ];

  const seen = new Set();
  const parts = [];

  rawParts.forEach((part) => {
    if (!part) return;
    const value = String(part).trim();
    if (!value || value === "-" || value === "0") return;
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    parts.push(value);
  });

  if (!parts.length) {
    return null;
  }

  return parts.join(", ");
}
