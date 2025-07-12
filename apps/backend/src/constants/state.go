package constants

import gametypes "riposte-backend/src/types/game_types"

// Will make things robust later, these are just random values for now.
var InitialStates1v1 = []*gametypes.PlayerState{
	{
		X:  100,
		Y:  300,
		VX: 0,
		VY: 0,
	},
	{
		X:  500,
		Y:  300,
		VX: 0,
		VY: 0,
	},
}

var InitialStates2v2 = []*gametypes.PlayerState{
	{
		X:  100,
		Y:  300,
		VX: 0,
		VY: 0,
	},
	{
		X:  150,
		Y:  300,
		VX: 0,
		VY: 0,
	},
	{
		X:  500,
		Y:  300,
		VX: 0,
		VY: 0,
	},
	{
		X:  550,
		Y:  300,
		VX: 0,
		VY: 0,
	},
}

var DefaultSpeed = 50 // px per second
