import * as vue from '@vue/language-core'
import * as ts from 'typescript/lib/tsserverlibrary'
import type { TwoSlashOptions, TwoSlashReturn } from '@typescript/twoslash'
import { twoslasher } from '@typescript/twoslash'

export function twoslashVue(code: string, extension: string, options: TwoSlashOptions = {}): TwoSlashReturn {
  if (extension === 'vue') {
    const lang = vue.createVueLanguage(ts)
    const snapshot = ts.ScriptSnapshot.fromString(code)
    const fileSource = lang.createVirtualFile('index.vue', snapshot, 'vue')!
    const fileCompiled = fileSource.getEmbeddedFiles()[0]
    // No type for `content` in `EmbeddedFile`?
    const compiled = (fileCompiled as any).content.map((c: any) => Array.isArray(c) ? c[0] : c).join('')

    const result = twoslasher(compiled, 'ts', {
      ...options,
      defaultOptions: {
        noErrorValidation: true,
        ...options.defaultOptions,
      },
    })

    const mappings = fileCompiled.mappings
    const lines = Array.from(code.matchAll(/^.*$/mg)).map(m => m[0])

    function toSourceIndex(pos: number) {
      for (const mapping of mappings) {
        if (mapping.generatedRange[0] <= pos && pos <= mapping.generatedRange[1])
          return mapping.sourceRange[0] + Math.floor((pos - mapping.generatedRange[0]) / (mapping.generatedRange[1] - mapping.generatedRange[0]) * (mapping.sourceRange[1] - mapping.sourceRange[0]))
      }
    }

    function indexToPos(index: number) {
      let line = 0
      let character = 0
      while (index > lines[line].length) {
        index -= lines[line].length
        line++
      }
      character = index
      return { line, character }
    }

    result.code = code
    result.queries = result.queries
      .map((q) => {
        const index = toSourceIndex(q.start - 1)!
        if (index == null)
          return undefined
        const { line, character } = indexToPos(index)
        return {
          ...q,
          start: index + 1,
          line: line + 1,
          offset: character,
        }
      })
      .filter(isNotNull)
    result.staticQuickInfos = result.staticQuickInfos
      .filter(i => !i.targetString.startsWith('__'))
      .map((i) => {
        const index = toSourceIndex(i.start - 1)!
        if (index == null)
          return undefined
        const { line, character } = indexToPos(index)
        return {
          ...i,
          start: index + 1,
          line,
          character,
        }
      })
      .filter(isNotNull)

    return result
  }
  else {
    return twoslasher(code, extension, options)
  }
}

function isNotNull<T>(x: T | null | undefined): x is T {
  return x != null
}
