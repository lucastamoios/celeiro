package testsetup

import (
	"context"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"time"

	"github.com/catrutech/celeiro/internal/config"
	"github.com/catrutech/celeiro/internal/migrations"
	database "github.com/catrutech/celeiro/pkg/database/persistent"
	"github.com/catrutech/celeiro/pkg/logging"

	"github.com/pressly/goose/v3"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

const (
	testDataPath = "internal/tests/setup/testdata/"
)

// postgresContainer represents the database instance for the reports module test.
type postgresContainer struct {
	config    postgresContainerConfig
	container *postgres.PostgresContainer
	db        database.Database
}

// postgresContainerConfig represents the configuration for the postgres database container.
type postgresContainerConfig struct {
	DBConnInfo
	Logger logging.Logger
	Image  string
}

// DBConnInfo represents the database connection information.
type DBConnInfo struct {
	Name       string
	Host       string
	Port       int
	Database   string
	User       string
	Password   string
	DisableSSL string
	// Redundant to the above fields, but it is useful as a shortcut to the connection string.
	ConnectionString string
}

// newDBContainer creates the database container.
func newDBContainer(config postgresContainerConfig) *postgresContainer {
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()
	container := new(postgresContainer)
	container.config = config
	container.init(ctx)
	container.setupDatabase(ctx)
	container.migrate(ctx)
	return container
}

// setupDatabase maps the database container connection information to the struct postgresContainer.
func (c *postgresContainer) setupDatabase(ctx context.Context) {
	c.createDatabaseConnection(ctx)
	host, err := c.container.Host(ctx)
	if err != nil {
		c.config.Logger.Error(ctx, "error to get db container host", "error", err.Error())
	}
	c.config.Host = host
	port, err := c.container.MappedPort(ctx, "5432")
	if err != nil {
		c.config.Logger.Error(ctx, "error to get db container host", "error", err.Error())
	}
	c.config.Port = port.Int()
	// We also need to configure toggldb default connection
	c.config.ConnectionString, err = c.container.ConnectionString(ctx, c.config.DisableSSL)
	if err != nil {
		c.config.Logger.Error(ctx, "error to get db container connection string", "error", err.Error())
	}
}

// createDatabaseConnection creates the connection object that will be used to run queries.
func (c *postgresContainer) createDatabaseConnection(ctx context.Context) {
	connStr, err := c.container.ConnectionString(ctx, c.config.DisableSSL)
	if err != nil {
		c.config.Logger.Error(ctx, "error to get db container connection string", "error", err.Error())
	}
	c.config.Logger.Info(ctx, "db container connection string", "name", c.config.Name, "connStr", connStr)
	dbCfg := &config.Config{
		PGConnStr: connStr,
		PGMaxIdle: 2,
		PGMaxConn: 2,
		PGDBName:  c.config.Database,
		Port:      c.config.Port,
	}

	c.db = database.New(dbCfg, c.config.Logger)
}

// init initializes the postgres container instance.
func (c *postgresContainer) init(ctx context.Context) {
	c.container = c.create(ctx, c.prepareScripts(ctx)...)
}

// migrate runs the migrations for the postgres container.
func (c *postgresContainer) migrate(ctx context.Context) {
	c.config.Logger.Info(ctx, "migrating postgres container", "database", c.config.Name)
	goose.SetBaseFS(migrations.MigrationsFS)

	if err := goose.SetDialect("postgres"); err != nil {
		panic(err)
	}

	db := c.db.(*database.PostgresDatabase)
	if err := goose.Up(db.GetDB(), "."); err != nil {
		panic(err)
	}
}

// create creates a postgres container.
func (c *postgresContainer) create(ctx context.Context, initScrips ...string) *postgres.PostgresContainer {
	c.config.Logger.Info(ctx, "creating postgres container", "image", c.config.Image, "database", c.config.Name, "user", c.config.User, "password", c.config.Password)
	pgContainer, err := postgres.Run(ctx,
		c.config.Image,
		postgres.WithDatabase(c.config.Name),
		postgres.WithUsername(c.config.User),
		postgres.WithPassword(c.config.Password),
		postgres.WithInitScripts(initScrips...),
		postgres.WithConfigFile(filepath.Join(getBaseDir(), testDataPath, "postgresql.conf")),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(time.Second*5),
		),
	)
	if err != nil {
		c.config.Logger.Error(ctx, "error to setup postgres container", "error", err.Error())
	}
	c.config.Logger.Info(ctx, "postgres container created", "container", pgContainer)
	return pgContainer
}

// prepareScripts setups the needed migrations and return them.
func (c *postgresContainer) prepareScripts(ctx context.Context) []string {
	return c.getScripts(ctx, getBaseDir())
}

func getBaseDir() string {
	_, b, _, _ := runtime.Caller(0)
	rootDir := filepath.Dir(b)
	rootDir = filepath.Join(rootDir, "..", "..", "..")
	return rootDir
}

// getScripts load the migrations from the testdata directory.
// rootDir = base directory where the tests execution was started.
func (c *postgresContainer) getScripts(ctx context.Context, rootDir string) []string {
	rootDir = filepath.Join(rootDir, testDataPath, c.config.Name)
	file, err := os.Open(rootDir)
	if err != nil {
		c.config.Logger.Error(ctx, "error while opening testdata integration tests directory", "error", err.Error(), "rootDir", rootDir)
	}
	defer file.Close()

	files, err := file.Readdir(-1)
	if err != nil {
		c.config.Logger.Error(ctx, "error while opening testdata integration tests directory", "error", err.Error(), "rootDir", rootDir)
	}

	var initScripts []string
	for _, f := range files {
		initScripts = append(initScripts, filepath.Join(rootDir, f.Name()))
	}
	sort.Strings(initScripts)
	return initScripts
}
