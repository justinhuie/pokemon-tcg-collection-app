import { NextResponse, type NextRequest } from "next/server";

type MockListCard = {
  id: string;
  name: string;
  set: { name: string };
  images: { small: string };
};

const mockCards: MockListCard[] = [
  {
    id: "base1-4",
    name: "Charizard",
    set: { name: "Base Set" },
    images: { small: "https://images.pokemontcg.io/base1/4.png" },
  },
  {
    id: "base1-2",
    name: "Blastoise",
    set: { name: "Base Set" },
    images: { small: "https://images.pokemontcg.io/base1/2.png" },
  },
];

export async function GET(_req: NextRequest) {
  return NextResponse.json({ data: mockCards });
}
