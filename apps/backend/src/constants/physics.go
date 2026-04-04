package constants

const (
	// Gravity is the downward acceleration applied per second (pixels/s²)
	Gravity = 800.0

	// TerminalVelocity is the maximum falling speed (pixels/s)
	TerminalVelocity = 600.0

	// JumpStrength is the upward velocity applied when jumping (pixels/s)
	JumpStrength = -400.0

	// GroundLevel is the Y coordinate of the ground/floor
	GroundLevel = 500.0

	// DefaultSpeed is the horizontal movement speed (pixels/s)
	DefaultSpeed = 200.0

	// FixedDeltaTime is the exact physics step duration in seconds.
	// Both server and client MUST use this identical value for all
	// physics simulation to prevent floating-point drift.
	FixedDeltaTime = 1.0 / 60.0
)
