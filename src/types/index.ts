
export interface Player {
  id: string;
  name: string;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goals: number;
  mvpAwards: number;
  points: number;
  goalDifference: number;
}

export interface GameResult {
  id: string;
  date: string;
  team1Players: string[];
  team2Players: string[];
  team1Goals: number;
  team2Goals: number;
  mvpPlayer: string;
  goalScorers: { playerId: string; goals: number }[];
}

export interface GameInput {
  team1Players: string[];
  team2Players: string[];
  team1Goals: number;
  team2Goals: number;
  mvpPlayer: string;
  goalScorers: { playerId: string; goals: number }[];
}
