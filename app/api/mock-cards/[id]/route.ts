import { NextResponse, type NextRequest } from "next/server";

type MockCard = {
  id: string;
  name: string;
  set: { name: string };
  images: { small: string; large: string };
  tcgplayer?: {
    updatedAt?: string;
    prices?: Record<
      string,
      {
        low?: number;
        mid?: number;
        high?: number;
        market?: number;
        directLow?: number;
      }
    >;
  };
};

const mockCards: Record<string, MockCard> = {
  "base1-4": {
    id: "base1-4",
    name: "Charizard",
    set: { name: "Base Set" },
    images: {
      small: "https://images.pokemontcg.io/base1/4.png",
      large: "https://images.pokemontcg.io/base1/4_hires.png",
    },
    tcgplayer: {
      updatedAt: "2026/02/05",
      prices: {
        holofoil: {
          market: 250.12,
          low: 200,
          mid: 240,
          high: 400,
        },
      },
    },
  },
  "base1-2": {
    id: "base1-2",
    name: "Blastoise",
    set: { name: "Base Set" },
    images: {
      small: "https://images.pokemontcg.io/base1/2.png",
      large: "https://images.pokemontcg.io/base1/2_hires.png",
    },
    tcgplayer: {
      updatedAt: "2026/02/05",
      prices: {
        holofoil: {
          market: 180.55,
          low: 150,
          mid: 175,
          high: 300,
        },
      },
    },
  },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const card = mockCards[id];
  if (!card) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: card });
}
