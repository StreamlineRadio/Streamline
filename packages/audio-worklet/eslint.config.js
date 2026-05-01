import prettier from 'eslint-config-prettier';
import js from '@eslint/js';
import ts from 'typescript-eslint';
import { defineConfig } from 'eslint/config';
import globals from 'globals';

export default defineConfig(js.configs.recommended, ts.configs.recommended, prettier, {
	languageOptions: { globals: { ...globals.browser, ...globals.node } },
	rules: {
		'no-undef': 'off'
	}
});
