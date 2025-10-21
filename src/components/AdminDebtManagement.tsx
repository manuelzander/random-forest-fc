import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { ScheduledGame, GameScheduleSignup } from '@/types';

interface DebtEntry {
  gameId: string;
  gameDate: string;
  pitchSize: string;
  playerName: string;
  isGuest: boolean;
  isVerified: boolean;
  position: number;
  owesDebt: boolean;
  isLastMinuteDropout: boolean;
}

const AdminDebtManagement = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [debtEntries, setDebtEntries] = useState<DebtEntry[]>([]);

  useEffect(() => {
    fetchDebtData();
  }, []);

  const fetchDebtData = async () => {
    setLoading(true);
    try {
      // Fetch all scheduled games
      const { data: games, error: gamesError } = await supabase
        .from('games_schedule')
        .select('*')
        .order('scheduled_at', { ascending: false });

      if (gamesError) throw gamesError;

      // Fetch all signups with player details
      const { data: signupsData, error: signupsError } = await supabase
        .from('games_schedule_signups')
        .select(`
          *,
          players:player_id (
            id,
            name,
            user_id
          )
        `)
        .order('signed_up_at', { ascending: true });

      if (signupsError) throw signupsError;

      // Process debt entries
      const entries: DebtEntry[] = [];

      games?.forEach((game: ScheduledGame) => {
        const gameSignups = (signupsData || []).filter(
          (s: any) => s.game_schedule_id === game.id
        );

        // Determine pitch capacity
        const pitchCapacity = game.pitch_size === 'small' ? 12 : 14;

        gameSignups.forEach((signup: any, index: number) => {
          const position = index + 1;
          const isWithinCapacity = position <= pitchCapacity;
          
          // Player owes debt if:
          // 1. They're within capacity (top 12 or 14)
          // 2. OR they're marked as last minute dropout (regardless of position)
          const owesDebt = isWithinCapacity || signup.last_minute_dropout === true;

          if (owesDebt) {
            entries.push({
              gameId: game.id,
              gameDate: game.scheduled_at,
              pitchSize: game.pitch_size || 'big',
              playerName: signup.is_guest ? signup.guest_name : signup.players?.name || 'Unknown',
              isGuest: signup.is_guest || false,
              isVerified: !!signup.players?.user_id,
              position,
              owesDebt: true,
              isLastMinuteDropout: signup.last_minute_dropout === true
            });
          }
        });
      });

      setDebtEntries(entries);
    } catch (error) {
      console.error('Error fetching debt data:', error);
      toast({
        title: "Error",
        description: "Failed to load debt information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <DollarSign className="h-5 w-5" />
            Debt Management
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Players who owe payment for scheduled games. Includes top {' '}
            {12} (small pitch) or {14} (big pitch) players and last-minute dropouts.
          </p>
        </CardHeader>
        <CardContent>
          {debtEntries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No debt entries found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Game Date</TableHead>
                    <TableHead>Pitch Size</TableHead>
                    <TableHead>Player Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debtEntries.map((entry, index) => (
                    <TableRow key={`${entry.gameId}-${index}`}>
                      <TableCell className="font-medium">
                        {format(new Date(entry.gameDate), "MMM d, yyyy h:mm a")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {entry.pitchSize === 'small' ? 'Small (12)' : 'Big (14)'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {entry.playerName}
                          {entry.isLastMinuteDropout && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Last Min Dropout
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">#{entry.position}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {entry.isVerified && (
                            <Badge className="text-xs bg-green-100 text-green-700 border-0">
                              Verified
                            </Badge>
                          )}
                          {entry.isGuest && (
                            <Badge className="text-xs bg-blue-100 text-blue-700 border-0">
                              Guest
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDebtManagement;
