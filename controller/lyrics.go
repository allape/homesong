package controller

import (
	"net/http"
	"net/url"
	"strings"

	"github.com/allape/gocrud"
	"github.com/allape/homesong/model"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupLyricsController(group *gin.RouterGroup, db *gorm.DB) error {
	err := gocrud.New(group, db, gocrud.Crud[model.Lyrics]{
		DefaultPageSize: DefaultPageSize,
		SearchHandlers: map[string]gocrud.SearchHandler{
			"like_name":         gocrud.KeywordLike("name", nil),
			"like_searchText":   gocrud.KeywordLike("search_text", nil),
			"in_id":             gocrud.KeywordIDIn("id", gocrud.OverflowedArrayTrimmerFilter[gocrud.ID](DefaultPageSize)),
			"deleted":           gocrud.NewSoftDeleteSearchHandler("lyrics"),
			"orderBy_priority":  gocrud.SortBy("priority"),
			"orderBy_createdAt": gocrud.SortBy("created_at"),
			"orderBy_updatedAt": gocrud.SortBy("updated_at"),
			"orderByDefault": func(db *gorm.DB, values []string, with url.Values) *gorm.DB {
				return db.Order("`priority` DESC, `updated_at` DESC")
			},
		},
		OnDelete: gocrud.NewSoftDeleteHandler[model.Lyrics](gocrud.RestCoder),
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
