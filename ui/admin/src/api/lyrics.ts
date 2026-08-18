import Crudy, { config } from "@allape/gocrud-react";
import { ILyrics, ILyricsSearchParams } from "../model/lyrics.ts";

export const LyricsCrudy = new Crudy<ILyrics, ILyricsSearchParams>(
  `${config.SERVER_URL}/lyrics`,
);
