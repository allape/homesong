package ffmpeg

import (
	"errors"
	"io"
	"os"
	"os/exec"
	"slices"
)

var ImageCodecs = []CodecName{"png", "mjpeg", "jpeg", "jpg", "bmp", "gif", "tiff", "webp"}

func GetExtByCodecName(codec CodecName) string {
	switch codec {
	case "png":
		return ".png"
	case "bmp":
		return ".bmp"
	case "gif":
		return ".gif"
	case "tiff":
		return ".tiff"
	case "webp":
		return ".webp"
	default:
		return ".jpg"
	}
}

func ExtractCover(filename string, ffprobe *FFProbeJson) ([]byte, CodecName, error) {
	file, err := os.Open(filename)
	if err != nil {
		return nil, "", err
	}

	defer func() {
		_ = file.Close()
	}()

	if ffprobe == nil {
		ffprobe, _, err = FFProbeReader(file)
		if err != nil {
			return nil, "", err
		}
		_, err = file.Seek(0, io.SeekStart)
		if err != nil {
			return nil, "", err
		}
	}

	return ExtractCoverReader(file, ffprobe)
}

func ExtractCoverReader(reader io.Reader, ffprobe *FFProbeJson) ([]byte, CodecName, error) {
	if ffprobe == nil {
		return nil, "", errors.New("ffprobe is nil")
	}

	for _, stream := range ffprobe.Streams {
		if stream.CodecType == Video && slices.Contains(ImageCodecs, stream.CodecName) {
			cmd := exec.Command(
				"ffmpeg",
				"-v", "quiet",
				"-i", "-",
				"-vframes", "1",
				"-f", "image2",
				"-",
			)
			cmd.Stdin = reader
			output, err := cmd.CombinedOutput()
			return output, stream.CodecName, err
		}
	}

	return nil, "", nil
}
