
import { Player } from '@/types';

export const samplePlayers: Player[] = [
  {
    id: '1',
    name: 'Alex Johnson',
    games_played: 8,
    wins: 6,
    draws: 1,
    losses: 1,
    mvp_awards: 3,
    points: 19,
    goal_difference: 8
  },
  {
    id: '2',
    name: 'Marcus Silva',
    games_played: 7,
    wins: 5,
    draws: 2,
    losses: 0,
    mvp_awards: 2,
    points: 17,
    goal_difference: 6
  },
  {
    id: '3',
    name: 'David Thompson',
    games_played: 8,
    wins: 4,
    draws: 2,
    losses: 2,
    mvp_awards: 4,
    points: 14,
    goal_difference: 10
  },
  {
    id: '4',
    name: 'James Rodriguez',
    games_played: 6,
    wins: 4,
    draws: 1,
    losses: 1,
    mvp_awards: 1,
    points: 13,
    goal_difference: 3
  },
  {
    id: '5',
    name: 'Michael Brown',
    games_played: 7,
    wins: 3,
    draws: 3,
    losses: 1,
    mvp_awards: 1,
    points: 12,
    goal_difference: 1
  },
  {
    id: '6',
    name: 'Chris Wilson',
    games_played: 8,
    wins: 3,
    draws: 2,
    losses: 3,
    mvp_awards: 2,
    points: 11,
    goal_difference: -2
  },
  {
    id: '7',
    name: 'Ryan Garcia',
    games_played: 5,
    wins: 3,
    draws: 1,
    losses: 1,
    mvp_awards: 0,
    points: 10,
    goal_difference: 2
  },
  {
    id: '8',
    name: 'Luke Anderson',
    games_played: 6,
    wins: 2,
    draws: 3,
    losses: 1,
    mvp_awards: 1,
    points: 9,
    goal_difference: 0
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
    games_played: Math.floor(Math.random() * 8) + 3,
    wins: Math.floor(Math.random() * 6) + 1,
    draws: Math.floor(Math.random() * 3),
    losses: Math.floor(Math.random() * 4),
    mvp_awards: Math.floor(Math.random() * 3),
    points: Math.floor(Math.random() * 15) + 3,
    goal_difference: Math.floor(Math.random() * 15) - 5
  }));
};

export const allPlayers = [...samplePlayers, ...generateMorePlayers()].sort((a, b) => b.points - a.points);
