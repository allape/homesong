import Crudy, { config, get } from "@allape/gocrud-react";
import {
  ICollection,
  ICollectionSearchParams,
  ICollectionSongSearchParams,
} from "../model/collection.ts";
import { ILyrics } from "../model/lyrics.ts";
import { ISong, ISongLyrics } from "../model/song.ts";
import { CollectionCrudy, CollectionSongCrudy } from "./collection.ts";

export const SongCrudy = new Crudy<ISong>(`${config.SERVER_URL}/song`);

export function upload(song: Partial<ISong>, file?: File): Promise<ISong> {
  const form = new FormData();
  form.append("song", JSON.stringify(song));
  if (file) {
    form.append("file", file);
  }
  return get(`${config.SERVER_URL}/song/upload`, {
    method: "PUT",
    body: form,
  });
}

export interface ISongWithCollections extends ISong {
  _collections?: ICollection[];
  _singerNames?: string;
  _singerIds?: ICollection["id"][];
  _lyricistNames?: string;
  _lyricistIds?: ICollection["id"][];
  _composerNames?: string;
  _composerIds?: ICollection["id"][];
  _arrangerNames?: string;
  _arrangerIds?: ICollection["id"][];
  _producerNames?: string;
  _producerIds?: ICollection["id"][];
  _otherNames?: string;
  _otherIds?: ICollection["id"][];
  _nonSingerNames?: string;
  _nonSingerIds?: ICollection["id"][];
  _nonArtistNames?: string;
  _nonArtistNameArr?: string[];
  _nonArtistIds?: ICollection["id"][];
}

export async function fillSongsWithCollections(
  songs: ISong[],
  artistSep: string = " & ",
): Promise<ISongWithCollections[]> {
  if (songs.length === 0) {
    return [];
  }

  const songIds = Array.from(new Set(songs.map((s) => s.id)));
  const collectionSongs =
    await CollectionSongCrudy.all<ICollectionSongSearchParams>({
      in_songId: songIds,
    });

  const collectionIds = Array.from(
    new Set(collectionSongs.map((cs) => cs.collectionId)),
  );

  let collections: ICollection[] = [];
  if (collectionIds.length > 0) {
    collections = await CollectionCrudy.page<ICollectionSearchParams>(
      1,
      collectionIds.length,
      {
        deleted: false,
        in_id: collectionIds,
      },
    );
  }

  return songs.map<ISongWithCollections>((s) => {
    const currentCss = collectionSongs.filter((cs) => cs.songId === s.id);
    const currentCsIds = currentCss.map((cs) => cs.collectionId);

    const singerIds: ICollection["id"][] = [];
    const lyricistIds: ICollection["id"][] = [];
    const composerIds: ICollection["id"][] = [];
    const arrangerIds: ICollection["id"][] = [];
    const producerIds: ICollection["id"][] = [];
    const otherIds: ICollection["id"][] = [];
    const nonArtistIds: ICollection["id"][] = [];

    currentCss.forEach((cs) => {
      switch (cs.role) {
        case "singer":
          singerIds.push(cs.collectionId);
          break;
        case "lyricist":
          lyricistIds.push(cs.collectionId);
          break;
        case "composer":
          composerIds.push(cs.collectionId);
          break;
        case "arranger":
          arrangerIds.push(cs.collectionId);
          break;
        case "producer":
          producerIds.push(cs.collectionId);
          break;
        case "other":
          otherIds.push(cs.collectionId);
          break;
        case "_":
        default:
          nonArtistIds.push(cs.collectionId);
          break;
      }
    });

    const nonSingerIds = currentCss
      .filter(
        (cs) =>
          cs.role !== "singer" &&
          cs.role !== "_" &&
          !singerIds.includes(cs.collectionId),
      )
      .map((cs) => cs.collectionId);

    const singerNames: ICollection["name"][] = [];
    const lyricistNames: ICollection["name"][] = [];
    const composerNames: ICollection["name"][] = [];
    const arrangerNames: ICollection["name"][] = [];
    const producerNames: ICollection["name"][] = [];
    const otherNames: ICollection["name"][] = [];

    const nonSingerNames: ICollection["name"][] = [];
    const nonArtistNames: ICollection["name"][] = [];

    const cs: ICollection[] = [];

    collections.forEach((c) => {
      if (currentCsIds.includes(c.id)) {
        cs.push(c);
      }

      if (nonSingerIds.includes(c.id)) {
        nonSingerNames.push(c.name);
      }
      if (nonArtistIds.includes(c.id)) {
        nonArtistNames.push(c.name);
      }

      if (singerIds.includes(c.id)) {
        singerNames.push(c.name);
      }
      if (lyricistIds.includes(c.id)) {
        lyricistNames.push(c.name);
      }
      if (composerIds.includes(c.id)) {
        composerNames.push(c.name);
      }
      if (arrangerIds.includes(c.id)) {
        arrangerNames.push(c.name);
      }
      if (producerIds.includes(c.id)) {
        producerNames.push(c.name);
      }
      if (otherIds.includes(c.id)) {
        otherNames.push(c.name);
      }
    });

    return {
      ...s,
      _collections: cs,

      _singerNames: singerNames.join(artistSep),
      _singerIds: singerIds,

      _lyricistNames: lyricistNames.join(artistSep),
      _lyricistIds: lyricistIds,

      _composerNames: composerNames.join(artistSep),
      _composerIds: composerIds,

      _arrangerNames: arrangerNames.join(artistSep),
      _arrangerIds: arrangerIds,

      _producerNames: producerNames.join(artistSep),
      _producerIds: producerIds,

      _otherNames: otherNames.join(artistSep),
      _otherIds: otherIds,

      _nonSingerNames: nonSingerNames.join(artistSep),
      _nonSingerIds: nonSingerIds,

      _nonArtistIds: nonArtistIds,
      _nonArtistNameArr: nonArtistNames,
      _nonArtistNames: nonArtistNames.join(", "),
    };
  });
}

export function getLyrics(id: ISong["id"]): Promise<ILyrics[]> {
  return get(`${config.SERVER_URL}/song/lyrics/${id}`);
}

export function saveLyricsBySong(
  songId: ISong["id"],
  lyrics: ILyrics["id"][],
): Promise<ISongLyrics[]> {
  return get(
    `${config.SERVER_URL}/song/lyrics/${songId}?lyricsIds=${encodeURIComponent(lyrics.join(","))}`,
    {
      method: "PUT",
    },
  );
}
