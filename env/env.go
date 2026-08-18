package env

import (
	"github.com/allape/goenv"
)

const Project = "HOMESONG_"

const (
	bindAddr   = Project + "BIND_ADDR"
	enableCors = Project + "ENABLE_CORS"

	databaseDSN           = Project + "DATABASE_DSN"
	standaloneDatabaseDSN = Project + "STANDALONE_DATABASE_DSN"

	uiFolder     = Project + "UI_FOLDER"
	staticFolder = Project + "STATIC_FOLDER"

	debugMode = Project + "DEBUG_MODE"
)

var (
	BindAddr   = goenv.Getenv(bindAddr, ":8080")
	EnableCors = goenv.Getenv(enableCors, true)

	//DatabaseDSN           = goenv.Getenv(databaseDSN, "") // "root:Root_123456@tcp(127.0.0.1:3306)/homesong?charset=utf8mb4&parseTime=True&loc=Local"
	DatabaseDSN           = goenv.Getenv(databaseDSN, "root:Root_123456@tcp(127.0.0.1:3306)/homesong?charset=utf8mb4&parseTime=True&loc=Local")
	StandaloneDatabaseDSN = goenv.Getenv(standaloneDatabaseDSN, "./database/data.db")

	UIFolder     = goenv.Getenv(uiFolder, "./ui/admin/dist/index.html")
	StaticFolder = goenv.Getenv(staticFolder, "./static")

	DebugMode = goenv.Getenv(debugMode, false)

	Standalone = DatabaseDSN == ""
)
