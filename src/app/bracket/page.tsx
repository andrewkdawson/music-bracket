"use client";

import { useEffect, useState } from "react";
import type { Song, Match, Round } from "@/lib/bracket";
import confetti from "canvas-confetti";

export default function BracketPage() {
  const [bracket, setBracket] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [champion, setChampion] = useState<Song | null>(null);
  const [artistName, setArtistName] = useState("Quinn XCII");
  const [artistId, setArtistId] = useState("3ApUX1o6oSz321MMECyIYd");

  // ✅ Auto-advance only Round 1 byes
  function autoAdvanceByes(bracket: Round[]): Round[] {
    const newBracket = JSON.parse(JSON.stringify(bracket)) as Round[];
    const round1 = newBracket.find((r) => r.roundNumber === 1);
    if (!round1) return newBracket;

    round1.matches.forEach((match) => {
      if (match.song1 && !match.song2) {
        match.winner = match.song1;
        if (match.nextMatchId && match.slot) {
          const nextMatch = newBracket
            .flatMap((r) => r.matches)
            .find((m) => m.id === match.nextMatchId);
          if (nextMatch) {
            if (match.slot === "song1") {
              nextMatch.song1 = match.song1;
              nextMatch.seed1 = match.seed1;
            } else {
              nextMatch.song2 = match.song1;
              nextMatch.seed2 = match.seed1;
            }
          }
        }
      } else if (!match.song1 && match.song2) {
        match.winner = match.song2;
        if (match.nextMatchId && match.slot) {
          const nextMatch = newBracket
            .flatMap((r) => r.matches)
            .find((m) => m.id === match.nextMatchId);
          if (nextMatch) {
            if (match.slot === "song1") {
              nextMatch.song1 = match.song2;
              nextMatch.seed1 = match.seed2;
            } else {
              nextMatch.song2 = match.song2;
              nextMatch.seed2 = match.seed2;
            }
          }
        }
      }
    });

    return newBracket;
  }

  // Fetch bracket for current artistId
  useEffect(() => {
    const fetchBracket = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/artist/${artistId}/bracket`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        let data = await response.json();

        // ✅ auto-advance Round 1 byes
        data = autoAdvanceByes(data);

        setBracket(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch bracket");
      } finally {
        setLoading(false);
      }
    };
    if (artistId) fetchBracket();
  }, [artistId]);

  // Detect champion
  useEffect(() => {
    if (bracket.length > 0) {
      const finalRound = bracket[bracket.length - 1];
      const finalMatch = finalRound.matches[0];
      if (finalMatch.winner && champion?.id !== finalMatch.winner.id) {
        setChampion(finalMatch.winner);
        confetti({
          particleCount: 200,
          spread: 80,
          origin: { y: 0.6 },
        });
      }
    }
  }, [bracket]);

  if (loading) return <div className="p-6 text-center text-white">Loading bracket...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-[#191414] text-white p-6 overflow-x-auto">
      {/* 🔍 Search Bar */}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!artistName) return;
          const res = await fetch(`/api/search-artist?name=${encodeURIComponent(artistName)}`);
          if (!res.ok) {
            alert("Artist not found");
            return;
          }
          const data = await res.json();
          setArtistId(data.id);
          setArtistName(data.name);
        }}
        className="mb-8 flex justify-center gap-2"
      >
        <input
          type="text"
          placeholder="Search artist..."
          value={artistName}
          onChange={(e) => setArtistName(e.target.value)}
          className="px-4 py-2 rounded-lg bg-[#282828] text-white border border-[#1DB954]/40 w-64"
        />
        <button
          type="submit"
          className="bg-[#1DB954] text-black font-bold px-4 py-2 rounded-lg hover:bg-[#1ed760] transition"
        >
          Search
        </button>
      </form>

      {/* Title */}
      <h1 className="text-4xl font-extrabold text-center mb-10 text-[#1DB954] tracking-wide">
        {artistName} Madness
      </h1>

      {/* Bracket */}
      <div className="flex gap-12">
        {bracket.map((round) => (
          <div key={round.roundNumber} className="flex-1 min-w-[250px]">
            <h2 className="text-lg font-bold text-center text-[#1DB954] mb-6 uppercase tracking-wider">
              {round.roundNumber === 0
                ? "Play-in"
                : round.roundNumber === bracket.length
                ? "Final"
                : `Round ${round.roundNumber}`}
            </h2>
            <div className="space-y-6">
              {round.matches.map((match) => (
                <div
                  key={match.id}
                  className="bg-[#282828] rounded-lg border border-[#1DB954]/40 shadow-lg p-4 hover:border-[#1DB954] transition"
                >
                  {/* Song 1 */}
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() =>
                        match.song1 && handlePickWinner(match, match.song1, match.seed1)
                      }
                      disabled={!match.song1}
                      className={`flex-1 flex items-center gap-2 text-left rounded px-2 py-2 ${
                        match.song1 && match.winner?.id === match.song1?.id
                          ? "bg-[#1DB954] text-black font-bold"
                          : "hover:bg-[#1DB954]/20"
                      }`}
                    >
                      {match.seed1 && (
                        <span className="text-xs font-bold bg-[#1DB954]/20 text-[#1DB954] px-2 py-1 rounded">
                          {match.seed1}
                        </span>
                      )}
                      <span>
                        {match.song1?.name || (round.roundNumber === 1 ? "BYE" : "TBD")}
                      </span>
                    </button>
                  </div>

                  <div className="text-center text-[#b3b3b3] text-sm font-semibold">vs</div>

                  {/* Song 2 */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() =>
                        match.song2 && handlePickWinner(match, match.song2, match.seed2)
                      }
                      disabled={!match.song2}
                      className={`flex-1 flex items-center gap-2 text-left rounded px-2 py-2 ${
                        match.song2 && match.winner?.id === match.song2?.id
                          ? "bg-[#1DB954] text-black font-bold"
                          : "hover:bg-[#1DB954]/20"
                      }`}
                    >
                      {match.seed2 && (
                        <span className="text-xs font-bold bg-[#1DB954]/20 text-[#1DB954] px-2 py-1 rounded">
                          {match.seed2}
                        </span>
                      )}
                      <span>
                        {match.song2?.name || (round.roundNumber === 1 ? "BYE" : "TBD")}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Champion Modal */}
      {champion && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#282828] rounded-xl shadow-2xl border border-[#1DB954] p-8 max-w-md text-center">
            <h2 className="text-3xl font-bold text-[#1DB954] mb-4">🏆 Champion 🏆</h2>
            <p className="text-xl font-semibold mb-4">{champion.name}</p>
            {champion.spotifyUrl && (
              <a
                href={champion.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-[#1DB954] text-black font-bold px-4 py-2 rounded-lg hover:bg-[#1ed760] transition"
              >
                Listen on Spotify
              </a>
            )}
            <button
              onClick={() => setChampion(null)}
              className="mt-6 block mx-auto text-[#b3b3b3] hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Winner advancing logic
  function handlePickWinner(match: Match, song: Song, seed: number | null) {
    setBracket((prev) => {
      const newBracket = JSON.parse(JSON.stringify(prev)) as Round[];
      const round = newBracket.find((r) => r.roundNumber === match.round)!;
      const m = round.matches.find((x) => x.id === match.id)!;
      m.winner = song;

      if (m.nextMatchId && m.slot) {
        const nextMatch = newBracket
          .flatMap((r) => r.matches)
          .find((x) => x.id === m.nextMatchId)!;

        if (m.slot === "song1") {
          nextMatch.song1 = song;
          nextMatch.seed1 = seed;
        } else {
          nextMatch.song2 = song;
          nextMatch.seed2 = seed;
        }
      }

      return newBracket;
    });
  }
}
