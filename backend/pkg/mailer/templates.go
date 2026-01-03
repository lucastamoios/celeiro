package mailer

import (
	"bytes"
	"embed"
	"fmt"
	"html/template"
	"io/fs"
	"path/filepath"
	"strings"
	"sync"
)

//go:embed templates/*.html
var templatesFS embed.FS

var (
	parseOnce          sync.Once
	parsedTemplates    *template.Template
	availableTemplates map[string]string
	parseErr           error
)

type TemplateName string

const (
	TemplateAuthCode             TemplateName = "auth_code"
	OrganizationInviteTemplate   TemplateName = "organization_invite"
)

func discoverTemplates() map[string]string {
	templates := make(map[string]string)

	err := fs.WalkDir(templatesFS, "templates", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		if !d.IsDir() && strings.HasSuffix(path, ".html") {
			filename := filepath.Base(path)
			templateName := strings.TrimSuffix(filename, ".html")
			templates[filename] = templateName
		}

		return nil
	})

	if err != nil {
		panic(fmt.Sprintf("Failed to discover templates: %v", err))
	}

	return templates
}

func GetTemplates() (*template.Template, error) {
	parseOnce.Do(func() {
		availableTemplates = discoverTemplates()
		parsedTemplates, parseErr = template.New("").ParseFS(templatesFS, "templates/*.html")
	})
	return parsedTemplates, parseErr
}

func GetAvailableTemplates() map[string]string {
	if availableTemplates == nil {
		GetTemplates()
	}
	return availableTemplates
}

func GetTemplateFilename(templateName TemplateName) (string, error) {
	templates := GetAvailableTemplates()

	for filename, name := range templates {
		if name == string(templateName) {
			return filename, nil
		}
	}

	return "", fmt.Errorf("template not found: %s", templateName)
}

func RenderTemplateToString(filename string, data any) (string, error) {
	t, err := GetTemplates()
	if err != nil {
		return "", err
	}
	var buf bytes.Buffer
	if err := t.ExecuteTemplate(&buf, filename, data); err != nil {
		return "", err
	}
	return buf.String(), nil
}

func RenderTemplateByName(templateName TemplateName, data any) (string, error) {
	filename, err := GetTemplateFilename(templateName)
	if err != nil {
		return "", err
	}
	return RenderTemplateToString(filename, data)
}
