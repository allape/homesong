import { IBase, IBaseSearchParams } from "@allape/gocrud";
import { IColoredLV } from "@allape/gocrud-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ISong } from "./song.ts";

export type CollectionType =
  "playlist" | "artist" | "album" | "language" | "ost" | "opera";

export interface ICollection extends IBase {
  type: CollectionType;
  cover: string;
  name: string;
  keywords: string;
  code: string;
  description: string;
}

export interface ICollectionSearchParams extends IBaseSearchParams {
  in_type?: ICollection["type"][];
  keywords?: string;
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
    label: "collection.types.language",
    value: "language",
    color: "yellow",
  },
  {
    label: "collection.types.ost",
    value: "ost",
    color: "cyan",
  },
  {
    label: "collection.types.opera",
    value: "opera",
    color: "lime",
  },
];

export const ArtistCollectionTypes: CollectionType[] = ["artist"];

export const NonArtistCollectionTypes: CollectionType[] =
  CollectionTypes.filter((ct) => !ArtistCollectionTypes.includes(ct.value)).map(
    (ct) => ct.value,
  );

export type Role =
  "singer" | "lyricist" | "composer" | "arranger" | "producer" | "other" | "_";

export interface ICollectionSong extends Pick<IBase, "createdAt"> {
  songId: ISong["id"];
  collectionId: ICollection["id"];
  role: Role;
}

export function FromCollectionIds(
  collectionIds: ICollectionSong["collectionId"][],
  songId: ICollectionSong["songId"],
  role: Role,
): ICollectionSong[] {
  return collectionIds.map(
    (ci) =>
      ({
        collectionId: ci,
        songId,
        role,
      }) as ICollectionSong,
  );
}
