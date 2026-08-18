import { IBase, IBaseSearchParams } from "@allape/gocrud";
import { ICollection } from "./collection.ts";
import { ILyrics } from "./lyrics.ts";

export interface ISong extends IBase {
  name: string;
  subtitle: string;
  filename: string;
  cover: string;
  digest: string;
  mime: string;
  ffprobeInfo: string;
  description: string;
}

export interface ISongSearchParams extends IBaseSearchParams {
  keywords?: string;
  like_name?: string;
  like_collectionName?: string;
  in_collectionId?: ICollection["id"][];
}

export interface ISongLyrics extends Pick<IBase, "createdAt"> {
  songId: ISong["id"];
  lyricsId: ILyrics["id"];
}
