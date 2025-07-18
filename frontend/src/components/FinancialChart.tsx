import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface FinancialChartProps {
  data: Array<{
    period: string;
    value: number;
    label?: string;
  }>;
  title: string;
  type?: 'bar' | 'line';
  className?: string;
}

const FinancialChart: React.FC<FinancialChartProps> = ({
  data,
  title,
  type = 'bar',
  className = ''
}) => {
  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(1)}B`;
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const chartData = {
    labels: data.map(item => {
      const date = new Date(item.period);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
    }),
    datasets: [
      {
        label: title,
        data: data.map(item => item.value),
        backgroundColor: type === 'bar' ? 'rgba(59, 130, 246, 0.8)' : 'rgba(59, 130, 246, 0.1)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        fill: type === 'line',
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            return `${context.dataset.label}: ${formatCurrency(value)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => formatCurrency(value),
        },
      },
    },
  };

  const ChartComponent = type === 'line' ? Line : Bar;

  return (
    <div className={`bg-white p-6 rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="h-80">
        <ChartComponent data={chartData} options={options} />
      </div>
    </div>
  );
};

export default FinancialChart;