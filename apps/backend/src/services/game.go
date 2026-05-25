package services

import (
	"log"
	"time"

	"riposte-backend/src/constants"
	"riposte-backend/src/events"
	"riposte-backend/src/types/errors"
	eventpayloads "riposte-backend/src/types/event_payloads"
	gametypes "riposte-backend/src/types/game_types"
)

func StartGameLoop(roomID string) error {
	mu.Lock()
	room, exists := rooms[roomID]
	mu.Unlock()

	if !exists {
		log.Printf("StartGameLoop: room %s not found\n", roomID)
		return errors.NewGameError(errors.ErrRoomNotFound, "room not found")
	}

	maxPlayers := 2
	if room.Mode == "2v2" {
		maxPlayers = 4
	}

	// Check if room has enough players to start
	if len(room.Players) < maxPlayers {
		log.Printf("StartGameLoop: not enough players in room %s for %s\n", roomID, room.Mode)
		return errors.NewGameError(errors.ErrNotEnoughPlayers, "not enough players to start")
	}

	// Assign initial states to players before starting the game loop
	AssignInitialStates(room)

	ticker := time.NewTicker(16 * time.Millisecond) // ~60Hz

	go func() {
		defer ticker.Stop()
		log.Printf("Game loop started for room %s", roomID)

		// Preallocate the player states slice once
		states := make([]*gametypes.PlayerSnapshot, 0, maxPlayers)

		previousTime := time.Now()
		var accumulator float64 // seconds of unprocessed physics time

		for range ticker.C {
			mu.Lock()
			_, exists := rooms[roomID]
			mu.Unlock()
			if !exists {
				log.Printf("Game loop for room %s stopping: room deleted", roomID)
				return
			}

			currentTime := time.Now()
			frameTime := currentTime.Sub(previousTime).Seconds()
			previousTime = currentTime

			// Cap frameTime to prevent a "spiral of death" if the server
			// stalls for a long time. Without this cap,
			// the accumulator would try to run hundreds of physics steps
			// to catch up, making the stall even worse.
			if frameTime > 0.1 { // max 100ms (6 steps)
				frameTime = 0.1
			}

			accumulator += frameTime

			// Reset slice length, keep capacity
			states = states[:0]
			lastProcessedInput := make(map[string]int)

			room.DoLocked(func() {
				// Run physics in exact FixedDeltaTime steps
				for accumulator >= constants.FixedDeltaTime {
					for _, player := range room.Players {
						if player.Conn == nil || player.State == nil {
							continue
						}

						s := player.State

						// --- Dash cooldown ---
						if s.DashCooldown > 0 {
							s.DashCooldown -= constants.FixedDeltaTime
							if s.DashCooldown < 0 {
								s.DashCooldown = 0
							}
						}

						// --- Attack cooldown ---
						if s.AttackCooldown > 0 {
							s.AttackCooldown -= constants.FixedDeltaTime
							if s.AttackCooldown < 0 {
								s.AttackCooldown = 0
							}
						}

						// --- Attack timer ---
						if s.IsAttacking {
							s.AttackTimer -= constants.FixedDeltaTime
							if s.AttackTimer <= 0 {
								s.IsAttacking = false
								s.AttackTimer = 0
								// Restore velocity based on held keys
								speed := float64(constants.DefaultSpeed)
								if s.IsBlocking {
									speed *= constants.BlockSpeedFactor
								}
								if s.IsHoldingLeft && !s.IsHoldingRight {
									s.VX = -speed
								} else if s.IsHoldingRight && !s.IsHoldingLeft {
									s.VX = speed
								} else {
									s.VX = 0
								}
							}
						}

						// --- Block timer (parry window) ---
						if s.IsBlocking {
							s.BlockTimer += constants.FixedDeltaTime
						}

						// --- Posture recovery ---
						if !s.IsBlocking && !s.IsAttacking && s.Posture > 0 {
							s.Posture -= constants.PostureRecoveryRate * constants.FixedDeltaTime
							if s.Posture < 0 {
								s.Posture = 0
							}
						}

						// --- Dash physics ---
						if s.IsDashing {
							// Horizontal dash: force velocity, skip gravity
							s.VX = float64(s.FacingDirection) * constants.DashSpeed
							s.VY = 0
							s.DashTimer -= constants.FixedDeltaTime
							if s.DashTimer <= 0 {
								s.IsDashing = false
								s.DashTimer = 0
								speed := float64(constants.DefaultSpeed)
								if s.IsBlocking {
									speed *= constants.BlockSpeedFactor
								}
								if s.IsHoldingLeft && !s.IsHoldingRight {
									s.VX = -speed
								} else if s.IsHoldingRight && !s.IsHoldingLeft {
									s.VX = speed
								} else {
									s.VX = 0
								}
							}
						} else if s.IsDownDashing {
							// Downward plunge: force velocity, skip gravity
							s.VX = 0
							s.VY = constants.DownDashSpeed
							s.DashTimer -= constants.FixedDeltaTime
							if s.DashTimer <= 0 {
								s.IsDownDashing = false
								s.DashTimer = 0
								s.VY = 0
								speed := float64(constants.DefaultSpeed)
								if s.IsBlocking {
									speed *= constants.BlockSpeedFactor
								}
								if s.IsHoldingLeft && !s.IsHoldingRight {
									s.VX = -speed
								} else if s.IsHoldingRight && !s.IsHoldingLeft {
									s.VX = speed
								} else {
									s.VX = 0
								}
							}
						} else {
							// Normal physics: apply gravity
							s.VY += constants.Gravity * constants.FixedDeltaTime

							// Enforce terminal velocity
							if s.VY > constants.TerminalVelocity {
								s.VY = constants.TerminalVelocity
							}
						}

						// --- Attack movement lock ---
						if s.IsAttacking {
							s.VX = 0
						}

						// Update position
						s.X += s.VX * constants.FixedDeltaTime
						s.Y += s.VY * constants.FixedDeltaTime

						// Ground collision detection
						if s.Y >= constants.GroundLevel {
							s.Y = constants.GroundLevel
							s.VY = 0
							s.IsGrounded = true

							// End down-dash on landing
							if s.IsDownDashing {
								s.IsDownDashing = false
								s.DashTimer = 0
								speed := float64(constants.DefaultSpeed)
								if s.IsBlocking {
									speed *= constants.BlockSpeedFactor
								}
								if s.IsHoldingLeft && !s.IsHoldingRight {
									s.VX = -speed
								} else if s.IsHoldingRight && !s.IsHoldingLeft {
									s.VX = speed
								} else {
									s.VX = 0
								}
							}

							// Reset air dash on landing
							s.HasAirDash = true
						} else {
							s.IsGrounded = false
						}
					}

					accumulator -= constants.FixedDeltaTime
				}

				// --- Server-only hit resolution pass ---
				// Runs after all players' physics are fully updated for this tick.
				// Checks attacker hitboxes against all other players' body boxes.
				for _, attacker := range room.Players {
					if attacker.Conn == nil || attacker.State == nil {
						continue
					}
					a := attacker.State

					// Reset hit result every tick so stale results don't persist
					a.LastHitResult = ""

					// Only check if actively attacking and not yet checked this swing
					if !a.IsAttacking || a.AttackHitChecked {
						continue
					}
					a.AttackHitChecked = true

					// Compute attacker hitbox (matches frontend PlayerEntity.ts visual exactly)
					// hitboxCenterX = X + facing * (BodyWidth/2 + AttackWidth/2)
					hitboxCenterX := a.X + float64(a.FacingDirection)*(constants.BodyWidth/2+constants.AttackWidth/2)
					hitboxCenterY := a.Y - constants.BodyHeight/2

					attackerLeft := hitboxCenterX - constants.AttackWidth/2
					attackerRight := hitboxCenterX + constants.AttackWidth/2
					attackerTop := hitboxCenterY - constants.AttackHeight/2
					attackerBottom := hitboxCenterY + constants.AttackHeight/2

					for _, defender := range room.Players {
						if defender.Metadata.ID == attacker.Metadata.ID {
							continue // skip self
						}
						if defender.Conn == nil || defender.State == nil {
							continue
						}
						d := defender.State

						// Compute defender body box (origin = bottom-center)
						defenderLeft := d.X - constants.BodyWidth/2
						defenderRight := d.X + constants.BodyWidth/2
						defenderTop := d.Y - constants.BodyHeight
						defenderBottom := d.Y

						// AABB overlap check
						if attackerRight <= defenderLeft || attackerLeft >= defenderRight ||
							attackerBottom <= defenderTop || attackerTop >= defenderBottom {
							continue // no overlap
						}

						// Hit landed — evaluate defender's state
						// Block-during-dash guard: dashing players are vulnerable even if IsBlocking=true
						isDefenderBlocking := d.IsBlocking && !d.IsDashing && !d.IsDownDashing

						if isDefenderBlocking && d.BlockTimer <= constants.ParryWindow {
							// Perfect deflect — punish the attacker's posture
							a.Posture += constants.DeflectPostureDamage
							if a.Posture > constants.MaxPosture {
								a.Posture = constants.MaxPosture
							}
							a.LastHitResult = "deflected"
							d.LastHitResult = "deflected"
						} else if isDefenderBlocking {
							// Normal block — defender absorbs posture damage
							d.Posture += constants.BlockPostureDamage
							if d.Posture > constants.MaxPosture {
								d.Posture = constants.MaxPosture
							}
							a.LastHitResult = "blocked"
							d.LastHitResult = "blocked"
						} else {
							// Raw hit — defender takes posture damage (HP added in Step 4)
							d.Posture += constants.HitPostureDamage
							if d.Posture > constants.MaxPosture {
								d.Posture = constants.MaxPosture
							}
							a.LastHitResult = "hit"
							d.LastHitResult = "hit"
						}
					}
				}

				// After all physics steps, snapshot every player's state for broadcast
				for _, player := range room.Players {
					if player.Conn == nil || player.State == nil {
						continue
					}

					states = append(states, &gametypes.PlayerSnapshot{
						PlayerMetadata: *player.Metadata,
						State:          player.State,
					})

					lastProcessedInput[player.Metadata.ID] = player.LastProcessedInput
				}
			})

			payload := &eventpayloads.GameLoopResponse{
				RoomID:             roomID,
				PlayerStates:       states,
				LastProcessedInput: lastProcessedInput,
			}

			if err := BroadcastToRoom(roomID, events.GameLoop, payload); err != nil {
				log.Printf("BroadcastToRoom error: %v", err)
			}
		}
	}()

	return nil
}

func AssignInitialStates(room *gametypes.Room) {
	var initialStates []*gametypes.PlayerState

	switch room.Mode {
	case "1v1":
		initialStates = constants.NewInitialStates1v1()
	case "2v2":
		initialStates = constants.NewInitialStates2v2()
	}

	for i, player := range room.Players {
		if i < len(initialStates) {
			player.State = initialStates[i]
		} else {
			player.State = &gametypes.PlayerState{X: 0, Y: 0, VX: 0, VY: 0, FacingDirection: 1, HasAirDash: true}
		}
	}
}

func MovePlayer(roomID string, payload eventpayloads.MovePlayerPayload) error {
	mu.Lock()
	room, exists := rooms[roomID]
	mu.Unlock()

	if !exists {
		return errors.NewGameError(errors.ErrRoomNotFound, "room not found")
	}

	room.DoLocked(func() {
		for _, player := range room.Players {
			if player.Metadata.ID != payload.PlayerID {
				continue
			}

			// Track the sequence number of this input
			player.LastProcessedInput = payload.SequenceNumber

			s := player.State

			switch payload.Direction {
			case "left":
				if payload.KeyState == "pressed" {
					s.IsHoldingLeft = true
					s.FacingDirection = -1
					if !s.IsDashing && !s.IsDownDashing {
						speed := float64(constants.DefaultSpeed)
						if s.IsBlocking {
							speed *= constants.BlockSpeedFactor
						}
						s.VX = -speed
					}
				} else {
					s.IsHoldingLeft = false
					if !s.IsDashing && !s.IsDownDashing {
						if s.IsHoldingRight {
							speed := float64(constants.DefaultSpeed)
							if s.IsBlocking {
								speed *= constants.BlockSpeedFactor
							}
							s.VX = speed
							s.FacingDirection = 1
						} else {
							s.VX = 0
						}
					}
				}
			case "right":
				if payload.KeyState == "pressed" {
					s.IsHoldingRight = true
					s.FacingDirection = 1
					if !s.IsDashing && !s.IsDownDashing {
						speed := float64(constants.DefaultSpeed)
						if s.IsBlocking {
							speed *= constants.BlockSpeedFactor
						}
						s.VX = speed
					}
				} else {
					s.IsHoldingRight = false
					if !s.IsDashing && !s.IsDownDashing {
						if s.IsHoldingLeft {
							speed := float64(constants.DefaultSpeed)
							if s.IsBlocking {
								speed *= constants.BlockSpeedFactor
							}
							s.VX = -speed
							s.FacingDirection = -1
						} else {
							s.VX = 0
						}
					}
				}
			case "jump":
				if payload.KeyState == "pressed" {
					// Only allow jump if player is grounded and not dashing/attacking
					if s.IsGrounded && !s.IsDashing && !s.IsDownDashing && !s.IsAttacking {
						s.VY = constants.JumpStrength
					}
				} else if payload.KeyState == "released" {
					// Variable jump: Cut velocity if still rising (and not dashing)
					if s.VY < 0 && !s.IsDashing {
						s.VY *= 0.5
					}
				}
			case "dash":
				if payload.KeyState == "pressed" && !s.IsDashing && !s.IsDownDashing && !s.IsBlocking && !s.IsAttacking && s.DashCooldown <= 0 {
					if s.IsGrounded || s.HasAirDash {
						s.IsDashing = true
						s.DashTimer = constants.DashDuration
						s.DashCooldown = constants.DashCooldownTime
						s.VX = float64(s.FacingDirection) * constants.DashSpeed
						s.VY = 0
						if !s.IsGrounded {
							s.HasAirDash = false
						}
					}
				}
			case "downdash":
				if payload.KeyState == "pressed" && !s.IsGrounded && !s.IsDashing && !s.IsDownDashing && !s.IsBlocking && !s.IsAttacking && s.DashCooldown <= 0 {
					s.IsDownDashing = true
					s.DashTimer = constants.DownDashDuration
					s.DashCooldown = constants.DashCooldownTime
					s.VX = 0
					s.VY = constants.DownDashSpeed
					s.HasAirDash = false
				}
			case "attack":
				if payload.KeyState == "pressed" && !s.IsAttacking && !s.IsBlocking && !s.IsDashing && !s.IsDownDashing && s.AttackCooldown <= 0 {
					s.IsAttacking = true
					s.AttackHitChecked = false // reset for this new swing
					s.AttackTimer = constants.AttackDuration
					s.AttackCooldown = constants.AttackCooldownTime
					s.VX = 0
				}
			case "block":
				if payload.KeyState == "pressed" {
					if !s.IsAttacking {
						s.IsBlocking = true
						s.BlockTimer = 0 // reset parry window on fresh block press
					}
					// Cannot apply block speed while dashing or attacking
					if !s.IsDashing && !s.IsDownDashing && !s.IsAttacking {
						// Cap current velocity to block speed
						blockSpeed := float64(constants.DefaultSpeed) * constants.BlockSpeedFactor
						if s.VX > blockSpeed {
							s.VX = blockSpeed
						} else if s.VX < -blockSpeed {
							s.VX = -blockSpeed
						}
					}
				} else {
					s.IsBlocking = false
					// Restore full speed based on held keys
					if !s.IsDashing && !s.IsDownDashing {
						if s.IsHoldingLeft && !s.IsHoldingRight {
							s.VX = -float64(constants.DefaultSpeed)
						} else if s.IsHoldingRight && !s.IsHoldingLeft {
							s.VX = float64(constants.DefaultSpeed)
						} else {
							s.VX = 0
						}
					}
				}
			default:
				if !s.IsDashing && !s.IsDownDashing {
					s.VX = 0
				}
			}

			break
		}
	})

	return nil
}
