export const RECIPE_PALETTE = {
  'Honey Lemon':         { bg: 'hsl(44,  85%, 88%)', border: 'hsl(44,  70%, 66%)', text: 'hsl(35,  65%, 34%)' },
  'Rosemary Lemon Peel': { bg: 'hsl(96,  45%, 87%)', border: 'hsl(96,  40%, 62%)', text: 'hsl(96,  40%, 32%)' },
  'Lime Agave':          { bg: 'hsl(88,  62%, 85%)', border: 'hsl(88,  52%, 62%)', text: 'hsl(88,  50%, 32%)' },
  'Cranberry Hibiscus':  { bg: 'hsl(345, 65%, 88%)', border: 'hsl(345, 55%, 65%)', text: 'hsl(345, 52%, 35%)' },
  'Mint Julep':          { bg: 'hsl(152, 55%, 87%)', border: 'hsl(152, 45%, 62%)', text: 'hsl(152, 45%, 32%)' },
  'Azalea':              { bg: 'hsl(340, 72%, 88%)', border: 'hsl(340, 60%, 65%)', text: 'hsl(340, 55%, 35%)' },
  'Blackberry Smash':    { bg: 'hsl(272, 55%, 88%)', border: 'hsl(272, 48%, 64%)', text: 'hsl(272, 48%, 34%)' },
  'Summer Berry':        { bg: 'hsl(310, 58%, 87%)', border: 'hsl(310, 48%, 63%)', text: 'hsl(310, 48%, 33%)' },
}

export function recipeColor(expression) {
  if (!expression) return null
  if (RECIPE_PALETTE[expression]) return RECIPE_PALETTE[expression]
  let h = 0
  for (const ch of expression) h = (h * 31 + ch.charCodeAt(0)) | 0
  const hue = Math.abs(h) % 360
  return { bg: `hsl(${hue},55%,88%)`, border: `hsl(${hue},45%,65%)`, text: `hsl(${hue},45%,35%)` }
}
