// Earnable badges, derived from the same stats that drive points. Pure
// functions of computeStats() output — no separate storage.

import { restaurants } from '../data/restaurants';

const FEATURED_COUNT = restaurants.filter((r) => r.featured && !r.honorableMention).length;

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
    need: `Visit all ${FEATURED_COUNT} featured spots`,
    earned: (s) => s.featuredVisited >= FEATURED_COUNT,
  },
  {
    id: 'legend',
    icon: '👑',
    name: 'Zero Glutes Legend',
    need: 'Reach the top level',
    earned: (s) => s.points >= 3000,
  },
];

export function earnedBadges(stats) {
  return BADGES.filter((b) => b.earned(stats));
}

export function badgeProgress(stats) {
  return BADGES.map((b) => ({ ...b, done: b.earned(stats) }));
}
