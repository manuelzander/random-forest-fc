import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SkillRadarChart } from '@/components/SkillRadarChart';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, Trophy, Target, Calendar, User, MapPin, Clock, Home, LogOut, Shield, LogIn, CheckCircle, Heart, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';

interface PlayerData {
  id: string;
  name: string;
  points: number;
  games_played: number;
  wins: number;
  draws: number;
  losses: number;
  mvp_awards: number;
  goal_difference: number;
  avatar_url?: string;
  badges?: any[];
  user_id?: string;
  recentResults?: ('win' | 'draw' | 'loss')[];
}

interface ProfileData {
  bio?: string;
  football_skills?: string[];
  favorite_position?: string;
  years_playing?: number;
  favorite_club?: string;
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

const PlayerProfile = () => {
  const { playerId } = useParams();
  const { toast } = useToast();
  const { user, userRole, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (playerId) {
      fetchPlayerData();
    }
  }, [playerId]);

  const fetchPlayerData = async () => {
    try {
      setIsLoading(true);
      
      // First get the basic player info
      const { data: basicPlayer, error: basicError } = await supabase
        .from('players')
        .select('id, name, avatar_url, user_id, badges')
        .eq('id', playerId)
        .maybeSingle();

      if (basicError) throw basicError;
      
      if (!basicPlayer) {
        setPlayer(null);
        return;
      }

      // Then calculate stats from games
      const { data: statsData, error: statsError } = await supabase
        .from('games')
        .select('team1_players, team2_players, team1_goals, team2_goals, mvp_player, created_at')
        .or(`team1_players.cs.{${playerId}},team2_players.cs.{${playerId}}`)
        .order('created_at', { ascending: false });

      if (statsError) throw statsError;

      // Calculate stats
      let points = 0;
      let wins = 0;
      let draws = 0;
      let losses = 0;
      let mvp_awards = 0;
      let goal_difference = 0;
      const recentResults: ('win' | 'draw' | 'loss')[] = [];
      
      if (statsData) {
        statsData.forEach(game => {
          const isTeam1 = game.team1_players.includes(playerId);
          const isTeam2 = game.team2_players.includes(playerId);
          
          if (isTeam1 || isTeam2) {
            const playerGoals = isTeam1 ? game.team1_goals : game.team2_goals;
            const opponentGoals = isTeam1 ? game.team2_goals : game.team1_goals;
            
            goal_difference += playerGoals - opponentGoals;
            
            if (playerGoals > opponentGoals) {
              wins++;
              points += 3;
              if (recentResults.length < 6) recentResults.push('win');
            } else if (playerGoals === opponentGoals) {
              draws++;
              points += 1;
              if (recentResults.length < 6) recentResults.push('draw');
            } else {
              losses++;
              if (recentResults.length < 6) recentResults.push('loss');
            }
            
            if (game.mvp_player === playerId) {
              mvp_awards++;
            }
          }
        });
      }

      setPlayer({
        id: basicPlayer.id,
        name: basicPlayer.name,
        avatar_url: basicPlayer.avatar_url,
        user_id: basicPlayer.user_id,
        points,
        games_played: wins + draws + losses,
        wins,
        draws,
        losses,
        mvp_awards,
        goal_difference,
        badges: Array.isArray(basicPlayer.badges) ? basicPlayer.badges : [],
        recentResults
      });

      // Fetch profile data if player has a user_id
      if (basicPlayer.user_id) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('bio, football_skills, favorite_position, years_playing, favorite_club, skill_ratings')
          .eq('user_id', basicPlayer.user_id)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
        } else {
          setProfile({
            ...profileData,
            football_skills: Array.isArray(profileData.football_skills) ? profileData.football_skills as string[] : [],
            skill_ratings: (profileData.skill_ratings && typeof profileData.skill_ratings === 'object') 
              ? profileData.skill_ratings as ProfileData['skill_ratings'] 
              : {}
          });
        }
      }
    } catch (error) {
      console.error('Error fetching player:', error);
      toast({
        title: "Error",
        description: "Failed to fetch player data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getWinRate = () => {
    if (!player || player.games_played === 0) return 0;
    return Math.round((player.wins / player.games_played) * 100);
  };

  const getBadges = () => {
    const badges = [];
    
    // Add claimed badge if player has a user_id
    if (player?.user_id) {
      badges.push({ icon: <CheckCircle className="h-3 w-3" />, name: 'Verified Player', description: 'Claimed by user' });
    }
    
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
    
    // Win rate badges
    if (player && getWinRate() >= 90) {
      badges.push({ icon: '🥇', name: 'Dominator', description: '90%+ Win Rate' });
    } else if (player && getWinRate() >= 80) {
      badges.push({ icon: '🏆', name: 'Champion', description: '80%+ Win Rate' });
    } else if (player && getWinRate() >= 70) {
      badges.push({ icon: '🥉', name: 'Winner', description: '70%+ Win Rate' });
    }
    
    // Experience badges
    if (player?.games_played >= 50) {
      badges.push({ icon: '🏛️', name: 'Hall of Famer', description: '50+ Games Played' });
    } else if (player?.games_played >= 30) {
      badges.push({ icon: '⚔️', name: 'Warrior', description: '30+ Games Played' });
    } else if (player?.games_played >= 20) {
      badges.push({ icon: '🎖️', name: 'Veteran', description: '20+ Games Played' });
    }
    
    // Advanced stats badges
    const pointsPerGame = player?.games_played > 0 ? player.points / player.games_played : 0;
    if (pointsPerGame >= 2.5) {
      badges.push({ icon: '💎', name: 'Elite Performer', description: '2.5+ Points Per Game' });
    } else if (pointsPerGame >= 2.0) {
      badges.push({ icon: '⭐', name: 'Consistent', description: '2.0+ Points Per Game' });
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

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div>Loading player...</div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="loading-container">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Player Not Found</h2>
          <Link to="/">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const badges = getBadges();

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-inner">
            <div className="flex items-center gap-3">
              <div className="header-brand-primary">
                <Trophy className="h-6 w-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {isMobile ? 'RFFC' : 'Random Forest FC'}
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {user ? (
                <div className="flex items-center gap-1 sm:gap-2">
                  <Link to="/profile">
                    <Button variant="outline" size="sm">
                      <User className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Profile</span>
                    </Button>
                  </Link>
                  {userRole === 'admin' && (
                    <Link to="/admin">
                      <Button variant="outline" size="sm">
                        <Shield className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Admin</span>
                      </Button>
                    </Link>
                  )}
                  <Link to="/">
                    <Button variant="outline" size="sm">
                      <Home className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Home</span>
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1 sm:gap-2">
                  <Link to="/">
                    <Button variant="outline" size="sm">
                      <Home className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Home</span>
                    </Button>
                  </Link>
                  <Link to="/auth">
                    <Button variant="outline" size="sm">
                      <LogIn className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Sign In</span>
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Player Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <Avatar className="h-28 w-28 sm:h-32 sm:w-32 flex-shrink-0">
                <AvatarImage src={player.avatar_url} />
                <AvatarFallback className="text-lg sm:text-2xl">
                  {player.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
               <div className="flex-1 w-full">
                 <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">{player.name}</h1>
                 
                 {/* Basic stats row - always visible */}
                 <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <Trophy className="h-4 w-4" />
                    <span>{player.points} Points</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    <span>{getWinRate()}% Win Rate</span>
                  </div>
                   
                 </div>
                 
                 {/* Profile details - responsive layout */}
                 {(profile?.favorite_position || profile?.favorite_club || profile?.years_playing) && (
                   <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-3">
                     {profile?.favorite_position && (
                       <div className="flex items-center gap-1">
                         <MapPin className="h-4 w-4 flex-shrink-0" />
                         <span>{profile.favorite_position}</span>
                       </div>
                     )}
                     {profile?.favorite_club && (
                       <div className="flex items-center gap-1">
                         <Heart className="h-4 w-4 flex-shrink-0" />
                         <span>{profile.favorite_club}</span>
                       </div>
                     )}
                     {profile?.years_playing && (
                       <div className="flex items-center gap-1">
                         <Clock className="h-4 w-4 flex-shrink-0" />
                         <span>{profile.years_playing} years playing</span>
                       </div>
                     )}
                   </div>
                 )}
                 
                 {profile?.bio && (
                   <p className="text-muted-foreground mb-3 text-sm sm:text-base">{profile.bio}</p>
                 )}
                  {badges.length > 0 && (
                    <TooltipProvider>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                         {badges.map((badge, index) => (
                           <Tooltip key={index}>
                             <TooltipTrigger asChild>
                               <Badge className={`${
                                 badge.name === 'Verified Player' 
                                   ? 'bg-green-100 text-green-800 border-green-200' 
                                   : 'bg-yellow-100 text-yellow-800'
                               } flex items-center gap-1 px-1.5 py-0.5 text-xs whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity`}>
                                 {typeof badge.icon === 'string' ? <span>{badge.icon}</span> : badge.icon}
                                 <span className="hidden sm:inline">{badge.name}</span>
                               </Badge>
                             </TooltipTrigger>
                             <TooltipContent side="top" className="max-w-xs">
                               <div className="text-center">
                                 <div className="font-semibold">{badge.name}</div>
                                 <div className="text-sm text-muted-foreground">{badge.description}</div>
                               </div>
                             </TooltipContent>
                           </Tooltip>
                         ))}
                      </div>
                    </TooltipProvider>
                  )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Statistics
              </CardTitle>
             </CardHeader>
              <CardContent className="space-y-6">
                {/* Win/Draw/Loss at the top */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-green-100 rounded-lg">
                    <div className="text-xl font-bold text-green-700">{player.wins}</div>
                    <div className="text-xs font-medium text-green-600">Wins</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-100 rounded-lg">
                    <div className="text-xl font-bold text-yellow-700">{player.draws}</div>
                    <div className="text-xs font-medium text-yellow-600">Draws</div>
                  </div>
                  <div className="text-center p-3 bg-red-100 rounded-lg">
                    <div className="text-xl font-bold text-red-700">{player.losses}</div>
                    <div className="text-xs font-medium text-red-600">Losses</div>
                  </div>
                </div>

                {/* Form - Big box */}
                <div className="text-center p-6 bg-muted/50 rounded-lg">
                  <div className="flex gap-2 justify-center mb-3">
                    {player.recentResults && player.recentResults.length > 0 ? (
                      player.recentResults.slice(0, 6).reverse().map((result, index) => (
                        <div 
                          key={index}
                          className={`w-8 h-8 rounded ${
                            result === 'win' ? 'bg-green-500' :
                            result === 'draw' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          title={result === 'win' ? 'Win' : result === 'draw' ? 'Draw' : 'Loss'}
                        />
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No recent games</span>
                    )}
                  </div>
                  <div className="text-lg font-bold text-muted-foreground">Form (Last 6)</div>
                </div>

                {/* Stats grid - 6 smaller boxes */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{player.points}</div>
                    <div className="text-sm font-medium text-muted-foreground">Points</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{player.games_played}</div>
                    <div className="text-sm font-medium text-muted-foreground">Games Played</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-700">{player.mvp_awards}</div>
                    <div className="text-sm font-medium text-muted-foreground">MVP Awards</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className={`text-2xl font-bold ${
                      player.goal_difference > 0 ? 'text-green-600' : 
                      player.goal_difference < 0 ? 'text-red-600' : 'text-muted-foreground'
                    }`}>
                      {player.goal_difference > 0 ? '+' : ''}{player.goal_difference}
                    </div>
                    <div className="text-sm font-medium text-muted-foreground">Goal Difference</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {player.games_played > 0 ? (Number(player.points) / player.games_played).toFixed(1) : '0.0'}
                    </div>
                    <div className="text-sm font-medium text-muted-foreground">Points Per Game</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {player.games_played > 0 ? ((player.wins / player.games_played) * 100).toFixed(1) : '0.0'}%
                    </div>
                    <div className="text-sm font-medium text-muted-foreground">Win Rate</div>
                  </div>
                </div>
             </CardContent>
          </Card>

          {/* Right column: Player Skills + Player Quirks */}
          <div className="space-y-4">
            {/* Player Skills Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Player Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile?.skill_ratings && Object.keys(profile.skill_ratings).length > 0 ? (
                  <div className="flex justify-center">
                    <SkillRadarChart 
                      skillRatings={profile.skill_ratings} 
                      className="w-full max-w-xs"
                    />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground text-sm">No skill ratings available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Signature Moves */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Signature Moves
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile?.football_skills && profile.football_skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.football_skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="text-sm">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <Zap className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No signature moves listed yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfile;