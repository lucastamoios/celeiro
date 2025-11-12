package financial

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/catrutech/celeiro/pkg/logging"
	"github.com/catrutech/celeiro/pkg/system"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// =============================================================================
// OFX Data Generator
// =============================================================================

// generateOFXData creates OFX XML with N transactions for performance testing
func generateOFXData(count int) []byte {
	header := `<OFX><BANKTRANLIST>`
	footer := `</BANKTRANLIST></OFX>`

	transactions := ""
	for i := 0; i < count; i++ {
		// Vary transaction types and amounts
		trnType := "DEBIT"
		amount := decimal.NewFromFloat(float64(50 + (i % 200)))

		if i%3 == 0 {
			trnType = "CREDIT"
			amount = amount.Mul(decimal.NewFromFloat(2))
		}

		// Vary merchants for realistic data
		merchants := []string{
			"Supermercado Extra",
			"Posto de Gasolina",
			"Netflix Brasil",
			"Restaurante Italiano",
			"Farmácia Popular",
			"Livraria Cultura",
			"Amazon Brasil",
			"Uber",
			"Spotify Premium",
			"iFood",
		}
		merchant := merchants[i%len(merchants)]

		// Generate transaction date (spread over 30 days)
		day := (i % 30) + 1
		dateStr := fmt.Sprintf("202411%02d000000[-3:BRT]", day)

		transaction := fmt.Sprintf(`
<STMTTRN>
<TRNTYPE>%s</TRNTYPE>
<DTPOSTED>%s</DTPOSTED>
<TRNAMT>%s</TRNAMT>
<FITID>tx-%d-%s</FITID>
<NAME>%s</NAME>
<MEMO>Transaction %d</MEMO>
</STMTTRN>`, trnType, dateStr, amount.String(), i, merchant, merchant, i)

		transactions += transaction
	}

	return []byte(header + transactions + footer)
}

// =============================================================================
// Performance Tests (with timing measurements)
// =============================================================================

func TestBulkImportPerformance_1000Transactions(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{
		Repository: mockRepo,
		system:     system.NewSystem(),
		logger:     &logging.TestLogger{},
		metrics:    nil,
	}
	ctx := context.Background()

	// Setup account verification
	mockRepo.On("FetchAccountByID", ctx, mock.Anything).Return(AccountModel{
		AccountID:      1,
		UserID:         1,
		OrganizationID: 1,
	}, nil)

	// Generate test data
	ofxData := generateOFXData(1000)
	t.Logf("Generated OFX data: %d bytes", len(ofxData))

	// Phase 1: Parsing
	parser := NewOFXParser()
	parseStart := time.Now()
	transactions, err := parser.ParseOFX(ofxData)
	parseTime := time.Since(parseStart)

	assert.NoError(t, err)
	assert.Len(t, transactions, 1000)

	// Phase 2: DB Insert (mocked)
	insertedModels := make([]TransactionModel, 1000)
	for i := 0; i < 1000; i++ {
		insertedModels[i] = TransactionModel{
			TransactionID: i + 1,
			AccountID:     1,
			Description:   fmt.Sprintf("Transaction %d", i),
			Amount:        decimal.NewFromFloat(100.00),
		}
	}

	mockRepo.On("BulkInsertTransactions", ctx, mock.Anything).Return(insertedModels, nil)

	// Mock auto-matching (return empty patterns to skip matching)
	mockRepo.On("FetchTransactionByID", ctx, mock.Anything).Return(TransactionModel{
		TransactionID: 1,
		AccountID:     1,
		CategoryID:    nil, // No category = no matching needed
	}, nil).Maybe()
	mockRepo.On("FetchSavedPatterns", ctx, mock.Anything).Return([]PlannedEntryModel{}, nil).Maybe()

	importStart := time.Now()
	output, err := svc.ImportTransactionsFromOFX(ctx, ImportOFXInput{
		UserID:         1,
		OrganizationID: 1,
		AccountID:      1,
		OFXData:        ofxData,
	})
	totalTime := time.Since(importStart)

	assert.NoError(t, err)
	assert.Equal(t, 1000, output.ImportedCount)

	// Performance metrics
	t.Logf("=== Performance Report: 1000 Transactions ===")
	t.Logf("Parse Time:  %v (%.2f µs/tx)", parseTime, float64(parseTime.Microseconds())/1000.0)
	t.Logf("Total Time:  %v", totalTime)
	t.Logf("Throughput:  %.2f tx/sec", 1000.0/totalTime.Seconds())

	// Performance assertions
	assert.Less(t, parseTime.Milliseconds(), int64(1000), "Parse should be < 1s for 1000 transactions")

	mockRepo.AssertExpectations(t)
}

func TestBulkImportPerformance_5000Transactions(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping 5000 transaction test in short mode")
	}

	mockRepo := new(MockRepository)
	svc := &service{
		Repository: mockRepo,
		system:     system.NewSystem(),
		logger:     &logging.TestLogger{},
		metrics:    nil,
	}
	ctx := context.Background()

	mockRepo.On("FetchAccountByID", ctx, mock.Anything).Return(AccountModel{
		AccountID:      1,
		UserID:         1,
		OrganizationID: 1,
	}, nil)

	// Generate test data
	ofxData := generateOFXData(5000)
	t.Logf("Generated OFX data: %.2f MB", float64(len(ofxData))/(1024*1024))

	// Phase 1: Parsing
	parser := NewOFXParser()
	parseStart := time.Now()
	transactions, err := parser.ParseOFX(ofxData)
	parseTime := time.Since(parseStart)

	assert.NoError(t, err)
	assert.Len(t, transactions, 5000)

	// Phase 2: DB Insert
	insertedModels := make([]TransactionModel, 5000)
	for i := 0; i < 5000; i++ {
		insertedModels[i] = TransactionModel{
			TransactionID: i + 1,
			AccountID:     1,
		}
	}

	mockRepo.On("BulkInsertTransactions", ctx, mock.Anything).Return(insertedModels, nil)
	mockRepo.On("FetchTransactionByID", ctx, mock.Anything).Return(TransactionModel{
		TransactionID: 1,
		CategoryID:    nil,
	}, nil).Maybe()
	mockRepo.On("FetchSavedPatterns", ctx, mock.Anything).Return([]PlannedEntryModel{}, nil).Maybe()

	importStart := time.Now()
	output, err := svc.ImportTransactionsFromOFX(ctx, ImportOFXInput{
		UserID:         1,
		OrganizationID: 1,
		AccountID:      1,
		OFXData:        ofxData,
	})
	totalTime := time.Since(importStart)

	assert.NoError(t, err)
	assert.Equal(t, 5000, output.ImportedCount)

	// Performance metrics
	t.Logf("=== Performance Report: 5000 Transactions ===")
	t.Logf("Parse Time:  %v (%.2f µs/tx)", parseTime, float64(parseTime.Microseconds())/5000.0)
	t.Logf("Total Time:  %v", totalTime)
	t.Logf("Throughput:  %.2f tx/sec", 5000.0/totalTime.Seconds())

	assert.Less(t, parseTime.Milliseconds(), int64(5000), "Parse should be < 5s for 5000 transactions")

	mockRepo.AssertExpectations(t)
}

func TestBulkImportPerformance_10000Transactions(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping 10000 transaction test in short mode")
	}

	mockRepo := new(MockRepository)
	svc := &service{
		Repository: mockRepo,
		system:     system.NewSystem(),
		logger:     &logging.TestLogger{},
		metrics:    nil,
	}
	ctx := context.Background()

	mockRepo.On("FetchAccountByID", ctx, mock.Anything).Return(AccountModel{
		AccountID:      1,
		UserID:         1,
		OrganizationID: 1,
	}, nil)

	// Generate test data
	ofxData := generateOFXData(10000)
	t.Logf("Generated OFX data: %.2f MB", float64(len(ofxData))/(1024*1024))

	// Phase 1: Parsing
	parser := NewOFXParser()
	parseStart := time.Now()
	transactions, err := parser.ParseOFX(ofxData)
	parseTime := time.Since(parseStart)

	assert.NoError(t, err)
	assert.Len(t, transactions, 10000)

	// Phase 2: DB Insert
	insertedModels := make([]TransactionModel, 10000)
	for i := 0; i < 10000; i++ {
		insertedModels[i] = TransactionModel{
			TransactionID: i + 1,
			AccountID:     1,
		}
	}

	mockRepo.On("BulkInsertTransactions", ctx, mock.Anything).Return(insertedModels, nil)
	mockRepo.On("FetchTransactionByID", ctx, mock.Anything).Return(TransactionModel{
		TransactionID: 1,
		CategoryID:    nil,
	}, nil).Maybe()
	mockRepo.On("FetchSavedPatterns", ctx, mock.Anything).Return([]PlannedEntryModel{}, nil).Maybe()

	importStart := time.Now()
	output, err := svc.ImportTransactionsFromOFX(ctx, ImportOFXInput{
		UserID:         1,
		OrganizationID: 1,
		AccountID:      1,
		OFXData:        ofxData,
	})
	totalTime := time.Since(importStart)

	assert.NoError(t, err)
	assert.Equal(t, 10000, output.ImportedCount)

	// Performance metrics
	t.Logf("=== Performance Report: 10000 Transactions ===")
	t.Logf("Parse Time:  %v (%.2f µs/tx)", parseTime, float64(parseTime.Microseconds())/10000.0)
	t.Logf("Total Time:  %v", totalTime)
	t.Logf("Throughput:  %.2f tx/sec", 10000.0/totalTime.Seconds())

	assert.Less(t, parseTime.Milliseconds(), int64(10000), "Parse should be < 10s for 10000 transactions")

	mockRepo.AssertExpectations(t)
}

// Test parsing performance only (no DB operations)
func TestParseOnlyPerformance(t *testing.T) {
	parser := NewOFXParser()

	sizes := []int{100, 500, 1000, 5000, 10000}
	results := make([]struct {
		size       int
		parseTime  time.Duration
		perTx      float64
		throughput float64
	}, len(sizes))

	for i, size := range sizes {
		ofxData := generateOFXData(size)

		start := time.Now()
		transactions, err := parser.ParseOFX(ofxData)
		elapsed := time.Since(start)

		assert.NoError(t, err)
		assert.Len(t, transactions, size)

		results[i].size = size
		results[i].parseTime = elapsed
		results[i].perTx = float64(elapsed.Microseconds()) / float64(size)
		results[i].throughput = float64(size) / elapsed.Seconds()
	}

	// Print results table
	t.Log("=== OFX Parse Performance ===")
	t.Log("Transactions | Parse Time | µs/tx | tx/sec")
	t.Log("-------------|------------|-------|--------")
	for _, r := range results {
		t.Logf("%12d | %10v | %5.2f | %6.0f",
			r.size, r.parseTime, r.perTx, r.throughput)
	}

	// Verify linear scaling (10x data should be < 15x time)
	ratio := float64(results[len(results)-1].parseTime) / float64(results[0].parseTime)
	sizeRatio := float64(sizes[len(sizes)-1]) / float64(sizes[0])
	t.Logf("Scaling factor: %.2fx time for %.0fx data", ratio, sizeRatio)
	assert.Less(t, ratio, sizeRatio*1.5, "Parse time should scale near-linearly")
}

// =============================================================================
// Go Benchmarks
// =============================================================================

func BenchmarkOFXParse_100(b *testing.B) {
	ofxData := generateOFXData(100)
	parser := NewOFXParser()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = parser.ParseOFX(ofxData)
	}
}

func BenchmarkOFXParse_1000(b *testing.B) {
	ofxData := generateOFXData(1000)
	parser := NewOFXParser()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = parser.ParseOFX(ofxData)
	}
}

func BenchmarkOFXParse_5000(b *testing.B) {
	ofxData := generateOFXData(5000)
	parser := NewOFXParser()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = parser.ParseOFX(ofxData)
	}
}

func BenchmarkOFXParse_10000(b *testing.B) {
	ofxData := generateOFXData(10000)
	parser := NewOFXParser()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = parser.ParseOFX(ofxData)
	}
}

// Benchmark data generation
func BenchmarkOFXDataGeneration_1000(b *testing.B) {
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = generateOFXData(1000)
	}
}

// Benchmark conversion to insert params
func BenchmarkOFXConversion_1000(b *testing.B) {
	ofxData := generateOFXData(1000)
	parser := NewOFXParser()
	transactions, _ := parser.ParseOFX(ofxData)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		insertParams := make([]insertTransactionParams, 0, len(transactions))
		for _, tx := range transactions {
			insertParams = append(insertParams, tx.ToInsertParams(1))
		}
	}
}
