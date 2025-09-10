import { CheckCircle } from 'lucide-react';

export interface Player {
  id: string;
  name: string;
  points: number;
  games_played: number;
  wins: number;
  draws: number;
  losses: number;
  mvp_awards: number;
  goal_difference: number;
  user_id?: string;
  recentResults?: ('win' | 'draw' | 'loss')[];
}

export interface ProfileData {
  football_skills?: string[];
  skill_ratings?: {
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
  };
}

export interface Badge {
  icon: string | JSX.Element;
  name: string;
  description?: string;
}

export const getBadges = (player: Player, profile?: ProfileData): Badge[] => {
  const badges: Badge[] = [];
  
  const getWinRate = () => {
    if (!player || player.games_played === 0) return 0;
    return Math.round((player.wins / player.games_played) * 100);
  };
  
  // if (player?.user_id) {
  //   badges.push({ icon: '✅', name: 'Verified Player', description: 'Claimed by user' });
  // }
  
  // Elite performance badges
  if (player?.mvp_awards >= 10) {
    badges.push({ icon: '🌟', name: 'Legend', description: '10+ MVP Awards' });
  } else if (player?.mvp_awards >= 5) {
    badges.push({ icon: '👑', name: 'MVP Champion', description: '5+ MVP Awards' });
  }
  
  if (player?.goal_difference >= 25) {
    badges.push({ icon: '⚡', name: 'Goal God', description: '25+ Goal Difference' });
  } else if (player?.goal_difference >= 15) {
    badges.push({ icon: '🚀', name: 'Goal Machine', description: '15+ Goal Difference' });
  } else if (player?.goal_difference >= 10) {
    badges.push({ icon: '🎯', name: 'Sharp Shooter', description: '10+ Goal Difference' });
  }
  
  // Win rate badges (only for players with 10+ games)
  if (player?.games_played >= 10) {
    if (getWinRate() >= 80) {
      badges.push({ icon: '🥇', name: 'Dominator', description: '80%+ Win Rate' });
    } else if (getWinRate() >= 70) {
      badges.push({ icon: '🏆', name: 'Champion', description: '70%+ Win Rate' });
    } else if (getWinRate() >= 60) {
      badges.push({ icon: '🥉', name: 'Winner', description: '60%+ Win Rate' });
    }
  }
  
  // Experience badges
  if (player?.games_played >= 50) {
    badges.push({ icon: '🏛️', name: 'Hall of Famer', description: '50+ Games Played' });
  } else if (player?.games_played >= 30) {
    badges.push({ icon: '⚔️', name: 'Warrior', description: '30+ Games Played' });
  } else if (player?.games_played >= 20) {
    badges.push({ icon: '🎖️', name: 'Veteran', description: '20+ Games Played' });
  }
  
  // Advanced stats badges (only for players with 10+ games)
  const pointsPerGame = player?.games_played > 0 ? player.points / player.games_played : 0;
  if (player?.games_played >= 10) {
    if (pointsPerGame >= 2.2) {
      badges.push({ icon: '💎', name: 'Elite Performer', description: '2.2+ Points Per Game' });
    } else if (pointsPerGame >= 1.8) {
      badges.push({ icon: '⭐', name: 'Consistent', description: '1.8+ Points Per Game' });
    }
  }
  
  // Skills-based badges (if skill ratings are available)
  if (profile?.skill_ratings) {
    const skills = profile.skill_ratings;
    const avgSkill = Object.values(skills).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0) / Object.keys(skills).length;
    
    if (avgSkill >= 85) {
      badges.push({ icon: '🎨', name: 'Maestro', description: 'Elite overall skills' });
    } else if (avgSkill >= 75) {
      badges.push({ icon: '🔥', name: 'Skilled', description: 'High overall skills' });
    }
    
    // Specific skill badges
    if ((skills.pace || skills.PAC) >= 90) {
      badges.push({ icon: '💨', name: 'Speed Demon', description: 'Lightning fast' });
    }
    if ((skills.shooting || skills.SHO) >= 90) {
      badges.push({ icon: '🎯', name: 'Sniper', description: 'Deadly finisher' });
    }
    if ((skills.defending || skills.DEF) >= 90) {
      badges.push({ icon: '🛡️', name: 'Wall', description: 'Impenetrable defense' });
    }
    if ((skills.dribbling || skills.DRI) >= 90) {
      badges.push({ icon: '🕺', name: 'Magician', description: 'Mesmerizing skills' });
    }
    if ((skills.passing || skills.PAS) >= 90) {
      badges.push({ icon: '🎛️', name: 'Playmaker', description: 'Vision master' });
    }
    if ((skills.physical || skills.PHY) >= 90) {
      badges.push({ icon: '💪', name: 'Beast', description: 'Physical powerhouse' });
    }
  }
  
  // Signature moves badges
  if (profile?.football_skills && profile.football_skills.length > 0) {
    const skills = profile.football_skills;
    
    if (skills.includes('Rainbow Flick') || skills.includes('Elastico')) {
      badges.push({ icon: '🌈', name: 'Showboat', description: 'Loves fancy skills' });
    }
    if (skills.includes('Bicycle Kick') || skills.includes('Overhead Kick')) {
      badges.push({ icon: '🚲', name: 'Acrobat', description: 'Spectacular finisher' });
    }
    if (skills.includes('Nutmeg') || skills.includes('Panna')) {
      badges.push({ icon: '🥜', name: 'Humiliator', description: 'Nutmeg specialist' });
    }
    if (skills.includes('Rabona') || skills.includes('Trivela')) {
      badges.push({ icon: '🎭', name: 'Artist', description: 'Technical genius' });
    }
    if (skills.length >= 5) {
      badges.push({ icon: '🎪', name: 'Swiss Army Knife', description: '5+ signature moves' });
    }
  }
  
  // Form-based badges
  if (player?.recentResults && player.recentResults.length >= 5) {
    const recentWins = player.recentResults.filter(r => r === 'win').length;
    const recentLosses = player.recentResults.filter(r => r === 'loss').length;
    
    if (recentWins >= 5) {
      badges.push({ icon: '🔥', name: 'On Fire', description: '5+ recent wins' });
    } else if (recentWins === 0 && recentLosses >= 4) {
      badges.push({ icon: '🌧️', name: 'Stormy Weather', description: 'Rough patch' });
    }
  }
  
  // Funny/Creative badges
  if (player?.goal_difference <= -15) {
    badges.push({ icon: '🕳️', name: 'Black Hole', description: 'Goals disappear around you' });
  } else if (player?.goal_difference <= -10) {
    badges.push({ icon: '🤡', name: 'Goal Leaker', description: 'Conceded 10+ more goals than scored' });
  }
  
  if (player?.draws >= 8) {
    badges.push({ icon: '🤝', name: 'Diplomat', description: '8+ drawn games' });
  } else if (player?.draws >= 5) {
    badges.push({ icon: '⚖️', name: 'Peacekeeper', description: '5+ drawn games' });
  }
  
  if (player?.losses >= 15) {
    badges.push({ icon: '💀', name: 'Cursed', description: '15+ losses' });
  } else if (player?.losses >= 10) {
    badges.push({ icon: '😤', name: 'Unlucky', description: '10+ losses' });
  }
  
  // Special achievement badges
  if (getWinRate() === 0 && player?.games_played >= 5) {
    badges.push({ icon: '😅', name: 'Trying Hard', description: 'No wins yet but still playing!' });
  }
  if (player?.mvp_awards === 0 && player?.games_played >= 10) {
    badges.push({ icon: '🐐', name: 'Team Player', description: 'No MVPs but always showing up' });
  }
  if (getWinRate() === 100 && player?.games_played >= 3) {
    badges.push({ icon: '🦄', name: 'Unstoppable', description: 'Perfect win record' });
  }
  if (player?.goal_difference === 0 && player?.games_played >= 5) {
    badges.push({ icon: '⚖️', name: 'Balanced', description: 'Perfectly balanced goal difference' });
  }
  if (player?.games_played === 1) {
    badges.push({ icon: '🆕', name: 'Fresh Meat', description: 'Just getting started' });
  }
  
  // More funny situational badges
  if (player?.wins === player?.draws && player?.draws === player?.losses && player?.wins >= 2) {
    badges.push({ icon: '🎲', name: 'Chaos Agent', description: 'Equal wins, draws, and losses' });
  }
  if (player?.games_played >= 15 && player?.points === 0) {
    badges.push({ icon: '🍕', name: 'Participation Trophy', description: '15+ games with 0 points' });
  }
  if (player?.draws > (player?.wins + player?.losses) && player?.draws >= 3) {
    badges.push({ icon: '🎭', name: 'Drama Queen', description: 'More draws than wins and losses combined' });
  }
  if (player?.games_played >= 5 && player?.points === 1) {
    badges.push({ icon: '🐢', name: 'Slow Starter', description: 'Exactly 1 point after 5+ games' });
  }
  
  // Quirky statistical badges
  if (player?.games_played >= 10 && player?.wins === 0 && player?.draws === 0) {
    badges.push({ icon: '🎯', name: 'Perfectionist', description: 'Consistent in losing' });
  }
  if (player?.mvp_awards > player?.wins) {
    badges.push({ icon: '👑', name: 'Hero of Lost Causes', description: 'More MVPs than wins' });
  }
  if (player && player.games_played >= 5 && Math.abs(player.goal_difference) === player.games_played) {
    badges.push({ icon: '📊', name: 'Mathematician', description: 'Goal difference equals games played' });
  }
  if (player?.games_played >= 7 && player?.wins === 1 && player?.draws === 1 && player?.losses >= 5) {
    badges.push({ icon: '🍀', name: 'One Hit Wonder', description: 'Rare moments of glory' });
  }
  
  // Weekend warrior type badges
  if (player && pointsPerGame < 1 && player.games_played >= 10) {
    badges.push({ icon: '🏃', name: 'Cardio King', description: 'Here for the exercise' });
  }
  if (player?.mvp_awards >= 3 && getWinRate() < 50) {
    badges.push({ icon: '🎪', name: 'Star of the Show', description: 'Individual brilliance in team struggles' });
  }

  return badges;
};