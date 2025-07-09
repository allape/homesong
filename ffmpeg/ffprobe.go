package ffmpeg

import (
	"encoding/json"
	"fmt"
	"github.com/allape/gogger"
	"io"
	"os"
	"os/exec"
)

var l = gogger.New("ffmpeg")

type CodecType string

const (
	Video CodecType = "video"
	Audio CodecType = "audio"
)

type CodecName string

type FFProbeStream struct {
	Index         int       `json:"index"`
	CodecName     CodecName `json:"codec_name"`
	CodecLongName string    `json:"codec_long_name"`
	Profile       string    `json:"profile"`
	CodecType     CodecType `json:"codec_type"`
	CodecTagStr   string    `json:"codec_tag_string"`
	CodecTag      string    `json:"codec_tag"`
	NbFrames      string    `json:"nb_frames"`
	Width         int       `json:"width"`
	Height        int       `json:"height"`
}

type FFProbeFormat struct {
	Filename       string `json:"filename"`
	NbStreams      int    `json:"nb_streams"`
	NbPrograms     int    `json:"nb_programs"`
	NbStreamGroups int    `json:"nb_stream_groups"`
	FormatName     string `json:"format_name"`
	FormatLongName string `json:"format_long_name"`
	StartTime      string `json:"start_time"`
	Duration       Number `json:"duration"`
	Size           Number `json:"size"`
	BitRate        Number `json:"bit_rate"`
	ProbeScore     int    `json:"probe_score"`
	Tags           any    `json:"tags"`
}

type FFProbeJson struct {
	Streams []FFProbeStream `json:"streams"`
	Format  FFProbeFormat   `json:"format"`
}

func FromString(info string) (*FFProbeJson, error) {
	var ffprobe FFProbeJson
	err := json.Unmarshal([]byte(info), &ffprobe)
	if err != nil {
		return nil, err
	}
	return &ffprobe, nil
}

func FFProbe(file string) (*FFProbeJson, string, error) {
	f, err := os.Open(file)
	if err != nil {
		return nil, "", err
	}
	return FFProbeReader(f)
}

func FFProbeReader(reader io.Reader) (*FFProbeJson, string, error) {
	cmd := exec.Command(
		"ffprobe",
		"-v", "quiet",
		"-print_format", "json",
		"-show_format",
		"-show_streams",
		"-i", "-",
	)
	cmd.Stdin = reader
	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, "", fmt.Errorf("ffprobe: %w: %s", err, output)
	}

	l.Debug().Println(string(output))

	ffprobe, err := FromString(string(output))

	return ffprobe, string(output), nil
}
