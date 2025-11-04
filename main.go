package main

import (
	_ "embed"
	"net/http"
	"os"
	"path"
	"time"

	"github.com/allape/gocrud"
	"github.com/allape/gogger"
	"github.com/allape/homesong/asset"
	"github.com/allape/homesong/controller"
	"github.com/allape/homesong/env"
	"github.com/allape/homesong/model"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/mysql"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var l = gogger.New("main")

func main() {
	err := gogger.InitFromEnv()
	if err != nil {
		l.Error().Fatalf("Failed to init logger: %v", err)
	}

	var db *gorm.DB

	gormConfig := &gorm.Config{
		Logger: logger.New(gogger.New("db").Debug(), logger.Config{
			SlowThreshold: 200 * time.Millisecond,
			LogLevel:      logger.Info,
			Colorful:      true,
		}),
	}

	if env.Standalone {
		l.Info().Println("Standalone mode, using SQLite")

		err = os.MkdirAll(path.Dir(env.StandaloneDatabaseDSN), 0755)
		if err != nil {
			l.Error().Fatalf("Failed to create database directory: %v", err)
		}

		db, err = gorm.Open(sqlite.Open(env.StandaloneDatabaseDSN), gormConfig)
	} else {
		l.Info().Println("Using MySQL")
		db, err = gorm.Open(mysql.Open(env.DatabaseDSN), gormConfig)
	}
	if err != nil {
		l.Error().Fatalf("Failed to open database: %v", err)
	}

	err = db.AutoMigrate(
		&model.Song{},
		&model.Collection{}, &model.CollectionSong{},
		&model.Lyrics{}, &model.SongLyrics{},
	)
	if err != nil {
		l.Error().Fatalf("Failed to auto migrate database: %v", err)
	}

	engine := gin.Default()

	if env.EnableCors {
		engine.Use(gocrud.NewCors())
	}

	apiGrp := engine.Group("/api")

	err = controller.SetupSongController(apiGrp.Group("/song"), db)
	if err != nil {
		l.Error().Fatalf("Failed to setup song controller: %v", err)
	}

	err = controller.SetupCollectionController(apiGrp.Group("/collection"), db)
	if err != nil {
		l.Error().Fatalf("Failed to setup collection controller: %v", err)
	}

	err = controller.SetupLyricsController(apiGrp.Group("/lyrics"), db)
	if err != nil {
		l.Error().Fatalf("Failed to setup lyrics controller: %v", err)
	}

	err = gocrud.NewHttpFileSystem(engine.Group("/static"), env.StaticFolder, &gocrud.HttpFileSystemConfig{
		AllowOverwrite: false,
		AllowUpload:    true,
		EnableDigest:   true,
	})

	err = gocrud.NewSingleHTMLServe(engine.Group("/ui"), env.UIFolder, &gocrud.SingleHTMLServeConfig{
		AllowReplace: env.DebugMode,
	})
	if err != nil {
		l.Error().Fatalf("Failed to setup single html serve: %v", err)
	}

	engine.GET("/", func(context *gin.Context) {
		context.Redirect(http.StatusMovedPermanently, "/ui/")
	})
	engine.GET("/favicon.ico", func(context *gin.Context) {
		context.Data(http.StatusOK, asset.FaviconMIME, asset.Favicon)
	})

	go func() {
		err := engine.Run(env.BindAddr)
		if err != nil {
			l.Error().Fatalf("Failed to start http server: %v", err)
		}
	}()

	gogger.New("ctrl-c").Info().Println("Exiting with", gocrud.Wait4CtrlC())
}
