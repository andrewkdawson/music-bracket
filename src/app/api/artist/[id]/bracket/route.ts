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
    cache: "no-store",
  });

  const data = await res.json();
  return data.access_token;
}

// ✅ normalize song names to merge duplicates
function normalizeTrackName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\(feat\..*?\)/gi, "")   // remove (feat. X)
    .replace(/\s*\(with.*?\)/gi, "")     // remove (with X)
    .replace(/\s*\[.*?remix.*?\]/gi, "") // remove [Remix]
    .replace(/\s*\(.*?remix.*?\)/gi, "") // remove (Remix)
    .trim();
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
  const albumIds = albumsData.items?.map((a: { id: string }) => a.id) || [];

  // 2. Fetch tracks for all albums in parallel
  const albumTrackResponses = await Promise.all(
    albumIds.map((albumId) =>
      fetch(`https://api.spotify.com/v1/albums/${albumId}/tracks`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json())
    )
  );

  const trackSet = new Map<string, { id: string; name: string }>();
  albumTrackResponses.forEach((tracksData) => {
    if (tracksData.items && Array.isArray(tracksData.items)) {
      tracksData.items.forEach((t: { id: string; name: string }) => {
        if (!trackSet.has(t.id)) {
          trackSet.set(t.id, { id: t.id, name: t.name });
        }
      });
    }
  });

  // 3. Batch fetch track details (50 IDs at a time)
  const trackIds = Array.from(trackSet.keys());
  function chunkArray<T>(arr: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
    return result;
  }

  const trackChunks = chunkArray(trackIds, 50);
  const tracks: any[] = [];

  const trackResponses = await Promise.all(
    trackChunks.map((chunk) =>
      fetch(`https://api.spotify.com/v1/tracks?ids=${chunk.join(",")}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json())
    )
  );

  trackResponses.forEach((tracksData) => {
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
  });

  // 4. Deduplicate by normalized name (case-insensitive, strip features/remix)
  const uniqueTracksMap = new Map<string, any>();
  tracks.forEach((track) => {
    const key = normalizeTrackName(track.name);
    const existing = uniqueTracksMap.get(key);
    if (!existing || track.popularity > existing.popularity) {
      uniqueTracksMap.set(key, track);
    }
  });

  const uniqueTracks = Array.from(uniqueTracksMap.values());

  // 5. Generate bracket
  const bracket = generateBracket(uniqueTracks);

  return NextResponse.json(bracket);
}
