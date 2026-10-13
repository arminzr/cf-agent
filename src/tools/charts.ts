// ─────────────────────────────────────────────────
// Charts — QuickChart API (free, no API key, unlimited)
// Generates chart images from config
// Docs: https://quickchart.io/
// ─────────────────────────────────────────────────

export async function generateChart(
  type: string,
  data: any,
  options?: any,
  title?: string
): Promise<any> {
  const validTypes = ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea', 'scatter', 'bubble'];
  const chartType = validTypes.includes(type) ? type : 'bar';

  const chartConfig: any = {
    type: chartType,
    data,
    options: {
      ...options,
      plugins: {
        ...(options?.plugins || {}),
        title: title ? { display: true, text: title } : undefined,
      },
    },
  };

  const imageUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;

  return {
    url: imageUrl,
    type: chartType,
    title: title || '',
    config: chartConfig,
  };
}

// Helper: create a simple bar chart
export function barChart(labels: string[], values: number[], title?: string): any {
  return generateChart(
    'bar',
    {
      labels,
      datasets: [{ label: title || 'Data', data: values, backgroundColor: 'rgba(54, 162, 235, 0.6)' }],
    },
    undefined,
    title
  );
}

// Helper: create a line chart
export function lineChart(labels: string[], values: number[], title?: string): any {
  return generateChart(
    'line',
    {
      labels,
      datasets: [{ label: title || 'Data', data: values, borderColor: 'rgba(54, 162, 235, 1)', fill: false }],
    },
    undefined,
    title
  );
}

// Helper: create a pie chart
export function pieChart(labels: string[], values: number[], title?: string): any {
  return generateChart(
    'pie',
    {
      labels,
      datasets: [{ data: values, backgroundColor: [
        'rgba(255, 99, 132, 0.6)',
        'rgba(54, 162, 235, 0.6)',
        'rgba(255, 206, 86, 0.6)',
        'rgba(75, 192, 192, 0.6)',
        'rgba(153, 102, 255, 0.6)',
      ]}],
    },
    undefined,
    title
  );
}
