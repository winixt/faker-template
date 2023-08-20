/*
    ## Handler

    处理 faker 数据模板。

    * Handler.gen( template, name?, context? )

        入口方法。

    * Data Template Definition, DTD

        处理数据模板定义。

        * Handler.array( options )
        * Handler.object( options )
        * Handler.number( options )
        * Handler.boolean( options )
        * Handler.string( options )
        * Handler.function( options )
        * Handler.regexp( options )

        处理路径（相对和绝对）。

        * Handler.getValueByKeyPath( key, options )

    * Data Placeholder Definition, DPD

        处理数据占位符定义

        * Handler.placeholder( placeholder, context, templateContext, options )

*/
import { get } from 'lodash-es'
import { parse } from './parser'
import { toType } from './utils'
import { faker } from './faker'
import { RE_KEY, RE_PLACEHOLDER } from './constant'
import type { Context, Options } from './types'

export class Handler {
  guid = 1
  constructor() {
  }

  /*
    template        属性值（即数据模板）
    name            属性名
    context         数据上下文，生成后的数据
    templateContext 模板上下文，

    Handle.gen(template, name, options)
    context
        parentValue, parentTemplate,
        path, templatePath
        root, rootTemplate
  */
  gen(template: unknown, name?: string | number, context?: Context) {
    name = name == null ? '' : `${name}`

    context = {
      // 当前访问路径，只有属性名，不包括生成规则
      path: context?.path || [this.guid],
      templatePath: context?.templatePath || [this.guid++],
      // 最终属性值的上下文
      parentValue: context?.parentValue,
      // 属性值模板的上下文
      parentTemplate: context?.parentTemplate || template,
      // 最终值的根
      root: context?.root || context?.parentValue,
      // 模板的根
      rootTemplate: context?.rootTemplate || context?.parentTemplate || template,
    }

    const rule = name ? parse(name) : {}
    const type = toType(template)
    let data

    if (this[type]) {
      data = this[type]({
        // 属性值类型
        type,
        // 属性值模板
        template,
        // 属性名 + 生成规则
        name,
        // 属性名
        fieldName: name ? name.replace(RE_KEY, '$1') : name,

        // 解析后的生成规则
        rule,
        // 相关上下文
        context,
      })

      if (!context.root)
        context.root = data
      return data
    }

    return template
  }

  array(options: Options<any[] & { __order_index?: number }>) {
    let result = []

    // 'name|1': []
    // 'name|count': []
    // 'name|min-max': []
    if (options.template.length === 0)
      return result

    // 'arr': [{ 'email': '@EMAIL' }, { 'email': '@EMAIL' }]
    if (!options.rule.parameters) {
      for (let i = 0; i < options.template.length; i++) {
        options.context.path.push(i)
        options.context.templatePath.push(i)
        result.push(
          this.gen(options.template[i], i, {
            path: options.context.path,
            templatePath: options.context.templatePath,
            parentValue: result,
            parentTemplate: options.template,
            root: options.context.root || result,
            rootTemplate: options.context.rootTemplate || options.template,
          }),
        )
        options.context.path.pop()
        options.context.templatePath.pop()
      }
    }
    else {
      // 'method|1': ['GET', 'POST', 'HEAD', 'DELETE']
      if (options.rule.min === 1 && options.rule.max === undefined) {
        const index = faker.number.int({ min: 0, max: options.template.length - 1 })
        options.context.path.push(index)
        options.context.templatePath.push(index)
        result = this.gen(options.template[index], index, {
          path: options.context.path,
          templatePath: options.context.templatePath,
          parentValue: result,
          parentTemplate: options.template,
          root: options.context.root || result,
          rootTemplate: options.context.rootTemplate || options.template,
        })
        options.context.path.pop()
        options.context.templatePath.pop()
      }
      else {
        // 'data|+1': [{}, {}]
        if (options.rule.parameters[2]) {
          options.template.__order_index = options.template.__order_index || 0

          options.context.path.push(options.name)
          options.context.templatePath.push(options.name)
          result = this.gen(options.template, undefined, {
            path: options.context.path,
            templatePath: options.context.templatePath,
            parentValue: result,
            parentTemplate: options.template,
            root: options.context.root || result,
            rootTemplate: options.context.rootTemplate || options.template,
          })[
            options.template.__order_index % options.template.length
          ]

          options.template.__order_index += +options.rule.parameters[2]

          options.context.path.pop()
          options.context.templatePath.pop()
        }
        else {
          // 'data|1-10': [{}]
          for (let i = 0; i < options.rule.count; i++) {
            // 'data|1-10': [{}, {}]
            for (let ii = 0; ii < options.template.length; ii++) {
              options.context.path.push(result.length)
              options.context.templatePath.push(ii)
              result.push(
                this.gen(options.template[ii], result.length, {
                  path: options.context.path,
                  templatePath: options.context.templatePath,
                  parentValue: result,
                  parentTemplate: options.template,
                  root: options.context.root || result,
                  rootTemplate: options.context.rootTemplate || options.template,
                }),
              )
              options.context.path.pop()
              options.context.templatePath.pop()
            }
          }
        }
      }
    }
    return result
  }

  object(options: Options<Record<string, any>>) {
    const result = {}

    // 'obj|min-max': {}
    if (options.rule.min != null) {
      let keys = Object.keys(options.template)
      keys = faker.helpers.shuffle(keys)
      keys = keys.slice(0, options.rule.count)
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        const parsedKey = key.replace(RE_KEY, '$1')
        options.context.path.push(parsedKey)
        options.context.templatePath.push(key)
        result[parsedKey] = this.gen(options.template[key], key, {
          path: options.context.path,
          templatePath: options.context.templatePath,
          parentValue: result,
          parentTemplate: options.template,
          root: options.context.root || result,
          rootTemplate: options.context.rootTemplate || options.template,
        })
        options.context.path.pop()
        options.context.templatePath.pop()
      }
    }
    else {
      // 'obj': {}
      let keys = []
      const fnKeys = [] // #25 改变了非函数属性的顺序，查找起来不方便
      for (const key in options.template)
        (typeof options.template[key] === 'function' ? fnKeys : keys).push(key)

      keys = keys.concat(fnKeys)

      /*
                会改变非函数属性的顺序
                keys = Util.keys(options.template)
                keys.sort(function(a, b) {
                    var afn = typeof options.template[a] === 'function'
                    var bfn = typeof options.template[b] === 'function'
                    if (afn === bfn) return 0
                    if (afn && !bfn) return 1
                    if (!afn && bfn) return -1
                })
            */

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        const parsedKey = key.replace(RE_KEY, '$1')
        options.context.path.push(parsedKey)
        options.context.templatePath.push(key)
        result[parsedKey] = this.gen(options.template[key], key, {
          path: options.context.path,
          templatePath: options.context.templatePath,
          parentValue: result,
          parentTemplate: options.template,
          root: options.context.root || result,
          rootTemplate: options.context.rootTemplate || options.template,
        })
        options.context.path.pop()
        options.context.templatePath.pop()
        // 'id|+1': 1
        const inc = key.match(RE_KEY)
        if (inc && inc[2] && toType(options.template[key]) === 'number')
          options.template[key] += parseInt(inc[2], 10)
      }
    }
    return result
  }

  number(options: Options<number>) {
    if (options.rule.decimal) { // float
      const parts = `${options.template}`.split('.')
      // 'float1|.1-10': 10,
      // 'float2|1-100.1-10': 1,
      // 'float3|999.1-10': 1,
      // 'float4|.3-10': 123.123,
      parts[0] = options.rule.range ? `${options.rule.count}` : parts[0]
      parts[1] = (parts[1] || '').slice(0, options.rule.dcount)
      if (parts[1].length < options.rule.dcount)
        parts[1] += faker.string.numeric(options.rule.dcount - parts[1].length)

      return parseFloat(parts.join('.'))
    }
    else { // integer
      // 'grade1|1-100': 1,
      return (options.rule.range && !options.rule.parameters[2]) ? options.rule.count : options.template
    }
  }

  boolean(options: Options<boolean>) {
    // 'prop|multiple': false, 当前值是相反值的概率倍数
    // 'prop|probability-probability': false, 当前值与相反值的概率
    return options.rule.parameters ? faker.datatype.boolean(options.rule.min / (options.rule.min + options.rule.max)) : options.template
  }

  string(options: Options<string>) {
    let result = ''
    if (options.template.length) {
      //  'foo': '★',
      if (options.rule.count == null)
        result += options.template

      // 'star|1-5': '★',
      for (let i = 0; i < options.rule.count; i++)
        result += options.template

      // 'email|1-10': '@EMAIL, ',
      const placeholders = result.match(RE_PLACEHOLDER) || [] // A-Z_0-9 > \w_
      for (let i = 0; i < placeholders.length; i++) {
        const ph = placeholders[i]

        // 遇到转义斜杠，不需要解析占位符
        if (/^\\/.test(ph)) {
          placeholders.splice(i--, 1)
          continue
        }

        const phed = this.placeholder(ph, options.context.parentValue, options.context.parentTemplate, options)

        // 只有一个占位符，并且没有其他字符
        if (placeholders.length === 1 && ph === result && typeof phed !== typeof result) { //
          result = phed
          break
        }
        result = result.replace(ph, phed)
      }
    }
    else {
      // 'ASCII|1-10': '',
      // 'ASCII': '',
      // TODO 优化字符串生成
      result = options.rule.range ? faker.string.alpha(options.rule.count) : options.template
    }
    return result
  }

  function(options: Options<((...args: any[]) => any)>) {
    // ( context, options )
    return options.template.call(options.context.parentValue, options)
  }

  regexp(options: Options<RegExp | string>) {
    return faker.helpers.fromRegExp(options.template)
  }

  // 处理占位符，转换为最终值
  placeholder(placeholder: string, parentValue: any, parentTemplate: any, options: Options<any>) {
    // console.log(options.context.path)
    // 1 key, 2 params
    RE_PLACEHOLDER.exec('')
    const parts = RE_PLACEHOLDER.exec(placeholder)
    const key = parts && parts[1]

    // 占位符优先引用数据模板中的属性
    if (parentValue && (key in parentValue))
      return parentValue[key]

    const pathParts = this.splitPathToArray(key)
    // 绝对路径 or 相对路径
    if (
      key.charAt(0) === '/'
              || pathParts.length > 1
    ) return this.getValueByKeyPath(key, options)

    // 递归引用数据模板中的属性
    if (parentTemplate
          && (typeof parentTemplate === 'object')
          && (key in parentValue)
          && (placeholder !== parentValue[key]) // fix #15 避免自己依赖自己
    ) {
    // 先计算被引用的属性值
      parentTemplate[key] = this.gen(parentTemplate[key], key, {
        parentValue,
        parentTemplate,
      })
      return parentTemplate[key]
    }

    // 如果未找到，则原样返回
    const handle = get(faker, key)
    if (!handle)
      return placeholder

    let params: any = (parts && parts[2]) || ''

    // 解析占位符的参数
    try {
      // 1. 尝试保持参数的类型
      /*
                #24 [Window Firefox 30.0 引用 占位符 抛错](https://github.com/nuysoft/Mock/issues/24)
                [BX9056: 各浏览器下 window.eval 方法的执行上下文存在差异](http://www.w3help.org/zh-cn/causes/BX9056)
                应该属于 Window Firefox 30.0 的 BUG
            */
      // eslint-disable-next-line no-eval
      params = eval(`(function(){ return [].splice.call(arguments, 0 ) })(${params})`)
    }
    catch (error) {
      // 2. 如果失败，只能解析为字符串
      // console.error(error)
      // if (error instanceof ReferenceError) params = parts[2].split(/,\s*/);
      // else throw error
      params = parts[2].split(/,\s*/)
    }

    // 递归解析参数中的占位符
    for (let i = 0; i < params.length; i++) {
      RE_PLACEHOLDER.exec('')
      if (RE_PLACEHOLDER.test(params[i]))
        params[i] = this.placeholder(params[i], parentValue, parentTemplate, options)
    }

    return handle.apply(faker, params)
  }

  getValueByKeyPath(key: string, options: Options<any>) {
    const originalKey = key
    const keyPathParts = this.splitPathToArray(key)
    let absolutePathParts = []

    // 绝对路径
    if (key.charAt(0) === '/') {
      absolutePathParts = [options.context.path[0]].concat(
        this.normalizePath(keyPathParts),
      )
    }
    else {
      // 相对路径
      if (keyPathParts.length > 1) {
        absolutePathParts = options.context.path.slice(0)
        absolutePathParts.pop()
        absolutePathParts = this.normalizePath(
          absolutePathParts.concat(keyPathParts),
        )
      }
    }

    try {
      key = keyPathParts[keyPathParts.length - 1]
      let parentValue = options.context.root
      let parentTemplate = options.context.rootTemplate
      for (let i = 1; i < absolutePathParts.length - 1; i++) {
        parentValue = parentValue[absolutePathParts[i]]
        parentTemplate = parentTemplate[absolutePathParts[i]]
      }
      // 引用的值已经计算好
      if (parentValue && (key in parentValue))
        return parentValue[key]

      // 尚未计算，递归引用数据模板中的属性
      if (parentTemplate
                && (typeof parentTemplate === 'object')
                && (key in parentTemplate)
                && (originalKey !== parentTemplate[key]) // fix #15 避免自己依赖自己
      ) {
        // 先计算被引用的属性值
        parentTemplate[key] = this.gen(parentTemplate[key], key, {
          parentValue,
          parentTemplate,
        })
        return parentTemplate[key]
      }
    }
    catch (err) { }

    return `@${keyPathParts.join('/')}`
  }

  // https://github.com/kissyteam/kissy/blob/master/src/path/src/path.js
  normalizePath(pathParts: (string | number)[]) {
    const newPathParts = []
    for (let i = 0; i < pathParts.length; i++) {
      switch (pathParts[i]) {
        case '..':
          newPathParts.pop()
          break
        case '.':
          break
        default:
          newPathParts.push(pathParts[i])
      }
    }
    return newPathParts
  }

  splitPathToArray(path: string) {
    let parts = path.split(/\/+/)
    if (!parts[parts.length - 1])
      parts = parts.slice(0, -1)
    if (!parts[0])
      parts = parts.slice(1)
    return parts
  }
}
