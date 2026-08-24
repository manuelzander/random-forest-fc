import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Player } from '@/types';
import { getCachedBadges } from '@/utils/badgeCache';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Trophy, Info, Award, ArrowUp, ArrowDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDefaultAvatar } from '@/hooks/useDefaultAvatar';
import { usePlayerAchievements } from '@/hooks/usePlayerAchievements';

interface PlayerWithProfile extends Player {
  profile?: {
    football_skills?: string[];
    skill_ratings?: any;
  };
}

interface AchievementsTableProps {
  /** Players with profiles to show — live standings or an archived season's. */
  players?: PlayerWithProfile[];
}

const AchievementsTable: React.FC<AchievementsTableProps> = ({ players: providedPlayers }) => {
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [sortField, setSortField] = useState<'badges' | 'name'>('badges');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Fall back to live standings only when no players are supplied
  const live = usePlayerAchievements();
  const playersWithProfiles = providedPlayers ?? live.players;
  const isLoading = providedPlayers ? false : live.isLoading;
  const error = providedPlayers ? null : live.error;

  // Sort players whenever sort options change
  const [sortedPlayers, setSortedPlayers] = useState<PlayerWithProfile[]>([]);
  
  useEffect(() => {
    const sorted = [...playersWithProfiles].sort((a, b) => {
      if (sortField === 'badges') {
        const aBadgeCount = getCachedBadges(a, a.profile).length;
        const bBadgeCount = getCachedBadges(b, b.profile).length;
        return sortDirection === 'desc' ? bBadgeCount - aBadgeCount : aBadgeCount - bBadgeCount;
      } else {
        return sortDirection === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
      }
    });
    setSortedPlayers(sorted);
  }, [playersWithProfiles, sortField, sortDirection]);
  const PlayerAvatarWithDefault = ({
    player
  }: {
    player: Player;
  }) => {
    const {
      avatarUrl
    } = useDefaultAvatar({
      playerId: player.id,
      playerName: player.name,
      currentAvatarUrl: player.avatar_url
    });
    return <Avatar className="h-10 w-10">
      <AvatarImage src={avatarUrl || undefined} />
      <AvatarFallback>
        {player.name.substring(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>;
  };

  const handleSort = (field: 'badges' | 'name') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection(field === 'badges' ? 'desc' : 'asc');
    }
  };

  const SortButton = ({ field, children }: { field: 'badges' | 'name'; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="h-auto p-2 font-semibold"
    >
      {children}
      {sortField === field && (
        sortDirection === 'desc' ? <ArrowDown className="ml-1 h-3 w-3" /> : <ArrowUp className="ml-1 h-3 w-3" />
      )}
    </Button>
  );

  // Get all unique badges from all players with profiles
  const allBadges = Array.from(new Map(sortedPlayers.flatMap(player => getCachedBadges(player, player.profile)).map(badge => [badge.name, badge])).values());

  // Group badges by category
  const badgeCategories = {
    'Performance': allBadges.filter(badge => ['Legend', 'MVP Champion', 'Dominator', 'Champion', 'Winner', 'Elite Performer', 'Consistent'].includes(badge.name)),
    'Skills & Scoring': allBadges.filter(badge => ['Goal God', 'Goal Machine', 'Sharp Shooter', 'Speed Demon', 'Sniper', 'Wall', 'Magician', 'Playmaker', 'Beast', 'Maestro', 'Skilled'].includes(badge.name)),
    'Experience': allBadges.filter(badge => ['Hall of Famer', 'Warrior', 'Veteran'].includes(badge.name)),
    'Special Moves': allBadges.filter(badge => ['Showboat', 'Acrobat', 'Humiliator', 'Artist', 'Swiss Army Knife'].includes(badge.name)),
    'Form & Personality': allBadges.filter(badge => ['On Fire', 'Stormy Weather', 'Diplomat', 'Peacekeeper', 'Team Player', 'Unstoppable', 'Balanced'].includes(badge.name)),
    'Quirky & Fun': allBadges.filter(badge => !['Legend', 'MVP Champion', 'Dominator', 'Champion', 'Winner', 'Elite Performer', 'Consistent', 'Goal God', 'Goal Machine', 'Sharp Shooter', 'Speed Demon', 'Sniper', 'Wall', 'Magician', 'Playmaker', 'Beast', 'Maestro', 'Skilled', 'Hall of Famer', 'Warrior', 'Veteran', 'Showboat', 'Acrobat', 'Humiliator', 'Artist', 'Swiss Army Knife', 'On Fire', 'Stormy Weather', 'Diplomat', 'Peacekeeper', 'Team Player', 'Unstoppable', 'Balanced'].includes(badge.name))
  };

  if (error) {
    return (
      <Card>
        <CardHeader className="card-header-glass py-4">
          <CardTitle className="card-header-glass-title">
            <Trophy className="card-header-glass-icon h-6 w-6" />
            Player Achievements
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-destructive">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="card-header-glass py-4">
          <CardTitle className="card-header-glass-title">
            <Trophy className="card-header-glass-icon h-6 w-6" />
            Player Achievements
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return <Card>
      <CardHeader className="card-header-glass py-4">
        <CardTitle className="card-header-glass-title">
          <Trophy className="card-header-glass-icon h-6 w-6" />
          Player Achievements
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Badge Legend */}
        <div className="p-4 border-b bg-card/5">
          <Collapsible open={isLegendOpen} onOpenChange={setIsLegendOpen}>
            <CollapsibleTrigger className="info-note w-full items-center hover:bg-white/[0.07] transition-colors text-foreground">
              <Info className="info-note-icon mt-0" />
              <span className="font-semibold">Badge Guide</span>
              {isLegendOpen ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-6">
              {Object.entries(badgeCategories).map(([category, badges]) => {
              if (badges.length === 0) return null;
              return <div key={category}>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">{category}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                      {badges.map(badge => <div key={badge.name} className="flex items-start gap-3 p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/[0.08] transition-colors">
                          <span className="text-xl flex-shrink-0 mt-0.5">{badge.icon}</span>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-foreground">{badge.name}</div>
                            <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{badge.description}</div>
                          </div>
                        </div>)}
                    </div>
                  </div>;
            })}
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Players Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-card/5 border-b">
              <tr>
                <th className="px-3 py-3 text-left text-sm font-medium text-foreground w-12">Rank</th>
                <th className="px-3 py-3 text-left">
                  <SortButton field="name">Player</SortButton>
                </th>
                <th className="px-3 py-3 text-center">
                  <SortButton field="badges">
                    <Award className="h-4 w-4 mr-1" />
                    Count
                  </SortButton>
                </th>
                <th className="px-3 py-3 text-center text-sm font-medium text-foreground min-w-[300px]">
                  Achievements
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedPlayers.map((player, index) => {
              const playerBadges = getCachedBadges(player, player.profile);
              const rank = index + 1;
              const getRankBadgeColor = (rank: number) => {
                if (rank === 1) return 'bg-amber-400/20 text-amber-300 border border-amber-400/40';
                if (rank === 2) return 'bg-white/15 text-foreground border border-white/20';
                if (rank === 3) return 'bg-orange-400/20 text-orange-300 border border-orange-400/40';
                if (rank <= 5) return 'bg-primary/20 text-primary border border-primary/40';
                return 'bg-white/10 text-muted-foreground border border-white/15';
              };
              return <tr key={player.id} className="hover:bg-card/5 transition-colors">
                    <td className="px-3 py-4">
                      <Badge className={`${getRankBadgeColor(rank)} font-bold`}>
                        {rank}
                      </Badge>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-3">
                        <PlayerAvatarWithDefault player={player} />
                        <Link to={`/player/${player.id}`}>
                          <Button variant="link" className="p-0 h-auto font-semibold text-left hover:text-primary">
                            {player.name}
                          </Button>
                        </Link>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-center">
                      <Badge variant="secondary" className="font-bold text-lg">
                        {playerBadges.length}
                      </Badge>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex flex-wrap gap-2 justify-center">
                        {playerBadges.length > 0 ? playerBadges.slice(0, 8).map((badge, badgeIndex) => <Badge key={badgeIndex} className="badge-trophy">
                              <span>{typeof badge.icon === 'string' ? badge.icon : '✅'}</span>
                              <span className="hidden sm:inline">{badge.name}</span>
                            </Badge>) : <span className="text-xs text-muted-foreground italic">No badges earned yet</span>}
                        {playerBadges.length > 8 && <span className="text-xs text-muted-foreground font-medium">
                            +{playerBadges.length - 8} more
                          </span>}
                      </div>
                    </td>
                  </tr>;
            })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>;
};
export default AchievementsTable;