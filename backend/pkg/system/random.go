package system

import (
	cryptoRand "crypto/rand"
	"encoding/base64"
	"math/rand"
	"time"

	"github.com/google/uuid"
)

type System struct {
	UUID         UUIDGenerator
	Int          IntGenerator
	Time         TimeGenerator
	SessionToken SessionTokenGenerator
	String       StringGenerator
}

func NewSystem() *System {
	return &System{
		UUID:         NewUUIDGenerator(),
		Int:          NewIntGenerator(),
		Time:         NewTimeGenerator(),
		SessionToken: NewSessionTokenGenerator(),
		String:       NewStringGenerator(),
	}
}

// UUIDGenerator

type UUIDGenerator interface {
	Generate() string
}

type DefaultUUIDGenerator struct{}

func NewUUIDGenerator() UUIDGenerator {
	return &DefaultUUIDGenerator{}
}

func (g *DefaultUUIDGenerator) Generate() string {
	return uuid.New().String()
}

// IntGenerator

type IntGenerator interface {
	Generate() int
	GenerateInRange(min, max int) int
}

type DefaultIntGenerator struct{}

func NewIntGenerator() IntGenerator {
	return &DefaultIntGenerator{}
}

func (g *DefaultIntGenerator) Generate() int {
	return rand.Int()
}

func (g *DefaultIntGenerator) GenerateInRange(min, max int) int {
	if min >= max {
		return min
	}
	return rand.Intn(max-min) + min
}

// TimeGenerator

type TimeGenerator interface {
	Now() time.Time
}

type DefaultTimeGenerator struct{}

func NewTimeGenerator() TimeGenerator {
	return &DefaultTimeGenerator{}
}

func (g *DefaultTimeGenerator) Now() time.Time {
	return time.Now()
}

// SessionTokenGenerator

type SessionTokenGenerator interface {
	Generate(length int) string
}

type DefaultSessionTokenGenerator struct{}

func NewSessionTokenGenerator() SessionTokenGenerator {
	return &DefaultSessionTokenGenerator{}
}

func (g *DefaultSessionTokenGenerator) Generate(length int) string {
	b := make([]byte, length)
	if _, err := cryptoRand.Read(b); err != nil {
		return ""
	}
	return base64.StdEncoding.EncodeToString(b)
}

type StringGenerator interface {
	Generate(length int) string
	GenerateAlphanumeric(length int) string
}

type DefaultStringGenerator struct{}

func NewStringGenerator() StringGenerator {
	return &DefaultStringGenerator{}
}

func (g *DefaultStringGenerator) Generate(length int) string {
	b := make([]byte, length)
	if _, err := cryptoRand.Read(b); err != nil {
		return ""
	}
	return base64.StdEncoding.EncodeToString(b)
}

func (g *DefaultStringGenerator) GenerateAlphanumeric(length int) string {
	letters := []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
	b := make([]rune, length)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}
