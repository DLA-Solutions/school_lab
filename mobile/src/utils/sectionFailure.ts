/** A list load that failed before or without a network classification the UI already knows. */
export class SectionFailure extends Error {
  readonly phase: 'error';

  constructor() {
    super('section_load_failed');
    this.name = 'SectionFailure';
    this.phase = 'error';
  }
}
