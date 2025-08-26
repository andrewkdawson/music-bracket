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

export async function GET(
  req: Request,
  context: { params: { id: string } }
) {
  const token = await getSpotifyToken();
  const artistId = context.params.id;

  // 1. Get all albums
  const albumsRes = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const albumsData = await albumsRes.json();
  const albumIds = albumsData.items?.map((a: any) => a.id) || [];

  // 2. Collect all track IDs (dedupe with a Set)
  const trackSet = new Map<string, any>();
  for (const albumId of albumIds) {
    const tracksRes = await fetch(
      `https://api.spotify.com/v1/albums/${albumId}/tracks`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const tracksData = await tracksRes.json();

    if (tracksData.items && Array.isArray(tracksData.items)) {
      tracksData.items.forEach((t: any) => {
        if (!trackSet.has(t.id)) {
          trackSet.set(t.id, { id: t.id, name: t.name });
        }
      });
    }
  }

  // 3. Batch fetch track details (popularity, preview, albumArt, spotifyUrl)
  const trackIds = Array.from(trackSet.keys());
  function chunkArray<T>(arr: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
    return result;
  }

  const trackChunks = chunkArray(trackIds, 50);
  const tracks: any[] = [];
  for (const chunk of trackChunks) {
    const idsParam = chunk.join(",");
    const tracksRes = await fetch(`https://api.spotify.com/v1/tracks?ids=${idsParam}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const tracksData = await tracksRes.json();

    if (tracksData.tracks && Array.isArray(tracksData.tracks)) {
      tracksData.tracks.forEach((t: any) => {
        tracks.push({
          id: t.id,
          name: t.name,
          popularity: t.popularity,
          albumArt: t.album.images?.[1]?.url || null,
          preview_url: t.preview_url,
          spotifyUrl: t.external_urls?.spotify || null,
        });
      });
    }
  }

  // 4. Deduplicate by track name (keep most popular version)
  const uniqueTracksMap = new Map<string, any>();
  tracks.forEach((track) => {
    const existing = uniqueTracksMap.get(track.name);
    if (!existing || track.popularity > existing.popularity) {
      uniqueTracksMap.set(track.name, track);
    }
  });

  const uniqueTracks = Array.from(uniqueTracksMap.values());

  // 5. Generate bracket
  const bracket = generateBracket(uniqueTracks);

  return NextResponse.json(bracket);
}