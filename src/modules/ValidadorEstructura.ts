import fs from "fs";

interface SummaryJson {
  root_group: {
    name: string;
    path: string;
    id: string;
    groups: any[];
    checks: {
      name: string;
      path: string;
      id: string;
      passes: number;
      fails: number;
    }[];
  };
  options: {
    summaryTimeUnit: string;
    noColor: boolean;
    summaryTrendStats: string[];
  };
  state: {
    testRunDurationMs: number;
    isStdOutTTY: boolean;
    isStdErrTTY: boolean;
  };
  metrics: Record<
    string,
    { type: string; contains: string; values: Record<string, number> }
  >;
}

export function validarSummaryManual(path: string): boolean {
  const raw = fs.readFileSync(path, "utf8");
  const data: unknown = JSON.parse(raw);

  if (typeof data !== "object" || data === null) return false;

  const d = data as any;

  if (!d.root_group || typeof d.root_group !== "object") return false;
  if (!Array.isArray(d.root_group.groups)) return false;
  if (!Array.isArray(d.root_group.checks)) return false;

  for (const check of d.root_group.checks) {
    if (
      typeof check.name !== "string" ||
      typeof check.path !== "string" ||
      typeof check.id !== "string" ||
      typeof check.passes !== "number" ||
      typeof check.fails !== "number"
    ) {
      return false;
    }
  }

  // Validar options
  if (!d.options || typeof d.options !== "object") return false;
  if (typeof d.options.summaryTimeUnit !== "string") return false;
  if (typeof d.options.noColor !== "boolean") return false;
  if (!Array.isArray(d.options.summaryTrendStats)) return false;

  // Validar state
  if (!d.state || typeof d.state !== "object") return false;
  if (
    typeof d.state.testRunDurationMs !== "number" ||
    typeof d.state.isStdOutTTY !== "boolean" ||
    typeof d.state.isStdErrTTY !== "boolean"
  ) {
    return false;
  }

  if (!d.metrics || typeof d.metrics !== "object") return false;
  for (const key in d.metrics) {
    const metric = d.metrics[key];
    if (
      typeof metric.type !== "string" ||
      typeof metric.contains !== "string" ||
      typeof metric.values !== "object"
    ) {
      return false;
    }
  }

  return true;
}
