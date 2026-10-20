package main

import (
	"context"
	"embed"
	"log"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"

	"token-order-mgmt-desktop/internal/binding"
	"token-order-mgmt-desktop/internal/database"
	platformwindows "token-order-mgmt-desktop/internal/platform/windows"
	"token-order-mgmt-desktop/internal/service"
)

// frontendAssets is replaced by scripts/Sync-Frontend.ps1 before release builds.
//
//go:embed all:build/windows/frontend/dist
var frontendAssets embed.FS

func main() {
	paths, err := platformwindows.ResolvePaths()
	if err != nil {
		log.Fatal(err)
	}

	db, err := database.Open(context.Background(), paths.DatabasePath)
	if err != nil {
		log.Fatalf("open database %s: %v", paths.DatabasePath, err)
	}
	app := NewApp(binding.NewDesktopBinding(service.New(db), paths))

	err = wails.Run(&options.App{
		Title:     "TokenOrderMgmt",
		Width:     1280,
		Height:    820,
		MinWidth:  1024,
		MinHeight: 680,
		AssetServer: &assetserver.Options{
			Assets: frontendAssets,
		},
		OnStartup:  app.Startup,
		OnShutdown: app.Shutdown,
		Bind: []interface{}{
			app,
		},
		Windows: &windows.Options{
			DisablePinchZoom: true,
			Theme:            windows.SystemDefault,
		},
	})
	if err != nil {
		log.Fatal(err)
	}
}
