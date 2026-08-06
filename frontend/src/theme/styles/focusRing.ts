import { Theme } from '@mui/material';

export const FOCUS_RING_WIDTH = 2;

// The single focus treatment for the whole SPA (WCAG 2.1 SC 2.4.7).
//
// `primary.main` is the DashdarkX brand purple and needs no new token: measured against every
// surface the ring can land on it ranges from 3.13:1 to 5.05:1, clearing the 3:1 non-text
// threshold of SC 1.4.11 in both color schemes. The floor is the DataGrid editing row in light
// (`secondary.darker`), and it is what constrained the value that token could take.
//
// `offset` is negative where the ring has to be drawn inside the element's own box — DataGrid
// cells sit flush against their neighbours, so an outward ring would be overlapped.
const focusRing = (theme: Theme, offset: number = FOCUS_RING_WIDTH) => ({
  outline: `${FOCUS_RING_WIDTH}px solid ${(theme.vars || theme).palette.primary.main}`,
  outlineOffset: offset,
});

export default focusRing;
