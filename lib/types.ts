export type TcgplayerPriceVariant = {
  market?: number;
};

export type TcgplayerPrices = Record<string, TcgplayerPriceVariant>;

export type TcgplayerData = {
  updatedAt?: string;
  prices?: TcgplayerPrices;
};

export type CardmarketPrices = {
  trendPrice?: number;
  averageSellPrice?: number;
  avg7?: number;
  avg30?: number;
};

export type CardmarketData = {
  updatedAt?: string;
  prices?: CardmarketPrices;
};

export type PokemonCard = {
  tcgplayer?: TcgplayerData;
  cardmarket?: CardmarketData;
};
