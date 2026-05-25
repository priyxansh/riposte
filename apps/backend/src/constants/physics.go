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

	// DashSpeed is the horizontal speed during a dash (pixels/s)
	DashSpeed = 600.0

	// DashDuration is how long the dash lasts in seconds
	DashDuration = 0.12

	// DashCooldownTime is the minimum time between dashes in seconds
	DashCooldownTime = 0.5

	// DownDashSpeed is the downward plunge speed (pixels/s)
	DownDashSpeed = 800.0

	// DownDashDuration is the maximum duration of a down-dash before timeout
	DownDashDuration = 0.25

	// BlockSpeedFactor is the movement speed multiplier while blocking (0.3 = 30% speed)
	BlockSpeedFactor = 0.3

	// AttackDuration is the active attack swing duration in seconds
	AttackDuration = 0.2

	// AttackCooldownTime is the minimum time between initiating attacks in seconds
	AttackCooldownTime = 0.4

	// AttackWidth is the horizontal reach of the attack hitbox in pixels
	AttackWidth = 40.0

	// AttackHeight is the vertical height of the attack hitbox in pixels
	AttackHeight = 30.0

	// BodyWidth is the player rectangle width in pixels (must match frontend BODY_W)
	BodyWidth = 40.0

	// BodyHeight is the player rectangle height in pixels (must match frontend BODY_H)
	BodyHeight = 40.0

	// ParryWindow is the time in seconds after pressing block during which a
	// successful hit counts as a perfect deflect instead of a normal block.
	ParryWindow = 0.1

	// MaxPosture is the posture threshold at which a player becomes staggered.
	MaxPosture = 100.0

	// BlockPostureDamage is the posture build-up on the defender from blocking a hit.
	BlockPostureDamage = 15.0

	// HitPostureDamage is the posture build-up on the defender from taking a raw hit.
	HitPostureDamage = 30.0

	// DeflectPostureDamage is the posture damage reflected back to the attacker on a perfect deflect.
	DeflectPostureDamage = 25.0

	// PostureRecoveryRate is the posture decay rate per second when idle (not blocking, not attacking).
	PostureRecoveryRate = 20.0
)
