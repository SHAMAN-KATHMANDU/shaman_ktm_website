import type { Showroom } from "@/lib/api/types";

export const mockShowrooms: Showroom[] = [
  {
    key: "thamel",
    name: "Thamel",
    address: "Mandala Street, Thamel, Kathmandu 44600",
    whatsapp: "9779820151135",
    mapEmbedUrl:
      // Empty until a real embed URL is pasted from Google Maps → Share →
      // Embed a map. A hand-made pb value is rejected by Google, which then
      // renders its own error text inside the iframe.
      "",
  },
  {
    key: "gongabu",
    name: "Gongabu",
    address: "Ghalepul, Gongabu, Kathmandu 44600",
    whatsapp: "9779820151135",
    mapEmbedUrl:
      // Empty until a real embed URL is pasted from Google Maps → Share →
      // Embed a map. A hand-made pb value is rejected by Google, which then
      // renders its own error text inside the iframe.
      "",
  },
  {
    key: "gatthaghar",
    name: "Gatthaghar, Bhaktapur",
    address: "Bling Bling Homes, Gatthaghar, Bhaktapur 44800",
    whatsapp: "9779820151135",
    mapEmbedUrl:
      // Empty until a real embed URL is pasted from Google Maps → Share →
      // Embed a map. A hand-made pb value is rejected by Google, which then
      // renders its own error text inside the iframe.
      "",
  },
];
