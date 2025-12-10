import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuestSuggestion {
  id: string | null;
  name: string;
  type: 'guest' | 'orphan';
}

interface GuestNameAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onKeyPress?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  className?: string;
  gameId?: string; // Optional: to filter out guests already signed up for this game
}

const GuestNameAutocomplete = ({
  value,
  onChange,
  onKeyPress,
  placeholder = "Guest name",
  className,
  gameId,
}: GuestNameAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<GuestSuggestion[]>([]);
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
        const allSuggestions: GuestSuggestion[] = [];

        // Fetch existing guests
        const { data: guests } = await supabase
          .from('guests')
          .select('id, name')
          .ilike('name', `%${searchTerm}%`)
          .limit(5);

        if (guests) {
          guests.forEach(guest => {
            allSuggestions.push({
              id: guest.id,
              name: guest.name,
              type: 'guest',
            });
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
          // Get unique names not already in suggestions
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

        // If gameId provided, filter out guests already signed up
        if (gameId) {
          const { data: existingSignups } = await supabase
            .from('games_schedule_signups')
            .select('guest_id, guest_name')
            .eq('game_schedule_id', gameId)
            .eq('is_guest', true);

          if (existingSignups) {
            const signedUpIds = new Set(existingSignups.map(s => s.guest_id).filter(Boolean));
            const signedUpNames = new Set(existingSignups.map(s => s.guest_name?.toLowerCase()).filter(Boolean));
            
            const filtered = allSuggestions.filter(s => {
              if (s.id && signedUpIds.has(s.id)) return false;
              if (signedUpNames.has(s.name.toLowerCase())) return false;
              return true;
            });
            setSuggestions(filtered);
            return;
          }
        }

        setSuggestions(allSuggestions);
      } catch (error) {
        console.error('Error fetching guest suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(debounce);
  }, [value, gameId]);

  const handleSelect = (suggestion: GuestSuggestion) => {
    onChange(suggestion.name);
    setShowSuggestions(false);
  };

  const getIcon = (type: GuestSuggestion['type']) => {
    return <User className={cn(
      "h-3 w-3 shrink-0",
      type === 'guest' ? "text-green-600" : "text-muted-foreground"
    )} />;
  };

  const getLabel = (type: GuestSuggestion['type']) => {
    return type === 'guest' ? 'Guest' : 'Previous signup';
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
        onKeyPress={onKeyPress}
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
                index === 0 && "rounded-t-md",
                index === suggestions.length - 1 && "rounded-b-md"
              )}
              onClick={() => handleSelect(suggestion)}
            >
              {getIcon(suggestion.type)}
              <span className="truncate flex-1">{suggestion.name}</span>
              <span className={cn(
                "text-xs ml-auto shrink-0 px-1.5 py-0.5 rounded",
                suggestion.type === 'guest' && "bg-green-100 text-green-700",
                suggestion.type === 'orphan' && "bg-muted text-muted-foreground"
              )}>
                {getLabel(suggestion.type)}
              </span>
            </button>
          ))}
        </div>
      )}
      
      {showSuggestions && loading && value.length >= 2 && suggestions.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg p-2 text-sm text-muted-foreground">
          Searching...
        </div>
      )}
    </div>
  );
};

export default GuestNameAutocomplete;
