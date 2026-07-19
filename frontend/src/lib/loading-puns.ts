"use client";

import { useEffect, useState } from "react";

/**
 * Self-deprecating loading humor about running the whole backend on a free tier
 * with 0.1 vCPU and 512 MB of RAM. Waiting is inevitable on hosting this cheap,
 * so we make the wait fun instead of frustrating. The joke is always on us (the
 * host), never on the user.
 *
 * `LOADING_PUNS` is the general-purpose set shown anywhere something is churning;
 * `COLD_START_QUIPS` is the sleepier, "the dyno is literally napping" set used by
 * the cold-start gate. Keep both genuinely funny — if a line isn't, cut it.
 */
export const LOADING_PUNS = [
  "Our server runs on 0.1 CPU. That's not a typo — that's a lifestyle choice.",
  "512 MB of RAM, doing the work of a data center that only exists in our dreams.",
  "The hamster powering the backend just asked for a water break. Almost there.",
  "Crunching numbers on one-tenth of a CPU. Please clap.",
  "One very tired core is giving 110%. It only has 10% to give.",
  "Loading at the blazing speed of 'we did not pay for the fast tier.'",
  "Chrome laughs at our 512 MB of RAM. We load anyway. We are brave.",
  "This would be instant with a real budget. Instead, we have vibes and a prayer.",
  "Teaching 0.1 CPU to count. It's going about as well as you'd expect.",
  "The free tier is thinking. You can't rush genius on a budget.",
  "Byte by byte, on hosting cheaper than your morning coffee.",
  "Downloading more RAM… kidding, we can't afford that either.",
  "Patience: our CPU is fractional, but our spirit is whole.",
  "Rendering this on a potato. A deeply underpaid potato.",
  "One core, half a gig, zero dollars, infinite dreams.",
  "CPU's at 100%! …to be fair, 100% of 0.1 isn't a lot.",
  "Loading slowly so you can fully appreciate what money could've bought.",
  "Please hold — the hamster hit a hill.",
  "Compiling excuses… and also your data, on a free plan.",
  "Our server flexes 0.1 vCPU. It's mostly for the aesthetic.",
  "512 MB: enough RAM to load this, not quite enough to load it quickly.",
  "Somewhere in the cloud, a very cheap container is trying its absolute best.",
  "We optimized for cost, not speed. It shows. We're sorry. Kind of.",
  "Buffering feelings and bytes on a shoestring server.",
  "Give it a sec — greatness on a free tier takes a moment longer.",
] as const;

/**
 * Sleepier lines for the cold-start gate, where the free-tier dyno has fully
 * dozed off and needs a minute to wake up. Kept separate from `LOADING_PUNS`
 * because "the server is asleep" only makes sense during an actual cold start.
 */
export const COLD_START_QUIPS = [
  "Poking the server with a stick…",
  "It naps on a free tier to save money we don't have.",
  "Bribing the container with exposure and good vibes.",
  "This is what $0 a month buys you. Worth every penny.",
  "Somewhere, a very cheap dyno is reluctantly booting.",
  "The server is stretching, yawning, asking what year it is.",
  "Reticulating splines… kidding, it's just budget hosting.",
  "Whispering 'wakey wakey' to 512 MB of sleepy RAM.",
  "The 0.1 CPU pressed snooze. We pressed it again for you.",
  "Brewing coffee for a container that runs on zero dollars.",
] as const;

/** Pick a random pun, optionally avoiding an immediate repeat so it always visibly changes. */
export function randomPun(exclude?: string): string {
  const pool = exclude ? LOADING_PUNS.filter((p) => p !== exclude) : LOADING_PUNS;
  const list = pool.length > 0 ? pool : LOADING_PUNS;
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Returns a loading pun that rotates on an interval, never repeating back-to-back,
 * so a long wait feels alive instead of a frozen spinner. Use the returned string
 * as a React `key` on the text node to re-trigger a fade-in on each change.
 */
export function useRotatingPun(intervalMs = 3400): string {
  const [pun, setPun] = useState<string>(() => LOADING_PUNS[0]);

  useEffect(() => {
    // Randomize the first line on mount (kept deterministic during SSR to avoid hydration drift).
    setPun((prev) => randomPun(prev));
    const id = setInterval(() => setPun((prev) => randomPun(prev)), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return pun;
}
