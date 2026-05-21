package model

import (
	"time"

	"github.com/allape/gocrud"
)

type Song struct {
	gocrud.Base
	Name        string `json:"name"`
	Subtitle    string `json:"subtitle"`
	Filename    string `json:"filename"`
	Cover       string `json:"cover"`
	Digest      string `json:"digest"`
	MIME        string `json:"mime"`
	FFProbeInfo string `json:"ffprobeInfo"`
	Description string `json:"description"`
	Priority    int64  `json:"priority"`
}

type SongLyrics struct {
	SongID    gocrud.ID `json:"songId"`
	LyricsID  gocrud.ID `json:"lyricsId"`
	CreatedAt time.Time `json:"createdAt" gorm:"autoCreateTime;<-:create"`
}
