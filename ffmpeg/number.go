package ffmpeg

import "strconv"

type Number string

func (n Number) Uint64() (uint64, error) {
	return strconv.ParseUint(string(n), 10, 64)
}

func (n Number) Int64() (int64, error) {
	return strconv.ParseInt(string(n), 10, 64)
}

func (n Number) Float64() (float64, error) {
	return strconv.ParseFloat(string(n), 64)
}

func (n Number) Uint64Or(def uint64) uint64 {
	u, err := n.Uint64()
	if err != nil {
		return def
	}
	return u
}

func (n Number) Int64Or(def int64) int64 {
	i, err := n.Int64()
	if err != nil {
		return def
	}
	return i
}

func (n Number) Float64Or(def float64) float64 {
	f, err := n.Float64()
	if err != nil {
		return def
	}
	return f
}
