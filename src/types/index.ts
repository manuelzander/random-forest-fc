
export interface Player {
  id: string;
  name: string;
  games_played: number;
  wins: number;
  draws: number;
  losses: number;
  mvp_awards: number;
  points: number;
  goal_difference: number;
  user_id?: string | null;
  avatar_url?: string | null;
  created_by?: string | null;
  debt?: number;
}

export interface GameResult {
  id: string;
  date: string;
  team1Players: string[];
  team2Players: string[];
  team1Goals: number;
  team2Goals: number;
  mvpPlayer: string;
  youtubeUrl?: string;
}

export interface GameInput {
  team1Players: string[];
  team2Players: string[];
  team1Goals: number;
  team2Goals: number;
  team1Captain: string;
  team2Captain: string;
  mvpPlayer: string | null;
  youtubeUrl?: string;
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

export interface ScheduledGame {
  id: string;
  scheduled_at: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  pitch_size?: string | null;
}

export interface GameScheduleSignup {
  id: string;
  game_schedule_id: string;
  player_id: string | null;
  signed_up_at: string;
  created_at: string;
  player?: Player;
  guest_name?: string;
  is_guest?: boolean;
  created_by_user_id?: string | null;
  last_minute_dropout?: boolean;
}
