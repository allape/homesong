package controller

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path"
	"strconv"
	"strings"
	"sync"
	"unicode"

	"github.com/allape/gocrud"
	"github.com/allape/homesong/env"
	"github.com/allape/homesong/ffmpeg"
	"github.com/allape/homesong/model"
	"github.com/gin-gonic/gin"
	"github.com/h2non/filetype"
	"gorm.io/gorm"
)

// region Credits: github.com/gin-gonic/gin@v1.10.0/context.go:1097

func isASCII(s string) bool {
	for i := 0; i < len(s); i++ {
		if s[i] > unicode.MaxASCII {
			return false
		}
	}
	return true
}

var quoteEscaper = strings.NewReplacer("\\", "\\\\", `"`, "\\\"")

func escapeQuotes(s string) string {
	return quoteEscaper.Replace(s)
}

// endregion

var compressLocker = &sync.Mutex{}

func SetupSongController(group *gin.RouterGroup, db *gorm.DB) error {
	err := gocrud.New(group, db, gocrud.Crud[model.Song]{
		DisableSave:     true,
		EnableGetAll:    true,
		DefaultPageSize: DefaultPageSize,
		SearchHandlers: map[string]gocrud.SearchHandler{
			"like_name":         gocrud.KeywordLike("name", nil),
			"in_id":             gocrud.KeywordIDIn("id", gocrud.OverflowedArrayTrimmerFilter[gocrud.ID](DefaultPageSize)),
			"deleted":           gocrud.NewSoftDeleteSearchHandler("songs"),
			"orderBy_priority":  gocrud.SortBy("priority"),
			"orderBy_createdAt": gocrud.SortBy("created_at"),
			"orderBy_updatedAt": gocrud.SortBy("updated_at"),
			"orderByDefault": func(db *gorm.DB, values []string, with url.Values) *gorm.DB {
				return db.Order("`priority` DESC, `updated_at` DESC")
			},
			"in_collectionId": func(db *gorm.DB, values []string, with url.Values) *gorm.DB {
				if value, ok := gocrud.PickFirstValuableString(values); ok {
					ids := gocrud.IDsFromCommaSeparatedString(value)
					if len(ids) == 0 {
						return db
					}
					return db.Where("id IN (SELECT collection_songs.song_id FROM collection_songs WHERE collection_songs.collection_id IN ?)", ids)
				}
				return db
			},
			"like_collectionName": func(db *gorm.DB, values []string, with url.Values) *gorm.DB {
				if value, ok := gocrud.PickFirstValuableString(values); ok {
					value = fmt.Sprintf("%%%s%%", value)
					return db.Where(
						`
						id IN (
							SELECT collection_songs.song_id FROM collection_songs 
							LEFT JOIN collections ON collection_songs.collection_id = collections.id
							WHERE (collections.name LIKE ? OR collections.keywords LIKE ?)
						)`,
						value,
						value,
					)
				}
				return db
			},
		},
		WillGetAll: func(context *gin.Context, db *gorm.DB) *gorm.DB {
			collectionId := gocrud.IDsFromCommaSeparatedString(context.Query("in_collectionId"))
			if len(collectionId) == 0 {
				gocrud.MakeErrorResponse(context, gocrud.RestCoder.BadRequest(), "collectionId not found")
			}
			return db
		},
		OnDelete: gocrud.NewSoftDeleteHandler[model.Song](gocrud.RestCoder),
		WillSave: func(record *model.Song, context *gin.Context, db *gorm.DB) {
			record.Name = strings.TrimSpace(record.Name)
		},
	})
	if err != nil {
		return err
	}

	group.PUT("/upload", func(context *gin.Context) {
		form, err := context.MultipartForm()
		if err != nil {
			gocrud.MakeErrorResponse(context, gocrud.RestCoder.BadRequest(), err)
			return
		}

		songFormValue := form.Value["song"]
		if len(songFormValue) == 0 {
			gocrud.MakeErrorResponse(context, gocrud.RestCoder.BadRequest(), "song field not found")
			return
		}

		var song model.Song
		err = json.Unmarshal([]byte(songFormValue[0]), &song)
		if err != nil {
			gocrud.MakeErrorResponse(context, gocrud.RestCoder.BadRequest(), err)
			return
		}

		song.Name = strings.TrimSpace(song.Name)
		if song.Name == "" {
			gocrud.MakeErrorResponse(context, gocrud.RestCoder.BadRequest(), "name cannot be empty")
			return
		}

		songFormFile := form.File["file"]
		if len(songFormFile) > 0 {
			songFile, err := songFormFile[0].Open()
			if err != nil {
				gocrud.MakeErrorResponse(context, gocrud.RestCoder.BadRequest(), err)
				return
			}
			defer func() {
				_ = songFile.Close()
			}()

			filename, digest, err := gocrud.SaveAsDigestedFile(env.StaticFolder, songFormFile[0].Filename, songFile, songFormFile[0].Size, "")
			if err != nil {
				gocrud.MakeErrorResponse(context, gocrud.RestCoder.InternalServerError(), err)
				return
			}
			song.Filename = string(filename)
			song.Digest = string(digest)

			fullpath := path.Join(env.StaticFolder, string(filename))

			mime, err := filetype.MatchFile(fullpath)
			if err != nil {
				gocrud.MakeErrorResponse(context, gocrud.RestCoder.BadRequest(), err)
				return
			}
			song.MIME = mime.MIME.Value

			ffprobe, ffprobeJson, err := ffmpeg.FFProbe(fullpath)
			if err != nil {
				gocrud.MakeErrorResponse(context, gocrud.RestCoder.InternalServerError(), err)
				return
			}
			song.FFProbeInfo = ffprobeJson

			if song.Cover == "" {
				coverBytes, coverExt, err := ffmpeg.ExtractCover(fullpath, ffprobe)
				if err != nil {
					gocrud.MakeErrorResponse(context, gocrud.RestCoder.InternalServerError(), err)
					return
				}

				if len(coverBytes) > 0 {
					cover, _, err := gocrud.SaveAsDigestedFile(
						env.StaticFolder,
						"cover"+ffmpeg.GetExtByCodecName(coverExt),
						bytes.NewReader(coverBytes),
						int64(len(coverBytes)),
						"",
					)
					if err != nil {
						gocrud.MakeErrorResponse(context, gocrud.RestCoder.InternalServerError(), err)
						return
					}
					song.Cover = string(cover)
				}
			}
		}
		// empty file is allowed
		//else if song.ID == 0 {
		//	gocrud.MakeErrorResponse(context, gocrud.RestCoder.BadRequest(), "file not found")
		//	return
		//}

		if err := db.Save(&song).Error; err != nil {
			gocrud.MakeErrorResponse(context, gocrud.RestCoder.InternalServerError(), err)
			return
		}

		context.JSON(http.StatusOK, gocrud.R[model.Song]{Code: gocrud.RestCoder.OK(), Data: song})
	})

	group.POST("/ffprobe", func(context *gin.Context) {
		_, str, err := ffmpeg.FFProbeReader(context.Request.Body)
		if err != nil {
			gocrud.MakeErrorResponse(context, gocrud.RestCoder.InternalServerError(), err)
			return
		}
		context.JSON(http.StatusOK, str)
	})

	group.POST("/extract-cover", func(context *gin.Context) {
		tmp, err := os.CreateTemp(os.TempDir(), "song-*")
		if err != nil {
			gocrud.MakeErrorResponse(context, gocrud.RestCoder.InternalServerError(), err)
			return
		}

		n, err := io.Copy(tmp, context.Request.Body)
		if err != nil {
			gocrud.MakeErrorResponse(context, gocrud.RestCoder.InternalServerError(), err)
			return
		} else if context.Request.ContentLength > 0 && n != context.Request.ContentLength {
			gocrud.MakeErrorResponse(context, gocrud.RestCoder.BadRequest(), "incomplete file")
			return
		}

		cover, codec, err := ffmpeg.ExtractCover(tmp.Name(), nil)
		if err != nil {
			gocrud.MakeErrorResponse(context, gocrud.RestCoder.InternalServerError(), err)
			return
		}

		ext := ffmpeg.GetExtByCodecName(codec)

		context.Data(http.StatusOK, "image/"+ext, cover)
	})

	// bitrate=0: return original file
	// download=filename: add attachment header
	group.GET("/file/:id", func(context *gin.Context) {
		id := gocrud.Pick(gocrud.IDsFromCommaSeparatedString(context.Param("id")), 0, 0)
		if id == 0 {
			gocrud.MakeErrorResponse(context, gocrud.RestCoder.BadRequest(), "id not found")
			return
		}

		download := context.Query("download")

		var err error

		bitrate := uint64(0)
		bitrateStr := context.Query("bitrate")
		if bitrateStr != "" {
			bitrate, err = strconv.ParseUint(bitrateStr, 10, 64)
			if err != nil {
				gocrud.MakeErrorResponse(context, gocrud.RestCoder.BadRequest(), err)
				return
			}
		}

		var song model.Song
		if err := db.Model(&song).First(&song, id).Error; err != nil {
			gocrud.MakeErrorResponse(context, gocrud.RestCoder.InternalServerError(), err)
			return
		} else if song.Filename == "" {
			gocrud.MakeErrorResponse(context, gocrud.RestCoder.BadRequest(), "file not found")
			return
		}

		filename := path.Join(env.StaticFolder, song.Filename)

		// iOS will treat this as streaming when converting to mp3 on the fly
		//context.Header("Content-Type", "audio/mpeg")
		//context.Writer.WriteHeaderNow()
		//context.Writer.Flush()
		//
		//err = ffmpeg.Compress(filename, bitrate, context.Writer)
		//if err != nil {
		//	l.Error().Println(err)
		//}
		//context.Writer.Flush()

		if bitrate <= 0 {
			file, err := os.Open(filename)
			if err != nil {
				gocrud.MakeErrorResponse(context, gocrud.RestCoder.InternalServerError(), err)
				return
			}
			defer func() {
				_ = file.Close()
			}()

			stat, err := file.Stat()
			if err != nil {
				gocrud.MakeErrorResponse(context, gocrud.RestCoder.InternalServerError(), err)
				return
			} else if stat.IsDir() {
				gocrud.MakeErrorResponse(context, gocrud.RestCoder.InternalServerError(), "file is a directory")
				return
			}
		} else {
			compressedFolder := path.Join(env.StaticFolder, "compressed")

			stat, err := os.Stat(compressedFolder)
			if err != nil {
				if errors.Is(err, os.ErrNotExist) {
					err = os.MkdirAll(compressedFolder, 0755)
					if err != nil {
						gocrud.MakeErrorResponse(context, gocrud.RestCoder.InternalServerError(), err)
						return
					}
				} else {
					gocrud.MakeErrorResponse(context, gocrud.RestCoder.InternalServerError(), err)
					return
				}
			} else if !stat.IsDir() {
				gocrud.MakeErrorResponse(context, gocrud.RestCoder.InternalServerError(), "compressed folder is not a directory")
				return
			}

			compressedFilename := path.Join(compressedFolder, fmt.Sprintf("%s.%d.mp3", path.Base(song.Filename), bitrate))

			stat, err = os.Stat(compressedFilename)
			if err != nil {
				if errors.Is(err, os.ErrNotExist) {
					func() {
						compressLocker.Lock()
						defer compressLocker.Unlock()
						err = ffmpeg.Compress(compressedFilename, filename, bitrate)
					}()
					if err != nil {
						gocrud.MakeErrorResponse(context, gocrud.RestCoder.InternalServerError(), err)
						return
					}
				} else {
					gocrud.MakeErrorResponse(context, gocrud.RestCoder.InternalServerError(), err)
					return
				}
			} else if stat.IsDir() {
				gocrud.MakeErrorResponse(context, gocrud.RestCoder.InternalServerError(), "compressed file is a directory")
				return
			}

			filename = compressedFilename
		}

		if download != "" {
			if isASCII(download) {
				context.Writer.Header().Set("Content-Disposition", `attachment; filename="`+escapeQuotes(download)+`"`)
			} else {
				context.Writer.Header().Set("Content-Disposition", `attachment; filename*=UTF-8''`+strings.ReplaceAll(url.QueryEscape(download), "+", "%20"))
			}
			context.Writer.Header().Set("Content-Type", "application/octet-stream")
		}

		context.File(filename)
	})

	// ?lyricsIds=1,2,3
	group.PUT("/lyrics/:id", func(context *gin.Context) {
		id := gocrud.Pick(gocrud.IDsFromCommaSeparatedString(context.Param("id")), 0, 0)
		lyricsIds := gocrud.IDsFromCommaSeparatedString(context.Query("lyricsIds"))

		if id == 0 {
			gocrud.MakeErrorResponse(context, gocrud.RestCoder.BadRequest(), "id not found")
			return
		}

		var lyricsArr []model.Lyrics
		if err := db.Model(&lyricsArr).Where("id IN ?", lyricsIds).Find(&lyricsArr).Error; err != nil {
			gocrud.MakeErrorResponse(context, gocrud.RestCoder.InternalServerError(), err)
			return
		}

		songLyrics := make([]model.SongLyrics, len(lyricsIds))
		for i, lyricsId := range lyricsIds {
			songLyrics[i] = model.SongLyrics{
				SongID:   id,
				LyricsID: lyricsId,
			}
		}

		if err := db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Delete(&model.SongLyrics{}, "song_id = ?", id).Error; err != nil {
				return err
			}

			if len(lyricsIds) == 0 {
				return nil
			}

			if err := tx.Model(&model.SongLyrics{}).Save(songLyrics).Error; err != nil {
				return err
			}

			return nil
		}); err != nil {
			gocrud.MakeErrorResponse(context, gocrud.RestCoder.InternalServerError(), err)
			return
		}

		context.JSON(http.StatusOK, gocrud.R[[]model.SongLyrics]{Code: gocrud.RestCoder.OK(), Data: songLyrics})
	})

	group.GET("/lyrics/:id", func(context *gin.Context) {
		id := gocrud.Pick(gocrud.IDsFromCommaSeparatedString(context.Param("id")), 0, 0)
		if id == 0 {
			gocrud.MakeErrorResponse(context, gocrud.RestCoder.BadRequest(), "id not found")
			return
		}

		var lyricsArr []model.Lyrics

		if err := db.Model(&lyricsArr).Where(
			"id IN (SELECT song_lyrics.lyrics_id FROM song_lyrics WHERE song_lyrics.song_id = ?)",
			id,
		).Order("`priority` DESC").Order("`updated_at` DESC").Find(&lyricsArr).Error; err != nil {
			gocrud.MakeErrorResponse(context, gocrud.RestCoder.InternalServerError(), err)
			return
		}

		context.JSON(http.StatusOK, gocrud.R[[]model.Lyrics]{
			Code: gocrud.RestCoder.OK(),
			Data: lyricsArr,
		})
	})

	return nil
}
