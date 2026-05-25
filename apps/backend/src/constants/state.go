package constants

import gametypes "riposte-backend/src/types/game_types"

// NewInitialStates1v1 returns fresh initial states for a 1v1 match.
// Each call allocates new structs to prevent pointer aliasing across rooms.
func NewInitialStates1v1() []*gametypes.PlayerState {
	return []*gametypes.PlayerState{
		{
			X:               100,
			Y:               300,
			VX:              0,
			VY:              0,
			FacingDirection: 1, // Faces right
			HasAirDash:      true,
			Health:          MaxHealth,
		},
		{
			X:               500,
			Y:               300,
			VX:              0,
			VY:              0,
			FacingDirection: -1, // Faces left
			HasAirDash:      true,
			Health:          MaxHealth,
		},
	}
}

// NewInitialStates2v2 returns fresh initial states for a 2v2 match.
func NewInitialStates2v2() []*gametypes.PlayerState {
	return []*gametypes.PlayerState{
		{
			X:               100,
			Y:               300,
			VX:              0,
			VY:              0,
			FacingDirection: 1,
			HasAirDash:      true,
			Health:          MaxHealth,
		},
		{
			X:               150,
			Y:               300,
			VX:              0,
			VY:              0,
			FacingDirection: 1,
			HasAirDash:      true,
			Health:          MaxHealth,
		},
		{
			X:               500,
			Y:               300,
			VX:              0,
			VY:              0,
			FacingDirection: -1,
			HasAirDash:      true,
			Health:          MaxHealth,
		},
		{
			X:               550,
			Y:               300,
			VX:              0,
			VY:              0,
			FacingDirection: -1,
			HasAirDash:      true,
			Health:          MaxHealth,
		},
	}
}
