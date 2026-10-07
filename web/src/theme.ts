import { createTheme } from "@mantine/core";

export const theme = createTheme({
  fontFamily: '"IBM Plex Sans", sans-serif',
  fontFamilyMonospace: '"IBM Plex Mono", ui-monospace, monospace',
  primaryColor: "orange",
  primaryShade: 6,
  defaultRadius: 4,
  headings: {
    fontFamily: '"Newsreader", Georgia, serif',
    fontWeight: "500",
  },
  colors: {
    orange: [
      "#fff7ed",
      "#ffedd5",
      "#fed7aa",
      "#fdba74",
      "#fb923c",
      "#f97316",
      "#d97706",
      "#b45309",
      "#92400e",
      "#78350f",
    ],
  },
  components: {
    Badge: {
      defaultProps: {
        radius: "xs",
        variant: "light",
        tt: "none",
        fw: 500,
        styles: { root: { fontSize: 12, letterSpacing: 0 } },
      },
    },
  },
});