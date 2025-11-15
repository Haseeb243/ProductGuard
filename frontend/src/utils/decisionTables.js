// Utility to evaluate decision tables for Business Rules Testing

/**
 * Evaluate a decision table.
 * @param {Array<{conditions: Record<string, string|boolean|number|null|undefined>, actions: Record<string, boolean|string|number>}>} rules
 * @param {Record<string, any>} inputs - keyed by condition name
 * @returns {Record<string, any>} merged actions from the first matching rule(s)
 */
export function evaluateDecisionTable(rules, inputs) {
  if (!Array.isArray(rules)) return {};
  const normalizedInputs = normalizeValues(inputs);
  const outputs = {};
  for (const rule of rules) {
    if (matchesRule(rule.conditions || {}, normalizedInputs)) {
      Object.assign(outputs, rule.actions || {});
    }
  }
  return outputs;
}

function normalizeValues(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    out[k] = typeof v === "string" ? v.trim().toUpperCase() : v;
  }
  return out;
}

function matchesRule(conditions, inputs) {
  for (const [name, expectedRaw] of Object.entries(conditions)) {
    const expected =
      typeof expectedRaw === "string"
        ? expectedRaw.trim().toUpperCase()
        : expectedRaw;
    if (expected === "-" || expected === undefined) continue; // don't care
    const actual = inputs[name];
    if (
      typeof expected === "string" &&
      (expected === "Y" || expected === "N")
    ) {
      const actualYN = coerceToYN(actual);
      if (actualYN !== expected) return false;
    } else if (expected !== actual) {
      return false;
    }
  }
  return true;
}

function coerceToYN(value) {
  if (typeof value === "string") {
    const v = value.trim().toUpperCase();
    if (["Y", "YES", "TRUE", "T", "1"].includes(v)) return "Y";
    if (["N", "NO", "FALSE", "F", "0"].includes(v)) return "N";
  }
  if (typeof value === "boolean") return value ? "Y" : "N";
  if (typeof value === "number") return value ? "Y" : "N";
  return value ? "Y" : "N";
}

// Example rule set for SuperStores Policy #3
export const superStoresRules = [
  { conditions: { C1: "Y" }, actions: { A1: "Y" } },
  { conditions: { C1: "N", C3: "Y" }, actions: { A1: "Y" } },
  { conditions: { C1: "N", C3: "N" }, actions: { A1: "N" } },
  { conditions: { C2: "Y" }, actions: { A2: "Y" } },
];

export function evaluateSuperStores({
  repeatCustomer,
  usedSSCard,
  orderOver100,
}) {
  const inputs = { C1: repeatCustomer, C2: usedSSCard, C3: orderOver100 };
  return evaluateDecisionTable(superStoresRules, inputs);
}
