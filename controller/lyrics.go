package controller

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/allape/gocrud"
	"github.com/allape/homesong/model"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var lyricsl = l.New("lyrics")

func SetupLyricsController(group *gin.RouterGroup, db *gorm.DB) error {
	err := gocrud.Setup(group, db, lyricsl.New("crud"), &gocrud.Crud[model.Lyrics]{
		EnableGetAll: true,
		SearchHandlers: gocrud.BaseSearchHandlers(gocrud.SearchHandlers{
			"like_name":       gocrud.KeywordLike("name", nil),
			"like_searchText": gocrud.KeywordLike("search_text", nil),
			"keywords": func(db *gorm.DB, values []string, _ *gin.Context) (*gorm.DB, error) {
				if value, ok := gocrud.PickFirstValuableString(values); ok {
					likeValue := fmt.Sprintf("%%%s%%", strings.TrimSpace(value))
					return db.Where("`name` LIKE ? OR `search_text` LIKE ?", likeValue, likeValue), nil
				}
				return db, nil
			},
		}),
		WillSave: func(record *model.Lyrics, context *gin.Context, db *gorm.DB) {
			record.Name = strings.TrimSpace(record.Name)
		},
	})
	if err != nil {
		return err
	}

	group.GET("/text/:id", func(context *gin.Context) {
		id := gocrud.Pick(gocrud.IDsFromCommaSeparatedString(context.Param("id")), 0, 0)
		if id == 0 {
			gocrud.MakeErrorResponse(context, gocrud.RestCoder.BadRequest(), "id not found")
			return
		}

		var lyrics model.Lyrics
		if err := db.Model(lyrics).Where("id = ?", id).Find(&lyrics).Error; err != nil {
			gocrud.MakeErrorResponse(context, gocrud.RestCoder.NotFound(), "lyrics not found")
			return
		}

		context.Data(http.StatusOK, "text/plain; charset=utf-8", []byte(lyrics.Content))
	})

	return nil
}
