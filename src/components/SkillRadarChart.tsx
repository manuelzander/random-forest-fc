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
  // Also support the database field names
  pace?: number;
  shooting?: number;
  passing?: number;
  dribbling?: number;
  defending?: number;
  physical?: number;
}

interface SkillRadarChartProps {
  skillRatings: SkillRatings;
  className?: string;
}

export const SkillRadarChart = ({ skillRatings, className = "" }: SkillRadarChartProps) => {
  const skillData = [
    skillRatings.PAC || skillRatings.pace || 0,
    skillRatings.SHO || skillRatings.shooting || 0,
    skillRatings.PAS || skillRatings.passing || 0,
    skillRatings.DRI || skillRatings.dribbling || 0,
    skillRatings.DEF || skillRatings.defending || 0,
    skillRatings.PHY || skillRatings.physical || 0,
  ];

  const data = {
    labels: ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'],
    datasets: [
      {
        label: 'Player Skills',
        data: skillData,
        backgroundColor: 'rgba(59, 130, 246, 0.15)', // Blue with transparency
        borderColor: 'rgb(59, 130, 246)', // Solid blue
        borderWidth: 3,
        pointBackgroundColor: [
          'rgb(239, 68, 68)',   // Red for PAC
          'rgb(34, 197, 94)',   // Green for SHO
          'rgb(59, 130, 246)',  // Blue for PAS
          'rgb(168, 85, 247)',  // Purple for DRI
          'rgb(245, 158, 11)',  // Amber for DEF
          'rgb(239, 68, 68)',   // Red for PHY
        ],
        pointBorderColor: 'rgb(255, 255, 255)',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        fill: true,
      },
    ],
  };

  const skillColors = [
    'rgb(239, 68, 68)',   // Red for PAC
    'rgb(34, 197, 94)',   // Green for SHO
    'rgb(59, 130, 246)',  // Blue for PAS
    'rgb(168, 85, 247)',  // Purple for DRI
    'rgb(245, 158, 11)',  // Amber for DEF
    'rgb(239, 68, 68)',   // Red for PHY
  ];

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
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        min: 0,
        ticks: {
          stepSize: 25,
          display: false, // Hide the scale numbers
          font: {
            size: 11,
            weight: 'bold' as const,
          },
          color: 'hsl(var(--muted-foreground))',
          backdropColor: 'transparent',
          showLabelBackdrop: false,
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.3)', // Light gray grid
          lineWidth: 1,
        },
        angleLines: {
          color: 'rgba(148, 163, 184, 0.4)', // Slightly darker angle lines
          lineWidth: 1,
        },
        pointLabels: {
          font: {
            size: 14,
            weight: 'bold' as const,
          },
          color: (context: any) => {
            return skillColors[context.index] || 'hsl(var(--foreground))';
          },
          padding: 15,
        },
      },
    },
  };

  // Show individual skill values below the chart
  const skillLabels = ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'];
  const skillBgClasses = [
    'bg-red-50 dark:bg-red-950/30',
    'bg-green-50 dark:bg-green-950/30', 
    'bg-blue-50 dark:bg-blue-950/30',
    'bg-purple-50 dark:bg-purple-950/30',
    'bg-amber-50 dark:bg-amber-950/30',
    'bg-pink-50 dark:bg-pink-950/30'
  ];
  const skillTextClasses = [
    'text-red-600 dark:text-red-400',
    'text-green-600 dark:text-green-400', 
    'text-blue-600 dark:text-blue-400',
    'text-purple-600 dark:text-purple-400',
    'text-amber-600 dark:text-amber-400',
    'text-pink-600 dark:text-pink-400'
  ];
  const skillProgressClasses = [
    'bg-red-600 dark:bg-red-400',
    'bg-green-600 dark:bg-green-400', 
    'bg-blue-600 dark:bg-blue-400',
    'bg-purple-600 dark:bg-purple-400',
    'bg-amber-600 dark:bg-amber-400',
    'bg-pink-600 dark:bg-pink-400'
  ];

  return (
    <div className={`relative ${className}`}>
      <div className="mb-6">
        <Radar data={data} options={options} />
      </div>
      
      {/* Colorful skill cards with hover effect */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {skillLabels.map((label, index) => (
          <div 
            key={label} 
            className={`p-3 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-md ${skillBgClasses[index]}`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className={`text-xs font-bold ${skillTextClasses[index]}`}>
                {label}
              </div>
              <div className={`text-lg font-bold ${skillTextClasses[index]}`}>
                {skillData[index]}
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-white/50 dark:bg-black/20 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out ${skillProgressClasses[index]}`}
                style={{ width: `${skillData[index]}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};