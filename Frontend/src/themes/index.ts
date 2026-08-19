import { AppTheme } from './types';
import { darkTheme } from './dark';
import { brightTheme } from './bright';

export * from './types';
export { darkTheme, brightTheme };

export const AVAILABLE_THEMES: AppTheme[] = [
    darkTheme,
    brightTheme
];

export const DEFAULT_THEME_ID = 'dark';
