import { ISongModified } from "../../api/song.ts";

export interface IModifiedSong extends ISongModified {
  _url: string;
  _cover?: string;
  _name: string;
}
