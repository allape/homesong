import {
  IBase,
  IBaseSearchParams,
  ITimeSortSearchParams,
  SortType,
} from "@allape/gocrud";
import { ICollection } from "./collection.ts";
import { ILyrics } from "./lyrics.ts";

export interface ISong extends IBase {
  name: string;
  filename: string;
  cover: string;
  digest: string;
  mime: string;
  ffprobeInfo: string;
  description: string;
  priority: number;
}

export interface ISongSearchParams
  extends IBaseSearchParams, Pick<ITimeSortSearchParams, 'orderBy_createdAt' | 'orderBy_updatedAt'> {
  like_name?: string;
  like_collectionName?: string;
  in_id?: ISong["id"][];
  in_collectionId?: ICollection["id"][];
  orderBy_priority?: SortType;
}

export interface ISongLyrics {
  songId: ISong["id"];
  lyricsId: ILyrics["id"];
  createdAt: string;
}
