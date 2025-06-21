const NEAL_BASE_URL = 'https://neal.fun/api/infinite-craft';

// GET /pair?first=Water&second=Water
// returns JSON Object: { "result": "Lake", "emoji": "x", "isNew": "false" }
export const COMBINE_ELEMENTS = `${NEAL_BASE_URL}/pair`;

// GET /check?first=Water&second=Fire&result=Steam
// returns JSON Object: { "valid": "true", "emoji": "x" }
export const CHECK_RECIPE = `${NEAL_BASE_URL}/check`;
