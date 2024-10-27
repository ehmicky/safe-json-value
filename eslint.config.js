import eslintConfig from '@ehmicky/eslint-config'

export default [
  ...eslintConfig,
  {
    rules: {
      // This repository relies on JSON parsing/serializing
      'unicorn/prefer-structured-clone': 0,
    },
  },
]
