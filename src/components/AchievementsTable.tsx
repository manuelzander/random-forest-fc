import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Player } from '@/types';
import { getBadges } from '@/utils/badges';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Trophy, Info } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';

interface AchievementsTableProps {
  players: Player[];
}

const AchievementsTable: React.FC<AchievementsTableProps> = ({ players }) => {
  const [isLegendOpen, setIsLegendOpen] = useState(false);

  const getAvatarUrl = (player: Player) => {
    return player.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`;
  };

  // Get all unique badges from all players
  const allBadges = Array.from(
    new Map(
      players.flatMap(player => getBadges(player))
        .map(badge => [badge.name, badge])
    ).values()
  );

  // Group badges by category
  const badgeCategories = {
    'Performance': allBadges.filter(badge => 
      ['Legend', 'MVP Champion', 'Dominator', 'Champion', 'Winner', 'Elite Performer', 'Consistent'].includes(badge.name)
    ),
    'Skills & Scoring': allBadges.filter(badge => 
      ['Goal God', 'Goal Machine', 'Sharp Shooter', 'Speed Demon', 'Sniper', 'Wall', 'Magician', 'Playmaker', 'Beast', 'Maestro', 'Skilled'].includes(badge.name)
    ),
    'Experience': allBadges.filter(badge => 
      ['Hall of Famer', 'Warrior', 'Veteran'].includes(badge.name)
    ),
    'Special Moves': allBadges.filter(badge => 
      ['Showboat', 'Acrobat', 'Humiliator', 'Artist', 'Swiss Army Knife'].includes(badge.name)
    ),
    'Form & Personality': allBadges.filter(badge => 
      ['On Fire', 'Stormy Weather', 'Diplomat', 'Peacekeeper', 'Team Player', 'Unstoppable', 'Balanced'].includes(badge.name)
    ),
    'Quirky & Fun': allBadges.filter(badge => 
      !['Legend', 'MVP Champion', 'Dominator', 'Champion', 'Winner', 'Elite Performer', 'Consistent',
        'Goal God', 'Goal Machine', 'Sharp Shooter', 'Speed Demon', 'Sniper', 'Wall', 'Magician', 'Playmaker', 'Beast', 'Maestro', 'Skilled',
        'Hall of Famer', 'Warrior', 'Veteran',
        'Showboat', 'Acrobat', 'Humiliator', 'Artist', 'Swiss Army Knife',
        'On Fire', 'Stormy Weather', 'Diplomat', 'Peacekeeper', 'Team Player', 'Unstoppable', 'Balanced'].includes(badge.name)
    )
  };

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-6 w-6" />
          Player Achievements
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Badge Legend */}
        <div className="p-4 border-b bg-muted/20">
          <Collapsible open={isLegendOpen} onOpenChange={setIsLegendOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full hover:text-primary transition-colors">
              <Info className="h-4 w-4" />
              <span className="font-semibold">Badge Guide</span>
              {isLegendOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              {Object.entries(badgeCategories).map(([category, badges]) => {
                if (badges.length === 0) return null;
                return (
                  <div key={category}>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-2">{category}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                      {badges.map((badge) => (
                        <div key={badge.name} className="flex items-center gap-2 p-2 rounded bg-card border">
                          <span className="text-lg">{badge.icon}</span>
                          <div>
                            <div className="font-medium">{badge.name}</div>
                            <div className="text-xs text-muted-foreground">{badge.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Players Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-center">Badges</TableHead>
                <TableHead className="text-center min-w-[200px]">Achievements</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((player, index) => {
                const playerBadges = getBadges(player);
                return (
                  <TableRow key={player.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <Link 
                        to={`/player/${player.id}`}
                        className="flex items-center gap-3 hover:text-primary transition-colors"
                      >
                        <Avatar className="h-8 w-8">
                          <img 
                            src={getAvatarUrl(player)} 
                            alt={player.name}
                            className="h-full w-full object-cover"
                          />
                        </Avatar>
                        <span className="font-medium">{player.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-xs">
                        {playerBadges.length}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 justify-center max-w-xs">
                        {playerBadges.length > 0 ? (
                          playerBadges.slice(0, 6).map((badge, badgeIndex) => (
                            <div
                              key={badgeIndex}
                              className="flex items-center gap-1 bg-card border rounded px-2 py-1 text-xs hover:bg-muted/50 transition-colors"
                              title={`${badge.name}: ${badge.description}`}
                            >
                              <span className="text-sm">{badge.icon}</span>
                              <span className="hidden sm:inline">{badge.name}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No badges yet</span>
                        )}
                        {playerBadges.length > 6 && (
                          <div className="flex items-center gap-1 bg-muted border rounded px-2 py-1 text-xs">
                            <span>+{playerBadges.length - 6}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AchievementsTable;