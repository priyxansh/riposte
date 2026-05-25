package gametypes

import (
	"github.com/gofiber/websocket/v2"
)

type Player struct {
	Conn               *websocket.Conn
	Metadata           *PlayerMetadata `json:"metadata"`
	State              *PlayerState    `json:"state"`
	LastProcessedInput int             // Last input sequence number processed for this player
}

type PlayerMetadata struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type PlayerState struct {
	X                float64 `json:"x"`
	Y                float64 `json:"y"`
	VX               float64 `json:"vx"` // velocity x
	VY               float64 `json:"vy"` // velocity y
	IsGrounded       bool    `json:"isGrounded"`
	FacingDirection  int     `json:"facingDirection"` // 1 = Right, -1 = Left
	IsDashing        bool    `json:"isDashing"`
	IsDownDashing    bool    `json:"isDownDashing"`
	DashTimer        float64 `json:"dashTimer"`
	DashCooldown     float64 `json:"dashCooldown"`
	HasAirDash       bool    `json:"hasAirDash"`
	IsHoldingLeft    bool    `json:"isHoldingLeft"`
	IsHoldingRight   bool    `json:"isHoldingRight"`
	IsBlocking       bool    `json:"isBlocking"`
	IsAttacking      bool    `json:"isAttacking"`
	AttackTimer      float64 `json:"attackTimer"`
	AttackCooldown   float64 `json:"attackCooldown"`
	AttackHitChecked bool    `json:"attackHitChecked"` // true after hit check fires for this swing (prevents multi-hit)
	Posture          float64 `json:"posture"`          // current posture build-up (0=fresh, 100=broken)
	BlockTimer       float64 `json:"blockTimer"`       // time since block was pressed (for parry window detection)
	LastHitResult    string  `json:"lastHitResult"`    // "" | "hit" | "blocked" | "deflected" — reset each tick
	Health           float64 `json:"health"`           // current health points (0=rip)
	IsStaggered      bool    `json:"isStaggered"`      // true when posture breaks — player is stunned
	StaggerTimer     float64 `json:"staggerTimer"`     // countdown timer for stagger stun duration
}

type PlayerSnapshot struct {
	PlayerMetadata
	State *PlayerState `json:"state"`
}
