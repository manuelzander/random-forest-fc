
export interface Player {
  id: string;
  name: string;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  mvpAwards: number;
  points: number;
  goalDifference: number;
  user_id?: string | null;
  avatar_url?: string | null;
}

export interface GameResult {
  id: string;
  date: string;
  team1Players: string[];
  team2Players: string[];
  team1Goals: number;
  team2Goals: number;
  mvpPlayer: string;
}

export interface GameInput {
  team1Players: string[];
  team2Players: string[];
  team1Goals: number;
  team2Goals: number;
  mvpPlayer: string;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  published: boolean;
}
