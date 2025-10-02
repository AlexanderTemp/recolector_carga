type MetricType = "counter" | "gauge" | "rate" | "trend";
type MetricContains = "data" | "time" | string;

export interface Metric {
  type: MetricType;
  contains: MetricContains;
  values: Record<string, number>;
  thresholds?: Record<
    string,
    { ok: boolean; threshold: number; value: number }
  >;
}

export interface Check {
  name: string;
  path: string;
  id: string;
  passes: number;
  fails: number;
}

export interface Group {
  name: string;
  path?: string;
  id?: string;
  groups: Group[];
  checks: Check[];
}

export interface Options {
  indent?: string;
  enableColors?: boolean;
  summaryTimeUnit?: string | null;
  summaryTrendStats?: string[];
  name?: string;
}

export interface DataSummary {
  root_group: Group;
  options: Options;
  metrics: Record<string, Metric>;
}

const forEach = <T>(
  obj: Record<string, T>,
  callback: (key: string, value: T) => boolean | void
) => {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (callback(key, obj[key])) break;
    }
  }
};

const palette = {
  reset: 0,
  bold: 1,
  faint: 2,
  red: 31,
  green: 32,
  cyan: 36,
  white: 37,
  gray: 90,
};

const groupPrefix = "■";
const detailsPrefix = "↳";
const succMark = "✓";
const failMark = "✗";

const defaultOptions: Options = {
  indent: " ",
  enableColors: true,
  summaryTimeUnit: null,
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)"],
};

function strWidth(s: string): number {
  const data = s.normalize("NFKC");
  let inEscSeq = false;
  let inLongEscSeq = false;
  let width = 0;
  for (const char of data) {
    if (char === "\x1b") {
      inEscSeq = true;
      continue;
    }
    if (inEscSeq && char === "[") {
      inLongEscSeq = true;
      continue;
    }
    if (
      inEscSeq &&
      inLongEscSeq &&
      char.charCodeAt(0) >= 0x40 &&
      char.charCodeAt(0) <= 0x7e
    ) {
      inEscSeq = false;
      inLongEscSeq = false;
      continue;
    }
    if (
      inEscSeq &&
      !inLongEscSeq &&
      char.charCodeAt(0) >= 0x40 &&
      char.charCodeAt(0) <= 0x5f
    ) {
      inEscSeq = false;
      continue;
    }
    if (!inEscSeq && !inLongEscSeq) width++;
  }
  return width;
}

function displayNameForMetric(name: string): string {
  const subMetricPos = name.indexOf("{");
  if (subMetricPos >= 0) {
    return "{ " + name.substring(subMetricPos + 1, name.length - 1) + " }";
  }
  return name;
}

function indentForMetric(name: string): string {
  return name.indexOf("{") >= 0 ? "  " : "";
}

function humanizeBytes(bytes: number): string {
  const units = ["B", "kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const base = 1000;
  if (bytes < 10) return bytes + " B";
  const e = Math.floor(Math.log(bytes) / Math.log(base));
  const suffix = units[e | 0];
  const val = Math.floor((bytes / Math.pow(base, e)) * 10 + 0.5) / 10;
  return val.toFixed(val < 10 ? 1 : 0) + " " + suffix;
}

const unitMap = {
  s: { unit: "s", coef: 0.001 },
  ms: { unit: "ms", coef: 1 },
  us: { unit: "µs", coef: 1000 },
};

function toFixedNoTrailingZeros(val: number, prec: number): string {
  return parseFloat(val.toFixed(prec)).toString();
}

function toFixedNoTrailingZerosTrunc(val: number, prec: number): string {
  const mult = Math.pow(10, prec);
  return toFixedNoTrailingZeros(Math.trunc(mult * val) / mult, prec);
}

function humanizeGenericDuration(dur: number): string {
  if (dur === 0) return "0s";
  if (dur < 0.001) return Math.trunc(dur * 1_000_000) + "ns";
  if (dur < 1) return toFixedNoTrailingZerosTrunc(dur * 1000, 2) + "µs";
  if (dur < 1000) return toFixedNoTrailingZerosTrunc(dur, 2) + "ms";

  let result =
    toFixedNoTrailingZerosTrunc((dur % 60000) / 1000, dur > 60000 ? 0 : 2) +
    "s";
  let rem = Math.trunc(dur / 60000);
  if (rem < 1) return result;
  result = (rem % 60) + "m" + result;
  rem = Math.trunc(rem / 60);
  if (rem < 1) return result;
  return rem + "h" + result;
}

function humanizeDuration(dur: number, timeUnit?: string | null): string {
  if (timeUnit && unitMap.hasOwnProperty(timeUnit)) {
    const u = unitMap[timeUnit as keyof typeof unitMap];
    return (dur * u.coef).toFixed(2) + u.unit;
  }
  return humanizeGenericDuration(dur);
}

function humanizeValue(
  val: number,
  metric: Metric,
  timeUnit?: string | null
): string {
  if (metric.type === "rate")
    return (Math.trunc(val * 10000) / 100).toFixed(2) + "%";

  switch (metric.contains) {
    case "data":
      return humanizeBytes(val);
    case "time":
      return humanizeDuration(val, timeUnit);
    default:
      return toFixedNoTrailingZeros(val, 6);
  }
}

function nonTrendMetricValueForSum(
  metric: Metric,
  timeUnit?: string | null
): string[] {
  switch (metric.type) {
    case "counter":
      return [
        humanizeValue(metric.values.count, metric, timeUnit),
        humanizeValue(metric.values.rate, metric, timeUnit) + "/s",
      ];
    case "gauge":
      return [
        humanizeValue(metric.values.value, metric, timeUnit),
        "min=" + humanizeValue(metric.values.min, metric, timeUnit),
        "max=" + humanizeValue(metric.values.max, metric, timeUnit),
      ];
    case "rate":
      return [
        humanizeValue(metric.values.rate, metric, timeUnit),
        succMark + " " + metric.values.passes,
        failMark + " " + metric.values.fails,
      ];
    default:
      return ["[no data]"];
  }
}

function trendMetricValueForSum(
  metric: Metric,
  trendStats: string[],
  timeUnit?: string | null
): { labels: string[]; values: string[] } {
  const labels: string[] = [];
  const values: string[] = [];

  for (const stat of trendStats) {
    if (metric.values.hasOwnProperty(stat)) {
      const value = humanizeValue(
        Number(metric.values[stat]),
        metric,
        timeUnit
      );
      labels.push(stat + "=");
      values.push(value);
    }
  }

  return { labels, values };
}

function summarizeCheck(
  indent: string,
  check: Check,
  decorate: (text: string, ...colors: number[]) => string
): string {
  if (check.fails === 0)
    return decorate(indent + succMark + " " + check.name, palette.green);

  const succPercent = Math.floor(
    (100 * check.passes) / (check.passes + check.fails)
  );
  return decorate(
    `${indent}${failMark} ${check.name}\n${indent} ${detailsPrefix}  ${succPercent}% — ${succMark} ${check.passes} / ${failMark} ${check.fails}`,
    palette.red
  );
}

function summarizeGroup(
  indent: string,
  group: Group,
  decorate: (text: string, ...colors: number[]) => string
): string[] {
  const result: string[] = [];
  if (group.name !== "") {
    result.push(indent + groupPrefix + " " + group.name + "\n");
    indent += "  ";
  }
  for (const check of group.checks)
    result.push(summarizeCheck(indent, check, decorate));
  if (group.checks.length > 0) result.push("");
  for (const subgroup of group.groups)
    result.push(...summarizeGroup(indent, subgroup, decorate));
  return result;
}

function summarizeMetrics(
  options: Options,
  data: DataSummary,
  decorate: (text: string, ...colors: number[]) => string
): string[] {
  const indent = options.indent! + "  ";
  const result: string[] = [];

  const names: string[] = [];
  let nameLenMax = 0;
  const nonTrendValues: Record<string, string> = {};
  let nonTrendValueMaxLen = 0;
  const nonTrendExtras: Record<string, string[]> = {};
  const nonTrendExtraMaxLens: number[] = [0, 0];

  // Nuevas variables para manejar el formato de columnas
  const trendMetrics: Record<string, { labels: string[]; values: string[] }> =
    {};
  const trendLabelMaxLens: number[] = [];
  const trendValueMaxLens: number[] = [];

  forEach(data.metrics, (name, metric) => {
    names.push(name);
    const displayName = indentForMetric(name) + displayNameForMetric(name);
    const displayNameWidth = strWidth(displayName);
    if (displayNameWidth > nameLenMax) nameLenMax = displayNameWidth;

    if (metric.type === "trend") {
      const trendStats = options.summaryTrendStats || [
        "avg",
        "min",
        "med",
        "max",
        "p(90)",
        "p(95)",
      ];
      const labels: string[] = [];
      const values: string[] = [];

      // Calcular máximo ancho para labels y valores
      trendStats.forEach((stat, index) => {
        if (metric.values.hasOwnProperty(stat)) {
          const value = humanizeValue(
            Number(metric.values[stat]),
            metric,
            options.summaryTimeUnit
          );
          const label = stat + "=";

          labels.push(label);
          values.push(value);

          // Actualizar máximos
          if (trendLabelMaxLens.length <= index) {
            trendLabelMaxLens.push(strWidth(label));
          } else {
            trendLabelMaxLens[index] = Math.max(
              trendLabelMaxLens[index],
              strWidth(label)
            );
          }

          if (trendValueMaxLens.length <= index) {
            trendValueMaxLens.push(strWidth(value));
          } else {
            trendValueMaxLens[index] = Math.max(
              trendValueMaxLens[index],
              strWidth(value)
            );
          }
        }
      });

      trendMetrics[name] = { labels, values };
      return;
    }

    const values = nonTrendMetricValueForSum(metric, options.summaryTimeUnit);
    nonTrendValues[name] = values[0];
    const valueLen = strWidth(values[0]);
    if (valueLen > nonTrendValueMaxLen) nonTrendValueMaxLen = valueLen;
    nonTrendExtras[name] = values.slice(1);
    for (let i = 1; i < values.length; i++) {
      const extraLen = strWidth(values[i]);
      if (extraLen > nonTrendExtraMaxLens[i - 1])
        nonTrendExtraMaxLens[i - 1] = extraLen;
    }
  });

  names.sort();

  const getData = (name: string) => {
    if (trendMetrics.hasOwnProperty(name)) {
      const { labels, values } = trendMetrics[name];
      const formattedParts: string[] = [];

      // Formatear cada par label=valor con espaciado fijo
      labels.forEach((label, index) => {
        const value = values[index];
        const formattedLabel =
          decorate(label, palette.faint) +
          " ".repeat(trendLabelMaxLens[index] - strWidth(label));
        const formattedValue =
          decorate(value, palette.cyan) +
          " ".repeat(trendValueMaxLens[index] - strWidth(value));

        formattedParts.push(formattedLabel + formattedValue);
      });

      return formattedParts.join("  "); // Doble espacio entre columnas
    }

    const value = nonTrendValues[name];
    let fmtData =
      decorate(value, palette.cyan) +
      " ".repeat(nonTrendValueMaxLen - strWidth(value));
    const extras = nonTrendExtras[name];

    if (extras.length > 0) {
      const formattedExtras = extras.map((extra) => {
        if (extra.includes("=")) {
          const [label, val] = extra.split("=");
          const labelWidth = strWidth(label + "=");
          const valueWidth = strWidth(val);
          const totalWidth = labelWidth + valueWidth;

          return (
            decorate(label + "=", palette.faint) + decorate(val, palette.cyan)
          );
        } else if (extra.includes("✓") || extra.includes("✗")) {
          return decorate(extra, palette.cyan, palette.faint);
        }
        return decorate(extra, palette.cyan, palette.faint);
      });
      fmtData += "  " + formattedExtras.join("  ");
    }
    return fmtData;
  };

  for (const name of names) {
    const metric = data.metrics[name];
    let mark = " ";
    let markColor = (text: string) => text;

    if (metric.thresholds) {
      mark = succMark;
      markColor = (text: string) => decorate(text, palette.green);
      forEach(metric.thresholds, (_, threshold) => {
        if (!threshold.ok) {
          mark = failMark;
          markColor = (text: string) => decorate(text, palette.red);
          return true;
        }
      });
    }

    const fmtIndent = indentForMetric(name);
    let fmtName = displayNameForMetric(name);

    // Asegurar que los puntos de alineación sean consistentes
    const dotsNeeded = nameLenMax - strWidth(fmtName) - strWidth(fmtIndent) + 2;
    const dots = dotsNeeded > 0 ? ".".repeat(dotsNeeded) : "...";

    fmtName = fmtName + decorate(dots + ":", palette.faint);

    result.push(
      indent + fmtIndent + markColor(mark) + " " + fmtName + " " + getData(name)
    );
  }

  return result;
}

export function generateTextSummary(
  data: DataSummary,
  options: Options = {}
): string {
  const mergedOpts: Options = {
    ...defaultOptions,
    ...data.options,
    ...options,
  };
  let lines: string[] = [];

  let decorate = (text: string, ..._: number[]) => text;
  if (mergedOpts.enableColors) {
    decorate = (text: string, ...colors: number[]) =>
      "\x1b[" + colors.join(";") + "m" + text + "\x1b[0m";
  }

  lines.push("");
  lines.push(decorate("     execution: local", palette.bold));
  lines.push(decorate("        output: -", palette.bold));
  lines.push(decorate("        script: carga.js", palette.bold));
  lines.push("");

  const checks = data.metrics["checks"];
  if (checks) {
    const totalChecks = checks.values.passes + checks.values.fails;
    const checkPercent =
      totalChecks > 0
        ? ((checks.values.passes / totalChecks) * 100).toFixed(2)
        : "0.00";

    lines.push(
      decorate(
        `     checks..................: ${checkPercent}% ✓ ${checks.values.passes} ✗ ${checks.values.fails}`,
        checks.values.fails === 0 ? palette.green : palette.red
      )
    );
  }

  lines.push(
    ...summarizeGroup(mergedOpts.indent! + "    ", data.root_group, decorate)
  );

  if (lines[lines.length - 1] !== "") {
    lines.push("");
  }

  lines.push(...summarizeMetrics(mergedOpts, data, decorate));

  return lines.join("\n");
}

const replacements: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "'": "&#39;",
  '"': "&quot;",
};

function escapeHTML(str: string): string {
  return str.replace(/[&<>'"]/g, (char) => replacements[char]);
}

export function generateJUnitXML(
  data: DataSummary,
  options?: Options & { name?: string }
): string {
  let failures = 0;
  const cases: string[] = [];

  forEach(data.metrics, (metricName, metric) => {
    if (!metric.thresholds) return;
    forEach(metric.thresholds, (thresholdName, threshold) => {
      if (threshold.ok) {
        cases.push(
          `<testcase name="${escapeHTML(metricName)} - ${escapeHTML(
            thresholdName
          )}" />`
        );
      } else {
        failures++;
        cases.push(
          `<testcase name="${escapeHTML(metricName)} - ${escapeHTML(
            thresholdName
          )}"><failure message="failed" /></testcase>`
        );
      }
    });
  });

  const name = options?.name ? escapeHTML(options.name) : "k6 thresholds";

  return `<?xml version="1.0"?>\n<testsuites tests="${
    cases.length
  }" failures="${failures}">\n<testsuite name="${name}" tests="${
    cases.length
  }" failures="${failures}">\n${cases.join("\n")}\n</testsuite>\n</testsuites>`;
}
