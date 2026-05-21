export type CodecType = "video" | "audio";
export type CodecName = string;

export interface IFFProbeStream {
  index: number;
  codec_name: CodecName;
  codec_long_name: string;
  profile: string;
  codec_type: CodecType;
  codec_tag_string: string;
  codec_tag: string;
  nb_frames: string;
  width: number;
  height: number;
}

export interface IFFProbeFormat {
  filename: string;
  nb_streams: number;
  nb_programs: number;
  nb_stream_groups: number;
  format_name: string;
  format_long_name: string;
  start_time: string;
  duration: number;
  size: number;
  bit_rate: number;
  probe_score: number;
  tags: unknown;
}

export interface IFFProbeInfo {
  streams: IFFProbeStream[];
  format: IFFProbeFormat;
}
