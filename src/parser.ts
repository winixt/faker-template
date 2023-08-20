/*
  ## Parser

  解析数据模板（属性名部分）。

  * Parser.parse( name )

  ```json
  {
      parameters: [ name, inc, range, decimal ],
      rnage: [ min , max ],

      min: min,
      max: max,
      count : count,

      decimal: decimal,
      dmin: dmin,
      dmax: dmax,
      dcount: dcount
  }
  ```
 */
import { faker } from '@faker-js/faker'

import { RE_KEY, RE_RANGE } from './constant'

export function parse(name: string) {
  const parameters = (name || '').match(RE_KEY)

  const range
      = parameters && parameters[3] && parameters[3].match(RE_RANGE)
  const min = range && range[1] && parseInt(range[1], 10) // || 1
  const max = range && range[2] && parseInt(range[2], 10) // || 1
  // repeat || min-max || 1
  const count = range
    ? !range[2]
        ? parseInt(range[1], 10)
        : faker.number.int({ min, max })
    : undefined

  const decimal
      = parameters && parameters[4] && parameters[4].match(RE_RANGE)
  const dmin = decimal && decimal[1] && parseInt(decimal[1], 10) // || 0,
  const dmax = decimal && decimal[2] && parseInt(decimal[2], 10) // || 0,
  // int || dmin-dmax || 0
  const dcount = decimal
    ? ((!decimal[2] && parseInt(decimal[1], 10)) || faker.number.int({ min: dmin, max: dmax }))
    : undefined

  return {
    // 1 name, 2 inc, 3 range, 4 decimal
    parameters,
    // 1 min, 2 max
    range,
    min,
    max,
    // min-max
    count,
    // 是否有 decimal
    decimal,
    dmin,
    dmax,
    // dmin-dmax
    dcount,
  }
}
