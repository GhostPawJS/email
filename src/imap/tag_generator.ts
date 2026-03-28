import { DEFAULT_TAG_PREFIX } from '../types/defaults.ts';

export function createTagGenerator(prefix = DEFAULT_TAG_PREFIX): () => string {
	let seq = 0;
	return () => {
		seq++;
		return `${prefix}${seq.toString().padStart(4, '0')}`;
	};
}
