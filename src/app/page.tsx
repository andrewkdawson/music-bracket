"use client";

import { useEffect, useState, useRef } from "react";
import type { Song, Match, Round } from "@/lib/bracket";
import confetti from "canvas-confetti";
import Image from "next/image";
import { toPng } from "html-to-image";

export default function BracketPage() {
  const [bracket, setBracket] = useState<Round[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [champion, setChampion] = useState<Song | null>(null);
  const [artistName, setArtistName] = useState("");
  const [artistId, setArtistId] = useState<string | null>(null);

  const bracketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = artistId ? `${artistName} Madness` : "Music Madness";
  }, [artistId, artistName]);

  function autoAdvanceByes(bracket: Round[]): Round[] {
    const newBracket = JSON.parse(JSON.stringify(bracket)) as Round[];
    const round1 = newBracket.find((r) => r.roundNumber === 1);
    if (!round1) return newBracket;

    round1.matches.forEach((match) => {
      if (match.song1 && !match.song2) {
        match.winner = match.song1;
        if (match.nextMatchId && match.slot) {
          const nextMatch = newBracket.flatMap((r) => r.matches).find((m) => m.id === match.nextMatchId);
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
          const nextMatch = newBracket.flatMap((r) => r.matches).find((m) => m.id === match.nextMatchId);
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

  useEffect(() => {
    const fetchBracket = async () => {
      if (!artistId) return;
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/artist/${artistId}/bracket`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        let data = await response.json();
        data = autoAdvanceByes(data);
        setBracket(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch bracket");
      } finally {
        setLoading(false);
      }
    };
    fetchBracket();
  }, [artistId]);

  useEffect(() => {
    if (bracket.length > 0) {
      const finalRound = bracket[bracket.length - 1];
      const finalMatch = finalRound.matches[0];
      if (finalMatch.winner && champion?.id !== finalMatch.winner.id) {
        setChampion(finalMatch.winner);
        confetti({ particleCount: 200, spread: 80, origin: { y: 0.6 } });
      }
    }
  }, [bracket]);

  async function exportBracketAsImage() {
    if (!bracketRef.current) return;

    const node = bracketRef.current;
    const width = node.scrollWidth;
    const height = node.scrollHeight;

    try {
      const dataUrl = await toPng(node, {
        backgroundColor: "#191414",
        pixelRatio: 3,
        width,
        height,
        style: {
          width: `${width}px`,
          height: `${height}px`,
        },
      });

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${artistName.replace(/\s+/g, "_")}_bracket.png`;
      link.click();
    } catch (err) {
      console.error("Error exporting bracket:", err);
    }
  }

  return (
    <div className="min-h-screen bg-[#191414] text-white p-6 overflow-x-auto">
      {!artistId && (
        <div className="max-w-xl mx-auto text-center mt-24">
          <h1 className="text-5xl font-extrabold mb-6 text-[#1DB954]">Music Madness 🎶</h1>
          <p className="text-lg text-gray-300 mb-8">
            Build your own bracket with the songs from any artist’s discography. <br />
            Pick winners round by round until a champion is crowned!
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!artistName) return;
              const res = await fetch(`/api/search-artist?name=${encodeURIComponent(artistName)}`);
              if (!res.ok) {
                setError("Artist not found");
                return;
              }
              const data = await res.json();
              setArtistId(data.id);
              setArtistName(data.name);
            }}
            className="flex justify-center gap-2"
          >
            <input
              type="text"
              placeholder="Enter artist name..."
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              className="px-4 py-2 rounded-lg bg-[#282828] text-white border border-[#1DB954]/40 w-64"
            />
            <button
              type="submit"
              className="bg-[#1DB954] text-black font-bold px-4 py-2 rounded-lg hover:bg-[#1ed760] transition"
            >
              Start
            </button>
          </form>
          {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>
      )}

      {artistId && !loading && !error && (
        <>
          <div className="fixed top-0 left-0 right-0 bg-[#191414] z-40 py-4">
            <h1 className="text-4xl font-extrabold text-center text-[#1DB954] tracking-wide">
              {artistName} Madness
            </h1>
            <div className="text-center mt-2">
              <button
                onClick={() => {
                  setArtistId(null);
                  setBracket([]);
                  setChampion(null);
                }}
                className="text-sm bg-[#1DB954] text-black px-3 py-1 rounded-lg hover:bg-[#1ed760] transition"
              >
                ← Back to Home
              </button>
            </div>
          </div>

          <div className="flex gap-12 mt-32 overflow-x-auto">
            <div ref={bracketRef} className="flex gap-12">
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
                    {round.matches.map((match) => {
                      const isByeMatch =
                        round.roundNumber === 1 &&
                        ((match.song1 && !match.song2) || (!match.song1 && match.song2));
                      if (isByeMatch) return null;

                      return (
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
                              className={`flex-1 text-left rounded px-2 py-2 ${
                                match.song1 && match.winner?.id === match.song1?.id
                                  ? "bg-[#1DB954] text-black font-bold"
                                  : "hover:bg-[#1DB954]/20"
                              }`}
                            >
                              <div className="flex items-center gap-2 justify-between">
                                <div className="flex items-center gap-2">
                                  {match.seed1 && (
                                    <span
                                      className={`text-xs font-bold px-2 py-1 rounded ${
                                        match.song1 && match.winner?.id === match.song1?.id
                                          ? "bg-black/20 text-black"
                                          : "bg-[#1DB954]/20 text-[#1DB954]"
                                      }`}
                                    >
                                      {match.seed1}
                                    </span>
                                  )}
                                  <span>{match.song1?.name || (round.roundNumber === 1 ? "BYE" : "TBD")}</span>
                                </div>

                                {/* ▶ Preview or Spotify link */}
                                {match.song1?.preview_url ? (
                                  <audio controls className="h-8 w-24">
                                    <source src={match.song1.preview_url} type="audio/mpeg" />
                                  </audio>
                                ) : match.song1?.spotifyUrl ? (
                                  <a
                                    href={match.song1.spotifyUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#1DB954] text-lg hover:scale-110 transition"
                                    title="Listen on Spotify"
                                  >
                                    ▶
                                  </a>
                                ) : null}
                              </div>
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
                              className={`flex-1 text-left rounded px-2 py-2 ${
                                match.song2 && match.winner?.id === match.song2?.id
                                  ? "bg-[#1DB954] text-black font-bold"
                                  : "hover:bg-[#1DB954]/20"
                              }`}
                            >
                              <div className="flex items-center gap-2 justify-between">
                                <div className="flex items-center gap-2">
                                  {match.seed2 && (
                                    <span
                                      className={`text-xs font-bold px-2 py-1 rounded ${
                                        match.song2 && match.winner?.id === match.song2?.id
                                          ? "bg-black/20 text-black"
                                          : "bg-[#1DB954]/20 text-[#1DB954]"
                                      }`}
                                    >
                                      {match.seed2}
                                    </span>
                                  )}
                                  <span>{match.song2?.name || (round.roundNumber === 1 ? "BYE" : "TBD")}</span>
                                </div>

                                {/* ▶ Preview or Spotify link */}
                                {match.song2?.preview_url ? (
                                  <audio controls className="h-8 w-24">
                                    <source src={match.song2.preview_url} type="audio/mpeg" />
                                  </audio>
                                ) : match.song2?.spotifyUrl ? (
                                  <a
                                    href={match.song2.spotifyUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#1DB954] text-lg hover:scale-110 transition"
                                    title="Listen on Spotify"
                                  >
                                    ▶
                                  </a>
                                ) : null}
                              </div>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {champion && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#282828] rounded-xl shadow-2xl border border-[#1DB954] p-8 max-w-md text-center">
            <h2 className="text-3xl font-bold text-[#1DB954] mb-4">🏆 Champion 🏆</h2>
            {champion.albumArt && (
              <Image
                src={champion.albumArt}
                alt={champion.name}
                width={192}
                height={192}
                className="mx-auto mb-4 rounded-lg shadow-lg object-cover"
              />
            )}
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
            {champion.preview_url && (
              <audio controls autoPlay className="mt-4 w-full">
                <source src={champion.preview_url} type="audio/mpeg" />
              </audio>
            )}
            <button
              onClick={exportBracketAsImage}
              className="mt-4 inline-block bg-blue-500 text-white font-bold px-4 py-2 rounded-lg hover:bg-blue-600 transition"
            >
              📸 Save Bracket as Image
            </button>
            <button
              onClick={() => setChampion(null)}
              className="mt-6 block mx-auto text-[#b3b3b3] hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center mt-10">
          Loading {artistName ? `${artistName} Madness Bracket...` : "Bracket..."}
        </div>
      )}
      {error && <div className="text-center text-red-500 mt-10">{error}</div>}
    </div>
  );

  function handlePickWinner(match: Match, song: Song, seed: number | null) {
    setBracket((prev) => {
      const newBracket = JSON.parse(JSON.stringify(prev)) as Round[];
      const round = newBracket.find((r) => r.roundNumber === match.round)!;
      const m = round.matches.find((x) => x.id === match.id)!;
      m.winner = song;

      if (m.nextMatchId && m.slot) {
        const nextMatch = newBracket.flatMap((r) => r.matches).find((x) => x.id === m.nextMatchId)!;
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
