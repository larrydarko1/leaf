import vueI18n from '@intlify/eslint-plugin-vue-i18n';
import * as jsoncParser from 'jsonc-eslint-parser';

/**
 * Keys the usage scan cannot see: it only follows `t()` calls under `src/renderer`.
 * `meta.name` is the locale's endonym, read as a plain property by the main process
 * (src/main/services/language.ts) to label the language picker.
 */
const UNSCANNED_KEYS = ['meta.name', 'meta.dictationLanguage'];

export default [
    {
        settings: {
            'vue-i18n': {
                localeDir: './assets/locales/*.json',
                messageSyntaxVersion: '^11.0.0',
            },
        },
    },
    {
        files: ['src/renderer/**/*.vue'],
        plugins: { '@intlify/vue-i18n': vueI18n },
        rules: {
            '@intlify/vue-i18n/no-raw-text': [
                'error',
                {
                    // Pure whitespace/number/punctuation/symbol runs, and empty-string ternary branches.
                    ignorePattern: '^[\\s\\d\\p{P}\\p{S}]*$',
                    ignoreText: ['Leaf'],
                },
            ],
            'vue/no-restricted-block': [
                'error',
                {
                    element: 'i18n',
                    message:
                        'No per-component <i18n> blocks — every key lives in assets/locales/<locale>.json. A block splits a key away from its siblings, and no locale-parity check can see it.',
                },
            ],
            '@intlify/vue-i18n/no-i18n-t-path-prop': 'error',
        },
    },
    {
        files: ['src/renderer/**/*.{ts,vue}'],
        plugins: { '@intlify/vue-i18n': vueI18n },
        rules: {
            '@intlify/vue-i18n/no-missing-keys': 'error',
            '@intlify/vue-i18n/valid-message-syntax': 'error',
            '@intlify/vue-i18n/prefer-linked-key-with-paren': 'error',
        },
    },
    {
        files: ['assets/locales/*.json'],
        plugins: { '@intlify/vue-i18n': vueI18n },
        languageOptions: { parser: jsoncParser },
        rules: {
            '@typescript-eslint/naming-convention': 'off',
            '@intlify/vue-i18n/no-missing-keys-in-other-locales': 'error',
            '@intlify/vue-i18n/no-duplicate-keys-in-locale': 'error',
            '@intlify/vue-i18n/valid-message-syntax': 'error',
            '@intlify/vue-i18n/prefer-linked-key-with-paren': 'error',
            '@intlify/vue-i18n/no-unused-keys': [
                'error',
                {
                    src: 'src/renderer',
                    extensions: ['.ts', '.vue'],
                    ignores: UNSCANNED_KEYS,
                },
            ],
        },
    },
];
