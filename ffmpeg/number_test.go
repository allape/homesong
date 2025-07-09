package ffmpeg

import "testing"

func TestNumber_Float64(t *testing.T) {
	n := Number("123.456")

	f1, err := n.Float64()
	if err != nil {
		t.Errorf("Unexpected error: %v", err)
	} else if f1 != 123.456 {
		t.Errorf("Expected 123.456, got %f", f1)
	}

	f2 := n.Float64Or(234.567)
	if f2 != 123.456 {
		t.Errorf("Expected 123.456, got %f", f2)
	}

	n1 := Number("abc")
	_, err = n1.Float64()
	if err == nil {
		t.Error("Expected error for invalid number, got nil")
	}
}

func TestNumber_Int64(t *testing.T) {
	n := Number("123")

	i1, err := n.Int64()
	if err != nil {
		t.Errorf("Unexpected error: %v", err)
	} else if i1 != 123 {
		t.Errorf("Expected 123, got %d", i1)
	}

	i2 := n.Int64Or(456)
	if i2 != 123 {
		t.Errorf("Expected 123, got %d", i2)
	}

	n1 := Number("abc")
	_, err = n1.Int64()
	if err == nil {
		t.Error("Expected error for invalid number, got nil")
	}
}
