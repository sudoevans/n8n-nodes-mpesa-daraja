module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint', 'n8n-nodes-base'],
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:n8n-nodes-base/community',
	],
	parserOptions: {
		ecmaVersion: 2019,
		sourceType: 'module',
		project: ['./tsconfig.json'],
		tsconfigRootDir: __dirname,
	},
	env: {
		node: true,
		es6: true,
	},
	rules: {
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
		'no-console': 'warn',
		'prefer-const': 'error',
		// Disable some n8n rules that are too strict for initial development
		'n8n-nodes-base/node-param-description-missing-final-period': 'warn',
		'n8n-nodes-base/node-param-description-excess-final-period': 'warn',
		'n8n-nodes-base/node-param-description-unencoded-angle-brackets': 'warn',
		'n8n-nodes-base/node-class-description-inputs-wrong-regular-node': 'off',
		'n8n-nodes-base/node-class-description-outputs-wrong': 'off',
	},
	ignorePatterns: ['dist/**', 'node_modules/**', '*.js', 'gulpfile.js'],
};
