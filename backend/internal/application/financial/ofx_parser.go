package financial

import (
	"bufio"
	"bytes"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/shopspring/decimal"
)

type OFXTransaction struct {
	Type        string          // DEBIT or CREDIT
	DatePosted  time.Time       // Transaction date
	Amount      decimal.Decimal // Transaction amount
	FITID       string          // Financial Institution Transaction ID
	Name        string          // Payee/Description
	Memo        string          // Additional memo
}

type OFXParser struct{}

func NewOFXParser() *OFXParser {
	return &OFXParser{}
}

// ParseOFX parses an OFX file and extracts transactions
func (p *OFXParser) ParseOFX(data []byte) ([]OFXTransaction, error) {
	// Convert to string for easier parsing
	content := string(data)

	// Find the <STMTTRN> blocks (statement transactions)
	transactions := []OFXTransaction{}

	// Use regex to find all transaction blocks ((?s) enables multiline mode)
	re := regexp.MustCompile(`(?s)<STMTTRN>(.*?)</STMTTRN>`)
	matches := re.FindAllStringSubmatch(content, -1)

	for _, match := range matches {
		if len(match) < 2 {
			continue
		}

		txBlock := match[1]
		tx, err := p.parseTransaction(txBlock)
		if err != nil {
			// Skip malformed transactions
			continue
		}

		transactions = append(transactions, tx)
	}

	if len(transactions) == 0 {
		return nil, fmt.Errorf("no transactions found in OFX file")
	}

	return transactions, nil
}

func (p *OFXParser) parseTransaction(block string) (OFXTransaction, error) {
	tx := OFXTransaction{}

	scanner := bufio.NewScanner(bytes.NewReader([]byte(block)))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		// Parse different OFX tags
		if strings.HasPrefix(line, "<TRNTYPE>") {
			tx.Type = p.extractValue(line, "TRNTYPE")
		} else if strings.HasPrefix(line, "<DTPOSTED>") {
			dateStr := p.extractValue(line, "DTPOSTED")
			if date, err := p.parseOFXDate(dateStr); err == nil {
				tx.DatePosted = date
			}
		} else if strings.HasPrefix(line, "<TRNAMT>") {
			amountStr := p.extractValue(line, "TRNAMT")
			if amount, err := decimal.NewFromString(amountStr); err == nil {
				tx.Amount = amount
			}
		} else if strings.HasPrefix(line, "<FITID>") {
			tx.FITID = p.extractValue(line, "FITID")
		} else if strings.HasPrefix(line, "<NAME>") {
			tx.Name = p.extractValue(line, "NAME")
		} else if strings.HasPrefix(line, "<MEMO>") {
			tx.Memo = p.extractValue(line, "MEMO")
		}
	}

	// Validate required fields
	if tx.FITID == "" {
		return tx, fmt.Errorf("missing FITID")
	}
	if tx.DatePosted.IsZero() {
		return tx, fmt.Errorf("missing DTPOSTED")
	}
	if tx.Amount.IsZero() {
		return tx, fmt.Errorf("missing TRNAMT")
	}

	// Normalize transaction type
	tx.Type = p.normalizeType(tx.Type, tx.Amount)

	return tx, nil
}

func (p *OFXParser) extractValue(line, tag string) string {
	// Handle format: <TAG>value or <TAG>value</TAG>
	line = strings.TrimSpace(line)

	// Remove opening tag
	line = strings.TrimPrefix(line, "<"+tag+">")

	// Remove closing tag if present
	line = strings.TrimSuffix(line, "</"+tag+">")

	return strings.TrimSpace(line)
}

func (p *OFXParser) parseOFXDate(dateStr string) (time.Time, error) {
	// OFX date format: YYYYMMDD[HHMMSS][.XXX][TZ]
	// Examples: 20231015, 20231015120000, 20231015120000.000[-3:EST]

	// Extract just the date part (first 8 characters)
	if len(dateStr) < 8 {
		return time.Time{}, fmt.Errorf("invalid date length: %s", dateStr)
	}

	datePart := dateStr[:8]

	// Parse as YYYYMMDD
	year, _ := strconv.Atoi(datePart[0:4])
	month, _ := strconv.Atoi(datePart[4:6])
	day, _ := strconv.Atoi(datePart[6:8])

	// If time component exists, parse it
	hour, minute, second := 0, 0, 0
	if len(dateStr) >= 14 {
		hour, _ = strconv.Atoi(dateStr[8:10])
		minute, _ = strconv.Atoi(dateStr[10:12])
		second, _ = strconv.Atoi(dateStr[12:14])
	}

	return time.Date(year, time.Month(month), day, hour, minute, second, 0, time.UTC), nil
}

func (p *OFXParser) normalizeType(trnType string, amount decimal.Decimal) string {
	// OFX transaction types: DEBIT, CREDIT, INT, DIV, FEE, SRVCHG, DEP, ATM, POS, XFER, CHECK, PAYMENT, CASH, DIRECTDEP, DIRECTDEBIT, REPEATPMT, OTHER
	trnType = strings.ToUpper(trnType)

	switch trnType {
	case "DEBIT", "FEE", "SRVCHG", "ATM", "POS", "CHECK", "PAYMENT", "DIRECTDEBIT", "REPEATPMT":
		return TransactionTypeDebit
	case "CREDIT", "INT", "DIV", "DEP", "CASH", "DIRECTDEP", "XFER":
		return TransactionTypeCredit
	default:
		// Fall back to amount sign
		if amount.LessThan(decimal.Zero) {
			return TransactionTypeDebit
		}
		return TransactionTypeCredit
	}
}

// ToInsertParams converts OFX transaction to repository insert params
func (tx *OFXTransaction) ToInsertParams(accountID int) insertTransactionParams {
	description := tx.Name
	if tx.Memo != "" && tx.Memo != tx.Name {
		description = fmt.Sprintf("%s - %s", tx.Name, tx.Memo)
	}

	// Ensure amount is absolute value
	amount := tx.Amount.Abs()

	// Format date as RFC3339 for parsing
	dateStr := tx.DatePosted.Format(time.RFC3339)

	return insertTransactionParams{
		AccountID:       accountID,
		Description:     description,
		Amount:          amount,
		TransactionType: tx.Type,
		TransactionDate: dateStr,
		OFXFitID:        &tx.FITID,
		OFXMemo:         &tx.Memo,
	}
}
