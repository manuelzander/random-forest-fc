import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { User, UserPlus, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlayerSuggestion {
  id: string | null;
  name: string;
  type: 'player' | 'guest' | 'orphan' | 'new';
}

interface PlayerNameAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: PlayerSuggestion) => void;
  existingPlayers: { id: string; name: string }[];
  excludePlayerIds?: string[];
  placeholder?: string;
  className?: string;
}

const PlayerNameAutocomplete = ({
  value,
  onChange,
  onSelect,
  existingPlayers,
  excludePlayerIds = [],
  placeholder = "Type player name...",
  className,
}: PlayerNameAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<PlayerSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions when input changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!value.trim() || value.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const searchTerm = value.toLowerCase();
        const allSuggestions: PlayerSuggestion[] = [];

        // Filter existing players passed in props (they're already loaded)
        const matchingPlayers = existingPlayers.filter(p => 
          p.name.toLowerCase().includes(searchTerm) && 
          !excludePlayerIds.includes(p.id)
        );
        
        matchingPlayers.slice(0, 5).forEach(player => {
          allSuggestions.push({
            id: player.id,
            name: player.name,
            type: 'player',
          });
        });

        // Fetch existing guests
        const { data: guests } = await supabase
          .from('guests')
          .select('id, name')
          .ilike('name', `%${searchTerm}%`)
          .limit(5);

        if (guests) {
          const existingNames = new Set(allSuggestions.map(s => s.name.toLowerCase()));
          guests.forEach(guest => {
            if (!existingNames.has(guest.name.toLowerCase())) {
              existingNames.add(guest.name.toLowerCase());
              allSuggestions.push({
                id: guest.id,
                name: guest.name,
                type: 'guest',
              });
            }
          });
        }

        // Fetch orphaned guest signups (signups with guest_name but no guest_id)
        const { data: orphanedSignups } = await supabase
          .from('games_schedule_signups')
          .select('guest_name')
          .is('guest_id', null)
          .not('guest_name', 'is', null)
          .ilike('guest_name', `%${searchTerm}%`)
          .limit(5);

        if (orphanedSignups) {
          const existingNames = new Set(allSuggestions.map(s => s.name.toLowerCase()));
          orphanedSignups.forEach(signup => {
            if (signup.guest_name && !existingNames.has(signup.guest_name.toLowerCase())) {
              existingNames.add(signup.guest_name.toLowerCase());
              allSuggestions.push({
                id: null,
                name: signup.guest_name,
                type: 'orphan',
              });
            }
          });
        }

        // Add "Create new player" option if no exact match
        const exactMatch = allSuggestions.some(s => 
          s.name.toLowerCase() === value.trim().toLowerCase()
        );
        if (!exactMatch && value.trim().length >= 2) {
          allSuggestions.push({
            id: null,
            name: value.trim(),
            type: 'new',
          });
        }

        setSuggestions(allSuggestions);
      } catch (error) {
        console.error('Error fetching player suggestions:', error);
        // Still show create option on error
        setSuggestions([{
          id: null,
          name: value.trim(),
          type: 'new',
        }]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(debounce);
  }, [value, existingPlayers, excludePlayerIds]);

  const handleSelect = (suggestion: PlayerSuggestion) => {
    onSelect(suggestion);
    onChange('');
    setShowSuggestions(false);
  };

  const getIcon = (type: PlayerSuggestion['type']) => {
    switch (type) {
      case 'player':
        return <Users className="h-3 w-3 text-green-600 shrink-0" />;
      case 'guest':
        return <User className="h-3 w-3 text-blue-600 shrink-0" />;
      case 'orphan':
        return <User className="h-3 w-3 text-muted-foreground shrink-0" />;
      case 'new':
        return <UserPlus className="h-3 w-3 text-primary shrink-0" />;
    }
  };

  const getLabel = (type: PlayerSuggestion['type']) => {
    switch (type) {
      case 'player':
        return 'Player';
      case 'guest':
        return 'Guest';
      case 'orphan':
        return 'Previous signup';
      case 'new':
        return 'Create new';
    }
  };

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        className={className}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-64 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.type}-${suggestion.id || suggestion.name}-${index}`}
              type="button"
              className={cn(
                "w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-accent transition-colors",
                suggestion.type === 'new' && "bg-primary/5 border-t border-border",
                index === 0 && "rounded-t-md",
                index === suggestions.length - 1 && "rounded-b-md"
              )}
              onClick={() => handleSelect(suggestion)}
            >
              {getIcon(suggestion.type)}
              <span className="truncate flex-1">
                {suggestion.type === 'new' ? `Create "${suggestion.name}"` : suggestion.name}
              </span>
              <span className={cn(
                "text-xs ml-auto shrink-0 px-1.5 py-0.5 rounded",
                suggestion.type === 'player' && "bg-green-100 text-green-700",
                suggestion.type === 'guest' && "bg-blue-100 text-blue-700",
                suggestion.type === 'orphan' && "bg-muted text-muted-foreground",
                suggestion.type === 'new' && "bg-primary/10 text-primary"
              )}>
                {getLabel(suggestion.type)}
              </span>
            </button>
          ))}
        </div>
      )}
      
      {showSuggestions && loading && value.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg p-2 text-sm text-muted-foreground">
          Searching...
        </div>
      )}
    </div>
  );
};

export default PlayerNameAutocomplete;
