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
    labels: ['PACE', 'SHOOTING', 'PASSING', 'DRIBBLING', 'DEFENDING', 'PHYSICAL'],
    datasets: [
      {
        label: 'Player Skills',
        data: skillData,
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 3,
        pointBackgroundColor: [
          'rgb(239, 68, 68)',   // Red for PACE
          'rgb(34, 197, 94)',   // Green for SHOOTING
          'rgb(59, 130, 246)',  // Blue for PASSING
          'rgb(168, 85, 247)',  // Purple for DRIBBLING
          'rgb(245, 158, 11)',  // Amber for DEFENDING
          'rgb(236, 72, 153)',  // Pink for PHYSICAL
        ],
        pointBorderColor: 'rgb(255, 255, 255)',
        pointBorderWidth: 3,
        pointRadius: 7,
        pointHoverRadius: 10,
        fill: true,
      },
    ],
  };

  const skillColors = [
    'rgb(239, 68, 68)',   // Red
    'rgb(34, 197, 94)',   // Green
    'rgb(59, 130, 246)',  // Blue
    'rgb(168, 85, 247)',  // Purple
    'rgb(245, 158, 11)',  // Amber
    'rgb(236, 72, 153)',  // Pink
  ];

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    animation: {
      duration: 1000,
      easing: 'easeOutQuart' as const,
    },
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
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(34, 197, 94, 0.5)',
        borderWidth: 2,
        padding: 12,
        displayColors: false,
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 13,
        }
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        min: 0,
        ticks: {
          stepSize: 25,
          display: false,
          backdropColor: 'transparent',
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.2)',
          lineWidth: 2,
          circular: true,
        },
        angleLines: {
          color: 'rgba(148, 163, 184, 0.3)',
          lineWidth: 2,
        },
        pointLabels: {
          font: {
            size: 11,
            weight: 'bold' as const,
          },
          color: (context: any) => {
            return skillColors[context.index] || 'hsl(var(--foreground))';
          },
          padding: 20,
        },
      },
    },
  };

  const skillLabels = ['PACE', 'SHOOTING', 'PASSING', 'DRIBBLING', 'DEFENDING', 'PHYSICAL'];
  const skillAbbrev = ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'];
  const skillBgClasses = [
    'bg-red-50 border-red-200',
    'bg-green-50 border-green-200', 
    'bg-blue-50 border-blue-200',
    'bg-purple-50 border-purple-200',
    'bg-amber-50 border-amber-200',
    'bg-pink-50 border-pink-200'
  ];
  const skillTextClasses = [
    'text-red-600',
    'text-green-600', 
    'text-blue-600',
    'text-purple-600',
    'text-amber-600',
    'text-pink-600'
  ];

  return (
    <div className={`relative ${className}`}>
      {/* Radar Chart with glow effect */}
      <div className="mb-6 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-blue-500/5 rounded-lg blur-xl"></div>
        <div className="relative p-4">
          <Radar data={data} options={options} />
        </div>
      </div>
      
      {/* Skill bars with values */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {skillLabels.map((label, index) => (
          <div 
            key={label} 
            className={`p-3 rounded-lg border-2 transition-all duration-300 hover:scale-105 hover:shadow-md ${skillBgClasses[index]}`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className={`text-xs font-bold ${skillTextClasses[index]}`}>
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{skillAbbrev[index]}</span>
              </div>
              <div className={`text-lg font-bold ${skillTextClasses[index]}`}>
                {skillData[index]}
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-white/50 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out ${skillTextClasses[index].replace('text-', 'bg-')}`}
                style={{ width: `${skillData[index]}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};