import { Message } from "../vm/types.js";
export class KmsClient {
	private kmsUrl: URL;
	constructor(origin: string) {
		this.kmsUrl = new URL(origin);
	}

	public async signMessage({message}:{message: Message}): Promise<Message> {
		const resp = await fetch(this.kmsUrl, {
			method: 'POST',
			headers: {
			  'Content-Type': 'application/json',
			},
			body: message
		  })
		return resp.signedMessage
	}
}