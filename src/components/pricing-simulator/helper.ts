// src/components/pricing-simulator/helpers.ts
import debounce from "lodash/debounce";

/** Build a map of every column → its unique sorted values */
export function buildValueMap(data: any[]): Record<string,string[]> {
  const map: Record<string,Set<string>> = {};
  data.forEach(row => {
    Object.entries(row).forEach(([k,v]) => {
      if (k.endsWith("_value") && v != null) {
        map[k.replace(/_value$/, "")] ||= new Set();
        map[k.replace(/_value$/, "")].add(String(v));
      }
    });
  });
  // also include explicit type/view/floor fields
  ["type","view","floor"].forEach(f => {
    map[f] ||= new Set();
    data.forEach(r => r[f] != null && map[f].add(String(r[f])));
  });
  return Object.fromEntries(
    Object.entries(map)
      .map(([k,s]) => [k, Array.from(s).sort()])
  );
}

/** Debounced async loader for react-select */
export const asyncUnitOptions = (data: any[]) =>
  debounce((input: string, cb: (opts: any[])=>void) => {
    const opts = Array.from(new Set(
      data
        .map(r => r.name)
        .filter(n => typeof n === "string" && n.toLowerCase().includes(input.toLowerCase()))
    )).map(n => ({ label: n, value: n }));
    cb(opts);
  }, 200);
