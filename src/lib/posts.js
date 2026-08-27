// Local social posts: notes + #hashtags + optional photo, tagged to a restaurant.
// localStorage for now; this is the exact shape the Firebase `posts` collection
// will use, so the switch is a storage swap, not a rewrite.

import { getProfile } from './profile';
import { deletePhoto } from './photos';

const KEY = 'zgg.posts.v1';

export function parseHashtags(text) {
  const tags = new Set();
  for (const m of text.matchAll(/#([a-z0-9][a-z0-9_-]{0,30})/gi)) {
    tags.add(m[1].toLowerCase());
  }
  return [...tags];
}

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function getAllPosts() {
  return read();
}

export function getPostsFor(restaurantId) {
  return read().filter((p) => p.restaurantId === restaurantId);
}

export function addPost({ restaurantId, text, photoId = null }) {
  const list = read();
  const trimmed = (text || '').trim();
  const post = {
    id: `po_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    restaurantId,
    text: trimmed,
    tags: parseHashtags(trimmed),
    photoId,
    handle: getProfile().handle || 'anon',
    date: new Date().toISOString(),
  };
  write([post, ...list]);
  return post;
}

export async function deletePost(id) {
  const list = read();
  const post = list.find((p) => p.id === id);
  if (post?.photoId) await deletePhoto(post.photoId);
  write(list.filter((p) => p.id !== id));
}

export function allHashtags() {
  const counts = {};
  for (const p of read()) for (const t of p.tags) counts[t] = (counts[t] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}
