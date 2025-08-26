import { NextResponse } from "next/server";

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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");

  if (!name) {
    return NextResponse.json({ error: "Missing artist name" }, { status: 400 });
  }

  const token = await getSpotifyToken();
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();

  if (!data.artists || data.artists.items.length === 0) {
    return NextResponse.json({ error: "Artist not found" }, { status: 404 });
  }

  const artist = data.artists.items[0];

  return NextResponse.json({
    id: artist.id,
    name: artist.name,
    image: artist.images?.[0]?.url || null,
  });
}
