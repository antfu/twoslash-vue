import { SourceMap, createVueLanguage, sharedTypes } from '@vue/language-core'
import * as ts from 'typescript/lib/tsserverlibrary'
import type { CreateTwoSlashOptions, Range, TwoSlashExecuteOptions, TwoSlashInstance } from 'twoslashes'
import { createTwoSlasher, removeCodeRanges, resolveTokenPositions } from 'twoslashes'

export function createTwoSlasherVue(createOptions: CreateTwoSlashOptions = {}, flag = true): TwoSlashInstance {
  const twoslasher = createTwoSlasher(createOptions)

  function vuefied(code: string, extension?: string, options: TwoSlashExecuteOptions = {}) {
    if (extension !== 'vue')
      return twoslasher(code, extension, options)

    const lang = createVueLanguage(
      ts,
      {
        target: 99,
        strict: true,
        moduleResolution: 2 satisfies ts.ModuleResolutionKind.NodeJs,
        ...options.compilerOptions,
      },
      {
        strictTemplates: false,
      },
    )
    const snapshot = ts.ScriptSnapshot.fromString(code)
    const fileSource = lang.createVirtualFile('index.vue', snapshot, 'vue')!
    const fileCompiled = fileSource.getEmbeddedFiles()[0]
    const typeHelpers = sharedTypes.getTypesCode(fileSource.vueCompilerOptions)
    const compiled = [
      // No type for `content` in `EmbeddedFile`?
      (fileCompiled as any).content.map((c: any) => Array.isArray(c) ? c[0] : c).join(''),
      '// ---cut-after---',
      typeHelpers,
    ].join('\n')

    const result = twoslasher(compiled, 'tsx', {
      ...options,
      compilerOptions: {
        jsx: 4 satisfies ts.JsxEmit.ReactJSX,
        jsxImportSource: 'vue',
        noImplicitAny: false,
        ...options.compilerOptions,
      },
      handbookOptions: {
        noErrorsCutted: true,
        ...options.handbookOptions,
        keepNotations: true,
      },
      shouldGetHoverInfo(id) {
        // ignore internal types
        return !id.startsWith('__VLS')
      },
      filterToken(token) {
        if (token.type === 'hover' && token.text === 'any')
          return false
        return true
      },
    })

    if (!flag)
      return result

    const map = new SourceMap(fileCompiled.mappings)

    const mappedTokens = result.tokens
      .map((q) => {
        if ('text' in q && q.text === 'any')
          return undefined
        const start = map.toSourceOffset(q.start)?.[0]
        const end = map.toSourceOffset(q.start + q.length)?.[0]
        if (start == null || end == null || start < 0 || end < 0 || start >= end)
          return undefined
        return Object.assign(q, {
          ...q,
          start,
          length: end - start,
        })
      })
      .filter(isNotNull)

    const mappedRemovals = result.meta.removals
      .map((r) => {
        const start = map.toSourceOffset(r[0])?.[0]
        const end = map.toSourceOffset(r[1])?.[0]
        if (start == null || end == null || start < 0 || end < 0 || start >= end)
          return undefined
        return [start, end] as Range
      })
      .filter(isNotNull)

    const removed = removeCodeRanges(code, mappedRemovals, mappedTokens)
    result.code = removed.code
    result.tokens = resolveTokenPositions(removed.tokens!, result.code)

    return result
  }

  vuefied.dispose = twoslasher.dispose
  vuefied.getCacheMap = twoslasher.getCacheMap

  return vuefied
}

function isNotNull<T>(x: T | null | undefined): x is T {
  return x != null
}
