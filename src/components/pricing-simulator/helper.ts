/*  --------  SHARED HELPER UTILITIES  --------
    - Build a map of column → unique values (for fast
      dropdown population without repeated scans)
    - Debounced async loader for unit-name type-ahead      */

import { debounce } from "lodash";

/** Construct { column: [sortedUniqueValues] } */
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

/** Return a debounced async loader compatible with react-select’s AsyncSelect */
export const asyncUnitOptions = (units: string[]) =>
  debounce(
    (input: string, callback: (options: { label: string; value: string }[]) => void) => {
      const q = (input || "").toLowerCase();
      callback(
        units
          .filter((u) => u.toLowerCase().includes(q))
          .slice(0, 20) // cap results
          .map((u) => ({ label: u, value: u }))
      );
    },
    200,
    { leading: false }
  );
