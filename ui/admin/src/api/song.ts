import Crudy, {
  antdget,
  AntdM2MConnectorHandler,
  antdupload,
  config,
} from "@allape/gocrud-react";
import { ICollection, Role } from "../model/collection.ts";
import { IFFProbeInfo } from "../model/ffprobe.ts";
import { ILyrics } from "../model/lyrics.ts";
import { ISong, ISongLyrics, ISongSearchParams } from "../model/song.ts";
import { CollectionSongHandler } from "./collection.ts";
import { LyricsCrudy } from "./lyrics.ts";

export const SongCrudy = new Crudy<ISong, ISongSearchParams>(
  `${config.SERVER_URL}/song`,
);

export const SongLyricsHandler = new AntdM2MConnectorHandler<
  ISong,
  ILyrics,
  ISongLyrics
>(
  `${config.SERVER_URL}/song-lyrics`,
  SongCrudy,
  LyricsCrudy,
  "songId",
  "lyricsId",
);

export function upload(song: Partial<ISong>, file?: File): Promise<ISong> {
  const form = new FormData();
  form.append("record", JSON.stringify(song));
  if (file) {
    form.append("file", file);
  }
  return antdget(`${config.SERVER_URL}/song/upload`, {
    method: "PUT",
    body: form,
  });
}

export interface ISongModified extends ISong {
  _collections?: ICollection[];
  _collectionIds?: ICollection["id"][];

  _collectionSets?: Partial<Record<Role, ICollection[]>>;
  _collectionNameSets?: Partial<Record<Role, string>>;
  _collectionIdSets?: Partial<Record<Role, ICollection["id"][]>>;

  _singerNames?: string;
  _nonSingerNames?: string;

  _crowdedSingers?: boolean; // when the count of singers is more than 3

  _parsedFFProbeInfo?: IFFProbeInfo;
  _duration?: string; // 00:00 format
  _fileSizeInMB?: number;
}

export async function fillSongsWithCollections(
  songs: ISong[],
  collectionNameSep: string = " & ",
): Promise<ISongModified[]> {
  if (songs.length === 0) {
    return [];
  }

  await CollectionSongHandler.get<ICollection, ISongModified>(
    "songId",
    songs,
    {},
    (song, collections, collectionSongs) => {
      song._collections = collections;
      song._collectionIds = collections.map((c) => c.id);

      song._collectionSets = {};
      collectionSongs.forEach((cs) => {
        const found = collections.find((c) => c.id === cs.collectionId);
        if (!found) {
          return;
        }

        if (!song._collectionSets![cs.role]) {
          song._collectionSets![cs.role] = [];
        }

        song._collectionSets![cs.role]!.push(found);
      });

      const nonSingers: ICollection[] = [];
      song._collectionIdSets = {};
      song._collectionNameSets = {};
      Object.entries(song._collectionSets).forEach(([role, collections]) => {
        song._collectionIdSets![role as Role] = collections.map((c) => c.id);
        song._collectionNameSets![role as Role] = collections
          .map((c) => c.name)
          .join(collectionNameSep);

        if (!(["_", "singer"] as Role[]).includes(role as Role)) {
          collections.forEach((collection) => {
            if (
              !song._collectionSets?.singer?.find(
                (s) => s.id === collection.id,
              ) &&
              !nonSingers.find((ns) => ns.id === collection.id)
            ) {
              nonSingers.push(collection);
            }
          });
        }
      });

      song._singerNames = song._collectionNameSets?.singer;
      song._nonSingerNames = nonSingers
        .map((ns) => ns.name)
        .join(collectionNameSep);

      try {
        song._parsedFFProbeInfo = JSON.parse(song.ffprobeInfo);
      } catch (e) {
        console.error(e);
      }

      song._crowdedSingers = (song._collectionSets?.singer?.length || 0) > 3;

      if (song._parsedFFProbeInfo?.format?.duration) {
        const min = Math.floor(song._parsedFFProbeInfo.format.duration / 60);
        const sec = Math.floor(song._parsedFFProbeInfo.format.duration % 60);
        song._duration = `${`${min}`.padStart(2, "0")}:${`${sec}`.padStart(2, "0")}`;
      }

      if (song._parsedFFProbeInfo?.format?.size) {
        song._fileSizeInMB =
          Math.floor(
            (song._parsedFFProbeInfo.format.size / 1024 / 1024) * 100,
          ) / 100;
      }
    },
  );

  return songs;
}

export async function getLyrics(id: ISong["id"]): Promise<ILyrics[]> {
  const lyrics = await antdget<ILyrics[] | undefined>(
    `${config.SERVER_URL}/song/lyrics/${id}`,
  );
  return lyrics || [];
}

export function uploadCover(file: File): Promise<string> {
  return antdupload(
    `${config.SERVER_STATIC_URL}/${encodeURIComponent(file.name)}`,
    file,
  );
}
