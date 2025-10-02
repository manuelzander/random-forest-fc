import { Player } from '@/types';
import { ProfileData, getBadges, Badge } from './badges';

// Simple in-memory cache for badges
const badgeCache = new Map<string, { badges: Badge[], timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getCachedBadges = (player: Player, profile?: ProfileData): Badge[] => {
  // Include all relevant fields that affect badge calculation
  const profileKey = profile 
    ? `${JSON.stringify(profile.skill_ratings || {})}-${(profile.football_skills || []).join(',')}`
    : 'no-profile';
  const cacheKey = `${player.id}-${player.points}-${player.games_played}-${player.mvp_awards}-${player.wins}-${player.losses}-${player.draws}-${player.goal_difference}-${profileKey}`;
  const cached = badgeCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.badges;
  }
  
  const badges = getBadges(player, profile);
  badgeCache.set(cacheKey, { badges, timestamp: Date.now() });
  
  return badges;
};

export const clearBadgeCache = () => {
  badgeCache.clear();
};