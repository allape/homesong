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

var songl = l.New("song")

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
	err := gocrud.Setup(group, db, songl.New("crud"), &gocrud.Crud[model.Song]{
		DisableSave:  true,
		EnableGetAll: true,
		SearchHandlers: gocrud.BaseSearchHandlers(gocrud.SearchHandlers{
			"like_name": gocrud.KeywordLike("name", nil),
			"in_collectionId": func(db *gorm.DB, values []string, _ *gin.Context) (*gorm.DB, error) {
				if value, ok := gocrud.PickFirstValuableString(values); ok {
					ids := gocrud.IDsFromCommaSeparatedString(value)
					if len(ids) == 0 {
						return nil, gocrud.NotArrayError
					}
					return db.Where("id IN (SELECT collection_songs.song_id FROM collection_songs WHERE collection_songs.collection_id IN ?)", ids), nil
				}
				return db, nil
			},
			"keywords": func(db *gorm.DB, values []string, _ *gin.Context) (*gorm.DB, error) {
				if value, ok := gocrud.PickFirstValuableString(values); ok {
					value = fmt.Sprintf("%%%s%%", value)
					return db.Where(
						"`name` LIKE ? OR `subtitle` LIKE ? OR "+`
						id IN (
							SELECT collection_songs.song_id FROM collection_songs 
							LEFT JOIN collections ON collection_songs.collection_id = collections.id
							WHERE (collections.name LIKE ? OR collections.keywords LIKE ? OR collections.code LIKE ?)
						)`,
						value,
						value,

						value,
						value,
						value,
					), nil
				}
				return db, nil
			},
		}),
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

		mpRecord := form.Value["record"]
		if len(mpRecord) == 0 {
			gocrud.MakeErrorResponse(context, gocrud.RestCoder.BadRequest(), "record data not found")
			return
		}

		var song model.Song
		err = json.Unmarshal([]byte(mpRecord[0]), &song)
		if err != nil {
			gocrud.MakeErrorResponse(context, gocrud.RestCoder.BadRequest(), err)
			return
		}

		song.Name = strings.TrimSpace(song.Name)
		if song.Name == "" {
			gocrud.MakeErrorResponse(context, gocrud.RestCoder.BadRequest(), "name cannot be empty")
			return
		}
		song.Subtitle = strings.TrimSpace(song.Subtitle)

		mpFiles := form.File["file"]
		if len(mpFiles) > 0 {
			mpFile := mpFiles[0]
			songFile, err := mpFile.Open()
			if err != nil {
				gocrud.MakeErrorResponse(context, gocrud.RestCoder.BadRequest(), err)
				return
			}
			defer func() {
				_ = songFile.Close()
			}()

			dareFile, err := gocrud.SaveDareFile(songFile, &gocrud.SaveDareFileConfig{
				BaseFolder: env.StaticFolder,
				Ext:        path.Ext(mpFile.Filename),
				Size:       gocrud.FileSize(mpFile.Size),
			})
			if err != nil {
				gocrud.MakeErrorResponse(context, gocrud.RestCoder.InternalServerError(), err)
				return
			}
			song.Filename = string(dareFile.Name)
			song.Digest = string(dareFile.Digest)

			fullpath := path.Join(env.StaticFolder, song.Filename)

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
					coverFile, err := gocrud.SaveDareFile(bytes.NewReader(coverBytes), &gocrud.SaveDareFileConfig{
						BaseFolder: env.StaticFolder,
						Ext:        ffmpeg.GetExtByCodecName(coverExt),
						Size:       gocrud.FileSize(len(coverBytes)),
					})
					if err != nil {
						gocrud.MakeErrorResponse(context, gocrud.RestCoder.InternalServerError(), err)
						return
					}
					song.Cover = string(coverFile.Name)
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

func SetupSongLyricsController(group *gin.RouterGroup, db *gorm.DB) error {
	return gocrud.SetupM2MConnectorController[model.SongLyrics](
		group, db, songl.New("lyrics"),
		"SongID", "LyricsID", nil,
	)
}
