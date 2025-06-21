
const NEAL_BASE_URL = 'https://neal.fun/api/infinite-craft';

// GET /pair?first=Water&second=Water
// returns CombineElementsResponse type
export const COMBINE_ELEMENTS = `${NEAL_BASE_URL}/pair`;

// GET /check?first=Water&second=Fire&result=Steam
// returns CheckRecipeResponse type
export const CHECK_RECIPE = `${NEAL_BASE_URL}/check`;
