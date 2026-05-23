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
		},
		{
			X:               500,
			Y:               300,
			VX:              0,
			VY:              0,
			FacingDirection: -1, // Faces left
			HasAirDash:      true,
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
		},
		{
			X:               150,
			Y:               300,
			VX:              0,
			VY:              0,
			FacingDirection: 1,
			HasAirDash:      true,
		},
		{
			X:               500,
			Y:               300,
			VX:              0,
			VY:              0,
			FacingDirection: -1,
			HasAirDash:      true,
		},
		{
			X:               550,
			Y:               300,
			VX:              0,
			VY:              0,
			FacingDirection: -1,
			HasAirDash:      true,
		},
	}
}

