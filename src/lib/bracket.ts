export interface Song {
    id: string;
    name: string;
    popularity: number;
    albumArt?: string;
  }
  
  export interface Match {
    id: string;
    round: number;
    seeds: number[]; // which seeds feed into this match
    seed1: number | null;
    song1: Song | null;
    seed2: number | null;
    song2: Song | null;
    winner?: Song;
    nextMatchId?: string;
    slot?: "song1" | "song2";
  }
  
  export interface Round {
    roundNumber: number;
    matches: Match[];
  }
  
  let matchCounter = 1;
  function makeMatch(round: number, seeds: number[]): Match {
    return {
      id: `M${matchCounter++}`,
      round,
      seeds,
      seed1: null,
      song1: null,
      seed2: null,
      song2: null,
    };
  }
  
  // Generate first-round seed pairings: (1 vs N), (2 vs N-1), ...
  function generateFirstRoundSeeds(size: number): [number, number][] {
    const pairs: [number, number][] = [];
    for (let i = 1; i <= size / 2; i++) {
      pairs.push([i, size + 1 - i]);
    }
    return pairs;
  }
  
  export function generateBracket(songs: Song[]): Round[] {
    if (songs.length === 0) return [];
  
    const sorted = [...songs].sort((a, b) => b.popularity - a.popularity);
  
    // Round up to nearest power of 2
    const size = Math.pow(2, Math.ceil(Math.log2(sorted.length)));
  
    const rounds: Round[] = [];
  
    // --- Round 1
    const round1Pairs = generateFirstRoundSeeds(size);
    const round1: Match[] = round1Pairs.map(([s1, s2]) => {
      return {
        ...makeMatch(1, [s1, s2]),
        seed1: s1,
        song1: s1 <= sorted.length ? sorted[s1 - 1] : null,
        seed2: s2,
        song2: s2 <= sorted.length ? sorted[s2 - 1] : null,
      };
    });
    rounds.push({ roundNumber: 1, matches: round1 });
  
    // --- Later rounds
    let prevMatches = round1;
    let roundNum = 2;
  
    while (prevMatches.length > 1) {
      const current: Match[] = [];
      const numMatches = prevMatches.length / 2;
  
      for (let i = 0; i < numMatches; i++) {
        // Collect seeds from the two child matches
        const child1 = prevMatches[i];
        const child2 = prevMatches[prevMatches.length - 1 - i]; // <-- NCAA rule: mirror pairing
  
        const parentSeeds = [...child1.seeds, ...child2.seeds];
        const parent = makeMatch(roundNum, parentSeeds);
  
        // link children
        child1.nextMatchId = parent.id;
        child1.slot = "song1";
        child2.nextMatchId = parent.id;
        child2.slot = "song2";
  
        current.push(parent);
      }
  
      rounds.push({ roundNumber: roundNum, matches: current });
      prevMatches = current;
      roundNum++;
    }
  
    return rounds;
  }
  