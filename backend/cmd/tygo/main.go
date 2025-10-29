package main

import (
	"log"

	"github.com/gzuidhof/tygo/tygo"
)

func main() {
	config := &tygo.Config{
		Packages: []*tygo.PackageConfig{
			{
				Path:       "github.com/catrutech/celeiro/internal/web/accounts",
				OutputPath: "../mobile/app/services/api/accounts.ts",
			},
			{
				Path:       "github.com/catrutech/celeiro/internal/web/rides",
				OutputPath: "../mobile/app/services/api/rides.ts",
			},
			{
				Path:       "github.com/catrutech/celeiro/internal/web/scores",
				OutputPath: "../mobile/app/services/api/scores.ts",
			},
		},
	}
	gen := tygo.New(config)
	err := gen.Generate()
	if err != nil {
		log.Fatal(err)
	}
}
