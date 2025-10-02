/**
 * Build a descriptive, deduplicated location string from the BigDataCloud response.
 * Falls back to null if nothing meaningful is available.
 */
export function buildDescriptiveLocation(data) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const sanitise = (value) => {
    if (!value) return null;
    const trimmed = String(value).trim();
    if (!trimmed || trimmed === "-" || trimmed === "0") return null;
    return trimmed.replace(/\s+/g, " ");
  };

  const disallowedExact = new Set([
    "asia",
    "europe",
    "africa",
    "north america",
    "south america",
    "antarctica",
    "oceania",
  ]);

  const disallowedPatterns = [
    /^zone\b/i,
    /^asia\//i,
    /^indian\s+subcontinent$/i,
    /^pk-/i,
  ];

  const isAllowed = (value) => {
    if (!value) return false;
    const lower = value.toLowerCase();
    if (disallowedExact.has(lower)) return false;
    return !disallowedPatterns.some((pattern) => pattern.test(value));
  };

  const administrative = Array.isArray(data?.localityInfo?.administrative)
    ? data.localityInfo.administrative
    : [];
  const informative = Array.isArray(data?.localityInfo?.informative)
    ? data.localityInfo.informative
    : [];

  const sortedAdministrative = [...administrative].sort(
    (a, b) => (b?.order ?? 0) - (a?.order ?? 0)
  );

  const findFirst = (list, predicate) => {
    for (const item of list) {
      if (predicate(item)) {
        return sanitise(item?.name);
      }
    }
    return null;
  };

  const localityDescriptionPattern =
    /(Village|Suburb|Neighbourhood|Neighborhood|Township|Town)/i;
  const cityDescriptionPattern = /(City|Capital|Municipality)/i;
  const regionDescriptionPattern =
    /(Province|State|Region|Territory|Division)/i;

  const neighbourhood =
    sanitise(data.suburb) ||
    sanitise(data.localityUnicode) ||
    sanitise(data.village) ||
    findFirst(sortedAdministrative, (item) =>
      localityDescriptionPattern.test(item?.description || "")
    ) ||
    findFirst([...informative].reverse(), (item) =>
      localityDescriptionPattern.test(item?.description || "")
    );

  const city =
    sanitise(data.city) ||
    sanitise(data.municipality) ||
    sanitise(data.locality) ||
    findFirst(sortedAdministrative, (item) =>
      cityDescriptionPattern.test(item?.description || "")
    );

  const region =
    sanitise(data.principalSubdivision) ||
    findFirst(sortedAdministrative, (item) =>
      regionDescriptionPattern.test(item?.description || "")
    );

  const country = sanitise(data.countryName);

  const parts = [];
  const seen = new Set();
  const pushPart = (value) => {
    if (!value || !isAllowed(value)) return;
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    parts.push(value);
  };

  pushPart(neighbourhood);
  pushPart(city);
  if (!city) {
    pushPart(region);
  }
  pushPart(country);

  if (parts.length < 3) {
    const fallbackCandidates = [
      !city ? region : null,
      sanitise(data.county),
      !city ? sanitise(data.locality) : null,
      findFirst(sortedAdministrative, () => true),
    ];
    fallbackCandidates.forEach(pushPart);
  }

  if (!parts.length) {
    return null;
  }

  return parts.slice(0, 3).join(", ");
}
