import { createRoomHandler } from '$lib/socket/handlers/createRoomHandler';

class SocketManager {
	private state = $state({
		socket: null as WebSocket | null,
		connectionState: 'disconnected' as 'connected' | 'disconnected' | 'error',
		error: null as Error | null
	});

	public roomState = $state({
		roomId: null as string | null,
		roomName: null as string | null,
		roomMembers: [] as string[]
	});

	public get socket() {
		return this.state.socket;
	}

	public get connectionState() {
		return this.state.connectionState;
	}

	public get error() {
		return this.state.error;
	}

	public connect(url: string) {
		if (this.state.socket) {
			this.state.socket.close();
		}

		this.state.socket = new WebSocket(url);

		this.state.socket.onopen = () => {
			this.state.connectionState = 'connected';
			this.state.error = null;
			console.log('WebSocket connection established.');
		};

		this.state.socket.onclose = () => {
			this.state.connectionState = 'disconnected';
			console.log('WebSocket connection closed.');
		};

		this.state.socket.onerror = (event) => {
			this.state.connectionState = 'error';
			this.state.error = new Error('WebSocket connection error');
			console.error('WebSocket error:', event);
		};

		this.state.socket.onmessage = (ev) => {
			try {
				const data = JSON.parse(ev.data);

				const event = data.event;
				const payload = data.payload;

				switch (event) {
					case 'create_room':
						createRoomHandler(payload);
						break;
					default:
						console.warn(`Unhandled WebSocket event: ${event}`, payload, data);
				}
			} catch (error) {
				console.error('Error handling WebSocket message:', error);
			}
		};
	}

	public sendMessage(message: string) {
		if (this.state.socket && this.state.socket.readyState === WebSocket.OPEN) {
			this.state.socket.send(message);
		} else {
			console.error('WebSocket is not open. Cannot send message.');
		}
	}
}

export const socketManager = new SocketManager();
