import { NextResponse } from "next/server";
import { generateBracket } from "@/lib/bracket";

async function getSpotifyToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const authString = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authString}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();
  return data.access_token;
}

export async function GET() {
  const token = await getSpotifyToken();

  // Quinn XCII’s Spotify Artist ID
  const artistId = "3ApUX1o6oSz321MMECyIYd";

  // Get all albums
  const albumsRes = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const albumsData = await albumsRes.json();

  // Collect all album IDs
  const albumIds = albumsData.items.map((a: any) => a.id);

  // Get tracks from each album
  const trackSet = new Map<string, any>(); // use Map to avoid duplicates
  for (const albumId of albumIds) {
    const tracksRes = await fetch(
      `https://api.spotify.com/v1/albums/${albumId}/tracks`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const tracksData = await tracksRes.json();

    if (tracksData.items && Array.isArray(tracksData.items)) {
      tracksData.items.forEach((t: any) => {
        if (!trackSet.has(t.id)) {
          trackSet.set(t.id, {
            id: t.id,
            name: t.name,
          });
        }
      });
    }
  }

  // Gather all track IDs
  const trackIds = Array.from(trackSet.keys());

  // Helper to chunk into groups of 50 (Spotify API limit)
  function chunkArray<T>(arr: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  }

  const trackChunks = chunkArray(trackIds, 50);

  const tracks: any[] = [];
  for (const chunk of trackChunks) {
    const idsParam = chunk.join(",");
    const tracksRes = await fetch(
      `https://api.spotify.com/v1/tracks?ids=${idsParam}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const tracksData = await tracksRes.json();

    if (tracksData.tracks && Array.isArray(tracksData.tracks)) {
      tracksData.tracks.forEach((t: any) => {
        tracks.push({
          id: t.id,
          name: t.name,
          popularity: t.popularity,
          albumArt: t.album.images?.[1]?.url || null, // 🎨 medium album art
          preview_url: t.preview_url, // 🎶 30s preview
          spotifyUrl: t.external_urls?.spotify || null, // 🔗 link
        });
      });
    }
  }

  // Deduplicate songs by name, keeping the one with highest popularity
  const uniqueTracksMap = new Map<string, any>();
  tracks.forEach((track) => {
    const existingTrack = uniqueTracksMap.get(track.name);
    if (!existingTrack || track.popularity > existingTrack.popularity) {
      uniqueTracksMap.set(track.name, track);
    }
  });

  const uniqueTracks = Array.from(uniqueTracksMap.values());

  // Generate bracket
  const bracket = generateBracket(uniqueTracks);

  return NextResponse.json(bracket);
}