interface Metric {
  type: "counter" | "gauge" | "rate" | "trend";
  contains: "data" | "time" | string;
  values: Record<string, number>;
  thresholds?: Record<
    string,
    { ok: boolean; threshold: number; value: number }
  >;
}

interface Check {
  name: string;
  path: string;
  id: string;
  passes: number;
  fails: number;
}

interface Group {
  name: string;
  path?: string;
  id?: string;
  groups: Group[];
  checks: Check[];
}

interface Options {
  indent?: string;
  enableColors?: boolean;
  summaryTimeUnit?: string | null;
  summaryTrendStats?: string[];
  name?: string;
}

interface DataSummary {
  root_group: Group;
  options: Options;
  metrics: Record<string, Metric>;
}
