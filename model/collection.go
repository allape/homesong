package model

import (
	"time"

	"github.com/allape/gocrud"
)

type CollectionType string

const (
	CollectionTypePlaylist CollectionType = "playlist"
	CollectionTypeArtist   CollectionType = "artist"
	CollectionTypeAlbum    CollectionType = "album"
	CollectionTypeLanguage CollectionType = "language"
	CollectionTypeOST      CollectionType = "ost"
	CollectionTypeOpera    CollectionType = "opera"
)

var CollectionTypes = []CollectionType{
	CollectionTypePlaylist,
	CollectionTypeArtist,
	CollectionTypeAlbum,
	CollectionTypeLanguage,
	CollectionTypeOST,
	CollectionTypeOpera,
}

type Collection struct {
	gocrud.Base
	Type        CollectionType `json:"type"`
	Cover       string         `json:"cover"`
	Name        string         `json:"name"`     // human-readable name
	Keywords    string         `json:"keywords"` // search keywords
	Code        string         `json:"code"`     // for machine usage, not for human
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
	SongID       gocrud.ID `json:"songId" gorm:"index:idx_collection_song"`
	CollectionID gocrud.ID `json:"collectionId" gorm:"index:idx_collection_song"`
	Role         Role      `json:"role" gorm:"default:'_';index:idx_collection_song"`
	CreatedAt    time.Time `json:"createdAt" gorm:"autoCreateTime;<-:create"`
}
