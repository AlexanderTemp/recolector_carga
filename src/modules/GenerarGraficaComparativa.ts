import fs from "fs";
import path from "path";
import { createCanvas } from "canvas";
import * as echarts from "echarts";
import { FolderJsons, JsonFile } from "../types/global";

const calcularPorcentajeExito = (data: any): number => {
  if (!data.metrics || !data.metrics.checks || !data.metrics.checks.values) {
    return 0;
  }
  const rate = data.metrics.checks.values.rate;

  return Math.floor(rate * 10000) / 100;
};

const obtenerMetricasK6 = (data: any) => {
  return {
    checks: data.metrics?.checks?.values?.rate || 0,
    http_reqs: data.metrics?.http_reqs?.values?.count || 0,
    http_req_failed: data.metrics?.http_req_failed?.values?.rate || 0,
    http_req_duration: {
      avg: data.metrics?.http_req_duration?.values?.avg || 0,
      p95: data.metrics?.http_req_duration?.values?.p95 || 0,
    },
  };
};

export const generarReporteBarras = async (
  folderJsons: FolderJsons,
  outputBaseDir: string
) => {
  try {
    if (!fs.existsSync(outputBaseDir)) {
      fs.mkdirSync(outputBaseDir, { recursive: true });
    }

    for (const [folderName, folderData] of Object.entries(folderJsons)) {
      const folderOutput = path.join(outputBaseDir, folderName);
      if (!fs.existsSync(folderOutput))
        fs.mkdirSync(folderOutput, { recursive: true });

      const nombres: string[] = [];
      const porcentajes: number[] = [];
      const metricasAdicionales: any[] = [];

      for (const jsonFile of folderData.jsons) {
        try {
          const raw = fs.readFileSync(jsonFile.absolutePath, "utf-8");
          const data = JSON.parse(raw);

          nombres.push(jsonFile.name);
          const porcentaje = calcularPorcentajeExito(data);
          porcentajes.push(porcentaje);
          metricasAdicionales.push(obtenerMetricasK6(data));
        } catch (err) {
          console.error(`❌ Error leyendo ${jsonFile.absolutePath}:`, err);
        }
      }

      if (nombres.length === 0) continue;

      const width = 1000;
      const height = 600;
      const canvas = createCanvas(width, height);
      const chart = echarts.init(canvas as any, null, {
        renderer: "canvas",
        width,
        height,
      });

      const getBarColor = (value: number) => {
        if (value >= 95) return "#10b981";
        if (value >= 90) return "#34d399";
        if (value >= 85) return "#f59e0b";
        if (value >= 80) return "#f97316";
        return "#ef4444";
      };

      const option = {
        backgroundColor: "#ffffff",
        title: {
          text: `📊 Reporte de Pruebas de Carga K6 - ${folderName}`,
          left: "center",
          textStyle: {
            color: "#1f2937",
            fontSize: 18,
            fontWeight: "bold",
          },
          subtext: "Éxito en Checks vs Peticiones HTTP",
          subtextStyle: {
            color: "#6b7280",
            fontSize: 12,
          },
        },
        legend: {
          data: ["Éxito de Checks", "Meta 95%"],
          bottom: 40,
          textStyle: {
            color: "#4b5563",
          },
        },
        xAxis: {
          type: "category",
          data: nombres,
          axisLabel: {
            rotate: 30,
            color: "#4b5563",
            fontSize: 11,
            fontWeight: "bold",
          },
          axisLine: {
            lineStyle: {
              color: "#d1d5db",
            },
          },
          axisTick: {
            alignWithLabel: true,
          },
        },
        yAxis: [
          {
            type: "value",
            name: "Porcentaje de Éxito %",
            nameTextStyle: {
              color: "#4b5563",
              fontWeight: "bold",
            },
            min: 0,
            max: 100,
            axisLabel: {
              formatter: "{value}%",
              color: "#4b5563",
            },
            axisLine: {
              lineStyle: {
                color: "#d1d5db",
              },
            },
            splitLine: {
              lineStyle: {
                color: "#f3f4f6",
                type: "solid",
              },
            },
          },
          {
            type: "value",
            name: "Peticiones HTTP (miles)",
            nameTextStyle: {
              color: "#4b5563",
              fontWeight: "bold",
            },
            position: "right",
            axisLabel: {
              formatter: (value: number) => `${(value / 1000).toFixed(0)}k`,
              color: "#4b5563",
            },
            axisLine: {
              lineStyle: {
                color: "#d1d5db",
              },
            },
          },
        ],
        grid: {
          left: "5%",
          right: "8%",
          bottom: "15%",
          top: "20%",
          containLabel: true,
        },
        series: [
          {
            name: "Éxito de Checks",
            data: porcentajes.map((value, index) => ({
              value: value,
              itemStyle: {
                color: getBarColor(value),
              },
            })),
            type: "bar",
            barWidth: "50%",
            itemStyle: {
              borderRadius: [6, 6, 0, 0],
              borderWidth: 0,
              shadowColor: "rgba(0, 0, 0, 0.1)",
              shadowBlur: 4,
              shadowOffsetY: 2,
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 8,
                shadowColor: "rgba(0, 0, 0, 0.2)",
              },
            },
            label: {
              show: true,
              position: "top",
              formatter: (params: any) =>
                `${Math.floor(params.value * 10) / 10}%`,
              color: "#1f2937",
              fontWeight: "bold",
              fontSize: 10,
              textBorderColor: "#ffffff",
              textBorderWidth: 2,
            },
          },
        ],
        markLine: {
          symbol: "none",
          lineStyle: {
            type: "solid",
            color: "#dc2626",
            width: 3,
            opacity: 0.8,
          },
          label: {
            formatter: "META 95%",
            position: "insideEndTop",
            color: "#dc2626",
            fontWeight: "bold",
            fontSize: 10,
          },
          data: [{ yAxis: 95, name: "Meta" }],
        },
        dataZoom: [
          {
            type: "inside",
            xAxisIndex: 0,
            start: 0,
            end: 100,
          },
        ],
      };

      chart.setOption(option);

      const buffer = canvas.toBuffer("image/png");
      const filePath = path.join(folderOutput, "reporte_barras_k6.png");
      fs.writeFileSync(filePath, buffer);

      console.log(
        `✅ Gráfico K6 generado para "${folderName}" en: ${filePath}`
      );
    }
  } catch (err) {
    console.error("❌ Error generando gráficos de barras K6:", err);
    throw err;
  }
};
