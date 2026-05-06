package model

import (
	"time"

	"github.com/allape/gocrud"
)

type CollectionType string

const (
	CollectionTypeArtist CollectionType = "artist"
	CollectionTypeAlbum  CollectionType = "album"
	CollectionTypeSong   CollectionType = "playlist"
)

var CollectionTypes = []CollectionType{
	CollectionTypeArtist,
	CollectionTypeAlbum,
	CollectionTypeSong,
}

type Collection struct {
	gocrud.Base
	Type        CollectionType `json:"type"`
	Priority    int64          `json:"priority"`
	Cover       string         `json:"cover"`
	Name        string         `json:"name"`               // human-readable name
	Keywords    string         `json:"keywords"`           // search keywords
	Code        string         `json:"code" gorm:"unique"` // for machine usage, not for human
	Description string         `json:"description"`
}

type Role string

const (
	Singer   Role = "singer"
	Lyricist Role = "lyricist"
	Composer Role = "composer"
	Arranger Role = "arranger"
	Producer Role = "producer"
	Other    Role = "other"
	Reserved Role = "_"
)

var Roles = []Role{
	Singer,
	Lyricist,
	Composer,
	Arranger,
	Producer,
	Other,
	Reserved,
}

type CollectionSong struct {
	SongID       gocrud.ID `json:"songId"`
	CollectionID gocrud.ID `json:"collectionId"`
	Role         Role      `json:"role" gorm:"default:'_'"`
	CreatedAt    time.Time `json:"createdAt" gorm:"autoCreateTime;<-:create"`
}
