
import { Player } from '@/types';

export const samplePlayers: Player[] = [
  {
    id: '1',
    name: 'Alex Johnson',
    gamesPlayed: 8,
    wins: 6,
    draws: 1,
    losses: 1,
    goals: 12,
    assists: 8,
    mvpAwards: 3,
    points: 19,
    goalDifference: 8
  },
  {
    id: '2',
    name: 'Marcus Silva',
    gamesPlayed: 7,
    wins: 5,
    draws: 2,
    losses: 0,
    goals: 9,
    assists: 12,
    mvpAwards: 2,
    points: 17,
    goalDifference: 6
  },
  {
    id: '3',
    name: 'David Thompson',
    gamesPlayed: 8,
    wins: 4,
    draws: 2,
    losses: 2,
    goals: 15,
    assists: 4,
    mvpAwards: 4,
    points: 14,
    goalDifference: 10
  },
  {
    id: '4',
    name: 'James Rodriguez',
    gamesPlayed: 6,
    wins: 4,
    draws: 1,
    losses: 1,
    goals: 7,
    assists: 6,
    mvpAwards: 1,
    points: 13,
    goalDifference: 3
  },
  {
    id: '5',
    name: 'Michael Brown',
    gamesPlayed: 7,
    wins: 3,
    draws: 3,
    losses: 1,
    goals: 5,
    assists: 9,
    mvpAwards: 1,
    points: 12,
    goalDifference: 1
  },
  {
    id: '6',
    name: 'Chris Wilson',
    gamesPlayed: 8,
    wins: 3,
    draws: 2,
    losses: 3,
    goals: 8,
    assists: 3,
    mvpAwards: 2,
    points: 11,
    goalDifference: -2
  },
  {
    id: '7',
    name: 'Ryan Garcia',
    gamesPlayed: 5,
    wins: 3,
    draws: 1,
    losses: 1,
    goals: 6,
    assists: 4,
    mvpAwards: 0,
    points: 10,
    goalDifference: 2
  },
  {
    id: '8',
    name: 'Luke Anderson',
    gamesPlayed: 6,
    wins: 2,
    draws: 3,
    losses: 1,
    goals: 4,
    assists: 7,
    mvpAwards: 1,
    points: 9,
    goalDifference: 0
  }
];

// Generate more players to reach 30
export const generateMorePlayers = (): Player[] => {
  const names = [
    'Tom Miller', 'Jake Davis', 'Ben Taylor', 'Sam Wilson', 'Matt Jones',
    'Nick Smith', 'Adam White', 'Paul Green', 'Mark Lee', 'Josh Clark',
    'Steve Hall', 'Dan Lewis', 'Rob Young', 'Tim King', 'Jim Scott',
    'Pete Adams', 'Carl Baker', 'Tony Evans', 'Rick Turner', 'Max Cooper',
    'Jay Parker', 'Zach Reed'
  ];

  return names.map((name, index) => ({
    id: (index + 9).toString(),
    name,
    gamesPlayed: Math.floor(Math.random() * 8) + 3,
    wins: Math.floor(Math.random() * 6) + 1,
    draws: Math.floor(Math.random() * 3),
    losses: Math.floor(Math.random() * 4),
    goals: Math.floor(Math.random() * 10) + 1,
    assists: Math.floor(Math.random() * 8) + 1,
    mvpAwards: Math.floor(Math.random() * 3),
    points: Math.floor(Math.random() * 15) + 3,
    goalDifference: Math.floor(Math.random() * 15) - 5
  }));
};

export const allPlayers = [...samplePlayers, ...generateMorePlayers()].sort((a, b) => b.points - a.points);
