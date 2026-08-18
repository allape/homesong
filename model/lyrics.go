package model

import (
	"github.com/allape/gocrud"
)

type Lyrics struct {
	gocrud.Base
	Name        string `json:"name"`
	Content     string `json:"content"`
	SearchText  string `json:"searchText"`
	Description string `json:"description"`
}
