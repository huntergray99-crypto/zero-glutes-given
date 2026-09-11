// Earnable badges, derived from the same stats that drive points. Pure
// functions of computeStats() output — no separate storage.

import { getRestaurants } from './restaurantStore';

// Read at call time: a runtime override can close a featured spot, and the
// badge shouldn't ask for a visit that's no longer possible.
const featuredCount = () =>
  getRestaurants().filter((r) => r.featured && !r.honorableMention).length;

export const BADGES = [
  {
    id: 'first-bite',
    icon: '🍽️',
    name: 'First Bite',
    need: 'Check in anywhere',
    earned: (s) => s.totalCheckIns >= 1,
  },
  {
    id: 'reviewer',
    icon: '✍️',
    name: 'Straight Talker',
    need: 'Write 3 celiac reviews',
    earned: (s) => s.reviewsWritten >= 3,
  },
  {
    id: 'chronicler',
    icon: '📸',
    name: 'Chronicler',
    need: 'Share 5 posts to the feed',
    earned: (s) => s.posts >= 5,
  },
  {
    id: 'explorer',
    icon: '🗺️',
    name: 'Neighborhood Explorer',
    need: 'Check in across 5 neighborhoods',
    earned: (s) => s.neighborhoods >= 5,
  },
  {
    id: 'night-owl',
    icon: '🌙',
    name: 'Night Owl',
    need: 'Check in after 10pm',
    earned: (s) => s.lateCheckIn,
  },
  {
    id: 'regular',
    icon: '🔁',
    name: 'Regular',
    need: '10 total check-ins',
    earned: (s) => s.totalCheckIns >= 10,
  },
  {
    id: 'featured-hound',
    icon: '⭐',
    name: 'Star Chaser',
    need: 'Visit 5 featured spots',
    earned: (s) => s.featuredVisited >= 5,
  },
  {
    id: 'completionist',
    icon: '🏆',
    name: 'Completionist',
    need: () => `Visit all ${featuredCount()} featured spots`,
    earned: (s) => s.featuredVisited >= featuredCount(),
  },
  {
    id: 'legend',
    icon: '👑',
    name: 'Zero Glutes Legend',
    need: 'Reach the top level',
    earned: (s) => s.points >= 3000,
  },
];

// `need` may be a function when its text depends on the live spot list.
const needText = (b) => (typeof b.need === 'function' ? b.need() : b.need);

export function earnedBadges(stats) {
  return BADGES.filter((b) => b.earned(stats));
}

export function badgeProgress(stats) {
  return BADGES.map((b) => ({ ...b, need: needText(b), done: b.earned(stats) }));
}
