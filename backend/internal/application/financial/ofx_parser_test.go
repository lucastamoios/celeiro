package financial

import (
	"testing"
	"time"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/suite"
)

type OFXParserTestSuite struct {
	suite.Suite
	parser *OFXParser
}

func TestOFXParserTestSuite(t *testing.T) {
	suite.Run(t, new(OFXParserTestSuite))
}

func (s *OFXParserTestSuite) SetupTest() {
	s.parser = NewOFXParser()
}

// Test ParseOFX with valid multiline OFX data (the critical bug we fixed)
func (s *OFXParserTestSuite) TestParseOFX_ValidMultilineTransaction() {
	ofxData := `
<OFX>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>CREDIT</TRNTYPE>
<DTPOSTED>20251001000000[-3:BRT]</DTPOSTED>
<TRNAMT>1.07</TRNAMT>
<FITID>68dd1c6e-2fe4-48c0-9ec4-f14ad281d6ed</FITID>
<MEMO>Transferência de saldo NuInvest</MEMO>
</STMTTRN>
</BANKTRANLIST>
</OFX>
`
	transactions, err := s.parser.ParseOFX([]byte(ofxData))

	s.Require().NoError(err)
	s.Require().Len(transactions, 1)

	tx := transactions[0]
	s.Equal("68dd1c6e-2fe4-48c0-9ec4-f14ad281d6ed", tx.FITID)
	s.Equal("credit", tx.Type)
	s.Equal("Transferência de saldo NuInvest", tx.Memo)
	s.True(tx.Amount.Equal(decimal.NewFromFloat(1.07)))
}

// Test ParseOFX with multiple transactions
func (s *OFXParserTestSuite) TestParseOFX_MultipleTransactions() {
	ofxData := `
<OFX>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT</TRNTYPE>
<DTPOSTED>20251002000000[-3:BRT]</DTPOSTED>
<TRNAMT>-68.20</TRNAMT>
<FITID>tx-001</FITID>
<NAME>Supermercado</NAME>
<MEMO>Compra no cartão</MEMO>
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT</TRNTYPE>
<DTPOSTED>20251003000000[-3:BRT]</DTPOSTED>
<TRNAMT>100.00</TRNAMT>
<FITID>tx-002</FITID>
<NAME>PIX Recebido</NAME>
</STMTTRN>
</BANKTRANLIST>
</OFX>
`
	transactions, err := s.parser.ParseOFX([]byte(ofxData))

	s.Require().NoError(err)
	s.Require().Len(transactions, 2)

	// First transaction
	s.Equal("tx-001", transactions[0].FITID)
	s.Equal("debit", transactions[0].Type)
	s.Equal("Supermercado", transactions[0].Name)
	s.Equal("Compra no cartão", transactions[0].Memo)

	// Second transaction
	s.Equal("tx-002", transactions[1].FITID)
	s.Equal("credit", transactions[1].Type)
	s.Equal("PIX Recebido", transactions[1].Name)
}

// Test ParseOFX with empty OFX file
func (s *OFXParserTestSuite) TestParseOFX_EmptyFile() {
	ofxData := `<OFX><BANKTRANLIST></BANKTRANLIST></OFX>`

	transactions, err := s.parser.ParseOFX([]byte(ofxData))

	s.Require().Error(err)
	s.Require().Nil(transactions)
	s.Contains(err.Error(), "no transactions found")
}

// Test ParseOFX with no STMTTRN blocks
func (s *OFXParserTestSuite) TestParseOFX_NoTransactions() {
	ofxData := `
<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0</CODE>
<SEVERITY>INFO</SEVERITY>
</STATUS>
</SONRS>
</SIGNONMSGSRSV1>
</OFX>
`
	transactions, err := s.parser.ParseOFX([]byte(ofxData))

	s.Require().Error(err)
	s.Require().Nil(transactions)
	s.Contains(err.Error(), "no transactions found")
}

// Test parseTransaction with all required fields
func (s *OFXParserTestSuite) TestParseTransaction_ValidTransaction() {
	block := `
<TRNTYPE>DEBIT</TRNTYPE>
<DTPOSTED>20251015120000</DTPOSTED>
<TRNAMT>-50.00</TRNAMT>
<FITID>unique-id-123</FITID>
<NAME>Restaurant</NAME>
<MEMO>Lunch</MEMO>
`
	tx, err := s.parser.parseTransaction(block)

	s.Require().NoError(err)
	s.Equal("unique-id-123", tx.FITID)
	s.Equal("debit", tx.Type)
	s.Equal("Restaurant", tx.Name)
	s.Equal("Lunch", tx.Memo)
	s.True(tx.Amount.Equal(decimal.NewFromFloat(-50.00)))
	s.Equal(2025, tx.DatePosted.Year())
	s.Equal(time.Month(10), tx.DatePosted.Month())
	s.Equal(15, tx.DatePosted.Day())
}

// Test parseTransaction with missing FITID
func (s *OFXParserTestSuite) TestParseTransaction_MissingFITID() {
	block := `
<TRNTYPE>DEBIT</TRNTYPE>
<DTPOSTED>20251015120000</DTPOSTED>
<TRNAMT>-50.00</TRNAMT>
<NAME>Restaurant</NAME>
`
	tx, err := s.parser.parseTransaction(block)

	s.Require().Error(err)
	s.Contains(err.Error(), "missing FITID")
	s.Equal("", tx.FITID)
}

// Test parseTransaction with missing DTPOSTED
func (s *OFXParserTestSuite) TestParseTransaction_MissingDatePosted() {
	block := `
<TRNTYPE>DEBIT</TRNTYPE>
<TRNAMT>-50.00</TRNAMT>
<FITID>unique-id-123</FITID>
<NAME>Restaurant</NAME>
`
	_, err := s.parser.parseTransaction(block)

	s.Require().Error(err)
	s.Contains(err.Error(), "missing DTPOSTED")
}

// Test parseTransaction with missing TRNAMT
func (s *OFXParserTestSuite) TestParseTransaction_MissingAmount() {
	block := `
<TRNTYPE>DEBIT</TRNTYPE>
<DTPOSTED>20251015120000</DTPOSTED>
<FITID>unique-id-123</FITID>
<NAME>Restaurant</NAME>
`
	_, err := s.parser.parseTransaction(block)

	s.Require().Error(err)
	s.Contains(err.Error(), "missing TRNAMT")
}

// Test extractValue with both tag formats
func (s *OFXParserTestSuite) TestExtractValue_WithClosingTag() {
	line := "<NAME>Test Name</NAME>"
	value := s.parser.extractValue(line, "NAME")
	s.Equal("Test Name", value)
}

func (s *OFXParserTestSuite) TestExtractValue_WithoutClosingTag() {
	line := "<NAME>Test Name"
	value := s.parser.extractValue(line, "NAME")
	s.Equal("Test Name", value)
}

func (s *OFXParserTestSuite) TestExtractValue_WithWhitespace() {
	line := "  <NAME>  Test Name  </NAME>  "
	value := s.parser.extractValue(line, "NAME")
	s.Equal("Test Name", value)
}

func (s *OFXParserTestSuite) TestExtractValue_EmptyValue() {
	line := "<NAME></NAME>"
	value := s.parser.extractValue(line, "NAME")
	s.Equal("", value)
}

// Test parseOFXDate with various formats
func (s *OFXParserTestSuite) TestParseOFXDate_DateOnly() {
	date, err := s.parser.parseOFXDate("20251015")

	s.Require().NoError(err)
	s.Equal(2025, date.Year())
	s.Equal(time.Month(10), date.Month())
	s.Equal(15, date.Day())
	s.Equal(0, date.Hour())
	s.Equal(0, date.Minute())
	s.Equal(0, date.Second())
}

func (s *OFXParserTestSuite) TestParseOFXDate_DateAndTime() {
	date, err := s.parser.parseOFXDate("20251015143025")

	s.Require().NoError(err)
	s.Equal(2025, date.Year())
	s.Equal(time.Month(10), date.Month())
	s.Equal(15, date.Day())
	s.Equal(14, date.Hour())
	s.Equal(30, date.Minute())
	s.Equal(25, date.Second())
}

func (s *OFXParserTestSuite) TestParseOFXDate_WithTimezone() {
	// OFX format with timezone: YYYYMMDDHHMMSS.XXX[-3:BRT]
	date, err := s.parser.parseOFXDate("20251015143025.000[-3:BRT]")

	s.Require().NoError(err)
	s.Equal(2025, date.Year())
	s.Equal(time.Month(10), date.Month())
	s.Equal(15, date.Day())
	s.Equal(14, date.Hour())
}

func (s *OFXParserTestSuite) TestParseOFXDate_TooShort() {
	date, err := s.parser.parseOFXDate("2025")

	s.Require().Error(err)
	s.Contains(err.Error(), "invalid date length")
	s.True(date.IsZero())
}

// Test normalizeType with various OFX transaction types
func (s *OFXParserTestSuite) TestNormalizeType_DebitTypes() {
	testCases := []struct {
		trnType string
		amount  decimal.Decimal
		want    string
	}{
		{"DEBIT", decimal.NewFromFloat(-50), TransactionTypeDebit},
		{"FEE", decimal.NewFromFloat(-10), TransactionTypeDebit},
		{"SRVCHG", decimal.NewFromFloat(-5), TransactionTypeDebit},
		{"ATM", decimal.NewFromFloat(-100), TransactionTypeDebit},
		{"POS", decimal.NewFromFloat(-75), TransactionTypeDebit},
		{"CHECK", decimal.NewFromFloat(-200), TransactionTypeDebit},
		{"PAYMENT", decimal.NewFromFloat(-300), TransactionTypeDebit},
		{"DIRECTDEBIT", decimal.NewFromFloat(-150), TransactionTypeDebit},
		{"REPEATPMT", decimal.NewFromFloat(-50), TransactionTypeDebit},
	}

	for _, tc := range testCases {
		s.Run(tc.trnType, func() {
			result := s.parser.normalizeType(tc.trnType, tc.amount)
			s.Equal(tc.want, result)
		})
	}
}

func (s *OFXParserTestSuite) TestNormalizeType_CreditTypes() {
	testCases := []struct {
		trnType string
		amount  decimal.Decimal
		want    string
	}{
		{"CREDIT", decimal.NewFromFloat(100), TransactionTypeCredit},
		{"INT", decimal.NewFromFloat(5), TransactionTypeCredit},
		{"DIV", decimal.NewFromFloat(50), TransactionTypeCredit},
		{"DEP", decimal.NewFromFloat(1000), TransactionTypeCredit},
		{"CASH", decimal.NewFromFloat(200), TransactionTypeCredit},
		{"DIRECTDEP", decimal.NewFromFloat(3000), TransactionTypeCredit},
		{"XFER", decimal.NewFromFloat(500), TransactionTypeCredit},
	}

	for _, tc := range testCases {
		s.Run(tc.trnType, func() {
			result := s.parser.normalizeType(tc.trnType, tc.amount)
			s.Equal(tc.want, result)
		})
	}
}

func (s *OFXParserTestSuite) TestNormalizeType_UnknownTypeFallbackToAmount() {
	// Negative amount should be debit
	result := s.parser.normalizeType("UNKNOWN", decimal.NewFromFloat(-100))
	s.Equal(TransactionTypeDebit, result)

	// Positive amount should be credit
	result = s.parser.normalizeType("UNKNOWN", decimal.NewFromFloat(100))
	s.Equal(TransactionTypeCredit, result)

	// Zero amount should be credit (default)
	result = s.parser.normalizeType("UNKNOWN", decimal.Zero)
	s.Equal(TransactionTypeCredit, result)
}

func (s *OFXParserTestSuite) TestNormalizeType_CaseInsensitive() {
	// Lowercase
	result := s.parser.normalizeType("debit", decimal.NewFromFloat(-50))
	s.Equal(TransactionTypeDebit, result)

	// Mixed case
	result = s.parser.normalizeType("CrEdIt", decimal.NewFromFloat(50))
	s.Equal(TransactionTypeCredit, result)
}

// Test ToInsertParams conversion
func (s *OFXParserTestSuite) TestToInsertParams_WithNameAndMemo() {
	tx := &OFXTransaction{
		Type:       TransactionTypeDebit,
		DatePosted: time.Date(2025, 10, 15, 14, 30, 0, 0, time.UTC),
		Amount:     decimal.NewFromFloat(-50.75),
		FITID:      "tx-123",
		Name:       "Supermercado",
		Memo:       "Compra no cartão",
	}

	params := tx.ToInsertParams(42)

	s.Equal(42, params.AccountID)
	s.Equal("Supermercado - Compra no cartão", params.Description)
	s.True(params.Amount.Equal(decimal.NewFromFloat(50.75))) // Should be absolute value
	s.Equal(TransactionTypeDebit, params.TransactionType)
	s.Equal("tx-123", *params.OFXFitID)
	s.Equal("Compra no cartão", *params.OFXMemo)
}

func (s *OFXParserTestSuite) TestToInsertParams_WithNameOnly() {
	tx := &OFXTransaction{
		Type:       TransactionTypeCredit,
		DatePosted: time.Date(2025, 10, 15, 14, 30, 0, 0, time.UTC),
		Amount:     decimal.NewFromFloat(100.00),
		FITID:      "tx-456",
		Name:       "PIX Recebido",
		Memo:       "",
	}

	params := tx.ToInsertParams(42)

	s.Equal("PIX Recebido", params.Description)
	s.True(params.Amount.Equal(decimal.NewFromFloat(100.00)))
}

func (s *OFXParserTestSuite) TestToInsertParams_SameMemoAndName() {
	tx := &OFXTransaction{
		Type:       TransactionTypeDebit,
		DatePosted: time.Date(2025, 10, 15, 14, 30, 0, 0, time.UTC),
		Amount:     decimal.NewFromFloat(-25.00),
		FITID:      "tx-789",
		Name:       "Uber",
		Memo:       "Uber", // Same as Name
	}

	params := tx.ToInsertParams(42)

	// Should not duplicate when memo and name are the same
	s.Equal("Uber", params.Description)
}

func (s *OFXParserTestSuite) TestToInsertParams_AbsoluteValue() {
	// Negative amount should become positive
	tx := &OFXTransaction{
		Type:       TransactionTypeDebit,
		DatePosted: time.Date(2025, 10, 15, 14, 30, 0, 0, time.UTC),
		Amount:     decimal.NewFromFloat(-75.50),
		FITID:      "tx-negative",
		Name:       "Test",
	}

	params := tx.ToInsertParams(1)
	s.True(params.Amount.Equal(decimal.NewFromFloat(75.50)))

	// Positive amount should stay positive
	tx.Amount = decimal.NewFromFloat(75.50)
	params = tx.ToInsertParams(1)
	s.True(params.Amount.Equal(decimal.NewFromFloat(75.50)))
}

// Test real-world Nubank OFX sample (from our actual test file)
func (s *OFXParserTestSuite) TestParseOFX_RealNubankSample() {
	ofxData := `
<OFX>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>CREDIT</TRNTYPE>
<DTPOSTED>20251001000000[-3:BRT]</DTPOSTED>
<TRNAMT>1.07</TRNAMT>
<FITID>68dd1c6e-2fe4-48c0-9ec4-f14ad281d6ed</FITID>
<MEMO>Transferência de saldo NuInvest</MEMO>
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT</TRNTYPE>
<DTPOSTED>20251002000000[-3:BRT]</DTPOSTED>
<TRNAMT>-68.20</TRNAMT>
<FITID>68df3a9c-c0e5-44f2-90e6-a3cdd97d23c6</FITID>
<MEMO>Transferência enviada pelo Pix - MARIA DA SILVA - CPF •••.123.456-•• - Conta 12345678-9</MEMO>
</STMTTRN>
</BANKTRANLIST>
</OFX>
`
	transactions, err := s.parser.ParseOFX([]byte(ofxData))

	s.Require().NoError(err)
	s.Require().Len(transactions, 2)

	// Verify first transaction (credit)
	tx1 := transactions[0]
	s.Equal("68dd1c6e-2fe4-48c0-9ec4-f14ad281d6ed", tx1.FITID)
	s.Equal("credit", tx1.Type)
	s.True(tx1.Amount.Equal(decimal.NewFromFloat(1.07)))
	s.Equal("Transferência de saldo NuInvest", tx1.Memo)

	// Verify second transaction (debit)
	tx2 := transactions[1]
	s.Equal("68df3a9c-c0e5-44f2-90e6-a3cdd97d23c6", tx2.FITID)
	s.Equal("debit", tx2.Type)
	s.True(tx2.Amount.Equal(decimal.NewFromFloat(-68.20)))
	s.Contains(tx2.Memo, "Transferência enviada pelo Pix")
}
