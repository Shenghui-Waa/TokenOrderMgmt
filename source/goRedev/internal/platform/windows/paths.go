package windows

import (
	"fmt"
	"os"
	"path/filepath"
)

type Paths struct {
	ExecutableDir string
	DataDir       string
	DatabasePath  string
}

func ResolvePaths() (Paths, error) {
	executable, err := os.Executable()
	if err != nil {
		return Paths{}, fmt.Errorf("resolve executable path: %w", err)
	}
	executable, err = filepath.EvalSymlinks(executable)
	if err != nil {
		return Paths{}, fmt.Errorf("resolve executable links: %w", err)
	}
	root := filepath.Dir(executable)
	dataDir := filepath.Join(root, "data")
	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		return Paths{}, fmt.Errorf("create data directory %q: %w", dataDir, err)
	}
	return Paths{ExecutableDir: root, DataDir: dataDir, DatabasePath: filepath.Join(dataDir, "token-order-mgmt.db")}, nil
}
