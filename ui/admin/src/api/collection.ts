import Crudy, {
  antdget,
  AntdM2MConnectorHandler,
  config,
} from "@allape/gocrud-react";
import {
  ICollection,
  ICollectionSearchParams,
  ICollectionSong,
} from "../model/collection.ts";
import { ISong } from "../model/song.ts";
import { SongCrudy } from "./song.ts";

export const CollectionCrudy = new Crudy<ICollection, ICollectionSearchParams>(
  `${config.SERVER_URL}/collection`,
);

export const CollectionSongHandler = new AntdM2MConnectorHandler<
  ICollection,
  ISong,
  ICollectionSong
>(
  `${config.SERVER_URL}/collection-song`,
  CollectionCrudy,
  SongCrudy,
  "collectionId",
  "songId",
);

export function saveCollectionSongsBySong(
  songId: ISong["id"],
  role: ICollectionSong["role"] = "_",
  collectionIds: ICollection["id"][],
): Promise<ICollectionSong[]> {
  return antdget(
    `${config.SERVER_URL}/collection/song/save-by-song/${songId}/${role}?collectionIds=${encodeURIComponent(collectionIds.join(","))}`,
    {
      method: "PUT",
    },
  );
}

export function createOrGetCollectionsByArtistNames(
  names: string[],
): Promise<ICollection[]> {
  return antdget(
    `${config.SERVER_URL}/collection/create-or-get/by-artist-names/${encodeURIComponent(names.join(","))}`,
    {
      method: "PUT",
    },
  );
}
