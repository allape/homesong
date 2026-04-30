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

type Collection struct {
	gocrud.Base
	Type        CollectionType `json:"type"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Keywords    string         `json:"keywords"`
	Cover       string         `json:"cover"`
	Priority    int64          `json:"priority"`
}

type CollectionSong struct {
	SongID       gocrud.ID `json:"songId"`
	CollectionID gocrud.ID `json:"collectionId"`
	Role         Role      `json:"role" gorm:"default:'_'"`
	CreatedAt    time.Time `json:"createdAt" gorm:"autoCreateTime;<-:create"`
}
