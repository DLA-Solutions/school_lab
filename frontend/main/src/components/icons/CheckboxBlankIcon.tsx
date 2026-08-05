import { SvgIcon, SvgIconProps } from '@mui/material';

/**
 * Unchecked state of the themed `Checkbox`. The box is painted from the palette rather than from
 * the SVG's own attributes: the fill has to follow the surface the control sits on, which is the
 * one thing that flips between colour schemes. The sibling checked and indeterminate icons leave
 * their paints unset and inherit `currentColor` from `SvgIcon`, so only the empty box needs this.
 */
const CheckboxBlankIcon = ({ sx, ...props }: SvgIconProps) => {
  return (
    <SvgIcon
      {...props}
      viewBox="0 0 13 13"
      fill="none"
      sx={[
        (theme) => {
          const palette = (theme.vars || theme).palette;

          return {
            '& rect': {
              fill: palette.background.paper,
              stroke: palette.neutral.dark,
            },
          };
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <rect
        x="1.16875"
        y="0.580859"
        width="11.6"
        height="11.6"
        rx="1.8"
        strokeWidth="0.4"
      />
    </SvgIcon>
  );
};

export default CheckboxBlankIcon;
