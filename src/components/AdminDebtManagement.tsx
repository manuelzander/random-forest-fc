import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { PoundSterling, AlertCircle, TrendingUp, TrendingDown, Calendar, Users, CheckCircle, User, AlertTriangle, Pencil, Download } from 'lucide-react';
import { format } from 'date-fns';
import type { ScheduledGame, GameScheduleSignup, Guest } from '@/types';

interface PlayerDebtSummary {
  playerId?: string;
  guestId?: string;
  playerName: string;
  isGuest: boolean;
  isVerified: boolean;
  totalDebt: number;
  credit: number;
  netBalance: number;
  gamesOwed: Array<{
    gameDate: string;
    pitchSize: string;
    isDropout: boolean;
    costPerPlayer: number;
    position: number;
    signupDate: string;
  }>;
}

const TOTAL_GAME_COST = 93.6; // Total cost per game to be split among players

const AdminDebtManagement = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [playerSummaries, setPlayerSummaries] = useState<PlayerDebtSummary[]>([]);
  const [editingCredit, setEditingCredit] = useState<{ id: string; value: string } | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerDebtSummary | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    fetchDebtData();
  }, []);

  const fetchDebtData = async () => {
    setLoading(true);
    try {
      console.log('Fetching debt data...');
      // Fetch all scheduled games
      const { data: games, error: gamesError } = await supabase
        .from('games_schedule')
        .select('*')
        .order('scheduled_at', { ascending: false });

      if (gamesError) throw gamesError;

      // Fetch all signups with player and guest details
      const { data: signupsData, error: signupsError } = await supabase
        .from('games_schedule_signups')
        .select(`
          *,
          players:player_id (
            id,
            name,
            user_id
          ),
          guests:guest_id (
            id,
            name,
            credit
          )
        `)
        .order('signed_up_at', { ascending: true });

      if (signupsError) throw signupsError;

      // Fetch all verified player profiles for credit info
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, credit');

      if (profilesError) throw profilesError;

      // Create a map of user_id to credit
      const creditMap = new Map(profiles?.map(p => [p.user_id, p.credit]) || []);

      // Helper to normalize guest names
      const normalize = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      // Fetch all guests to build a canonical name->guest mapping
      const { data: guestsList, error: guestsError } = await supabase
        .from('guests')
        .select('id, name, credit');
      
      if (guestsError) throw guestsError;

      const nameToGuest = new Map<string, { id: string; name: string; credit: number }>();
      guestsList?.forEach(g => {
        nameToGuest.set(normalize(g.name), { id: g.id, name: g.name, credit: Number(g.credit || 0) });
      });

      // Build supplemental mapping from signups that have guest_id (covers name variations)
      const signupNameToId = new Map<string, string>();
      (signupsData || []).forEach((s: any) => {
        if (s.is_guest && s.guest_id) {
          const nm = normalize(s.guests?.name || s.guest_name || '');
          if (nm && !signupNameToId.has(nm)) signupNameToId.set(nm, s.guest_id);
        }
      });

      // Calculate debt per player/guest
      const debtMap = new Map<string, PlayerDebtSummary>();

      games?.forEach((game: ScheduledGame) => {
        const gameSignups = (signupsData || []).filter(
          (s: any) => s.game_schedule_id === game.id
        );

        // Determine pitch capacity
        const pitchCapacity = game.pitch_size === 'small' ? 12 : 14;

        gameSignups.forEach((signup: any, index: number) => {
          const position = index + 1;
          const isWithinCapacity = position <= pitchCapacity;
          
          // Only top 12/14 players (by signup position) owe debt
          const owesDebt = position <= pitchCapacity;

          if (owesDebt) {
          const isGuest = signup.is_guest || false;
          const playerId = isGuest ? signup.guest_id : signup.player_id;
          const rawGuestName = isGuest 
            ? (signup.guests?.name || signup.guest_name || 'Unknown Guest')
            : (signup.players?.name || 'Unknown Player');
          
          // Skip if playerName is null or undefined (data integrity issue)
          if (!rawGuestName || rawGuestName === null) {
            console.warn('Skipping signup with null player name:', signup.id);
            return;
          }
          
          // Canonicalize guest identification
          let canonicalGuestId = playerId;
          let canonicalGuestName = rawGuestName;
          let canonicalCredit = 0;
          
          if (isGuest) {
            const nm = normalize(rawGuestName);
            const mapped = nameToGuest.get(nm);
            const mappedIdFromSignups = signupNameToId.get(nm);
            
            // Use the most authoritative guest ID we can find
            canonicalGuestId = signup.guest_id || mapped?.id || mappedIdFromSignups;
            // Prefer the saved guest name if available
            canonicalGuestName = mapped?.name || rawGuestName;
            canonicalCredit = signup.guests?.credit ?? mapped?.credit ?? 0;
          } else {
            canonicalCredit = creditMap.get(signup.players?.user_id) || 0;
          }
          
          const key = isGuest 
            ? (canonicalGuestId ? `guest-${canonicalGuestId}` : `guest-${normalize(rawGuestName)}`)
            : `player-${playerId}`;

            // Calculate cost per player based on pitch capacity
            const costPerPlayer = TOTAL_GAME_COST / pitchCapacity;

            if (!debtMap.has(key)) {
              debtMap.set(key, {
                playerId: isGuest ? undefined : playerId,
                guestId: isGuest ? canonicalGuestId : undefined,
                playerName: canonicalGuestName,
                isGuest,
                isVerified: !isGuest && !!signup.players?.user_id,
                totalDebt: 0,
                credit: Number(canonicalCredit),
                netBalance: 0,
                gamesOwed: []
              });
            }

            const summary = debtMap.get(key)!;
            summary.totalDebt += costPerPlayer;
            summary.gamesOwed.push({
              gameDate: game.scheduled_at,
              pitchSize: game.pitch_size || 'big',
              isDropout: signup.last_minute_dropout === true,
              costPerPlayer: costPerPlayer,
              position: position,
              signupDate: signup.signed_up_at
            });
          }
        });
      });

      // Calculate net balance for each player
      const summaries = Array.from(debtMap.values()).map(summary => ({
        ...summary,
        netBalance: summary.credit - summary.totalDebt
      }));

      // Sort by net balance (most negative first)
      summaries.sort((a, b) => a.netBalance - b.netBalance);

      setPlayerSummaries(summaries);
      console.log('Debt data loaded successfully:', summaries.length, 'entries');
    } catch (error) {
      console.error('Error fetching debt data:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load debt information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateCredit = async (summary: PlayerDebtSummary, newCredit: number) => {
    try {
      if (summary.isGuest && summary.guestId) {
        // Update guest credit
        const { error } = await supabase
          .from('guests')
          .update({ credit: newCredit })
          .eq('id', summary.guestId);
        
        if (error) throw error;
      } else if (summary.playerId) {
        // Update player profile credit
        const { data: player } = await supabase
          .from('players')
          .select('user_id')
          .eq('id', summary.playerId)
          .single();

        if (player?.user_id) {
          const { error } = await supabase
            .from('profiles')
            .update({ credit: newCredit })
            .eq('user_id', player.user_id);
          
          if (error) throw error;
        }
      }

      toast({
        title: "Success",
        description: "Credit updated successfully"
      });

      setEditingCredit(null);
      fetchDebtData();
    } catch (error) {
      console.error('Error updating credit:', error);
      toast({
        title: "Error",
        description: "Failed to update credit",
        variant: "destructive",
      });
    }
  };

  const totals = playerSummaries.reduce(
    (acc, summary) => ({
      debt: acc.debt + summary.totalDebt,
      credit: acc.credit + summary.credit,
      netBalance: acc.netBalance + summary.netBalance
    }),
    { debt: 0, credit: 0, netBalance: 0 }
  );

  const exportToCSV = () => {
    const headers = ['Player', 'Type', 'Games', 'Debt (£)', 'Credit (£)', 'Balance (£)'];
    const rows = playerSummaries.map(summary => [
      summary.playerName,
      summary.isGuest ? 'Guest' : summary.isVerified ? 'Verified' : 'Unverified',
      summary.gamesOwed.length,
      summary.totalDebt.toFixed(2),
      summary.credit.toFixed(2),
      summary.netBalance.toFixed(2)
    ]);
    
    // Add totals row
    rows.push(['TOTAL', '', playerSummaries.length, totals.debt.toFixed(2), totals.credit.toFixed(2), totals.netBalance.toFixed(2)]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `player-debt-credit-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    
    toast({
      title: "Exported",
      description: "Player debt & credit data exported to CSV"
    });
  };

  const exportPlayerDetails = (player: PlayerDebtSummary) => {
    const headers = ['Date', 'Pitch', 'Cost (£)', 'Position', 'Status', 'Signup Time'];
    const rows = player.gamesOwed.map(game => [
      format(new Date(game.gameDate), 'MMM d, yyyy h:mm a'),
      game.pitchSize,
      game.costPerPlayer.toFixed(2),
      game.position,
      game.isDropout ? 'Dropout' : 'Played',
      format(new Date(game.signupDate), 'MMM d, yyyy h:mm a')
    ]);
    
    // Add summary rows
    rows.push([]);
    rows.push(['Total Games', '', player.gamesOwed.length, '', '', '']);
    rows.push(['Total Debt', '', player.totalDebt.toFixed(2), '', '', '']);
    rows.push(['Credit', '', player.credit.toFixed(2), '', '', '']);
    rows.push(['Net Balance', '', player.netBalance.toFixed(2), '', '', '']);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${player.playerName.replace(/\s+/g, '-')}-debt-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    
    toast({
      title: "Exported",
      description: `${player.playerName}'s game details exported to CSV`
    });
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
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Total Debt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              £{totals.debt.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
              From {playerSummaries.length} players
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Total Credit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              £{totals.credit.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
              Available balance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PoundSterling className="h-4 w-4" />
              Net Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              £{totals.netBalance.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
              {totals.netBalance >= 0 ? 'Surplus' : 'Outstanding'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Player Debt Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <PoundSterling className="h-5 w-5" />
              Player Debt & Credit
            </CardTitle>
            <Button size="sm" onClick={exportToCSV} className="bg-green-600 hover:bg-green-700">
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {playerSummaries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No debt entries found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Games</TableHead>
                    <TableHead className="text-right">Debt</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {playerSummaries.map((summary, index) => {
                    const key = `${summary.isGuest ? 'guest' : 'player'}-${summary.guestId || summary.playerId || index}`;
                    const isEditing = editingCredit?.id === key;
                    
                    return (
                      <TableRow key={key}>
                        <TableCell className="font-medium">
                          <button
                            onClick={() => {
                              setSelectedPlayer(summary);
                              setIsDetailsOpen(true);
                            }}
                            className="text-primary hover:underline cursor-pointer"
                          >
                            {summary.playerName}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {summary.isVerified && (
                              <Badge className="text-xs h-5 px-1.5 bg-green-100 text-green-700 border-0">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Verified</span>
                              </Badge>
                            )}
                            {summary.isGuest && (
                              <Badge className="text-xs h-5 px-1.5 bg-blue-100 text-blue-700 border-0">
                                <User className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Guest</span>
                              </Badge>
                            )}
                            {!summary.isGuest && !summary.isVerified && (
                              <Badge className="text-xs h-5 px-1.5 bg-orange-100 text-orange-700 border-0">
                                <User className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Unverified</span>
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {summary.gamesOwed.length}
                        </TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          £{summary.totalDebt.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <div className="flex items-center gap-2 justify-end">
                              <Input
                                type="number"
                                step="0.01"
                                value={editingCredit.value}
                                onChange={(e) => setEditingCredit({ ...editingCredit, value: e.target.value })}
                                className="w-24 h-8 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={() => updateCredit(summary, parseFloat(editingCredit.value))}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingCredit(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingCredit({ id: key, value: summary.credit.toString() })}
                              className="inline-flex items-center gap-1.5 font-medium text-green-600 hover:bg-green-50 px-2 py-1 rounded transition-colors group"
                            >
                              £{summary.credit.toFixed(2)}
                              <Pencil className="h-3 w-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                            </button>
                          )}
                        </TableCell>
                        <TableCell className={`text-right font-bold ${summary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          £{summary.netBalance.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Player Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl mx-2 sm:mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pr-8">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="flex items-center gap-2">
                <PoundSterling className="h-5 w-5" />
                {selectedPlayer?.playerName} - Game Details
              </DialogTitle>
              {selectedPlayer && (
                <Button size="sm" onClick={() => exportPlayerDetails(selectedPlayer)} className="bg-green-600 hover:bg-green-700">
                  <Download className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              )}
            </div>
          </DialogHeader>
          
          {selectedPlayer && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      Total Debt
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      £{selectedPlayer.totalDebt.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Credit Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      £{selectedPlayer.credit.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <PoundSterling className="h-4 w-4" />
                      Net Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${selectedPlayer.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      £{Math.abs(selectedPlayer.netBalance).toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Games Table */}
              <div>
                <h3 className="font-semibold mb-2">Game Breakdown</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <span className="sm:hidden">Date</span>
                          <span className="hidden sm:inline">Date</span>
                        </TableHead>
                        <TableHead className="hidden sm:table-cell">Pitch</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-center hidden sm:table-cell">Position</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden sm:table-cell">Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPlayer.gamesOwed.map((game, index) => (
                        <TableRow key={index} className={game.isDropout ? 'bg-red-50 border-red-200' : ''}>
                          <TableCell className={`font-medium text-xs ${game.isDropout ? 'text-red-600' : 'text-muted-foreground'}`}>
                            <span className={game.isDropout ? 'line-through' : ''}>
                              <span className="sm:hidden">{format(new Date(game.gameDate), 'M/d h:mm a')}</span>
                              <span className="hidden sm:inline">{format(new Date(game.gameDate), 'MMM d, h:mm a')}</span>
                            </span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="outline" className="capitalize">
                              {game.pitchSize}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-xs">
                            £{game.costPerPlayer.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center hidden sm:table-cell">
                            <div className="flex items-center justify-center gap-1">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm font-medium">#{game.position}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {game.isDropout ? (
                              <Badge className="text-xs h-5 px-1.5 bg-red-100 text-red-700 border-0">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Dropout</span>
                              </Badge>
                            ) : (
                              <Badge className="text-xs h-5 px-1.5 bg-green-100 text-green-700 border-0">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Played</span>
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                            <span className="sm:hidden">{format(new Date(game.signupDate), 'M/d h:mm a')}</span>
                            <span className="hidden sm:inline">{format(new Date(game.signupDate), 'MMM d, h:mm a')}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center p-4 bg-muted rounded-lg font-semibold">
                <span>Total Games:</span>
                <span>{selectedPlayer.gamesOwed.length}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDebtManagement;
