import type { Address } from '../types/address.ts';
import { encodeHeader } from './encode_header.ts';

export function encodeAddress(addr: Address): string {
	if (!addr.name) return addr.address;
	const fake = encodeHeader('X', addr.name).trim();
	const encoded = fake.replace(/^X:\s*/, '');
	return `${encoded} <${addr.address}>`;
}

export function encodeAddressList(addrs: Address[] | undefined | null): string {
	if (!addrs?.length) return '';
	return addrs.map(encodeAddress).join(', ');
}
