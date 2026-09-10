package controller

import (
	"fmt"
	"net/http"
	"slices"
	"strings"

	"github.com/allape/gocrud"
	"github.com/allape/homesong/model"
	"github.com/gin-gonic/gin"
	"golang.org/x/text/unicode/norm"
	"gorm.io/gorm"
)

var collectionl = l.New("collection")

func SetupCollectionController(group *gin.RouterGroup, db *gorm.DB) error {
	CodeDuplicateCheckFunc, err := gocrud.NewDuplicateFieldCheckFunc[model.Collection](db, collectionl, "Code")
	if err != nil {
		return err
	}

	err = gocrud.Setup(group, db, collectionl.New("crud"), &gocrud.Crud[model.Collection]{
		EnableGetAll: true,
		SearchHandlers: gocrud.BaseSearchHandlers(gocrud.SearchHandlers{
			"keywords": func(db *gorm.DB, values []string, _ *gin.Context) (*gorm.DB, error) {
				if value, ok := gocrud.PickFirstValuableString(values); ok {
					likeValue := fmt.Sprintf("%%%s%%", strings.TrimSpace(value))
					return db.Where("`keywords` LIKE ? OR `name` LIKE ? OR `code` LIKE ? OR `id` = ?", likeValue, likeValue, likeValue, value), nil
				}
				return db, nil
			},
			"in_type": gocrud.KeywordIn("type", nil),
		}),
		WillSave: func(record *model.Collection, context *gin.Context, db *gorm.DB) {
			record.Name = strings.TrimSpace(record.Name)
			record.Keywords = strings.TrimSpace(record.Keywords)
			record.Type = model.CollectionType(strings.TrimSpace(string(record.Type)))

			if record.Type == "" {
				gocrud.MakeErrorResponse(context, gocrud.RestCoder.BadRequest(), "type is required")
				return
			} else if !slices.Contains(model.CollectionTypes, record.Type) {
				gocrud.MakeErrorResponse(context, gocrud.RestCoder.BadRequest(), "type is invalid")
				return
			}

			record.Name = norm.NFC.String(record.Name)

			var exist model.Collection
			if err := db.Model(&exist).Where("`name` = ? AND `type` = ?", record.Name, record.Type).First(&exist).Error; err == nil && exist.ID != record.ID {
				gocrud.MakeErrorResponse(context, gocrud.RestCoder.BadRequest(), "name already exists")
				return
			}

			record.Code = strings.TrimSpace(record.Code)
			if record.Code != "" {
				if err := CodeDuplicateCheckFunc(context, record); err != nil {
					return
				}
			}
		},
	})
	if err != nil {
		return err
	}

	// may require a lock
	group.PUT("/create-or-get/by-artist-names/:names", func(context *gin.Context) {
		names := gocrud.StringArrayFromCommaSeparatedString(context.Param("names"))
		if len(names) == 0 {
			gocrud.MakeErrorResponse(context, gocrud.RestCoder.BadRequest(), "names not found")
			return
		}

		var exists []model.Collection
		if err := db.Model(&exists).Where("type = 'artist' AND name IN ?", names).Find(&exists).Error; err != nil {
			gocrud.MakeErrorResponse(context, gocrud.RestCoder.InternalServerError(), err)
			return
		}

	out:
		for _, name := range names {
			for _, exist := range exists {
				if exist.Name == name {
					continue out
				}
			}

			var artist = model.Collection{Type: model.CollectionTypeArtist, Name: name}

			if err := db.Model(&artist).Create(&artist).Error; err != nil {
				gocrud.MakeErrorResponse(context, gocrud.RestCoder.InternalServerError(), err)
				return
			}

			exists = append(exists, artist)
		}

		context.JSON(http.StatusOK, gocrud.R[[]model.Collection]{Code: gocrud.RestCoder.OK(), Data: exists})
	})

	return nil
}

func SetupCollectionSongController(group *gin.RouterGroup, db *gorm.DB) error {
	return gocrud.SetupM2MConnectorController[model.CollectionSong](
		group, db, collectionl.New("song"),
		"CollectionID", "SongID", nil,
	)
}
