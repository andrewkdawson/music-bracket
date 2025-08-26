import { NextResponse } from "next/server";

async function getSpotifyToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const authString = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${authString}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();
  return data.access_token;
}

export async function GET() {
  const token = await getSpotifyToken();

  // Quinn XCII's Spotify Artist ID
  const artistId = "3ApUX1o6oSz321MMECyIYd";

  // Get all of his top tracks (US market)
  const res = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const data = await res.json();

  // Return a simplified list of tracks
  const tracks = data.tracks.map((track: any) => ({
    id: track.id,
    name: track.name,
    album: track.album.name,
    popularity: track.popularity,
    preview_url: track.preview_url,
  }));

  return NextResponse.json(tracks);
}
