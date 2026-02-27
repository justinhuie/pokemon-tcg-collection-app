const fs = require("fs");
const path = require("path");

const sortOrder = [
  "id", "name", "imageUrl", "subtype", "supertype", "level", "evolvesFrom",
  "ability", "ancientTrait", "hp", "retreatCost", "convertedRetreatCost",
  "number", "artist", "rarity", "series", "set", "setCode", "text", "types",
  "attacks", "weaknesses", "resistances", "imageUrlHiRes", "nationalPokedexNumber",
  "evolvesTo",
];

function compact(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => {
      if (v === null || v === undefined) return false;
      if (typeof v === "string" && v === "") return false;
      if (Array.isArray(v) && v.length === 0) return false;
      if (typeof v === "object" && !Array.isArray(v) && Object.keys(compact(v)).length === 0) return false;
      return true;
    })
  );
}

function sortedHash(card, order) {
  const result = {};
  for (const key of order) {
    if (key in card) result[key] = card[key];
  }
  return result;
}

const sets = JSON.parse(fs.readFileSync("sets/en.json", "utf-8"));

const cardDir = "cards/en";
const files = fs.readdirSync(cardDir).filter((f) => f.endsWith(".json"));

for (const filename of files) {
  const filepath = path.join(cardDir, filename);
  console.log(`Converting ${filename}...`);

  const cards = JSON.parse(fs.readFileSync(filepath, "utf-8"));
  const setId = path.basename(filename, ".json");
  const set = sets.find((s) => s.id === setId);

  const v1Cards = cards.map((card) => {
    card.imageUrl = card.images?.small;
    card.subtype = card.subtypes?.at(-1);
    card.ability = card.abilities?.[0];
    card.series = set?.series;
    card.setCode = set?.id;
    card.text = card.rules;
    card.imageUrlHiRes = card.images?.large;
    card.nationalPokedexNumber = card.nationalPokedexNumbers?.[0];
    return sortedHash(compact(card), sortOrder);
  });

  const outputDir = path.join(cardDir, "v1");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
  fs.writeFileSync(
    path.join(outputDir, filename),
    JSON.stringify(v1Cards, null, 2)
  );
}
