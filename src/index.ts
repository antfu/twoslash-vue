import { expect } from 'vitest'
import * as vue from '@vue/language-core'
import * as ts from 'typescript/lib/tsserverlibrary'
import type { CreateTwoSlashOptions, TwoSlashExecuteOptions, TwoSlashInstance } from 'twoslashes'
import { createPositionConverter, createTwoSlasher } from 'twoslashes'

export function createTwoSlasherVue(createOptions: CreateTwoSlashOptions = {}, flag = true): TwoSlashInstance {
  const twoslasher = createTwoSlasher(createOptions)

  function vuefied(code: string, extension?: string, options: TwoSlashExecuteOptions = {}) {
    if (extension !== 'vue')
      return twoslasher(code, extension, options)

    const lang = vue.createVueLanguage(ts)
    const snapshot = ts.ScriptSnapshot.fromString(code)
    const fileSource = lang.createVirtualFile('index.vue', snapshot, 'vue')!
    const fileCompiled = fileSource.getEmbeddedFiles()[0]
    // No type for `content` in `EmbeddedFile`?
    const compiled = (fileCompiled as any).content.map((c: any) => Array.isArray(c) ? c[0] : c).join('')

    // TODO: get generateGlobalHelperTypes
    const result = twoslasher(compiled, 'ts', {
      ...options,
      handbookOptions: {
        noErrorValidation: true,
        ...options.handbookOptions,
        keepNotations: true,
      },
    })

    if (!flag)
      return result

    const map = new vue.SourceMap(fileCompiled.mappings)
    const pc = createPositionConverter(code)

    result.code = code
    result.tokens = result.tokens
      .map((q) => {
        if ('target' in q && q.target.startsWith('__'))
          return undefined
        const start = map.toSourceOffset(q.start)?.[0]
        const end = map.toSourceOffset(q.start + q.length)?.[0]
        if (start == null || end == null || start < 0 || end < 0 || start >= end)
          return undefined
        // if ('target' in q) {
        //   const compiledStr = compiled.slice(q.start, q.start + q.length)
        //   console.log({ compiledStr, str: code.slice(start, end) })
        //   // expect.soft(code.slice(index, end)).toBe(compiledStr)
        // }
        const to = {
          ...q,
          start,
          length: end - start,
          ...pc.indexToPos(start),
        }
        return to
      })
      .filter(isNotNull)

    return result
  }

  vuefied.dispose = twoslasher.dispose
  vuefied.getCacheMap = twoslasher.getCacheMap

  return vuefied
}

function isNotNull<T>(x: T | null | undefined): x is T {
  return x != null
}
