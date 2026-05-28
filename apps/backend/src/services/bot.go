package services

import (
	"riposte-backend/src/constants"
	gametypes "riposte-backend/src/types/game_types"
)

// UpdateBots runs the AI routine for every bot in the room.
// Must be called once per fixed physics step, before the physics update loop,
// so that bot state mutations are picked up by the same tick's physics pass.
func UpdateBots(room *gametypes.Room) {
	for _, player := range room.Players {
		if !player.IsBot || player.State == nil {
			continue
		}

		switch player.BotBehavior {
		case "idle":
			// No-op: the bot just stands and falls with gravity.

		case "attack_spam":
			updateBotAttackSpam(player, room)

		case "block":
			updateBotBlock(player)

		case "auto_parry":
			updateBotAutoParry(player, room)
		}
	}
}

// updateBotAttackSpam makes the bot attack as soon as its cooldown expires.
func updateBotAttackSpam(bot *gametypes.Player, _ *gametypes.Room) {
	s := bot.State

	if s.IsStaggered || s.IsAttacking || s.IsBlocking || s.IsDashing || s.IsDownDashing {
		return
	}

	if s.AttackCooldown <= 0 {
		s.IsAttacking = true
		s.AttackHitChecked = false
		s.AttackTimer = constants.AttackDuration
		s.AttackCooldown = constants.AttackCooldownTime
		s.VX = 0
	}
}

// updateBotBlock keeps the bot in a constant blocking stance.
// The block timer is not reset each tick so a sustained block correctly
// accumulates past the parry window, behaving like a real player holding block.
func updateBotBlock(bot *gametypes.Player) {
	s := bot.State

	if s.IsStaggered || s.IsAttacking {
		return
	}

	if !s.IsBlocking {
		s.IsBlocking = true
		// Do not reset BlockTimer here so a sustained hold is preserved.
		// The physics loop increments it every tick.
	}
}

// updateBotAutoParry scans for any opponent whose swing just became active this
// tick (IsAttacking && !AttackHitChecked). When detected, the bot instantly
// enters a fresh block with BlockTimer = 0, guaranteeing it lands inside the
// parry window before the hit check fires.
func updateBotAutoParry(bot *gametypes.Player, room *gametypes.Room) {
	s := bot.State

	if s.IsStaggered {
		return
	}

	swingDetected := false
	for _, other := range room.Players {
		if other.Metadata.ID == bot.Metadata.ID {
			continue
		}
		if other.State == nil {
			continue
		}

		os := other.State
		// Swing just started this tick: AttackHitChecked is still false.
		if os.IsAttacking && !os.AttackHitChecked {
			swingDetected = true
			break
		}
	}

	if swingDetected {
		// Drop any existing block to reset BlockTimer to 0 on the fresh press.
		s.IsBlocking = true
		s.BlockTimer = 0
	} else if s.IsBlocking {
		// Release the block when there is no active incoming swing so the bot
		// does not accumulate posture from sustained holds.
		s.IsBlocking = false
	}
}
