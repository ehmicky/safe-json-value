import { expectType } from 'tsd'

import handleCliError, { Options } from './main.js'

expectType<true>(handleCliError(true))
