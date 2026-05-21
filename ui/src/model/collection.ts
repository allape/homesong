import {
  IBase,
  IBaseSearchParams,
  ITimeSortSearchParams,
  SortType,
} from "@allape/gocrud";
import { IColoredLV } from "@allape/gocrud-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ISong } from "./song.ts";

export type CollectionType = "playlist" | "artist" | "album" | "language" | "ost";

export interface ICollection extends IBase {
  type: CollectionType;
  priority: number;
  cover: string;
  name: string;
  keywords: string;
  code: string;
  description: string;
}

export interface ICollectionSearchParams
  extends
    IBaseSearchParams,
    Pick<ITimeSortSearchParams, "orderBy_createdAt" | "orderBy_updatedAt"> {
  in_id?: ICollection["id"][];
  in_type?: ICollection["type"][];
  keywords?: string;
  orderBy_priority?: SortType;
}

export function useCollectionTypes(): IColoredLV<CollectionType>[] {
  const { t } = useTranslation();
  return useMemo<IColoredLV<CollectionType>[]>(
    () =>
      CollectionTypes.map((ct) => ({
        ...ct,
        label: t(ct.label as string),
      })),
    [t],
  );
}

export const CollectionTypes: IColoredLV<CollectionType>[] = [
  {
    label: "collection.types.playlist",
    value: "playlist",
    color: "blue",
  },
  {
    label: "collection.types.artist",
    value: "artist",
    color: "green",
  },
  {
    label: "collection.types.album",
    value: "album",
    color: "orange",
  },
  {
    label: "collection.types.ost",
    value: "ost",
    color: "cyan",
  },
  {
    label: "collection.types.language",
    value: "language",
    color: "yellow",
  },
];

export const ArtistCollectionTypes: CollectionType[] = ["artist"];

export const NonArtistCollectionTypes: CollectionType[] = ["album", "playlist"];

export type Role =
  | "singer"
  | "lyricist"
  | "composer"
  | "arranger"
  | "producer"
  | "other"
  | "_";

export interface ICollectionSong extends Pick<IBase, "createdAt"> {
  songId: ISong["id"];
  collectionId: ICollection["id"];
  role: Role;
}

export interface ICollectionSongSearchParams extends IBaseSearchParams {
  in_songId?: ISong["id"][];
  in_collectionId?: ICollection["id"][];
  in_role?: Role[];
}
