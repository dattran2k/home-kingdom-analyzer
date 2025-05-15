// Constants and configuration

export const IMPORTANT_COLUMNS = [
    'Home Server', 'Name', 'Lord Id', 'Highest Power', 'Power',
    'Killcount T1', 'T4 +T5',
    'Units Dead', 'Units Healed', 'Victories', 'Defeats', 
    'Tank Ratio', 'Win Rate (%)', 'Player Type', 'Mana Spent'
];

export const DEFAULT_SORT_ORDER = [
    {column: 'Home Server', direction: 'asc'},
    {column: 'Name', direction: 'asc'},
    {column: 'Lord Id', direction: 'asc'}
];

export const POWER_THRESHOLD = 30000000;
export const TANK_DPS_RATIO = 1.3;
