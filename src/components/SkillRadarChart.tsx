import React from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface SkillRatings {
  PAC?: number;
  SHO?: number;
  PAS?: number;
  DRI?: number;
  DEF?: number;
  PHY?: number;
}

interface SkillRadarChartProps {
  skillRatings: SkillRatings;
  className?: string;
}

export const SkillRadarChart = ({ skillRatings, className = "" }: SkillRadarChartProps) => {
  const data = {
    labels: ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'],
    datasets: [
      {
        data: [
          skillRatings.PAC || 0,
          skillRatings.SHO || 0,
          skillRatings.PAS || 0,
          skillRatings.DRI || 0,
          skillRatings.DEF || 0,
          skillRatings.PHY || 0,
        ],
        backgroundColor: 'hsl(var(--primary) / 0.2)',
        borderColor: 'hsl(var(--primary))',
        borderWidth: 2,
        pointBackgroundColor: 'hsl(var(--primary))',
        pointBorderColor: 'hsl(var(--background))',
        pointBorderWidth: 2,
        pointRadius: 4,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.label}: ${context.raw}/100`;
          }
        }
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        min: 0,
        ticks: {
          stepSize: 20,
          font: {
            size: 10,
          },
          color: 'hsl(var(--muted-foreground))',
        },
        grid: {
          color: 'hsl(var(--border))',
        },
        angleLines: {
          color: 'hsl(var(--border))',
        },
        pointLabels: {
          font: {
            size: 12,
            weight: 'bold' as const,
          },
          color: 'hsl(var(--foreground))',
          padding: 10,
        },
      },
    },
  };

  return (
    <div className={`relative ${className}`}>
      <Radar data={data} options={options} />
    </div>
  );
};