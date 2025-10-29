package system

import "time"

type StubSystem struct {
	UUID *StubUUIDGenerator
	Int  *StubIntGenerator
	Time *StubTimeGenerator
}

func NewStubSystem() *StubSystem {
	return &StubSystem{
		UUID: &StubUUIDGenerator{},
		Int:  &StubIntGenerator{},
		Time: &StubTimeGenerator{},
	}
}

func (s *StubSystem) ToSystem() *System {
	return &System{
		UUID: s.UUID,
		Int:  s.Int,
		Time: s.Time,
	}
}

type StubUUIDGenerator struct {
	uuids []string
	index int
}

func NewStubUUIDGenerator(uuids ...string) *StubUUIDGenerator {
	return &StubUUIDGenerator{
		uuids: uuids,
		index: 0,
	}
}

func (s *StubUUIDGenerator) Generate() string {
	if len(s.uuids) == 0 {
		return "stub-uuid"
	}
	if s.index >= len(s.uuids) {
		s.index = 0
	}
	uuid := s.uuids[s.index]
	s.index++
	return uuid
}

func (s *StubUUIDGenerator) SetUUIDs(uuids ...string) {
	s.uuids = uuids
	s.index = 0
}

type StubIntGenerator struct {
	ints  []int
	index int
}

func NewStubIntGenerator(ints ...int) *StubIntGenerator {
	return &StubIntGenerator{
		ints:  ints,
		index: 0,
	}
}

func (s *StubIntGenerator) Generate() int {
	if len(s.ints) == 0 {
		return 42
	}
	if s.index >= len(s.ints) {
		s.index = 0
	}
	result := s.ints[s.index]
	s.index++
	return result
}

func (s *StubIntGenerator) GenerateInRange(min, max int) int {
	return s.Generate()
}

func (s *StubIntGenerator) SetInts(ints ...int) {
	s.ints = ints
	s.index = 0
}

type StubTimeGenerator struct {
	times []time.Time
	index int
}

func NewStubTimeGenerator(times ...time.Time) *StubTimeGenerator {
	return &StubTimeGenerator{
		times: times,
		index: 0,
	}
}

func (s *StubTimeGenerator) Now() time.Time {
	if len(s.times) == 0 {
		return time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC)
	}
	if s.index >= len(s.times) {
		s.index = 0
	}
	result := s.times[s.index]
	s.index++
	return result
}

func (s *StubTimeGenerator) SetTimes(times ...time.Time) {
	s.times = times
	s.index = 0
}
