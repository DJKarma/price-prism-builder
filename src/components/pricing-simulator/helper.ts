/* ──────────────────────────────────────────────
   Shared utilities for dropdown data & type-ahead
───────────────────────────────────────────────── */

import { debounce } from "lodash";

/** column → sorted unique values */
export const buildValueMap = (data: any[]) => {
  const map: Record<string, string[]> = {};
  data.forEach((u) => {
    Object.keys(u).forEach((k) => {
      if (!u[k]) return;
      if (!map[k]) map[k] = [];
      if (!map[k].includes(u[k])) map[k].push(u[k]);
    });
  });
  Object.keys(map).forEach((k) => map[k].sort());
  return map;
};

/** debounced loader for react-select AsyncSelect */
export const asyncUnitOptions = (units: string[]) =>
  debounce(
    (input: string, cb: (opts: { label: string; value: string }[]) => void) => {
      const q = (input || "").toLowerCase();
      cb(
        units
          .filter((u) => u.toLowerCase().includes(q))
          .slice(0, 20)
          .map((u) => ({ label: u, value: u }))
      );
    },
    200,
    { leading: false }
  );
