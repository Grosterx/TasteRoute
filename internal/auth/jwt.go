package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const issuer = "tasteroute"

var ErrInvalidToken = errors.New("invalid token")

type Claims struct {
	ParticipantID string `json:"participant_id"`
	RoomCode      string `json:"room_code"`
	jwt.RegisteredClaims
}

type RestaurantClaims struct {
	AccountID    string `json:"account_id"`
	RestaurantID string `json:"restaurant_id"`
	Role         string `json:"role"`
	TokenVersion int    `json:"token_version"`
	jwt.RegisteredClaims
}

func Issue(secret, participantID, roomCode string) (string, error) {
	now := time.Now()
	claims := Claims{
		ParticipantID: participantID,
		RoomCode:      roomCode,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    issuer,
			Subject:   participantID,
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now.Add(-time.Minute)),
			ExpiresAt: jwt.NewNumericDate(now.Add(24 * time.Hour)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", fmt.Errorf("sign token: %w", err)
	}
	return signed, nil
}

func Parse(secret, raw string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(raw, claims, func(token *jwt.Token) (any, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("%w: unexpected signing method", ErrInvalidToken)
		}
		return []byte(secret), nil
	}, jwt.WithIssuer(issuer), jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	if err != nil || !token.Valid {
		return nil, fmt.Errorf("%w: %v", ErrInvalidToken, err)
	}
	if claims.ParticipantID == "" || claims.RoomCode == "" {
		return nil, fmt.Errorf("%w: missing claims", ErrInvalidToken)
	}
	return claims, nil
}

func IssueRestaurant(secret, accountID, restaurantID, role string, tokenVersion int) (string, error) {
	now := time.Now()
	claims := RestaurantClaims{
		AccountID:    accountID,
		RestaurantID: restaurantID,
		Role:         role,
		TokenVersion: tokenVersion,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    issuer,
			Subject:   accountID,
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now.Add(-time.Minute)),
			ExpiresAt: jwt.NewNumericDate(now.Add(24 * time.Hour)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", fmt.Errorf("sign restaurant token: %w", err)
	}
	return signed, nil
}

func ParseRestaurant(secret, raw string) (*RestaurantClaims, error) {
	claims := &RestaurantClaims{}
	token, err := jwt.ParseWithClaims(raw, claims, func(token *jwt.Token) (any, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("%w: unexpected signing method", ErrInvalidToken)
		}
		return []byte(secret), nil
	}, jwt.WithIssuer(issuer), jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	if err != nil || !token.Valid {
		return nil, fmt.Errorf("%w: %v", ErrInvalidToken, err)
	}
	if claims.AccountID == "" || claims.RestaurantID == "" {
		return nil, fmt.Errorf("%w: missing claims", ErrInvalidToken)
	}
	return claims, nil
}
