import type { parse } from './parser'

export type NameParsed = ReturnType<typeof parse>

export interface Context {
  path?: (number | string)[]
  templatePath?: (number | string)[]
  parentValue: any
  parentTemplate: any
  root?: any
  rootTemplate?: any
}

export interface Options<T> {
  type: string
  template: T
  name: string
  fieldName: string
  rule: NameParsed
  context: Context
}
